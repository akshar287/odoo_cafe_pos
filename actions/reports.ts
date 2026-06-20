'use server';

import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import '@/models/Product';
import '@/models/Table';
import '@/models/Customer';
import '@/models/Employee';
import '@/models/PaymentMethod';
import '@/models/Category';

export async function getReportDataAction(period: string) {
  try {
    await dbConnect();

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Previous period for comparison
    const periodMs = now.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - periodMs);
    const prevEnd = new Date(startDate);

    // Current period orders (paid only)
    const orders = await Order.find({ createdAt: { $gte: startDate }, status: 'paid' })
      .populate('items.product', 'name category')
      .populate('table', 'number')
      .populate('customer', 'name')
      .populate('employee', 'name')
      .populate('paymentMethod', 'name type')
      .sort({ total: -1 })
      .lean();

    // Previous period orders
    const prevOrders = await Order.find({ createdAt: { $gte: prevStart, $lt: prevEnd }, status: 'paid' }).lean();

    // KPIs
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const prevRevenue = prevOrders.reduce((sum, o) => sum + (o as any).total, 0);
    const prevCount = prevOrders.length;

    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const ordersChange = prevCount > 0 ? ((totalOrders - prevCount) / prevCount) * 100 : 0;

    // Sales over time (hourly for today, daily otherwise)
    const salesMap: Record<string, number> = {};
    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      const key = period === 'today'
        ? `${d.getHours()}:00`
        : period === 'year'
        ? d.toLocaleString('en-IN', { month: 'short' })
        : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      salesMap[key] = (salesMap[key] || 0) + o.total;
    });

    // Top orders (already sorted by total desc)
    const topOrders = orders.slice(0, 10).map(o => ({
      _id: o._id.toString(),
      orderNumber: o.orderNumber,
      table: (o.table as any)?.number || 'N/A',
      customer: (o.customer as any)?.name || 'Walk-in',
      employee: (o.employee as any)?.name || 'Staff',
      paymentMethod: (o.paymentMethod as any)?.name || 'N/A',
      total: o.total,
      createdAt: o.createdAt,
    }));

    // Top products
    const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    orders.forEach(o => {
      o.items.forEach((item: any) => {
        const pid = item.product?._id?.toString() || 'unknown';
        const name = item.product?.name || 'Unknown';
        if (!productMap[pid]) productMap[pid] = { name, qty: 0, revenue: 0 };
        productMap[pid].qty += item.qty;
        productMap[pid].revenue += item.price * item.qty;
      });
    });
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    // Top categories (by revenue)
    const catMap: Record<string, { name: string; revenue: number }> = {};
    // Need to populate category through product
    const ordersWithCat = await Order.find({ createdAt: { $gte: startDate }, status: 'paid' })
      .populate({ path: 'items.product', populate: { path: 'category', select: 'name color' } })
      .lean();
    ordersWithCat.forEach((o: any) => {
      o.items.forEach((item: any) => {
        const cat = item.product?.category;
        if (!cat) return;
        const cid = cat._id?.toString() || 'unknown';
        if (!catMap[cid]) catMap[cid] = { name: cat.name, revenue: 0 };
        catMap[cid].revenue += item.price * item.qty;
      });
    });
    const topCategories = Object.values(catMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    return JSON.parse(JSON.stringify({
      kpis: { totalOrders, totalRevenue, avgOrder, revenueChange, ordersChange },
      salesChart: salesMap,
      topOrders,
      topProducts,
      topCategories,
    }));
  } catch (err: any) {
    console.error('getReportDataAction error:', err.message || err);
    return {
      kpis: { totalOrders: 0, totalRevenue: 0, avgOrder: 0, revenueChange: 0, ordersChange: 0 },
      salesChart: {},
      topOrders: [],
      topProducts: [],
      topCategories: [],
    };
  }
}
