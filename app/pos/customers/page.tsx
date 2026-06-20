'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Plus, User, Mail, Phone, Edit2, Trash2, Check, X } from 'lucide-react';
import { getCustomers, createCustomerAction } from '@/actions/order';

interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
}

export default function PosCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit / Create state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '' });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    const data = await getCustomers();
    setCustomers(data.map((c: { _id: { toString: () => string }, name: string, phone?: string, email?: string, totalOrders?: number, totalSpent?: number, createdAt?: string | Date }) => ({
      ...c,
      _id: c._id.toString(),
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : undefined
    } as unknown as Customer)));
    setLoading(false);
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingId('new');
    setEditForm({ name: '', phone: '', email: '' });
  };

  const handleEdit = (c: Customer) => {
    setIsCreating(false);
    setEditingId(c._id);
    setEditForm({ name: c.name, phone: c.phone || '', email: c.email || '' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!editForm.name) {
      alert('Name is required');
      return;
    }
    
    if (isCreating) {
      const res = await createCustomerAction(editForm);
      if (res.success) {
        setCustomers([{ ...editForm, _id: res.customer._id }, ...customers]);
        setEditingId(null);
        setIsCreating(false);
      } else {
        alert(res.error);
      }
    } else {
      // Mock update for now - need an updateCustomer action
      const res = await fetch(`/api/customers/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setCustomers(customers.map(c => c._id === editingId ? { ...c, ...editForm } : c));
        setEditingId(null);
      } else {
        alert('Failed to update');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete customer?')) return;
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setCustomers(customers.filter(c => c._id !== id));
    }
  };

  const filtered = customers.filter(c => {
    const term = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) || (c.phone || '').includes(term) || (c.email || '').toLowerCase().includes(term);
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
          <User className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold tracking-tight text-foreground">Customer Management</h1>
        </div>
      </header>

      <main className="flex-1 p-6 flex justify-center">
        <div className="w-full max-w-4xl flex flex-col gap-6">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, phone, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button 
              onClick={handleCreateNew}
              disabled={editingId !== null}
              className="px-5 py-3 bg-primary hover:bg-primary/95 text-primary-foreground rounded-2xl text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              New Customer
            </button>
          </div>

          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm flex flex-col">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="py-4 px-6 font-bold text-xs uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="py-4 px-6 font-bold text-xs uppercase tracking-wider text-muted-foreground">Phone</th>
                  <th className="py-4 px-6 font-bold text-xs uppercase tracking-wider text-muted-foreground">Email</th>
                  <th className="py-4 px-6 font-bold text-xs uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isCreating && (
                  <tr className="bg-primary/5 border-l-4 border-l-primary">
                    <td className="py-3 px-6">
                      <input 
                        type="text" placeholder="Name" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        autoFocus
                      />
                    </td>
                    <td className="py-3 px-6">
                      <input 
                        type="text" placeholder="Phone" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </td>
                    <td className="py-3 px-6">
                      <input 
                        type="email" placeholder="Email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </td>
                    <td className="py-3 px-6 text-right flex items-center justify-end gap-2">
                      <button onClick={handleSave} className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors cursor-pointer"><Check className="h-4 w-4" /></button>
                      <button onClick={handleCancelEdit} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"><X className="h-4 w-4" /></button>
                    </td>
                  </tr>
                )}
                
                {loading && !isCreating ? (
                  <tr><td colSpan={4} className="py-8 text-center text-muted-foreground animate-pulse">Loading customers...</td></tr>
                ) : filtered.length === 0 && !isCreating ? (
                  <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No customers found.</td></tr>
                ) : (
                  filtered.map(c => (
                    editingId === c._id ? (
                      <tr key={c._id} className="bg-muted/20">
                        <td className="py-3 px-6">
                          <input 
                            type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            autoFocus
                          />
                        </td>
                        <td className="py-3 px-6">
                          <input 
                            type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </td>
                        <td className="py-3 px-6">
                          <input 
                            type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </td>
                        <td className="py-3 px-6 text-right flex items-center justify-end gap-2">
                          <button onClick={handleSave} className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors cursor-pointer"><Check className="h-4 w-4" /></button>
                          <button onClick={handleCancelEdit} className="p-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors cursor-pointer"><X className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    ) : (
                      <tr key={c._id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-4 px-6 font-bold flex items-center gap-2">
                          <div className="h-8 w-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-black text-xs uppercase">{c.name.charAt(0)}</div>
                          {c.name}
                        </td>
                        <td className="py-4 px-6 text-muted-foreground">
                          {c.phone ? (
                            <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {c.phone}</div>
                          ) : '-'}
                        </td>
                        <td className="py-4 px-6 text-muted-foreground">
                          {c.email ? (
                            <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {c.email}</div>
                          ) : '-'}
                        </td>
                        <td className="py-4 px-6 text-right flex items-center justify-end gap-2">
                          <button onClick={() => handleEdit(c)} className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(c._id)} className="p-2 hover:bg-red-50 text-muted-foreground hover:text-red-600 rounded-lg transition-colors cursor-pointer">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
