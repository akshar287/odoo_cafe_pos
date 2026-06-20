'use server';

import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import { ChatGroq } from '@langchain/groq';
import { StateGraph, Annotation } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import dbConnect from '@/lib/db';
import Category from '@/models/Category';
import Product from '@/models/Product';
import Coupon from '@/models/Coupon';
import ScheduledTask from '@/models/ScheduledTask';
import Customer from '@/models/Customer';
import Employee from '@/models/Employee';
import Floor from '@/models/Floor';
import Order from '@/models/Order';
import PaymentMethod from '@/models/PaymentMethod';
import Session from '@/models/Session';
import Settings from '@/models/Settings';
import Table from '@/models/Table';

// ─── TOOL DEFINITIONS ────────────────────────────────────────────────────────

const getSystemMetadataTool = tool(
  async () => {
    try {
      await dbConnect();
      const categories = await Category.find({}).lean();
      const productsCount = await Product.countDocuments({});
      const coupons = await Coupon.find({}).lean();

      return JSON.stringify({
        categories: categories.map((c: any) => ({ name: c.name, _id: String(c._id) })),
        productsCount,
        coupons: coupons.map((c: any) => ({ name: c.name, code: c.code, active: c.active })),
        timeZone: 'Asia/Kolkata (IST)',
        currentTime: new Date().toISOString(),
      });
    } catch (e: any) {
      return `Error fetching metadata: ${e.message}`;
    }
  },
  {
    name: 'get_system_metadata',
    description: 'Retrieves current database category list, product count, and active coupons to understand system context.',
  }
);

const createCategoryTool = tool(
  async ({ name, color }) => {
    try {
      await dbConnect();
      const existing = await Category.findOne({ name });
      if (existing) {
        return `Category "${name}" already exists.`;
      }
      const cat = await Category.create({ name, color });
      return `Successfully created category "${cat.name}" with color "${cat.color}".`;
    } catch (e: any) {
      return `Error creating category: ${e.message}`;
    }
  },
  {
    name: 'create_category',
    description: 'Creates a new category for menu products.',
    schema: z.object({
      name: z.string().describe("Category name, e.g., 'Warm Soups'"),
      color: z.string().describe("Hex color code, e.g., '#f97316'"),
    }),
  }
);

const createProductTool = tool(
  async ({ name, categoryName, price, unitOfMeasure, tax, description, image, isVeg, sendToKDS }) => {
    try {
      await dbConnect();
      let category = await Category.findOne({ name: categoryName });
      if (!category) {
        // Auto-create category with a default orange color if it doesn't exist
        category = await Category.create({ name: categoryName, color: '#f97316' });
      }

      const prod = await Product.create({
        name,
        category: category._id,
        price,
        unitOfMeasure,
        tax: tax ?? 5,
        description,
        image: image ?? 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=400&h=400&q=80',
        isVeg: isVeg ?? true,
        sendToKDS: sendToKDS ?? true,
      });

      return `Successfully created product "${prod.name}" in category "${categoryName}" priced at ₹${prod.price}.`;
    } catch (e: any) {
      return `Error creating product: ${e.message}`;
    }
  },
  {
    name: 'create_product',
    description: 'Creates a new product and associates it with a category (creates category if missing).',
    schema: z.object({
      name: z.string().describe('Product name, e.g., "Vanilla Frappe"'),
      categoryName: z.string().describe('Category name, e.g., "Iced & Cold Coffees"'),
      price: z.number().describe('Product base price in rupees'),
      unitOfMeasure: z.string().describe('e.g., "ml", "g", "Units"'),
      tax: z.number().optional().describe('Tax percentage (defaults to 5)'),
      description: z.string().optional().describe('Brief description of product flavor or ingredients'),
      image: z.string().optional().describe('Unsplash image URL'),
      isVeg: z.boolean().optional().describe('Defaults to true'),
      sendToKDS: z.boolean().optional().describe('Defaults to true'),
    }),
  }
);

