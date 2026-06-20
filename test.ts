require('dotenv').config({path: '.env.local'});
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Session = require('./models/Session').default;
  const Order = require('./models/Order').default;
  require('./models/Customer');
  require('./models/Table');
  require('./models/Product');
  require('./models/Employee');

  const session = await Session.findOne({ status: 'open' }).lean();
  console.log('Session', session);

  const query = {};
  if (session) {
    query.createdAt = { $gte: session.openedAt };
  }

  try {
    const orders = await Order.find(query)
      .populate('customer', 'name')
      .populate('table', 'number')
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 })
      .lean();
    console.log('Found orders:', orders.length);
  } catch (e) {
    console.error('Error:', e);
  }
  mongoose.disconnect();
});
