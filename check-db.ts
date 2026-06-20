import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function checkData() {
  const { default: dbConnect } = await import('./lib/db');
  const { default: Table } = await import('./models/Table');
  const { default: Order } = await import('./models/Order');
  
  await dbConnect();
  
  const tables = await Table.find({});
  console.log("Tables:");
  tables.forEach(t => console.log(`- ${t.number}: ${t.status}`));

  const orders = await Order.find({ status: 'draft' }).populate('table').sort({ createdAt: -1 }).limit(5);
  console.log("\nRecent Draft Orders:");
  orders.forEach(o => console.log(`- ${o.orderNumber}: Table ${(o.table as any)?.number}, Items: ${o.items.length}`));
  
  process.exit(0);
}

checkData().catch(err => {
  console.error(err);
  process.exit(1);
});
