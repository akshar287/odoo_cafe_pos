import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function checkData() {
  const { default: dbConnect } = await import('./lib/db');
  const { default: Session } = await import('./models/Session');
  const { default: Order } = await import('./models/Order');

  await dbConnect();
  
  const session = await Session.findOne({ status: 'open' }).lean();
  console.log("Current Open Session:", session);

  const orders = await Order.find({}).sort({ createdAt: -1 }).limit(5).lean();
  console.log("\nRecent 5 Orders:");
  orders.forEach((o: any) => console.log(`- ${o.orderNumber}: status=${o.status}, kdsStatus=${o.kdsStatus}, createdAt=${o.createdAt}`));
  
  if (session) {
    const sessionOrders = await Order.find({ createdAt: { $gte: (session as any).openedAt } }).lean();
    console.log(`\nOrders since session opened (${(session as any).openedAt}):`, sessionOrders.length);
  }

  process.exit(0);
}

checkData().catch(err => {
  console.error(err);
  process.exit(1);
});
