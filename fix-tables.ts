import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });


async function fixStuckTables() {
  const { default: dbConnect } = await import('./lib/db');
  const { default: Table } = await import('./models/Table');
  const { default: Order } = await import('./models/Order');

  await dbConnect();
  
  const tables = await Table.find({ status: 'occupied' });
  console.log(`Found ${tables.length} occupied tables.`);
  
  let fixedCount = 0;
  for (const table of tables) {
    const draftOrder = await Order.findOne({ table: table._id, status: 'draft' });
    if (!draftOrder) {
      console.log(`Table ${table.number} (${table._id}) has no draft order. Marking as available...`);
      table.status = 'available';
      await table.save();
      fixedCount++;
    }
  }
  
  console.log(`Fixed ${fixedCount} stuck tables.`);
  process.exit(0);
}

fixStuckTables().catch(err => {
  console.error(err);
  process.exit(1);
});
