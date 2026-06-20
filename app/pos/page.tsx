'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import {
  Coffee,
  Play,
  Settings,
  Tv,
  Coins,
  LogOut,
  Users,
  Map,
} from 'lucide-react';

interface Floor { _id: string; name: string; }
interface Table { _id: string; number: string; seats: number; active: boolean; status: string; floor?: Floor; }
interface Sess { _id: string; openedBy: { name: string }; }
import { getCurrentSession, openSessionAction, getLastSessionStats } from '@/actions/session';
import { getFloorsAndTables } from '@/actions/booking';

export default function PosPage() {
  const router = useRouter();
  const { signOut } = useClerk();
  
  // Session states
  const [activeSession, setActiveSession] = useState<Sess | null>(null);
  const [lastStats, setLastStats] = useState({ lastClosedAt: null, lastSellAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [openingBalance, setOpeningBalance] = useState('2000');
  const [openingError, setOpeningError] = useState('');

  // Floor pop-up states (when session is open)
  const [floors, setFloors] = useState<Floor[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [activeFloorId, setActiveFloorId] = useState<string>('');

  const initData = async () => {
    setLoading(true);
    const session = await getCurrentSession();
    setActiveSession(session);

    if (!session) {
      const stats = await getLastSessionStats();
      setLastStats(stats);
    } else {
      // If session is open, fetch floors and tables to display selection
      const layout = await getFloorsAndTables();
      setFloors(layout.floors);
      setTables(layout.tables);
      if (layout.floors.length > 0) {
        setActiveFloorId(layout.floors[0]._id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    initData();
  }, []);

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpeningError('');
    const amt = parseFloat(openingBalance);
    if (isNaN(amt) || amt < 0) {
      setOpeningError('Starting cash must be a valid positive amount.');
      return;
    }

    const res = await openSessionAction(amt);
    if (res.success) {
      initData();
    } else {
      setOpeningError(res.error || 'Failed to open session.');
    }
  };

  const handleSelectTable = (table: Table) => {
    if (!table.active) return;
    router.push(`/pos/order/${table._id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground animate-pulse">
        <div className="flex flex-col items-center gap-3">
          <Coffee className="h-10 w-10 text-primary animate-bounce" />
          <span className="text-sm font-semibold text-muted-foreground">Initializing POS session...</span>
        </div>
      </div>
    );
  }

  // 1. SESSION CLOSED STATE: Show Session Opening Card
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
            <h1 className="text-5xl font-black leading-tight tracking-tight mb-4">
              Delicious Food,<br />Smart Checkout.
            </h1>
            <p className="text-white/80 text-sm leading-relaxed">
              Open your POS terminal to start taking orders. Configure floors, accept card, cash or UPI payments, and route tickets instantly to KDS screens.
            </p>
          </div>

          <div className="text-xs text-white/50">
            Powered by Next.js 15 & Mongoose. Copyright © 2026 Odoo Cafe.
          </div>
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

            {/* Last session stats */}
            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-2xl border border-border text-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-semibold">Last Session Date:</span>
                <span className="font-bold text-foreground">
                  {lastStats.lastClosedAt
                    ? new Date(lastStats.lastClosedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : 'No record'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-semibold">Last Sell Amount:</span>
                <span className="font-bold text-foreground">₹{lastStats.lastSellAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Opening Balance Form */}
            <form onSubmit={handleOpenSession} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Starting Cash Drawer (₹)</label>
                <div className="relative">
                  <Coins className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-border bg-background rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-primary/50 font-bold"
                  />
                </div>
                {openingError && <span className="text-xs text-destructive font-semibold">{openingError}</span>}
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]"
              >
                <Play className="h-4.5 w-4.5 fill-current" />
                <span>Open Session</span>
              </button>
            </form>

            <hr className="border-border" />

            {/* Quick Links */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex gap-4">
                <a
                  href="/backend"
                  className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors text-xs font-bold"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </a>
                <button
                  onClick={() => alert('Customer display screen active on secondary monitor...')}
                  className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors text-xs font-bold cursor-pointer"
                >
                  <Tv className="h-4 w-4" />
                  <span>Customer Display</span>
                </button>
              </div>

              <button
                onClick={() => signOut(() => (window.location.href = '/sign-in'))}
                className="flex items-center gap-1 text-destructive hover:underline text-xs font-bold cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. SESSION ACTIVE STATE: Show Floor Grid Popup Modal
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col p-6 items-center justify-center">
      <div className="w-full max-w-4xl bg-card border border-border rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Map className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                SESSION OPERATIONAL BY: {activeSession.openedBy?.name}
              </span>
              <h2 className="text-xl font-bold text-foreground">Select a Dining Table</h2>
            </div>
          </div>

          <button
            onClick={() => router.push('/backend')}
            className="text-xs font-bold text-primary hover:underline"
          >
            Go to Admin Dashboard
          </button>
        </div>

        <hr className="border-border" />

        {/* Floor Tab Filters */}
        {floors.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm border border-dashed border-border rounded-2xl">
            No floors configured in backend booking system. Please setup floors in dashboard.
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Horizontal Tabs */}
            <div className="flex overflow-x-auto gap-2 border-b border-border">
              {floors.map((floor) => (
                <button
                  key={floor._id}
                  onClick={() => setActiveFloorId(floor._id)}
                  className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all duration-200 whitespace-nowrap cursor-pointer
                    ${
                      activeFloorId === floor._id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  {floor.name}
                </button>
              ))}
            </div>

            {/* Table Grid list */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {tables.filter((t) => t.floor?._id === activeFloorId).length === 0 ? (
                <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-muted/20">
                  No tables configured on this floor.
                </div>
              ) : (
                tables
                  .filter((t) => t.floor?._id === activeFloorId)
                  .map((table) => {
                    const isOccupied = table.status === 'occupied';
                    return (
                      <button
                        key={table._id}
                        disabled={!table.active}
                        onClick={() => handleSelectTable(table)}
                        className={`relative border rounded-2xl p-5 text-center flex flex-col items-center gap-2 transition-all duration-200 cursor-pointer hover:scale-[1.03]
                          ${
                            !table.active
                              ? 'opacity-40 border-dashed border-muted bg-muted/10 cursor-not-allowed'
                              : isOccupied
                              ? 'bg-amber-500 border-amber-600 text-white shadow-lg shadow-amber-500/10'
                              : 'bg-green-500 border-green-600 text-white shadow-lg shadow-green-500/10'
                          }
                        `}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                          {isOccupied ? 'Occupied' : 'Available'}
                        </span>
                        <h3 className="text-2xl font-black">T-{table.number}</h3>
                        <div className="flex items-center gap-1 text-xs opacity-90">
                          <Users className="h-3.5 w-3.5" />
                          <span>{table.seats} Seats</span>
                        </div>
                      </button>
                    );
                  })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
