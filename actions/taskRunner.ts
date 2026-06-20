import dbConnect from '@/lib/db';
import ScheduledTask from '@/models/ScheduledTask';
import Category from '@/models/Category';
import Product from '@/models/Product';
import Coupon from '@/models/Coupon';

export async function runTasks(): Promise<string[]> {
  const executionLogs: string[] = [];
  try {
    await dbConnect();
    const now = new Date();
    
    // Find pending tasks that are due
    const tasks = await ScheduledTask.find({
      status: 'pending',
      executeAt: { $lte: now }
    }).sort({ executeAt: 1 });

    if (tasks.length === 0) {
      return ['No pending tasks due for execution.'];
    }

    for (const task of tasks) {
      executionLogs.push(`Executing task "${task.name}" (ID: ${task._id})...`);
      let logOutput = '';
      let success = false;

      try {
        if (task.taskType === 'create-category') {
          const existing = await Category.findOne({ name: task.payload.name });
          if (existing) {
            logOutput = `Category "${task.payload.name}" already exists. Skipping creation.`;
          } else {
            const cat = await Category.create(task.payload);
            logOutput = `Created category "${cat.name}" with color "${cat.color}".`;
          }
          success = true;
        } else if (task.taskType === 'create-product') {
          let category = await Category.findOne({ name: task.payload.categoryName });
          if (!category) {
            category = await Category.create({ name: task.payload.categoryName, color: '#f97316' });
            executionLogs.push(`Category "${task.payload.categoryName}" missing. Created default.`);
          }

          const prod = await Product.create({
            ...task.payload,
            category: category._id,
            image: task.payload.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=400&h=400&q=80',
          });
          logOutput = `Created product "${prod.name}" in category "${task.payload.categoryName}" priced at ₹${prod.price}.`;
          success = true;
        } else if (task.taskType === 'create-coupon') {
          const codeUpper = task.payload.code.toUpperCase();
          const existing = await Coupon.findOne({ code: codeUpper });
          if (existing) {
            logOutput = `Coupon code "${codeUpper}" already exists. Skipping creation.`;
          } else {
            const coupon = await Coupon.create({
              ...task.payload,
              code: codeUpper,
            });
            logOutput = `Created coupon "${coupon.name}" (Code: ${coupon.code}) with value ${coupon.discountValue}.`;
          }
          success = true;
        } else if (task.taskType === 'db-action') {
          const { modelName, operation, filter, update, options } = task.payload;

          const modelsMap: Record<string, any> = {
            Category: (await import('@/models/Category')).default,
            Coupon: (await import('@/models/Coupon')).default,
            Customer: (await import('@/models/Customer')).default,
            Employee: (await import('@/models/Employee')).default,
            Floor: (await import('@/models/Floor')).default,
            Order: (await import('@/models/Order')).default,
            PaymentMethod: (await import('@/models/PaymentMethod')).default,
            Product: (await import('@/models/Product')).default,
            ScheduledTask: (await import('@/models/ScheduledTask')).default,
            Session: (await import('@/models/Session')).default,
            Settings: (await import('@/models/Settings')).default,
            Table: (await import('@/models/Table')).default
          };

          const Model = modelsMap[modelName];
          if (!Model) {
            logOutput = `Error: Model "${modelName}" is not supported.`;
          } else {
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
              default:
                throw new Error(`Unsupported operation: ${operation}`);
            }
            logOutput = `Executed ${operation} on ${modelName}. Result: ${JSON.stringify(queryResult)}`;
            success = true;
          }
        } else {
          logOutput = `Unknown task type: ${task.taskType}`;
        }
      } catch (err: any) {
        logOutput = `Error executing action: ${err.message}`;
      }

      // Update current task status
      task.status = success ? 'completed' : 'failed';
      task.logs = logOutput;
      await task.save();
      executionLogs.push(`Task status: ${task.status}. Log: ${logOutput}`);

      // Handle recurrence
      if (success && task.intervalDays) {
        const nextExecuteAt = new Date(task.executeAt.getTime() + task.intervalDays * 24 * 60 * 60 * 1000);
        
        // Schedule next occurrence if endAt is not reached
        if (!task.endAt || nextExecuteAt <= task.endAt) {
          const nextTask = await ScheduledTask.create({
            name: task.name,
            prompt: task.prompt,
            taskType: task.taskType,
            payload: task.payload,
            executeAt: nextExecuteAt,
            intervalDays: task.intervalDays,
            endAt: task.endAt,
            status: 'pending',
          });
          executionLogs.push(`Scheduled next recurrence of "${task.name}" at ${nextTask.executeAt.toLocaleString()}.`);
        } else {
          executionLogs.push(`Recurrence end date reached for "${task.name}". Stopping recurrence.`);
        }
      }
    }
  } catch (e: any) {
    executionLogs.push(`Runner error: ${e.message}`);
  }

  return executionLogs;
}
