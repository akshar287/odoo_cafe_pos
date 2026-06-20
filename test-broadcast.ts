import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const { broadcastCartUpdateAction } = await import('./actions/realtime');
  const { default: dbConnect } = await import('./lib/db');
  await dbConnect();
  
  const { default: Table } = await import('./models/Table');
  const { default: Product } = await import('./models/Product');
  
  const table = await Table.findOne({});
  const product = await Product.findOne({});
  
  if (!table || !product) {
    console.log("No table or product found");
    return;
  }
  
  const fakeCartData = {
    items: [
      { productId: product._id.toString(), qty: 1, price: 100, discount: 0 }
    ],
    subtotal: 100,
    tax: 5,
    discount: 0,
    total: 105
  };
  
  const res = await broadcastCartUpdateAction(table._id.toString(), fakeCartData);
  console.log("Result:", res);
}

run().catch(console.error).finally(() => process.exit(0));
