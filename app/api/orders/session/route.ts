import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Session from '@/models/Session';

export async function GET() {
  try {
    await dbConnect();
    
    // Find open session
    const session = await Session.findOne({ status: 'open' }).lean();
    if (!session) {
      return NextResponse.json({ success: true, orders: [] });
    }

    // Get orders created during this session
    const orders = await Order.find({ createdAt: { $gte: session.openedAt } })
      .populate('table', 'number')
      .populate('customer', 'name phone')
      .populate('items.product', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, orders });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
