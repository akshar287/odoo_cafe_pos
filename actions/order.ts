'use server';

import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Table from '@/models/Table';
import Customer from '@/models/Customer';
import Employee from '@/models/Employee';
import Product from '@/models/Product';
import Session from '@/models/Session';
import { getOrCreateCurrentEmployee } from './session';
import { revalidatePath } from 'next/cache';
import { publishKdsUpdate, publishTableUpdate } from '@/lib/realtime';

export async function getCustomers(search = '') {
  try {
    await dbConnect();
    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const customers = await Customer.find(query).limit(10).lean();
    return JSON.parse(JSON.stringify(customers));
  } catch (err) {
    console.error('getCustomers error:', err);
    return [];
  }
}

export async function createCustomerAction(data: { name: string; email?: string; phone?: string }) {
  try {
    await dbConnect();
    const customer = await Customer.create({
      name: data.name,
      email: data.email || undefined,
      phone: data.phone || undefined,
    });
    return { success: true, customer: JSON.parse(JSON.stringify(customer)) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create customer' };
  }
}

export interface SubmitOrderInput {
  tableId: string;
  customerId?: string;
  items: Array<{
    productId: string;
    qty: number;
    price: number;
    discount: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'draft' | 'paid' | 'cancelled';
  paymentMethodId?: string;
  source: 'pos' | 'self-order';
}

export async function createOrderAction(input: SubmitOrderInput) {
  try {
    await dbConnect();
    const employee = await getOrCreateCurrentEmployee();

    // Generate unique order number: CAFE-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await Order.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    });
    const seq = String(count + 1).padStart(4, '0');
    const orderNumber = `CAFE-${dateStr}-${seq}`;

    // Map items
    const items = input.items.map((item) => ({
      product: item.productId,
      qty: item.qty,
      price: item.price,
      discount: item.discount,
    }));

    const orderData: any = {
      orderNumber,
      table: input.tableId,
      customer: input.customerId || undefined,
      employee: employee._id,
      items,
      subtotal: input.subtotal,
      tax: input.tax,
      discount: input.discount,
      total: input.total,
      status: input.status,
      paymentMethod: input.paymentMethodId || undefined,
      source: input.source,
      kdsStatus: (input.status === 'paid' || input.status === 'draft') ? 'to-cook' : 'none',
    };

    const order = await Order.create(orderData);
    
    // Fetch populated order for KDS
    const populatedOrder = await Order.findById(order._id)
      .populate('table', 'number')
      .populate('items.product', 'name sendToKDS')
      .lean();

    // Update table status: always occupied when an order is placed (until kitchen completes it)
    if (input.tableId) {
      await Table.findByIdAndUpdate(input.tableId, { status: 'occupied' });
    }

    revalidatePath('/pos');
    
    // Trigger Pusher updates
    const orderJson = JSON.parse(JSON.stringify(populatedOrder));
    if (orderJson.kdsStatus === 'to-cook') {
      await publishKdsUpdate('new-order', orderJson);
    }
    await publishTableUpdate(input.tableId, 'order-updated', orderJson);

    return { success: true, order: orderJson };
  } catch (err: any) {
    console.error('createOrderAction error:', err);
    return { success: false, error: err.message || 'Failed to submit order' };
  }
}

export async function sendToKitchenAction(orderId: string) {
  try {
    await dbConnect();
    const order = await Order.findByIdAndUpdate(
      orderId,
      { kdsStatus: 'to-cook' },
      { new: true }
    )
      .populate('table', 'number')
      .populate('items.product', 'name sendToKDS')
      .lean();

    revalidatePath('/pos');
    revalidatePath('/kds');
    const orderJson = JSON.parse(JSON.stringify(order));
    await publishKdsUpdate('new-order', orderJson);
    
    return { success: true, order: orderJson };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to route to kitchen' };
  }
}

export async function getActiveOrdersForTable(tableId: string) {
  try {
    await dbConnect();
    // Return the latest draft order for this table, if any
    const order = await Order.findOne({ table: tableId, status: 'draft' })
      .populate('items.product')
      .populate('customer')
      .lean();

    return JSON.parse(JSON.stringify(order));
  } catch (err) {
    console.error('getActiveOrdersForTable error:', err);
    return null;
  }
}

export async function createSelfOrderAction(input: Omit<SubmitOrderInput, 'tableId'> & { tableId?: string }) {
  try {
    await dbConnect();

    // Generate unique order number: CAFE-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await Order.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    });
    const seq = String(count + 1).padStart(4, '0');
    const orderNumber = `CAFE-${dateStr}-${seq}`;

    // Map items
    const items = input.items.map((item) => ({
      product: item.productId,
      qty: item.qty,
      price: item.price,
      discount: item.discount,
    }));

    const orderData: any = {
      orderNumber,
      table: input.tableId || undefined,
      items,
      subtotal: input.subtotal,
      tax: input.tax,
      discount: input.discount,
      total: input.total,
      status: 'paid', // Self-orders are considered paid or at least sent directly to kitchen
      source: 'self-order',
      kdsStatus: 'to-cook',
    };

    const order = await Order.create(orderData);

    revalidatePath('/pos');
    revalidatePath('/kds');
    
    // Trigger Pusher updates
    const orderJson = JSON.parse(JSON.stringify(order));
    await publishKdsUpdate('new-order', orderJson);

    return { success: true, order: orderJson };
  } catch (err: any) {
    console.error('createSelfOrderAction error:', err);
    return { success: false, error: err.message || 'Failed to submit self-order' };
  }
}

export async function getSessionOrdersAction(search = '') {
  try {
    await dbConnect();
    const session = await Session.findOne({ status: 'open' }).lean();
    const query: any = {};
    if (session) {
      query.createdAt = { $gte: (session as any).openedAt };
    }
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
      ];
    }
    let orders = await Order.find(query)
      .populate('customer', 'name')
      .populate('table', 'number')
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 })
      .lean();

    // If search, also filter by customer name (after population)
    if (search) {
      const lower = search.toLowerCase();
      orders = orders.filter((o: any) =>
        (o.orderNumber || '').toLowerCase().includes(lower) ||
        (o.customer?.name || '').toLowerCase().includes(lower) ||
        new Date(o.createdAt).toLocaleDateString().includes(lower)
      );
    }
    return JSON.parse(JSON.stringify(orders));
  } catch (err: any) {
    console.error('getSessionOrdersAction error:', err);
    require('fs').writeFileSync('c:/Users/Akshar/Desktop/odoo_cafe/order-error.log', String(err.stack || err));
    return [];
  }
}

