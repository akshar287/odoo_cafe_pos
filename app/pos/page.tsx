'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { logoutAction } from '@/actions/auth';
import {
  Coffee,
  Play,
  Settings,
  Tv,
  Coins,
  LogOut,
  Users,
  Map,
  ClipboardList,
  Search,
  X,
  Trash2,
  Edit2,
  ChevronRight,
  Clock,
  IndianRupee,
  TableProperties,
  CheckCircle2,
} from 'lucide-react';
import { getCurrentSession, openSessionAction, getLastSessionStats } from '@/actions/session';
import { getFloorsAndTables } from '@/actions/booking';
import {
  getSessionOrdersAction,
  deleteOrderAction,
  getTableActiveCustomerAction,
} from '@/actions/order';

interface Floor { _id: string; name: string; }
interface Table { _id: string; number: string; seats: number; active: boolean; status: string; floor?: Floor; }
interface Sess { _id: string; openedBy: { name: string }; }

interface OrderItem { product: { _id: string; name: string; price: number } | null; qty: number; price: number; discount: number; }
interface Order {
  _id: string;
  orderNumber: string;
  customer?: { name: string } | null;
  table?: { number: string } | null;
  items: OrderItem[];
  total: number;
  status: 'draft' | 'paid' | 'cancelled';
  createdAt: string;
}

type View = 'tables' | 'orders';

