'use server';

import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Table from '@/models/Table';
import Customer from '@/models/Customer';
import Employee from '@/models/Employee';
import Product from '@/models/Product';
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
    return await Customer.find(query).limit(10).lean();
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
      kdsStatus: input.status === 'paid' ? 'to-cook' : 'none',
    };

    const order = await Order.create(orderData);

    // Update table status: occupied if draft, available if paid (since payment clears the table)
    const nextTableStatus = input.status === 'paid' ? 'available' : 'occupied';
    await Table.findByIdAndUpdate(input.tableId, { status: nextTableStatus });

    revalidatePath('/pos');
    
    // Trigger Pusher updates
    const orderJson = JSON.parse(JSON.stringify(order));
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
    );
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