const createCouponTool = tool(
  async ({ name, code, type, discountType, discountValue, minQty, minOrderAmount, active }) => {
    try {
      await dbConnect();
      const existing = await Coupon.findOne({ code: code.toUpperCase() });
      if (existing) {
        return `Coupon with code "${code.toUpperCase()}" already exists.`;
      }

      const coupon = await Coupon.create({
        name,
        code: code.toUpperCase(),
        type,
        discountType,
        discountValue,
        minQty: minQty ?? 1,
        minOrderAmount: minOrderAmount ?? 0,
        active: active ?? true,
      });

      return `Successfully created coupon "${coupon.name}" (Code: ${coupon.code}) with ${coupon.discountValue}${coupon.discountType === 'percent' ? '%' : ' rupees'} discount.`;
    } catch (e: any) {
      return `Error creating coupon: ${e.message}`;
    }
  },
  {
    name: 'create_coupon',
    description: 'Creates a discount coupon/promotion in the database.',
    schema: z.object({
      name: z.string().describe('Readable name, e.g. "Summer Special"'),
      code: z.string().describe('Unique uppercase code, e.g. "SUMMER50"'),
      type: z.enum(['coupon', 'automated-product', 'automated-order']).describe('Type of coupon'),
      discountType: z.enum(['percent', 'fixed']).describe('Percentage vs. fixed rupee amount'),
      discountValue: z.number().describe('Discount value'),
      minQty: z.number().optional().describe('Minimum item quantity required'),
      minOrderAmount: z.number().optional().describe('Minimum order value required'),
      active: z.boolean().optional().describe('Defaults to true'),
    }),
  }
);

const executeDatabaseActionTool = tool(
  async ({ modelName, operation, filter, update, options }) => {
    try {
      await dbConnect();
      
      const modelsMap: Record<string, any> = {
        Category,
        Coupon,
        Customer,
        Employee,
        Floor,
        Order,
        PaymentMethod,
        Product,
        ScheduledTask,
        Session,
        Settings,
        Table
      };

      const Model = modelsMap[modelName];
      if (!Model) {
        return `Error: Model "${modelName}" is not supported. Supported models: ${Object.keys(modelsMap).join(', ')}`;
      }

      const parsedFilter = filter ? (typeof filter === 'string' ? JSON.parse(filter) : filter) : {};
      const parsedUpdate = update ? (typeof update === 'string' ? JSON.parse(update) : update) : {};
      const parsedOptions = options ? (typeof options === 'string' ? JSON.parse(options) : options) : {};

      let queryResult;

      switch (operation) {
        case 'find': {
          let query = Model.find(parsedFilter);
          if (parsedOptions.sort) query = query.sort(parsedOptions.sort);
          if (parsedOptions.limit) query = query.limit(parsedOptions.limit);
          if (parsedOptions.populate) query = query.populate(parsedOptions.populate);
          queryResult = await query.lean();
          break;
        }
        case 'findOne': {
          let query = Model.findOne(parsedFilter);
          if (parsedOptions.populate) query = query.populate(parsedOptions.populate);
          queryResult = await query.lean();
          break;
        }
        case 'create': {
          queryResult = await Model.create(parsedUpdate);
          break;
        }
        case 'updateOne': {
          queryResult = await Model.findOneAndUpdate(parsedFilter, parsedUpdate, { new: true, runValidators: true }).lean();
          break;
        }
        case 'updateMany': {
          queryResult = await Model.updateMany(parsedFilter, parsedUpdate, { runValidators: true });
          break;
        }
        case 'deleteOne': {
          queryResult = await Model.deleteOne(parsedFilter);
          break;
        }
        case 'deleteMany': {
          queryResult = await Model.deleteMany(parsedFilter);
          break;
        }
        case 'countDocuments': {
          queryResult = await Model.countDocuments(parsedFilter);
          break;
        }
        case 'aggregate': {
          queryResult = await Model.aggregate(parsedFilter);
          break;
        }
        default: {
          return `Error: Operation "${operation}" is not supported.`;
        }
      }

      return JSON.stringify({ success: true, result: queryResult });
    } catch (e: any) {
      return JSON.stringify({ success: false, error: e.message });
    }
  },
  {
    name: 'execute_database_action',
    description: 'Executes CRUD operations and aggregations on Odoo Cafe database models. Used to view, create, edit, or delete products, categories, coupons, orders, users, floors, tables, and settings.',
    schema: z.object({
      modelName: z.enum([
        'Category', 'Coupon', 'Customer', 'Employee', 'Floor', 'Order', 
        'PaymentMethod', 'Product', 'ScheduledTask', 'Session', 'Settings', 'Table'
      ]).describe('The Mongoose model to query'),
      operation: z.enum([
        'find', 'findOne', 'create', 'updateOne', 'updateMany', 
        'deleteOne', 'deleteMany', 'countDocuments', 'aggregate'
      ]).describe('The Mongoose operation to run'),
      filter: z.any().optional().describe('Query filter object (or pipeline array for aggregate)'),
      update: z.any().optional().describe('Payload object to write/update (or document fields for create)'),
      options: z.object({
        sort: z.any().optional().describe('e.g., { createdAt: -1 }'),
        limit: z.number().optional().describe('Maximum number of documents to return'),
        populate: z.string().optional().describe('Fields to populate, e.g., "category"'),
      }).optional().describe('Additional options like sort, limit, or populate'),
    }),
  }
);

