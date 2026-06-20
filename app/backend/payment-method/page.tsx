'use client';

import React, { useState, useEffect } from 'react';
import BackendHeader from '@/components/BackendHeader';
import {
  getPaymentMethods,
  savePaymentMethodAction,
  deletePaymentMethodAction,
} from '@/actions/payment-method';
import { Plus, Trash2, Edit2, X, Info } from 'lucide-react';
import QRCode from 'qrcode';

import Image from 'next/image';

interface PaymentMethod {
  _id: string;
  name: string;
  type: 'cash' | 'card' | 'upi';
  upiId?: string;
  active: boolean;
}

export default function PaymentMethodPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  // Form / Drawer state
  const [isOpen, setIsOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'cash' | 'card' | 'upi'>('cash');
  const [formUpiId, setFormUpiId] = useState('');
  const [formActive, setFormActive] = useState(true);

  // Live QR state
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const loadMethods = async () => {
    setLoading(true);
    const list = await getPaymentMethods();
    setMethods(list.map((c: { _id: { toString: () => string }, name: string, type: string, active: boolean, upiId?: string }) => ({
      ...c,
      _id: c._id.toString(),
      type: c.type as 'cash' | 'card' | 'upi'
    })));
    setLoading(false);
  };

  useEffect(() => {
    loadMethods();
  }, []);

  // Update live QR code preview when UPI details change
  useEffect(() => {
    if (formType === 'upi' && formUpiId.trim()) {
      // standard UPI payment URL protocol: upi://pay?pa=address@upi&pn=Display%20Name
      const upiUrl = `upi://pay?pa=${encodeURIComponent(formUpiId.trim())}&pn=${encodeURIComponent(
        'Odoo Cafe'
      )}`;
      QRCode.toDataURL(upiUrl, { width: 180, margin: 2 })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error('QR generation error:', err));
    } else {
      setQrCodeUrl('');
    }
  }, [formType, formUpiId]);

  const openForm = (method: PaymentMethod | null = null) => {
    if (method) {
      setEditingMethod(method);
      setFormName(method.name);
      setFormType(method.type);
      setFormUpiId(method.upiId || '');
      setFormActive(method.active);
    } else {
      setEditingMethod(null);
      setFormName('');
      setFormType('cash');
      setFormUpiId('');
      setFormActive(true);
    }
    setIsOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Please enter a payment method name.');
      return;
    }

    if (formType === 'upi' && !formUpiId.trim()) {
      alert('Please enter a valid UPI ID.');
      return;
    }

    const res = await savePaymentMethodAction({
      id: editingMethod?._id,
      name: formName.trim(),
      type: formType,
      upiId: formType === 'upi' ? formUpiId.trim() : undefined,
      active: formActive,
    });

    if (res.success) {
      setIsOpen(false);
      loadMethods();
    } else {
      alert(res.error || 'Failed to save payment method');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;
    const res = await deletePaymentMethodAction(id);
    if (res.success) {
      loadMethods();
    } else {
      alert(res.error || 'Failed to delete payment method');
    }
  };

  const handleToggleActivate = async (method: PaymentMethod) => {
    const res = await savePaymentMethodAction({
      id: method._id,
      name: method.name,
      type: method.type,
      upiId: method.upiId,
      active: !method.active,
    });
    if (res.success) {
      loadMethods();
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <BackendHeader title="Payment Methods" />

      <div className="p-6 flex flex-col gap-6 max-w-5xl w-full mx-auto">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Configure different settlement options. Live QR generation is enabled for instant customer-facing payouts.
          </p>

          <button
            onClick={() => openForm(null)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-primary/10"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>New Payment Method</span>
          </button>
        </div>

        {/* Methods Table */}
        <div className="border border-border bg-card rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="py-4 px-6">Name</th>
                <th className="py-4 px-6">Type</th>
                <th className="py-4 px-6">Configuration Details</th>
                <th className="py-4 px-6 text-center">Active</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6">
                      <div className="h-4 w-32 bg-muted rounded" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 w-16 bg-muted rounded" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 w-40 bg-muted rounded" />
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="h-4 w-6 bg-muted rounded mx-auto" />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="h-8 w-16 bg-muted rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : methods.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 px-6 text-center text-muted-foreground">
                    No payment methods configured.
                  </td>
                </tr>
              ) : (
                methods.map((method) => (
                  <tr key={method._id} className="hover:bg-muted/5 transition-colors">
                    <td className="py-4 px-6 font-medium text-foreground">{method.name}</td>
                    <td className="py-4 px-6">
                      <span className="capitalize font-semibold">{method.type}</span>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">
                      {method.type === 'upi' ? (
                        <code className="bg-muted px-2 py-1 rounded text-xs select-all text-foreground">
                          {method.upiId}
                        </code>
                      ) : (
                        <span>Standard Cash/Card settlement</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <input
                        type="checkbox"
                        checked={method.active}
                        onChange={() => handleToggleActivate(method)}
                        className="rounded border-border text-primary focus:ring-primary h-4.5 w-4.5 cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openForm(method)}
                          className="inline-flex items-center gap-1 text-primary hover:bg-primary/10 rounded-lg p-1.5 transition-colors cursor-pointer"
                        >
                          <Edit2 className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(method._id)}
                          className="inline-flex items-center gap-1 text-destructive hover:bg-destructive/10 rounded-lg p-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal/Drawer form popup */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsOpen(false)} />

          <div className="relative z-10 w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                {editingMethod ? 'Edit Payment Method' : 'Create Payment Method'}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto py-4 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-muted-foreground">Payment Method Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank POS Terminal, UPI Payout"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-muted-foreground">Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as 'cash' | 'card' | 'upi')}
                  className="px-3.5 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI (Instant QR code generation)</option>
                </select>
              </div>

              {formType === 'upi' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-primary/5 border border-primary/20 p-4 rounded-xl">
                  <div className="flex flex-col gap-2.5">
                    <label className="text-sm font-bold text-foreground">UPI ID Address</label>
                    <input
                      type="text"
                      required
                      placeholder="username@bankname"
                      value={formUpiId}
                      onChange={(e) => setFormUpiId(e.target.value)}
                      className="px-3.5 py-2 border border-border bg-card rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <span className="text-[11px] text-muted-foreground flex gap-1 items-start">
                      <Info className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                      We automatically construct the UPI pay payload for customer terminals.
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">Live QR Preview</span>
                    <div className="h-36 w-36 border border-border bg-white rounded-lg flex items-center justify-center overflow-hidden relative">
                      {qrCodeUrl ? (
                        <Image src={qrCodeUrl} alt="UPI QR Code" fill className="object-contain" />
                      ) : (
                        <span className="text-[11px] text-muted-foreground text-center p-3">
                          Enter UPI ID to generate live QR
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl border border-border p-3.5 bg-muted/20">
                <span className="text-sm font-semibold text-foreground">Activate settlement mode?</span>
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border border-border hover:bg-muted text-muted-foreground text-sm font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-5 py-2 rounded-xl text-sm cursor-pointer shadow-md shadow-primary/10"
                >
                  Save Method
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
