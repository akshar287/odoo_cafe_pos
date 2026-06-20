import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Session from '@/models/Session';

export async function GET() {
  try {
    await dbConnect();
    
    // In a real cafe, we want tickets for the current day or current open session.
    // We'll fetch orders from the open session that are not 'none' kdsStatus
    const session = await Session.findOne({ status: 'open' }).lean();
    let query: Record<string, unknown> = { kdsStatus: { $in: ['to-cook', 'preparing', 'completed'] } };

    if (session) {
      // Show tickets from this session, plus any incomplete ones from recently
      query = {
        kdsStatus: { $ne: 'none' },
        $or: [
          { createdAt: { $gte: session.openedAt } },
          { kdsStatus: { $in: ['to-cook', 'preparing'] } } // Bring forward uncompleted
        ]
      };
    }

    const orders = await Order.find(query)
      .populate('table', 'number')
      .populate('items.product', 'name sendToKDS')
      .sort({ createdAt: 1 })
      .lean();

    // Filter out items that are NOT sendToKDS
    // Assuming schema is relaxed, or we can just send all if 'sendToKDS' is not strictly enforced
    const filteredOrders = orders.map(o => {
      return {
        ...o,
        items: o.items.filter(i => {
          // If the product doesn't exist, ignore
          if (!i.product) return false;
          // If schema has sendToKDS, enforce it. Otherwise include.
          return (i.product as { sendToKDS?: boolean }).sendToKDS !== false;
        })
      };
    }).filter(o => o.items.length > 0);

    return NextResponse.json({ success: true, orders: filteredOrders });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
