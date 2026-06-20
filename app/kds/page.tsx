'use client';

import React, { useState, useEffect } from 'react';
import { ChefHat, CheckCircle2, Clock, PlayCircle, Search } from 'lucide-react';
import { getPusherClient } from '@/lib/realtime';

interface OrderItem {
  _id?: string;
  product: { _id: string; name: string; sendToKDS?: boolean };
  qty: number;
  completed?: boolean;
}

interface Order {
  _id: string;
  orderNumber: string;
  table?: { number: string };
  kdsStatus: 'to-cook' | 'preparing' | 'completed' | 'none';
  items: OrderItem[];
  createdAt: string;
}

export default function KDSPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'to-cook' | 'preparing' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadActiveOrders();

    const pusher = getPusherClient();
    if (pusher) {
      const channel = pusher.subscribe('kds-channel');
      channel.bind('new-order', (newOrder: Order) => {
        setOrders(prev => {
          const exists = prev.find(o => o._id === newOrder._id);
          if (exists) {
            return prev.map(o => o._id === newOrder._id ? newOrder : o);
          }
          return [newOrder, ...prev];
        });
        // Optional: play a ding sound here
      });

      channel.bind('update-order', (updatedOrder: Order) => {
        setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
      });

      return () => {
        pusher.unsubscribe('kds-channel');
      };
    }
  }, []);

  const loadActiveOrders = async () => {
    try {
      const res = await fetch('/api/kds/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const advanceStatus = async (order: Order) => {
    const nextStatus = order.kdsStatus === 'to-cook' ? 'preparing' : 'completed';
    
    // Optimistic UI update
    setOrders(prev => prev.map(o => o._id === order._id ? { ...o, kdsStatus: nextStatus } : o));

    try {
      await fetch(`/api/kds/orders/${order._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kdsStatus: nextStatus })
      });
    } catch {
      console.error('Failed to advance order status');
      // revert?
    }
  };

  const toggleItemCompletion = async (order: Order, itemIndex: number) => {
    const newItems = [...order.items];
    newItems[itemIndex] = { ...newItems[itemIndex], completed: !newItems[itemIndex].completed };

    // Auto-advance logic: if all items completed, mark order completed
    const allCompleted = newItems.every(i => i.completed);
    const newStatus = allCompleted ? 'completed' : order.kdsStatus === 'to-cook' ? 'preparing' : order.kdsStatus;

    setOrders(prev => prev.map(o => o._id === order._id ? { ...o, items: newItems, kdsStatus: newStatus } : o));

    try {
      await fetch(`/api/kds/orders/${order._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: newItems, kdsStatus: newStatus })
      });
    } catch {
      console.error('Failed to update item status');
    }
  };

  const filteredOrders = orders.filter(o => {
    if (activeTab !== 'all' && o.kdsStatus !== activeTab) return false;
    if (o.kdsStatus === 'none') return false; // Filter out non-kds orders
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!o.orderNumber.toLowerCase().includes(term) && !o.table?.number?.toLowerCase().includes(term)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col font-mono">
      {/* KDS Header */}
      <header className="h-16 flex items-center justify-between px-6 bg-[#1e293b] border-b border-slate-700 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-amber-500/20 rounded-xl flex items-center justify-center border border-amber-500/30">
            <ChefHat className="h-5 w-5 text-amber-500" />
          </div>
          <h1 className="text-xl font-black text-white tracking-widest uppercase">Kitchen Display</h1>
        </div>

        <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700">
          {(['all', 'to-cook', 'preparing', 'completed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                activeTab === tab ? 'bg-amber-500 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search ticket..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-6 h-full min-w-max items-start">
          {loading ? (
            <div className="text-slate-500 animate-pulse m-auto">Syncing kitchen queue...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-slate-500 m-auto flex flex-col items-center gap-2">
              <CheckCircle2 className="h-12 w-12 opacity-50" />
              <span>No tickets in queue</span>
            </div>
          ) : (
            filteredOrders.map(order => {
              const timeDiff = Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / 60000);
              const isUrgent = timeDiff > 15 && order.kdsStatus !== 'completed';

              return (
                <div 
                  key={order._id} 
                  className={`w-80 flex flex-col rounded-2xl overflow-hidden shrink-0 shadow-lg border transition-all ${
                    order.kdsStatus === 'completed' ? 'bg-slate-800/50 border-slate-700 opacity-70' :
                    isUrgent ? 'bg-red-950/40 border-red-900 shadow-red-900/20' : 
                    'bg-slate-800 border-slate-700'
                  }`}
                >
                  {/* Ticket Header */}
                  <div className={`p-4 flex flex-col gap-2 cursor-pointer transition-colors ${
                    order.kdsStatus === 'to-cook' ? 'bg-amber-500/10 hover:bg-amber-500/20 border-b border-amber-500/20' :
                    order.kdsStatus === 'preparing' ? 'bg-blue-500/10 hover:bg-blue-500/20 border-b border-blue-500/20' :
                    'bg-slate-900/50 hover:bg-slate-900/70 border-b border-slate-800'
                  }`} onClick={() => advanceStatus(order)}>
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-black text-white">#{order.orderNumber.split('-').pop()}</h3>
                      {order.table && (
                        <div className="px-2 py-1 bg-white/10 rounded-md text-xs font-bold text-white border border-white/10">
                          T-{order.table.number}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className={`font-bold uppercase tracking-wider ${
                        order.kdsStatus === 'to-cook' ? 'text-amber-400' :
                        order.kdsStatus === 'preparing' ? 'text-blue-400' : 'text-slate-400'
                      }`}>
                        {order.kdsStatus.replace('-', ' ')}
                      </span>
                      <span className={`flex items-center gap-1 font-bold ${isUrgent ? 'text-red-400' : 'text-slate-400'}`}>
                        <Clock className="h-3.5 w-3.5" />
                        {timeDiff}m ago
                      </span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="flex-1 p-3 flex flex-col gap-2 overflow-y-auto">
                    {order.items.map((item, idx) => (
                      <div 
                        key={idx}
                        onClick={() => toggleItemCompletion(order, idx)}
                        className={`flex gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                          item.completed 
                            ? 'bg-slate-900/50 border-slate-800 opacity-50' 
                            : 'bg-slate-700/50 border-slate-600 hover:border-amber-500/50'
                        }`}
                      >
                        <div className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center font-black text-sm border ${
                          item.completed ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-slate-800 border-slate-500 text-white'
                        }`}>
                          {item.qty}
                        </div>
                        <div className={`flex flex-col justify-center flex-1 ${item.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                          <span className="font-bold text-sm leading-tight">{item.product?.name || 'Unknown Item'}</span>
                        </div>
                        {item.completed && (
                          <div className="flex items-center justify-center shrink-0">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Action Bar */}
                  {order.kdsStatus !== 'completed' && (
                    <div className="p-3 bg-slate-900/50 border-t border-slate-800">
                      <button 
                        onClick={() => advanceStatus(order)}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                          order.kdsStatus === 'to-cook' 
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-900' 
                            : 'bg-blue-500 hover:bg-blue-400 text-white'
                        }`}
                      >
                        {order.kdsStatus === 'to-cook' ? (
                          <><PlayCircle className="h-4 w-4" /> Start Preparing</>
                        ) : (
                          <><CheckCircle2 className="h-4 w-4" /> Mark Completed</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