export async function deleteOrderAction(orderId: string) {
  try {
    await dbConnect();
    const order = await Order.findById(orderId).lean() as any;
    if (!order) return { success: false, error: 'Order not found' };
    if (order.status !== 'draft') return { success: false, error: 'Only draft orders can be deleted' };
    await Order.findByIdAndDelete(orderId);
    // Free the table if it was this order's table
    if (order.table) {
      const remaining = await Order.findOne({ table: order.table, status: 'draft' });
      if (!remaining) {
        await Table.findByIdAndUpdate(order.table, { status: 'available' });
      }
    }
    revalidatePath('/pos');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete order' };
  }
}

export async function getTableActiveCustomerAction(tableId: string) {
  try {
    await dbConnect();
    const order = await Order.findOne({ table: tableId, status: 'draft' })
      .populate('customer', 'name phone email')
      .populate('employee', 'name username')
      .populate('items.product', 'name price')
      .lean() as any;
    if (!order) return null;
    return JSON.parse(JSON.stringify(order));
  } catch (err) {
    return null;
  }
}

export async function getOrdersByIds(ids: string[]) {
  try {
    await dbConnect();
    const orders = await Order.find({ _id: { $in: ids } })
      .select('_id orderNumber status total createdAt')
      .sort({ createdAt: -1 })
      .lean();
    return JSON.parse(JSON.stringify(orders));
  } catch (err) {
    console.error('getOrdersByIds error:', err);
    return [];
  }
}
