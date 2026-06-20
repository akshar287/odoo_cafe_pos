'use client';

import React, { useState, useEffect } from 'react';
import BackendHeader from '@/components/BackendHeader';
import {
  getFloorsAndTables,
  createFloorAction,
  deleteFloorAction,
  saveTableAction,
  deleteTableAction,
} from '@/actions/booking';
import { Plus, Trash2, Users, Layers, HelpCircle, Edit2, ShieldAlert } from 'lucide-react';

interface Floor {
  _id: string;
  name: string;
}

interface Table {
  _id: string;
  number: string | number;
  seats: number;
  active: boolean;
  status: string;
  floor?: Floor | { _id: string; [key: string]: unknown };
}

export default function BookingPage() {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [activeFloorId, setActiveFloorId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Floor form state
  const [showFloorModal, setShowFloorModal] = useState(false);
  const [newFloorName, setNewFloorName] = useState('');

  // Table form state
  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [formTableNumber, setFormTableNumber] = useState('');
  const [formTableSeats, setFormTableSeats] = useState(4);
  const [formTableActive, setFormTableActive] = useState(true);

  // Message banners
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');

  const loadData = async () => {
    setLoading(true);
    const res = await getFloorsAndTables();
    setFloors(res.floors);
    setTables(res.tables);
    if (res.floors.length > 0 && !activeFloorId) {
      setActiveFloorId(res.floors[0]._id);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFloorName.trim()) return;

    setErrorText('');
    setSuccessText('');

    const res = await createFloorAction(newFloorName.trim());
    if (res.success) {
      setNewFloorName('');
      setShowFloorModal(false);
      setSuccessText('Floor created successfully.');
      
      // Select the newly created floor
      if (res.floor) {
        setActiveFloorId(res.floor._id);
      }
      loadData();
    } else {
      setErrorText(res.error || 'Failed to create floor');
    }
  };

  const handleDeleteFloor = async (floorId: string) => {
    if (!confirm('Are you sure you want to delete this floor? All table configurations must be deleted first.')) return;
    setErrorText('');
    setSuccessText('');

    const res = await deleteFloorAction(floorId);
    if (res.success) {
      setSuccessText('Floor deleted.');
      setActiveFloorId(floors.find((f) => f._id !== floorId)?._id || '');
      loadData();
    } else {
      setErrorText(res.error || 'Failed to delete floor.');
    }
  };

  const openTableModal = (table: Table | null = null) => {
    if (table) {
      setEditingTable(table);
      setFormTableNumber(String(table.number));
      setFormTableSeats(table.seats);
      setFormTableActive(table.active);
    } else {
      setEditingTable(null);
      // Guess next table number
      const floorTables = tables.filter((t) => t.floor?._id === activeFloorId);
      const nextNum = floorTables.length + 1;
      setFormTableNumber(String(nextNum));
      setFormTableSeats(4);
      setFormTableActive(true);
    }
    setShowTableModal(true);
  };

  const handleTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTableNumber.trim() || !formTableSeats) return;

    setErrorText('');
    setSuccessText('');

    const res = await saveTableAction({
      id: editingTable?._id,
      number: formTableNumber.trim(),
      seats: formTableSeats,
      floorId: activeFloorId,
      active: formTableActive,
    });

    if (res.success) {
      setShowTableModal(false);
      setSuccessText(editingTable ? 'Table updated.' : 'Table added.');
      loadData();
    } else {
      setErrorText(res.error || 'Failed to save table');
    }
  };

  const handleDeleteTable = async (id: string) => {
    if (!confirm('Are you sure you want to delete this table?')) return;
    const res = await deleteTableAction(id);
    if (res.success) {
      loadData();
    } else {
      setErrorText(res.error || 'Failed to delete table');
    }
  };

  const handleToggleTableActive = async (table: Table) => {
    const res = await saveTableAction({
      id: table._id,
      number: table.number,
      seats: table.seats,
      floorId: table.floor?._id || table.floor,
      active: !table.active,
    });
    if (res.success) {
      loadData();
    }
  };

  const filteredTables = tables.filter((table) => table.floor?._id === activeFloorId);

  return (
    <div className="flex flex-col min-h-screen">
      <BackendHeader title="Floor & Table Management" />

      <div className="p-6 flex flex-col gap-6 max-w-6xl w-full mx-auto">
        {/* Intro */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Structure your dining layout by configuring floors and table grids. The status of each table displays live in POS.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFloorModal(true)}
              className="flex items-center gap-2 border border-border bg-card hover:bg-muted text-foreground font-semibold px-4 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer shadow-xs"
            >
              <Layers className="h-4.5 w-4.5" />
              <span>New Floor</span>
            </button>

            {activeFloorId && (
              <button
                onClick={() => openTableModal(null)}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-primary/10"
              >
                <Plus className="h-4.5 w-4.5 stroke-[2.5]" />
                <span>New Table</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications */}
        {successText && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-sm font-semibold rounded-xl">
            {successText}
          </div>
        )}
        {errorText && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm font-semibold rounded-xl flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
            <span>{errorText}</span>
          </div>
        )}

        {/* Floor Tabs Header */}
        {loading ? (
          <div className="h-12 w-full bg-muted animate-pulse rounded-xl" />
        ) : floors.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card text-muted-foreground flex flex-col items-center gap-3">
            <HelpCircle className="h-10 w-10 text-muted-foreground" />
            <span>No floors configured. Start by creating a floor.</span>
            <button
              onClick={() => setShowFloorModal(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-semibold"
            >
              Add Floor
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Horizontal Tabs */}
            <div className="flex items-center justify-between border-b border-border">
              <div className="flex overflow-x-auto gap-2">
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

              {activeFloorId && (
                <button
                  onClick={() => handleDeleteFloor(activeFloorId)}
                  className="text-destructive hover:bg-destructive/10 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Delete Active Floor
                </button>
              )}
            </div>

            {/* Table Grid Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredTables.length === 0 ? (
                <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-muted/20">
                  No tables configured on this floor yet. Click &quot;New Table&quot; to configure one.
                </div>
              ) : (
                filteredTables.map((table) => (
                  <div
                    key={table._id}
                    className={`relative border rounded-2xl p-5 bg-card flex flex-col gap-3 shadow-xs hover:shadow-md transition-all duration-200
                      ${table.active ? 'border-border' : 'border-dashed border-muted-foreground/30 opacity-60'}
                    `}
                  >
                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {table.active ? 'Active' : 'Disabled'}
                      </span>
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          table.status === 'occupied' ? 'bg-amber-500 animate-pulse' : 'bg-green-500'
                        }`}
                        title={table.status === 'occupied' ? 'Occupied Table' : 'Available Table'}
                      />
                    </div>

                    <div className="my-1.5 flex flex-col items-center">
                      <h3 className="text-2xl font-black text-foreground">T-{table.number}</h3>
                      <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-xs font-medium">
                        <Users className="h-3.5 w-3.5" />
                        <span>{table.seats} Seats</span>
                      </div>
                    </div>

                    {/* Active toggle & buttons */}
                    <div className="flex items-center justify-between pt-3 border-t border-border mt-1">
                      <input
                        type="checkbox"
                        checked={table.active}
                        onChange={() => handleToggleTableActive(table)}
                        className="rounded border-border text-primary focus:ring-primary h-4.5 w-4.5 cursor-pointer"
                        title="Toggle Active Status"
                      />

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openTableModal(table)}
                          className="p-1 hover:bg-muted rounded text-primary transition-colors cursor-pointer"
                          title="Edit Table"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTable(table._id)}
                          className="p-1 hover:bg-destructive/10 rounded text-destructive transition-colors cursor-pointer"
                          title="Delete Table"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Floor Modal */}
      {showFloorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowFloorModal(false)} />
          <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-2xl p-5 shadow-2xl">
            <h3 className="text-lg font-bold mb-4 text-foreground">Create Dining Floor</h3>
            <form onSubmit={handleCreateFloor} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Floor Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ground Floor, Balcony"
                  value={newFloorName}
                  onChange={(e) => setNewFloorName(e.target.value)}
                  className="px-4.5 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="flex justify-end gap-2 text-sm pt-2">
                <button
                  type="button"
                  onClick={() => setShowFloorModal(false)}
                  className="px-4 py-2 border border-border hover:bg-muted rounded-xl text-muted-foreground font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-xl shadow-md shadow-primary/10 hover:bg-primary/95"
                >
                  Create Floor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table Form Modal */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowTableModal(false)} />
          <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-2xl p-5 shadow-2xl">
            <h3 className="text-lg font-bold mb-4 text-foreground">
              {editingTable ? `Edit Table T-${editingTable.number}` : 'Configure New Table'}
            </h3>
            <form onSubmit={handleTableSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Table Identifier (Number/String)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10, A1"
                  value={formTableNumber}
                  onChange={(e) => setFormTableNumber(e.target.value)}
                  className="px-4.5 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Seats Capacity</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formTableSeats}
                  onChange={(e) => setFormTableSeats(parseInt(e.target.value) || 2)}
                  className="px-4.5 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border p-3 bg-muted/20">
                <span className="text-sm font-semibold">Active / Ready for POS?</span>
                <input
                  type="checkbox"
                  checked={formTableActive}
                  onChange={(e) => setFormTableActive(e.target.checked)}
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 text-sm pt-2">
                <button
                  type="button"
                  onClick={() => setShowTableModal(false)}
                  className="px-4 py-2 border border-border hover:bg-muted rounded-xl text-muted-foreground font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-xl shadow-md shadow-primary/10 hover:bg-primary/95"
                >
                  Save Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
