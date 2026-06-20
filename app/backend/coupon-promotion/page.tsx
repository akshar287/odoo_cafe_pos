'use client';

import React, { useState, useEffect } from 'react';
import BackendHeader from '@/components/BackendHeader';
import { getCoupons, saveCouponAction, deleteCouponAction } from '@/actions/coupon';
import { Plus, Trash2, Edit2, X, Percent, IndianRupee } from 'lucide-react';

interface Promo {
  _id: string;
  name: string;
  type: 'coupon' | 'automated-product' | 'automated-order';
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minQty: number;
  minOrderAmount: number;
  active: boolean;
}

export default function CouponPromotionPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'coupon' | 'automated-product' | 'automated-order'>('coupon');
  const [formCode, setFormCode] = useState('');
  const [formDiscountType, setFormDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [formDiscountValue, setFormDiscountValue] = useState('');
  const [formMinQty, setFormMinQty] = useState('1');
  const [formMinOrderAmount, setFormMinOrderAmount] = useState('0');
  const [formActive, setFormActive] = useState(true);

  // Derived state to map sub-toggle for automated modes
  const [autoApplyToggle, setAutoApplyToggle] = useState<'product' | 'order'>('product');

  const loadPromos = async () => {
    setLoading(true);
    const list = await getCoupons();
    setPromos(list.map((c: { _id: { toString: () => string }, name: string, type: string, code: string, discountType: string, discountValue: number, minQty: number, minOrderAmount: number, active: boolean }) => ({
      ...c,
      _id: c._id.toString(),
      type: c.type as 'coupon' | 'automated-product' | 'automated-order',
      discountType: c.discountType as 'percent' | 'fixed'
    })));
    setLoading(false);
  };

  useEffect(() => {
    loadPromos();
  }, []);

  // Sync autoApplyToggle when formType changes
  useEffect(() => {
    if (formType === 'automated-product') {
      setAutoApplyToggle('product');
    } else if (formType === 'automated-order') {
      setAutoApplyToggle('order');
    }
  }, [formType]);

  // Sync formType when autoApplyToggle changes (for automated mode)
  const handleAutoToggleChange = (mode: 'product' | 'order') => {
    setAutoApplyToggle(mode);
    setFormType(mode === 'product' ? 'automated-product' : 'automated-order');
  };

  const openForm = (promo: Promo | null = null) => {
    if (promo) {
      setEditingPromo(promo);
      setFormName(promo.name);
      setFormType(promo.type);
      setFormCode(promo.code);
      setFormDiscountType(promo.discountType);
      setFormDiscountValue(String(promo.discountValue));
      setFormMinQty(String(promo.minQty || 1));
      setFormMinOrderAmount(String(promo.minOrderAmount || 0));
      setFormActive(promo.active);
      setAutoApplyToggle(promo.type === 'automated-product' ? 'product' : 'order');
    } else {
      setEditingPromo(null);
      setFormName('');
      setFormType('coupon');
      setFormCode('');
      setFormDiscountType('percent');
      setFormDiscountValue('');
      setFormMinQty('1');
      setFormMinOrderAmount('0');
      setFormActive(true);
      setAutoApplyToggle('product');
    }
    setIsOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim() || !formDiscountValue.trim()) {
      alert('Please fill in Name and Discount Value.');
      return;
    }

    let code = formCode.trim();
    if (formType === 'coupon' && !code) {
      alert('Coupon code is required.');
      return;
    }

    // For automated campaigns, auto-generate code if empty
    if (formType !== 'coupon' && !code) {
      code = 'AUTO_' + formName.toUpperCase().replace(/\s+/g, '_');
    }

    const valueNum = parseFloat(formDiscountValue);
    if (isNaN(valueNum) || valueNum <= 0) {
      alert('Discount value must be a valid positive number.');
      return;
    }

    const res = await saveCouponAction({
      id: editingPromo?._id,
      name: formName.trim(),
      code,
      type: formType,
      discountType: formDiscountType,
      discountValue: valueNum,
      minQty: formType === 'automated-product' ? (parseInt(formMinQty) || 1) : 1,
      minOrderAmount: formType === 'automated-order' ? (parseFloat(formMinOrderAmount) || 0) : 0,
      active: formActive,
    });

    if (res.success) {
      setIsOpen(false);
      loadPromos();
    } else {
      alert(res.error || 'Failed to save coupon/promotion');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotion program?')) return;
    const res = await deleteCouponAction(id);
    if (res.success) {
      loadPromos();
    } else {
      alert(res.error || 'Failed to delete promotion');
    }
  };

  const handleToggleActive = async (promo: Promo) => {
    const res = await saveCouponAction({
      id: promo._id,
      name: promo.name,
      code: promo.code,
      type: promo.type,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      minQty: promo.minQty,
      minOrderAmount: promo.minOrderAmount,
      active: !promo.active,
    });
    if (res.success) {
      loadPromos();
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <BackendHeader title="Coupons & Promotions" />

      <div className="p-6 flex flex-col gap-6 max-w-6xl w-full mx-auto">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Configure discount structures. Coupons are redeemed via codes; Automated Promotions apply live based on cart contents.
          </p>

          <button
            onClick={() => openForm(null)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-primary/10"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>New Promotion</span>
          </button>
        </div>

        {/* Promo List */}
        <div className="border border-border bg-card rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="py-4 px-6">Program Name</th>
                <th className="py-4 px-6">Type</th>
                <th className="py-4 px-6">Discount Value</th>
                <th className="py-4 px-6">Condition Thresholds</th>
                <th className="py-4 px-6 text-center">Activate</th>
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
                      <div className="h-4 w-24 bg-muted rounded" />
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
              ) : promos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-6 text-center text-muted-foreground">
                    No active discount coupons or automated promotions found.
                  </td>
                </tr>
              ) : (
                promos.map((promo) => (
                  <tr key={promo._id} className="hover:bg-muted/5 transition-colors">
                    <td className="py-4 px-6 font-medium text-foreground">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold">{promo.name}</span>
                        {promo.type === 'coupon' && (
                          <span className="text-[11px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded w-max">
                            Code: {promo.code}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-semibold">
                      {promo.type === 'coupon' && 'Coupon Code'}
                      {promo.type === 'automated-product' && 'Automated (Product mode)'}
                      {promo.type === 'automated-order' && 'Automated (Order mode)'}
                    </td>
                    <td className="py-4 px-6 font-bold text-primary">
                      {promo.discountType === 'percent' ? `${promo.discountValue}% Off` : `₹${promo.discountValue} Off`}
                    </td>
                    <td className="py-4 px-6 text-muted-foreground text-xs font-semibold">
                      {promo.type === 'automated-product' && `Min Qty: ${promo.minQty} unit(s) of "${promo.code}"`}
                      {promo.type === 'automated-order' && `Min Order Amount: ₹${promo.minOrderAmount}`}
                      {promo.type === 'coupon' &&
                        (promo.minOrderAmount > 0 ? `Min Order Amount: ₹${promo.minOrderAmount}` : 'No minimum')}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <input
                        type="checkbox"
                        checked={promo.active}
                        onChange={() => handleToggleActive(promo)}
                        className="rounded border-border text-primary focus:ring-primary h-4.5 w-4.5 cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openForm(promo)}
                          className="p-1.5 hover:bg-muted rounded text-primary transition-colors cursor-pointer"
                          title="Edit Campaign"
                        >
                          <Edit2 className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(promo._id)}
                          className="p-1.5 hover:bg-destructive/10 rounded text-destructive transition-colors cursor-pointer"
                          title="Delete Campaign"
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

      {/* Campaign Form Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsOpen(false)} />
          <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                {editingPromo ? 'Edit Discount Program' : 'Create Discount Program'}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto py-4 flex flex-col gap-4">
              {/* Program Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-muted-foreground">Campaign / Promo Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10% Monsoon Discount, Happy Hour"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Promo Type Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-muted-foreground">Promotion Type</label>
                <div className="grid grid-cols-2 gap-2 border border-border bg-muted/20 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormType('coupon')}
                    className={`py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors
                      ${
                        formType === 'coupon'
                          ? 'bg-card text-primary shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }
                    `}
                  >
                    Coupon Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType(autoApplyToggle === 'product' ? 'automated-product' : 'automated-order')}
                    className={`py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors
                      ${
                        formType !== 'coupon'
                          ? 'bg-card text-primary shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }
                    `}
                  >
                    Automated Promotion
                  </button>
                </div>
              </div>

              {/* Conditionally render form fields */}
              {formType === 'coupon' ? (
                // COUPON CODE VIEW
                <div className="flex flex-col gap-4 border border-border p-4 rounded-2xl bg-muted/10 animate-fade-in">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-foreground">Redeem Coupon Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MONSOON10"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      className="px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono font-bold uppercase tracking-wider"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-foreground">Minimum Order Subtotal (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={formMinOrderAmount}
                      onChange={(e) => setFormMinOrderAmount(e.target.value)}
                      className="px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              ) : (
                // AUTOMATED PROMO VIEW
                <div className="flex flex-col gap-4 border border-border p-4 rounded-2xl bg-muted/10 animate-fade-in">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-foreground">Apply Toggle (Trigger Scope)</label>
                    <div className="grid grid-cols-2 gap-2 border border-border/50 bg-background p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => handleAutoToggleChange('product')}
                        className={`py-1.5 rounded-md text-[11px] font-bold cursor-pointer transition-colors
                          ${
                            autoApplyToggle === 'product'
                              ? 'bg-primary text-primary-foreground shadow-xs'
                              : 'text-muted-foreground hover:text-foreground'
                          }
                        `}
                      >
                        Trigger by Product Qty
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAutoToggleChange('order')}
                        className={`py-1.5 rounded-md text-[11px] font-bold cursor-pointer transition-colors
                          ${
                            autoApplyToggle === 'order'
                              ? 'bg-primary text-primary-foreground shadow-xs'
                              : 'text-muted-foreground hover:text-foreground'
                          }
                        `}
                      >
                        Trigger by Order Amount
                      </button>
                    </div>
                  </div>

                  {autoApplyToggle === 'product' ? (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-foreground">Product Selector (Name/ID)</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Latte (Exact name or Product ID)"
                          value={formCode}
                          onChange={(e) => setFormCode(e.target.value)}
                          className="px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-foreground">Minimum Quantity Requirement</label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={formMinQty}
                          onChange={(e) => setFormMinQty(e.target.value)}
                          className="px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-foreground">Minimum Order Subtotal (₹)</label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={formMinOrderAmount}
                        onChange={(e) => setFormMinOrderAmount(e.target.value)}
                        className="px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Discount Value and Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-muted-foreground">Discount Value</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formDiscountValue}
                    onChange={(e) => setFormDiscountValue(e.target.value)}
                    className="px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-muted-foreground">Discount Type</label>
                  <div className="grid grid-cols-2 gap-1.5 border border-border p-1 rounded-xl bg-background h-10 items-center">
                    <button
                      type="button"
                      onClick={() => setFormDiscountType('percent')}
                      className={`h-full rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer transition-colors
                        ${
                          formDiscountType === 'percent'
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'text-muted-foreground hover:bg-muted'
                        }
                      `}
                    >
                      <Percent className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormDiscountType('fixed')}
                      className={`h-full rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer transition-colors
                        ${
                          formDiscountType === 'fixed'
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'text-muted-foreground hover:bg-muted'
                        }
                      `}
                    >
                      <IndianRupee className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Status active toggle */}
              <div className="flex items-center justify-between rounded-xl border border-border p-3.5 bg-muted/20">
                <span className="text-sm font-semibold text-foreground">Activate Promotion Plan?</span>
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                />
              </div>

              {/* Actions */}
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
                  Save Promotion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
