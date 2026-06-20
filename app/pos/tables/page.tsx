'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Coffee, ArrowLeft, Users, RefreshCw } from 'lucide-react';
import { getFloorsAndTables } from '@/actions/booking';

interface Floor { _id: string; name: string; }
interface Table { _id: string; number: string; seats: number; active: boolean; status: string; floor?: Floor; }

export default function PosTablesPage() {
  const router = useRouter();
  const [floors, setFloors] = useState<Floor[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [activeFloorId, setActiveFloorId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const loadLayout = async () => {
    setLoading(true);
    const layout = await getFloorsAndTables();
    setFloors(layout.floors);
    setTables(layout.tables);
    if (layout.floors.length > 0 && !activeFloorId) {
      setActiveFloorId(layout.floors[0]._id);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLayout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Standalone Nav Header */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-card px-6 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/pos')}
            className="p-2 hover:bg-muted rounded-xl transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Coffee className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight text-foreground">Dining Table Status Map</h1>
          </div>
        </div>

        <button
          onClick={loadLayout}
          className="flex items-center gap-1.5 text-xs font-semibold hover:bg-muted px-3.5 py-2 rounded-xl border border-border bg-card cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Reload Layout</span>
        </button>
      </header>

      {/* Main Layout Display */}
      <main className="flex-1 p-6 flex flex-col gap-6 max-w-5xl w-full mx-auto justify-center">
        {loading && floors.length === 0 ? (
          <div className="flex-1 flex items-center justify-center animate-pulse">
            <span className="text-sm text-muted-foreground font-semibold">Loading tables status...</span>
          </div>
        ) : floors.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm border border-dashed border-border rounded-2xl bg-card">
            No layout configured. Please add floors/tables in the admin panel first.
          </div>
        ) : (
          <div className="flex flex-col gap-6 bg-card border border-border p-6 rounded-3xl shadow-sm">
            {/* Tabs */}
            <div className="flex overflow-x-auto gap-2 border-b border-border">
              {floors.map((floor) => (
                <button
                  key={floor._id}
                  onClick={() => setActiveFloorId(floor._id)}
                  className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-all duration-200 whitespace-nowrap cursor-pointer
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

            {/* Grid */}
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
                      <div
                        key={table._id}
                        className={`relative border rounded-2xl p-5 text-center flex flex-col items-center gap-2 transition-all duration-200
                          ${
                            !table.active
                              ? 'opacity-40 border-dashed border-muted bg-muted/10'
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
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