export default function PosPage() {
  const router = useRouter();

  // Session states
  const [activeSession, setActiveSession] = useState<Sess | null>(null);
  const [lastStats, setLastStats] = useState({ lastClosedAt: null, lastSellAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [openingBalance, setOpeningBalance] = useState('2000');
  const [openingError, setOpeningError] = useState('');

  // Floor / Table states
  const [floors, setFloors] = useState<Floor[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [activeFloorId, setActiveFloorId] = useState<string>('');

  // View toggle
  const [currentView, setCurrentView] = useState<View>('tables');

  // Orders panel states
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Table Customer Detail panel
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [tableCustomerOrder, setTableCustomerOrder] = useState<Order | null>(null);
  const [tableDetailLoading, setTableDetailLoading] = useState(false);

  const initData = async () => {
    setLoading(true);
    const session = await getCurrentSession();
    setActiveSession(session);
    if (!session) {
      const stats = await getLastSessionStats();
      setLastStats(stats);
    } else {
      const layout = await getFloorsAndTables();
      setFloors(layout.floors);
      setTables(layout.tables);
      if (layout.floors.length > 0) {
        setActiveFloorId(layout.floors[0]._id);
      }
    }
    setLoading(false);
  };

  const loadOrders = useCallback(async (search = '') => {
    setOrdersLoading(true);
    const data = await getSessionOrdersAction(search);
    setOrders(data);
    setOrdersLoading(false);
  }, []);

  useEffect(() => { initData(); }, []);

  useEffect(() => {
    if (currentView === 'orders' && activeSession) {
      loadOrders(orderSearch);
    }
  }, [currentView, activeSession, loadOrders, orderSearch]);

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpeningError('');
    const amt = parseFloat(openingBalance);
    if (isNaN(amt) || amt < 0) { setOpeningError('Starting cash must be a valid positive amount.'); return; }
    const res = await openSessionAction(amt);
    if (res.success) { initData(); } else { setOpeningError(res.error || 'Failed to open session.'); }
  };

  const handleSelectTable = (table: Table) => {
    if (!table.active) return;
    router.push(`/pos/order/${table._id}`);
  };

  const handleTableClick = async (table: Table) => {
    if (!table.active) return;
    // If occupied, show customer detail panel; otherwise navigate to order
    if (table.status === 'occupied') {
      setSelectedTable(table);
      setTableDetailLoading(true);
      const order = await getTableActiveCustomerAction(table._id);
      setTableCustomerOrder(order);
      setTableDetailLoading(false);
    } else {
      handleSelectTable(table);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this draft order?')) return;
    const res = await deleteOrderAction(orderId);
    if (res.success) {
      setSelectedOrder(null);
      loadOrders(orderSearch);
      initData(); // Refresh table statuses
    } else {
      alert(res.error || 'Failed to delete order');
    }
  };

  const handleEditOrder = (order: Order) => {
    if (!order.table) { alert('No table linked to this draft.'); return; }
    router.push(`/pos/order/${(order.table as any)._id || order.table}`);
  };

  const handleSignOut = async () => {
    await logoutAction();
    router.push('/sign-in');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Coffee className="h-10 w-10 text-primary animate-bounce" />
          <span className="text-sm font-semibold text-muted-foreground">Initializing POS session...</span>
        </div>
      </div>
    );
  }

  // ─── SESSION CLOSED ───────────────────────────────────────────────────────
  if (!activeSession) {
    return (
      <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background">
        {/* Left branding panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-orange-500 to-amber-500 flex-col justify-between p-12 text-primary-foreground relative overflow-hidden">
          <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-black/10 blur-2xl" />
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
              <Coffee className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-wider">Odoo Cafe POS</span>
          </div>
          <div className="max-w-md">
            <h1 className="text-5xl font-black leading-tight tracking-tight mb-4">Delicious Food,<br />Smart Checkout.</h1>
            <p className="text-white/80 text-sm leading-relaxed">Open your POS terminal to start taking orders. Configure floors, accept card, cash or UPI payments, and route tickets instantly to KDS screens.</p>
          </div>
          <div className="text-xs text-white/50">Powered by Next.js 15 &amp; Mongoose. Copyright © 2026 Odoo Cafe.</div>
        </div>
        {/* Right Session Card Panel */}
        <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-xl flex flex-col gap-6 relative">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">POST-LOGIN TERMINAL</span>
                <h2 className="text-2xl font-black text-foreground">Odoo Cafe</h2>
              </div>
              <Coffee className="h-8 w-8 text-primary" />
            </div>
            <hr className="border-border" />
            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-2xl border border-border text-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-semibold">Last Session Date:</span>
                <span className="font-bold text-foreground">
                  {lastStats.lastClosedAt ? new Date(lastStats.lastClosedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'No record'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-semibold">Last Sell Amount:</span>
                <span className="font-bold text-foreground">₹{lastStats.lastSellAmount.toFixed(2)}</span>
              </div>
            </div>
            <form onSubmit={handleOpenSession} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Starting Cash Drawer (₹)</label>
                <div className="relative">
                  <Coins className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input type="number" step="0.01" required value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} className="w-full pl-11 pr-4 py-3 border border-border bg-background rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-primary/50 font-bold" />
                </div>
                {openingError && <span className="text-xs text-destructive font-semibold">{openingError}</span>}
              </div>
              <button type="submit" className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]">
                <Play className="h-4 w-4 fill-current" />
                <span>Open Session</span>
              </button>
            </form>
            <hr className="border-border" />
            <div className="flex items-center justify-between text-sm">
              <div className="flex gap-4">
                <a href="/backend" className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors text-xs font-bold">
                  <Settings className="h-4 w-4" /><span>Settings</span>
                </a>
                <button onClick={() => alert('Customer display screen active on secondary monitor...')} className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors text-xs font-bold cursor-pointer">
                  <Tv className="h-4 w-4" /><span>Customer Display</span>
                </button>
              </div>
              <button onClick={handleSignOut} className="flex items-center gap-1 text-destructive hover:underline text-xs font-bold cursor-pointer">
                <LogOut className="h-4 w-4" /><span>Log out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── SESSION ACTIVE ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
      {/* Top Header */}
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <Coffee className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="font-black text-base text-foreground">Odoo Cafe POS</span>
            <p className="text-[10px] text-muted-foreground font-semibold leading-none mt-0.5">Session by: {activeSession.openedBy?.name}</p>
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center gap-1 bg-muted/40 border border-border p-1 rounded-xl">
          <button
            onClick={() => setCurrentView('tables')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${currentView === 'tables' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <TableProperties className="h-3.5 w-3.5" />
            Table View
          </button>
          <button
            onClick={() => setCurrentView('orders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${currentView === 'orders' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Orders
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/backend')} className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors hidden sm:block">
            Admin Dashboard
          </button>
          <button onClick={handleSignOut} className="flex items-center gap-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 px-3 py-2 rounded-xl transition-colors cursor-pointer">
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </header>

      {/* ─── TABLE VIEW ─────────────────────────────────────────────────── */}
      {currentView === 'tables' && (
        <div className="flex-1 flex gap-0 overflow-hidden">
          <div className={`flex-1 flex flex-col p-6 overflow-y-auto transition-all ${selectedTable ? 'lg:max-w-[calc(100%-360px)]' : ''}`}>
            {floors.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm border border-dashed border-border rounded-2xl">
                No floors configured. Please setup floors in admin dashboard.
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Floor Tabs */}
                <div className="flex overflow-x-auto gap-2 border-b border-border">
                  {floors.map((floor) => (
                    <button key={floor._id} onClick={() => setActiveFloorId(floor._id)}
                      className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all duration-200 whitespace-nowrap cursor-pointer ${activeFloorId === floor._id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                      {floor.name}
                    </button>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
                  <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-green-500" />Available (click to order)</div>
                  <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-amber-500" />Occupied (click to view customer)</div>
                </div>

                {/* Table Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {tables.filter((t) => t.floor?._id === activeFloorId).length === 0 ? (
                    <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-muted/20">No tables on this floor.</div>
                  ) : (
                    tables.filter((t) => t.floor?._id === activeFloorId).map((table) => {
                      const isOccupied = table.status === 'occupied';
                      const isSelected = selectedTable?._id === table._id;
                      return (
                        <button key={table._id} disabled={!table.active} onClick={() => handleTableClick(table)}
                          className={`relative border-2 rounded-2xl p-5 text-center flex flex-col items-center gap-2 transition-all duration-200 cursor-pointer hover:scale-[1.04]
                            ${!table.active ? 'opacity-40 border-dashed border-muted bg-muted/10 cursor-not-allowed'
                              : isSelected ? 'ring-2 ring-offset-2 ring-primary border-primary bg-primary/10 text-foreground'
                              : isOccupied ? 'bg-amber-500 border-amber-600 text-white shadow-lg shadow-amber-500/20'
                              : 'bg-green-500 border-green-600 text-white shadow-lg shadow-green-500/20'}`}>
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                            {isOccupied ? 'Occupied' : 'Available'}
                          </span>
                          <h3 className="text-2xl font-black">T-{table.number}</h3>
                          <div className="flex items-center gap-1 text-xs opacity-90">
                            <Users className="h-3.5 w-3.5" />
                            <span>{table.seats} Seats</span>
                          </div>
                          {isOccupied && <ChevronRight className="h-3.5 w-3.5 opacity-70" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Table Customer Detail Side Panel */}
          {selectedTable && (
            <div className="w-full lg:w-[360px] border-l border-border bg-card flex flex-col shadow-xl fixed inset-y-0 right-0 top-16 z-30 lg:static lg:top-0 lg:z-auto">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div>
                  <h3 className="font-black text-foreground text-base">Table T-{selectedTable.number}</h3>
                  <p className="text-xs text-muted-foreground font-semibold mt-0.5">Active Order Details</p>
                </div>
                <button onClick={() => { setSelectedTable(null); setTableCustomerOrder(null); }} className="p-2 hover:bg-muted rounded-lg text-muted-foreground cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                {tableDetailLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-muted-foreground font-semibold">Loading order...</span>
                  </div>
                ) : !tableCustomerOrder ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                    <p className="text-sm font-bold text-foreground">Table is Free</p>
                    <p className="text-xs text-muted-foreground">No active draft order found for this table.</p>
                    <button onClick={() => handleSelectTable(selectedTable)} className="mt-2 bg-primary text-primary-foreground font-bold px-4 py-2.5 rounded-xl text-sm cursor-pointer">
                      Start New Order
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Order Info */}
                    <div className="bg-muted/30 border border-border rounded-2xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Order</span>
                        <span className="text-xs font-black text-primary">{tableCustomerOrder.orderNumber}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground font-semibold mb-0.5">Customer</p>
                          <p className="font-bold text-foreground">{(tableCustomerOrder as any).customer?.name || 'Walk-in'}</p>
                          {(tableCustomerOrder as any).customer?.phone && <p className="text-muted-foreground">{(tableCustomerOrder as any).customer.phone}</p>}
                        </div>
                        <div>
                          <p className="text-muted-foreground font-semibold mb-0.5">Served By</p>
                          <p className="font-bold text-foreground">{(tableCustomerOrder as any).employee?.name || 'Staff'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground font-semibold mb-0.5">Time</p>
                          <p className="font-bold text-foreground">{new Date(tableCustomerOrder.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground font-semibold mb-0.5">Status</p>
                          <span className="inline-block bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">Draft</span>
                        </div>
                      </div>
                    </div>

                    {/* Items List */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Order Items</p>
                      <div className="flex flex-col gap-2">
                        {tableCustomerOrder.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between bg-muted/20 border border-border rounded-xl px-3 py-2.5 text-xs">
                            <span className="font-semibold text-foreground">{(item.product as any)?.name || 'Unknown'}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground">x{item.qty}</span>
                              <span className="font-black text-primary">₹{(item.price * item.qty).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Total */}
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">Total Amount</span>
                      <span className="text-xl font-black text-primary">₹{tableCustomerOrder.total.toFixed(2)}</span>
                    </div>

                    {/* Actions */}
                    <button onClick={() => handleSelectTable(selectedTable)} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl text-sm cursor-pointer flex items-center justify-center gap-2">
                      <Edit2 className="h-4 w-4" />
                      Continue Order / Checkout
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── ORDERS VIEW ─────────────────────────────────────────────────── */}
      {currentView === 'orders' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Orders List */}
          <div className={`flex flex-col transition-all ${selectedOrder ? 'w-full lg:w-[55%]' : 'w-full'} border-r border-border overflow-hidden`}>
            {/* Search */}
            <div className="p-4 border-b border-border bg-card">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by customer name, order number, date..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {orderSearch && (
                  <button onClick={() => setOrderSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Orders Table */}
            <div className="flex-1 overflow-y-auto">
              {ordersLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-muted-foreground font-semibold">Loading orders...</span>
                  </div>
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
                  <ClipboardList className="h-10 w-10 opacity-30" />
                  <p className="text-sm font-semibold">{orderSearch ? 'No orders match your search.' : 'No orders in this session yet.'}</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 border-b border-border sticky top-0">
                    <tr className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-3">Date &amp; Time</th>
                      <th className="px-5 py-3">Order #</th>
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((order) => (
                      <tr
                        key={order._id}
                        onClick={() => setSelectedOrder(selectedOrder?._id === order._id ? null : order)}
                        className={`hover:bg-muted/20 cursor-pointer transition-colors ${selectedOrder?._id === order._id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="font-semibold">
                              {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{' '}
                              {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-black text-primary text-xs">{order.orderNumber}</span>
                          {order.table && <p className="text-[10px] text-muted-foreground font-semibold">T-{(order.table as any).number}</p>}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-foreground">
                          {order.customer?.name || <span className="text-muted-foreground italic">Walk-in</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="font-black text-primary">₹{order.total.toFixed(2)}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                            ${order.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                              : order.status === 'draft' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Order Detail Side Panel */}
          {selectedOrder && (
            <div className="hidden lg:flex flex-col w-[45%] bg-card border-l border-border overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div>
                  <h3 className="font-black text-lg text-foreground">Order #{selectedOrder.orderNumber}</h3>
                  <p className="text-xs text-muted-foreground font-semibold">
                    {new Date(selectedOrder.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-muted rounded-lg text-muted-foreground cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                {/* Meta */}
                <div className="grid grid-cols-2 gap-4 bg-muted/30 border border-border rounded-2xl p-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold mb-0.5">Customer</p>
                    <p className="font-bold text-foreground">{selectedOrder.customer?.name || 'Walk-in'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold mb-0.5">Table</p>
                    <p className="font-bold text-foreground">{selectedOrder.table ? `T-${(selectedOrder.table as any).number}` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold mb-0.5">Amount</p>
                    <p className="font-black text-primary text-lg">₹{selectedOrder.total.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold mb-0.5">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase
                      ${selectedOrder.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                        : selectedOrder.status === 'draft' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                </div>

                {/* Products */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Products</p>
                  {selectedOrder.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No items in this order.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {selectedOrder.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between bg-muted/20 border border-border rounded-xl px-4 py-3 text-sm">
                          <div>
                            <p className="font-semibold text-foreground">{(item.product as any)?.name || 'Unknown Product'}</p>
                            <p className="text-xs text-muted-foreground">₹{item.price.toFixed(2)} each</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground text-sm">×{item.qty}</span>
                            <span className="font-black text-primary">₹{(item.price * item.qty).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Total Summary */}
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2 text-foreground font-bold">
                    <IndianRupee className="h-4 w-4 text-primary" />
                    Total Paid
                  </div>
                  <span className="text-2xl font-black text-primary">₹{selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-border bg-card shrink-0 flex flex-col gap-2">
                {selectedOrder.status === 'draft' && (
                  <>
                    <button
                      onClick={() => handleEditOrder(selectedOrder)}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl text-sm cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit Order (Resume Cart)
                    </button>
                    <button
                      onClick={() => handleDeleteOrder(selectedOrder._id)}
                      className="w-full bg-destructive/10 hover:bg-destructive/20 text-destructive font-bold py-3 rounded-xl text-sm cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Draft Order
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
