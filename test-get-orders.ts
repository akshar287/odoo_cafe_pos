import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function run() {
  const { default: dbConnect } = await import('./lib/db');
  const { default: Session } = await import('./models/Session');
  const { default: Order } = await import('./models/Order');
  const { default: Customer } = await import('./models/Customer');
  const { default: Employee } = await import('./models/Employee');
  const { default: Product } = await import('./models/Product');
  const { default: Table } = await import('./models/Table');

  try {
    await dbConnect();
    const session = await Session.findOne({ status: 'open' }).lean();
    const query: any = {};
    if (session) {
      query.createdAt = { $gte: (session as any).openedAt };
    }
    
    let orders = await Order.find(query)
      .populate('customer', 'name')
      .populate('table', 'number')
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 })
      .lean();
      
    console.log("Success! Found orders:", orders.length);
  } catch (err: any) {
    console.error("ERROR:", err.stack || err);
  }
  process.exit(0);
}
run();
