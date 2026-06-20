'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, FileText, X, Trash2, Edit } from 'lucide-react';

interface Order {
  _id: string;
  orderNumber: string;
  customer?: { name: string; phone: string };
  total: number;
  status: string;
  createdAt: string;
  items: Record<string, unknown>[];
  table?: { number: string; _id: string };
}

export default function PosOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    // Since getActiveOrdersForTable requires a tableId, we need a new action `getSessionOrders`
    // Wait, let's create it in actions/order.ts in a sec.
    try {
      const res = await fetch('/api/orders/session');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const filteredOrders = orders.filter(o => {
    const term = searchTerm.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(term) ||
      (o.customer?.name || '').toLowerCase().includes(term) ||
      (o.customer?.phone || '').includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-40 flex h-16 w-full items-center border-b border-border bg-card px-6 shadow-xs">
        <button
          onClick={() => router.push('/pos')}
          className="p-2 hover:bg-muted rounded-xl transition-colors cursor-pointer text-muted-foreground hover:text-foreground mr-3"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold tracking-tight text-foreground">Session Orders</h1>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* Main List */}
        <div className={`flex-1 flex flex-col p-6 ${selectedOrder ? 'hidden md:flex md:w-1/2 lg:w-2/3 border-r border-border' : 'w-full'}`}>
          <div className="mb-6 flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by order #, customer name, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button onClick={loadOrders} className="px-4 py-3 bg-muted hover:bg-muted/80 rounded-2xl text-sm font-semibold transition-colors cursor-pointer border border-border">
              Refresh
            </button>
          </div>

          <div className="flex-1 bg-card border border-border rounded-3xl overflow-hidden flex flex-col shadow-sm">
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground animate-pulse text-sm">Loading orders...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">No orders found.</div>
            ) : (
              <div className="overflow-auto flex-1">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-muted/50 sticky top-0 backdrop-blur-md">
                    <tr>
                      <th className="py-4 px-6 font-bold text-xs uppercase tracking-wider text-muted-foreground">Order #</th>
                      <th className="py-4 px-6 font-bold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                      <th className="py-4 px-6 font-bold text-xs uppercase tracking-wider text-muted-foreground">Customer</th>
                      <th className="py-4 px-6 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="py-4 px-6 font-bold text-xs uppercase tracking-wider text-muted-foreground text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredOrders.map(order => (
                      <tr 
                        key={order._id} 
                        onClick={() => setSelectedOrder(order)}
                        className={`cursor-pointer transition-colors ${selectedOrder?._id === order._id ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                      >
                        <td className="py-4 px-6 font-bold">{order.orderNumber}</td>
                        <td className="py-4 px-6 text-muted-foreground text-xs">{new Date(order.createdAt).toLocaleString()}</td>
                        <td className="py-4 px-6">
                          {order.customer ? (
                            <div className="flex flex-col">
                              <span className="font-semibold">{order.customer.name}</span>
                              <span className="text-xs text-muted-foreground">{order.customer.phone}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">Walk-in</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            order.status === 'paid' ? 'bg-green-500/10 text-green-600' :
                            order.status === 'draft' ? 'bg-amber-500/10 text-amber-600' :
                            'bg-red-500/10 text-red-600'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-black">₹{order.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Slide Over Detail */}
        {selectedOrder && (
          <div className="w-full md:w-1/2 lg:w-1/3 bg-card flex flex-col h-full shadow-2xl relative animate-in slide-in-from-right">
            <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
              <h2 className="text-xl font-black">Order #{selectedOrder.orderNumber}</h2>
              <button onClick={() => setSelectedOrder(null)} className="p-2 bg-muted rounded-full hover:bg-muted/80 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 p-4 bg-muted/20 rounded-2xl border border-border">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</span>
                  <span className="font-bold capitalize">{selectedOrder.status}</span>
                </div>
                <div className="flex flex-col gap-1 p-4 bg-muted/20 rounded-2xl border border-border">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Table</span>
                  <span className="font-bold">T-{selectedOrder.table?.number || 'N/A'}</span>
                </div>
              </div>

              {selectedOrder.customer && (
                <div className="flex flex-col gap-1 p-4 bg-primary/5 rounded-2xl border border-primary/20">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Customer</span>
                  <span className="font-bold text-foreground">{selectedOrder.customer.name}</span>
                  <span className="text-xs text-muted-foreground">{selectedOrder.customer.phone}</span>
                </div>
              )}

              {/* Items */}
              <div>
                <h3 className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wider">Items</h3>
                <div className="flex flex-col gap-3">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border border-border rounded-xl text-sm">
                      <div className="flex items-center gap-3">
                        <span className="h-6 w-6 rounded-md bg-muted flex items-center justify-center font-bold text-xs">{item.qty}</span>
                        <span className="font-semibold">{item.product?.name || 'Unknown'}</span>
                      </div>
                      <span className="font-bold">₹{((item.price * item.qty) - (item.discount || 0)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-auto border-t border-border pt-4 flex justify-between items-center text-lg font-black">
                <span>Total</span>
                <span className="text-primary">₹{selectedOrder.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions for Draft orders */}
            {selectedOrder.status === 'draft' && (
              <div className="p-6 border-t border-border flex gap-3 bg-card sticky bottom-0">
                <button 
                  onClick={async () => {
                    if (confirm('Delete this draft order?')) {
                      await fetch(`/api/orders/${selectedOrder._id}`, { method: 'DELETE' });
                      setSelectedOrder(null);
                      loadOrders();
                    }
                  }}
                  className="px-4 py-3 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => router.push(`/pos/order/${selectedOrder.table?._id}?draftId=${selectedOrder._id}`)}
                  className="flex-1 bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-3 rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-[1.02]"
                >
                  <Edit className="h-4 w-4" />
                  Edit Order
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