const scheduleTaskTool = tool(
  async ({ name, prompt, taskType, payload, executeAt, intervalDays, endAt }) => {
    try {
      await dbConnect();
      const task = await ScheduledTask.create({
        name,
        prompt,
        taskType,
        payload,
        executeAt: new Date(executeAt),
        intervalDays,
        endAt: endAt ? new Date(endAt) : undefined,
        status: 'pending',
      });
      return `Successfully scheduled background task "${task.name}". It is set to run at ${task.executeAt.toLocaleString()}.`;
    } catch (e: any) {
      return `Error scheduling task: ${e.message}`;
    }
  },
  {
    name: 'schedule_task',
    description: 'Schedules a single or recurring background task (e.g. upload/create a coupon every 15 days for 3 months).',
    schema: z.object({
      name: z.string().describe('Short name, e.g. "SUMMER50 Recurrent Creation"'),
      prompt: z.string().describe('The user prompt detail'),
      taskType: z.enum(['create-coupon', 'create-product', 'create-category', 'db-action']),
      payload: z.any().describe('The argument parameters required by the taskType creation tool (or dynamic parameters for db-action)'),
      executeAt: z.string().describe('ISO datetime string for first execution'),
      intervalDays: z.number().optional().describe('Interval in days for recurrence, e.g. 15'),
      endAt: z.string().optional().describe('ISO datetime string when the recurrence ends'),
    }),
  }
);

const tools = [getSystemMetadataTool, createCategoryTool, createProductTool, createCouponTool, executeDatabaseActionTool, scheduleTaskTool];
const toolNode = new ToolNode(tools);

// ─── LANGGRAPH STATE & WORKFLOW ──────────────────────────────────────────────

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

function getModel() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes('your_actual')) {
    throw new Error('GROQ_API_KEY is not configured in your .env.local file.');
  }

  const model = new ChatGroq({
    apiKey: apiKey,
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
  });

  return model.bindTools(tools);
}

async function callModel(state: typeof AgentState.State) {
  const modelWithTools = getModel();
  const response = await modelWithTools.invoke(state.messages);
  return { messages: [response] };
}

function shouldContinue(state: typeof AgentState.State) {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return 'tools';
  }
  return '__end__';
}

const workflow = new StateGraph(AgentState)
  .addNode('agent', callModel)
  .addNode('tools', toolNode)
  .addEdge('__start__', 'agent')
  .addConditionalEdges('agent', shouldContinue)
  .addEdge('tools', 'agent');

const app = workflow.compile();

// ─── SERVER ACTIONS FOR FRONTEND ─────────────────────────────────────────────

