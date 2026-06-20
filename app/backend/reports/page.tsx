'use client';

import React, { useState, useEffect, useCallback } from 'react';
import BackendHeader from '@/components/BackendHeader';
import { getReportDataAction } from '@/actions/reports';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  IndianRupee,
  BarChart3,
  Download,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const PERIOD_OPTIONS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
];

const CATEGORY_COLORS = [
  '#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#eab308', '#06b6d4', '#ec4899',
];

interface KPIs {
  totalOrders: number;
  totalRevenue: number;
  avgOrder: number;
  revenueChange: number;
  ordersChange: number;
}

interface TopOrder {
  _id: string;
  orderNumber: string;
  table: string;
  customer: string;
  employee: string;
  paymentMethod: string;
  total: number;
  createdAt: string;
}

interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
}

interface TopCategory {
  name: string;
  revenue: number;
}

interface ReportData {
  kpis: KPIs;
  salesChart: Record<string, number>;
  topOrders: TopOrder[];
  topProducts: TopProduct[];
  topCategories: TopCategory[];
}

function ChangeChip({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${positive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
      {positive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {Math.abs(value).toFixed(1)}% vs last period
    </span>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState('today');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: string) => {
    setLoading(true);
    const result = await getReportDataAction(p);
    setData(result as ReportData);
    setLoading(false);
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ['Order #', 'Table', 'Customer', 'Employee', 'Payment', 'Total', 'Date'],
      ...data.topOrders.map(o => [o.orderNumber, `T-${o.table}`, o.customer, o.employee, o.paymentMethod, `${o.total.toFixed(2)}`, new Date(o.createdAt).toLocaleString('en-IN')]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${period}-${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const salesLabels = data ? Object.keys(data.salesChart) : [];
  const salesValues = data ? Object.values(data.salesChart) : [];

  const lineData = {
    labels: salesLabels,
    datasets: [{
      label: 'Revenue (₹)',
      data: salesValues,
      fill: true,
      tension: 0.4,
      borderColor: '#f97316',
      backgroundColor: 'rgba(249,115,22,0.10)',
      pointBackgroundColor: '#f97316',
      pointRadius: 4,
      pointHoverRadius: 6,
    }],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: { raw: unknown }) => `₹${Number(c.raw).toFixed(2)}` } } },
    scales: {
      x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 } } },
      y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 }, callback: (v: string | number) => `₹${v}` } },
    },
  };

  const catLabels = data?.topCategories.map(c => c.name) || [];
  const catValues = data?.topCategories.map(c => c.revenue) || [];
  const catTotal = catValues.reduce((a, b) => a + b, 0);

  const donutData = {
    labels: catLabels,
    datasets: [{
      data: catValues,
      backgroundColor: CATEGORY_COLORS.slice(0, catLabels.length),
      borderWidth: 2,
      borderColor: 'transparent',
      hoverOffset: 8,
    }],
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c: { label: string; raw: number }) => `${c.label}: ₹${c.raw.toFixed(2)} (${catTotal > 0 ? ((c.raw / catTotal) * 100).toFixed(1) : 0}%)` } },
    },
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <BackendHeader title="Reports & Analytics" />

      <div className="p-6 flex flex-col gap-6 max-w-7xl w-full mx-auto">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-xl">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${period === opt.value ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Calendar className="h-3 w-3" />
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => load(period)} className="flex items-center gap-2 px-4 py-2.5 border border-border bg-card hover:bg-muted text-sm font-bold rounded-xl transition-colors cursor-pointer">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors cursor-pointer">
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-semibold text-muted-foreground">Loading analytics...</span>
            </div>
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-muted-foreground">Failed to load report data.</div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Orders */}
              <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Orders</span>
                  <div className="h-9 w-9 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="h-4.5 w-4.5 text-blue-500" />
                  </div>
                </div>
                <span className="text-4xl font-black text-foreground">{data.kpis.totalOrders}</span>
                <ChangeChip value={data.kpis.ordersChange} />
              </div>

              {/* Revenue */}
              <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Revenue</span>
                  <div className="h-9 w-9 bg-primary/10 rounded-xl flex items-center justify-center">
                    <IndianRupee className="h-4.5 w-4.5 text-primary" />
                  </div>
                </div>
                <span className="text-4xl font-black text-foreground">₹{data.kpis.totalRevenue.toFixed(0)}</span>
                <ChangeChip value={data.kpis.revenueChange} />
              </div>

              {/* Avg Order Value */}
              <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Avg. Order Value</span>
                  <div className="h-9 w-9 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                    <BarChart3 className="h-4.5 w-4.5 text-green-500" />
                  </div>
                </div>
                <span className="text-4xl font-black text-foreground">₹{data.kpis.avgOrder.toFixed(0)}</span>
                <span className="text-[10px] text-muted-foreground font-semibold">Per paid order</span>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Sales Line Chart */}
              <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-foreground mb-4">Sales Over Time</h3>
                {salesLabels.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No sales data for this period.</div>
                ) : (
                  <div className="h-52">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Line data={lineData} options={lineOptions as any} />
                  </div>
                )}
              </div>

              {/* Category Donut */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-foreground mb-4">Top Selling Categories</h3>
                {catLabels.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No category data.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="h-40 relative">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <Doughnut data={donutData} options={donutOptions as any} />
                    </div>
                    <div className="flex flex-col gap-1.5 mt-1">
                      {catLabels.map((label, i) => (
                        <div key={label} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[i] }} />
                            <span className="font-semibold text-foreground truncate max-w-[100px]">{label}</span>
                          </div>
                          <span className="font-bold text-muted-foreground">
                            {catTotal > 0 ? ((catValues[i] / catTotal) * 100).toFixed(0) : 0}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top Orders Table */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Top Orders</h3>
                <span className="text-xs text-muted-foreground font-semibold">Highest value orders in period</span>
              </div>
              <div className="overflow-x-auto">
                {data.topOrders.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">No orders in this period.</div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border">
                        <th className="px-5 py-3">Order</th>
                        <th className="px-5 py-3">Table</th>
                        <th className="px-5 py-3">Customer</th>
                        <th className="px-5 py-3">Employee</th>
                        <th className="px-5 py-3">Payment</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.topOrders.map((order) => (
                        <tr key={order._id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3.5 font-black text-primary text-xs">{order.orderNumber}</td>
                          <td className="px-5 py-3.5 text-muted-foreground font-semibold">T-{order.table}</td>
                          <td className="px-5 py-3.5 font-semibold text-foreground">{order.customer}</td>
                          <td className="px-5 py-3.5 text-muted-foreground">{order.employee}</td>
                          <td className="px-5 py-3.5">
                            <span className="bg-muted px-2 py-1 rounded-lg text-xs font-bold text-foreground capitalize">{order.paymentMethod}</span>
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground text-xs">
                            {new Date(order.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-5 py-3.5 text-right font-black text-primary">₹{order.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Top Products & Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top Products */}
              <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h3 className="text-sm font-bold text-foreground">Top Products</h3>
                </div>
                {data.topProducts.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">No product data.</div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border">
                        <th className="px-5 py-3">Product</th>
                        <th className="px-5 py-3 text-center">Qty Sold</th>
                        <th className="px-5 py-3 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.topProducts.map((p, i) => (
                        <tr key={i} className="hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                              <span className="font-semibold text-foreground">{p.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center font-bold text-muted-foreground">{p.qty}</td>
                          <td className="px-5 py-3 text-right font-black text-primary">₹{p.revenue.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Top Categories */}
              <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h3 className="text-sm font-bold text-foreground">Top Categories</h3>
                </div>
                {data.topCategories.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">No category data.</div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border">
                        <th className="px-5 py-3">Category</th>
                        <th className="px-5 py-3 text-right">Revenue</th>
                        <th className="px-5 py-3 text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.topCategories.map((c, i) => {
                        const allRev = data.topCategories.reduce((s, x) => s + x.revenue, 0);
                        return (
                          <tr key={i} className="hover:bg-muted/20 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[i] }} />
                                <span className="font-semibold text-foreground">{c.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-right font-black text-primary">₹{c.revenue.toFixed(2)}</td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${allRev > 0 ? (c.revenue / allRev) * 100 : 0}%`, backgroundColor: CATEGORY_COLORS[i] }} />
                                </div>
                                <span className="text-xs font-bold text-muted-foreground w-8 text-right">
                                  {allRev > 0 ? ((c.revenue / allRev) * 100).toFixed(0) : 0}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
