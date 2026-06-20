import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import { publishKdsUpdate, publishTableUpdate } from '@/lib/realtime';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    const order = await Order.findByIdAndUpdate(id, body, { new: true })
      .populate('table', 'number')
      .populate('items.product', 'name sendToKDS')
      .lean();

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // Publish to pusher
    const orderJson = JSON.parse(JSON.stringify(order));
    await publishKdsUpdate('update-order', orderJson);
    
    // Publish table update for self-ordering / customer facing display
    if (orderJson.table?._id) {
      await publishTableUpdate(orderJson.table._id, 'order-updated', orderJson);
      
      // If the order is now completed, check if the table has any other active orders. If not, set table to available.
      if (orderJson.kdsStatus === 'completed') {
        const activeOrders = await Order.countDocuments({
          table: orderJson.table._id,
          kdsStatus: { $in: ['to-cook', 'preparing'] }
        });
        
        if (activeOrders === 0) {
          const Table = (await import('@/models/Table')).default;
          await Table.findByIdAndUpdate(orderJson.table._id, { status: 'available' });
        }
      }
    }

    return NextResponse.json({ success: true, order: orderJson });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