export async function askAgentAction(history: Array<{ role: 'user' | 'assistant'; content: string }>) {
  try {
    const messages = [
      new SystemMessage(
        `You are the Odoo Cafe AI Admin Assistant, equipped with full database access via the 'execute_database_action' tool.
        You are capable of performing ALL administrative, management, reporting, and operational tasks on Odoo Cafe.
        
        Always use 'get_system_metadata' first to understand active categories, product counts, coupons, current time, and timezone context.
        
        === DATABASE SCHEMAS (RAG CONTEXT) ===
        1. Category:
           - fields: name (string), color (hex code string)
        2. Product:
           - fields: name (string), category (ObjectId ref Category), price (number), unitOfMeasure (string), tax (number), description (string), image (string), isVeg (boolean), sendToKDS (boolean), archived (boolean)
        3. Coupon:
           - fields: name (string), code (uppercase string), type ('coupon' | 'automated-product' | 'automated-order'), discountType ('percent' | 'fixed'), discountValue (number), minQty (number), minOrderAmount (number), active (boolean)
        4. Employee:
           - fields: name (string), username (string), passwordHash (string), role ('admin' | 'cashier' | 'kitchen-staff'), status ('active' | 'disabled')
        5. PaymentMethod:
           - fields: name (string), type ('cash' | 'card' | 'upi'), upiId (string, required if type is upi), active (boolean)
        6. Settings:
           - fields: mobileOrderEnabled (boolean), mobileOrderMode ('online-ordering' | 'qr-menu'), mobileOrderBackgrounds (string[])
        7. Table:
           - fields: number (number), status ('available' | 'occupied' | 'reserved'), floor (ObjectId ref Floor), token (string)
        8. Floor:
           - fields: name (string), status ('active' | 'inactive')
        9. Order:
           - fields: orderNumber (string), table (ObjectId ref Table), customer (ObjectId ref Customer), items (array of { product (ObjectId), name, quantity, price }), subTotal, taxAmount, discountAmount, total, status ('pending' | 'preparing' | 'completed' | 'cancelled'), paymentStatus ('pending' | 'paid'), paymentMethod ('cash' | 'card' | 'upi'), isSelfOrder (boolean)

        === CAPABILITIES & INSTRUCTIONS ===
        - View/Read: To show categories, products, orders, coupons, settings, employees, tables etc., use 'execute_database_action' with operation 'find' or 'findOne'.
        - Create: Use 'execute_database_action' with operation 'create'. Remember to parse or link ObjectIds if referencing other models (e.g. category reference in Product).
        - Update: Use 'execute_database_action' with operation 'updateOne' or 'updateMany'. For example, if updating a product's price, filtering by { name: "Cappuccino" } and setting { price: 150 }.
        - Delete: Use 'execute_database_action' with operation 'deleteOne' or 'deleteMany'.
        - Statistics/Reporting: Use 'execute_database_action' with operation 'aggregate' or 'find' to compile sales reports, booking status, average values etc.
        - Scheduling: If the user asks to schedule any task or run it periodically, call 'schedule_task'.
          - For 'db-action' taskType, the payload should contain: { modelName, operation, filter, update, options }. This lets you schedule any future database write or edit!

        When answering, explain what you found or modified clearly, referencing the actual IDs and values returned by the tools. Provide a professional, helpful admin assistant response.`
      ),
      ...history.map(h => h.role === 'user' ? new HumanMessage(h.content) : new AIMessage(h.content))
    ];

    const result = await app.invoke({ messages });
    const lastMsg = result.messages[result.messages.length - 1];

    return {
      success: true,
      response: typeof lastMsg.content === 'string' ? lastMsg.content : lastMsg.content[0]?.toString() || '',
    };
  } catch (e: any) {
    return {
      success: false,
      error: e.message || 'Error communicating with AI Agent.',
    };
  }
}

export async function getScheduledTasksAction() {
  try {
    await dbConnect();
    const tasks = await ScheduledTask.find({}).sort({ executeAt: 1 }).lean();
    return { success: true, tasks: JSON.parse(JSON.stringify(tasks)) };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function runPendingTasksNowAction() {
  try {
    const { runTasks } = await import('./taskRunner');
    const logs = await runTasks();
    return { success: true, logs };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
