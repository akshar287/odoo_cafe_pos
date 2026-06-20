'use client';

import React, { useState, useEffect } from 'react';
import BackendHeader from '@/components/BackendHeader';
import {
  getProducts,
  saveProductAction,
  bulkDeleteProductsAction,
  bulkArchiveProductsAction,
  getCategories,
} from '@/actions/product';
import { Plus, Search, Trash2, Archive, Edit2, X } from 'lucide-react';

interface Category {
  _id: string;
  name: string;
  color?: string;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  tax: number;
  category: Category;
  description?: string;
  isVeg: boolean;
  sendToKDS: boolean;
  unitOfMeasure: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  // Drawer / Form states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formTax, setFormTax] = useState(5);
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsVeg, setFormIsVeg] = useState(false);
  const [formSendToKDS, setFormSendToKDS] = useState(true);
  const [formUnit, setFormUnit] = useState('units');

  // Inline Category creation popup inside form
  const [showInlineCatPopup, setShowInlineCatPopup] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Fetch functions
  const loadData = async () => {
    setLoading(true);
    const prodList = await getProducts({ search, categoryId: selectedCategory });
    const catList = await getCategories();
    setProducts(prodList.map((p: { _id: { toString: () => string }, category?: { _id: { toString: () => string } } }) => ({ ...p, _id: p._id.toString(), category: p.category ? { ...p.category, _id: p.category._id.toString() } : null } as unknown as Product)));
    setCategories(catList.map((c: { _id: { toString: () => string } }) => ({ ...c, _id: c._id.toString() } as unknown as Category)));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedCategory]);

  const handleCheckboxToggle = (id: string) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (checkedIds.length === products.length) {
      setCheckedIds([]);
    } else {
      setCheckedIds(products.map((p) => p._id));
    }
  };

  const openDrawer = (product: Product | null = null) => {
    if (product) {
      setEditingProduct(product);
      setFormName(product.name);
      setFormPrice(String(product.price));
      setFormTax(product.tax || 5);
      setFormCategory(product.category?._id || '');
      setFormDescription(product.description || '');
      setFormIsVeg(product.isVeg || false);
      setFormSendToKDS(product.sendToKDS !== false);
      setFormUnit(product.unitOfMeasure || 'units');
    } else {
      setEditingProduct(null);
      setFormName('');
      setFormPrice('');
      setFormTax(5);
      setFormCategory(categories[0]?._id || '');
      setFormDescription('');
      setFormIsVeg(false);
      setFormSendToKDS(true);
      setFormUnit('units');
    }
    setIsDrawerOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrice.trim() || !formCategory) {
      alert('Please fill in Name, Price, and Category');
      return;
    }

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      alert('Price must be a valid positive number');
      return;
    }

    const res = await saveProductAction({
      id: editingProduct?._id,
      name: formName.trim(),
      price: priceNum,
      tax: formTax,
      category: formCategory,
      description: formDescription.trim(),
      isVeg: formIsVeg,
      sendToKDS: formSendToKDS,
      unitOfMeasure: formUnit,
    });

    if (res.success) {
      setIsDrawerOpen(false);
      loadData();
    } else {
      alert(res.error || 'Failed to save product');
    }
  };

  const handleInlineCatCreate = () => {
    if (!newCatName.trim()) return;
    // Set formCategory to the new category name. 
    // The server action creates it automatically if it's not a valid Mongoose ID!
    setFormCategory(newCatName.trim());
    setShowInlineCatPopup(false);
    setNewCatName('');
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${checkedIds.length} products?`)) return;
    const res = await bulkDeleteProductsAction(checkedIds);
    if (res.success) {
      setCheckedIds([]);
      loadData();
    } else {
      alert(res.error || 'Failed to delete products');
    }
  };

  const handleBulkArchive = async () => {
    const res = await bulkArchiveProductsAction(checkedIds);
    if (res.success) {
      setCheckedIds([]);
      loadData();
    } else {
      alert(res.error || 'Failed to archive products');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <BackendHeader title="Products Management" />

      <div className="p-6 flex flex-col gap-6 max-w-7xl w-full mx-auto">
        {/* Search, filters, actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border bg-card rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3.5 py-2 border border-border bg-card rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => openDrawer(null)}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-primary/10"
            >
              <Plus className="h-4.5 w-4.5 stroke-[2.5]" />
              <span>New Product</span>
            </button>
          </div>
        </div>

        {/* Main List Table */}
        <div className="border border-border bg-card rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-4 px-6 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={products.length > 0 && checkedIds.length === products.length}
                      onChange={handleSelectAll}
                      className="rounded border-border focus:ring-primary text-primary"
                    />
                  </th>
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Price</th>
                  <th className="py-4 px-6">Tax Rate</th>
                  <th className="py-4 px-6">Attributes</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-6 text-center">
                        <div className="h-4 w-4 bg-muted rounded mx-auto" />
                      </td>
                      <td className="py-4 px-6">
                        <div className="h-4 w-40 bg-muted rounded" />
                      </td>
                      <td className="py-4 px-6">
                        <div className="h-4 w-24 bg-muted rounded" />
                      </td>
                      <td className="py-4 px-6">
                        <div className="h-4 w-16 bg-muted rounded" />
                      </td>
                      <td className="py-4 px-6">
                        <div className="h-4 w-12 bg-muted rounded" />
                      </td>
                      <td className="py-4 px-6">
                        <div className="h-4 w-20 bg-muted rounded" />
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="h-8 w-16 bg-muted rounded ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 px-6 text-center text-muted-foreground">
                      No products found. Click &quot;New Product&quot; to add one.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr
                      key={p._id}
                      className={`hover:bg-muted/10 transition-colors duration-150 ${
                        checkedIds.includes(p._id) ? 'bg-primary/5 hover:bg-primary/10' : ''
                      }`}
                    >
                      <td className="py-4 px-6 text-center">
                        <input
                          type="checkbox"
                          checked={checkedIds.includes(p._id)}
                          onChange={() => handleCheckboxToggle(p._id)}
                          className="rounded border-border focus:ring-primary text-primary"
                        />
                      </td>
                      <td className="py-4 px-6 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                              p.isVeg ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            title={p.isVeg ? 'Veg' : 'Non-Veg'}
                          />
                          <span>{p.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: `${p.category?.color || '#cbd5e1'}20`,
                            color: p.category?.color || '#64748b',
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: p.category?.color || '#64748b' }}
                          />
                          {p.category?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-semibold">₹{p.price.toFixed(2)}</td>
                      <td className="py-4 px-6">{p.tax}% GST</td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1.5">
                          {p.sendToKDS && (
                            <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs px-2 py-0.5 rounded-md font-medium">
                              KDS
                            </span>
                          )}
                          {p.unitOfMeasure && (
                            <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-md font-medium">
                              {p.unitOfMeasure}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => openDrawer(p)}
                          className="inline-flex items-center gap-1 text-primary hover:text-primary-dark font-medium p-1.5 hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="h-4 w-4" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Floating Bulk Action Bar */}
        {checkedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-6 bg-card border border-border px-6 py-4 rounded-2xl shadow-xl shadow-black/10 animate-slide-up">
            <span className="text-sm font-medium text-muted-foreground">
              <strong className="text-foreground text-base">{checkedIds.length}</strong> items selected
            </span>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-3">
              <button
                onClick={handleBulkArchive}
                className="flex items-center gap-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                <Archive className="h-4.5 w-4.5" />
                <span>Archive</span>
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer shadow-md shadow-destructive/10"
              >
                <Trash2 className="h-4.5 w-4.5" />
                <span>Delete Selected</span>
              </button>
              <button
                onClick={() => setCheckedIds([])}
                className="text-muted-foreground hover:text-foreground text-sm font-medium px-2 py-1 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-out Drawer Panel */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop overlay */}
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer container */}
          <div className="relative z-10 w-full max-w-lg bg-card border-l border-border h-full flex flex-col shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                {editingProduct ? 'Edit Product' : 'New Product'}
              </h2>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col gap-5 py-6">
              {/* Product Name */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-muted-foreground">Product Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Cafe Latte"
                  className="px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Price & UoM */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-muted-foreground">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="0.00"
                    className="px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-muted-foreground">Unit of Measure</label>
                  <input
                    type="text"
                    required
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="e.g. units, ml, serving"
                    className="px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Tax rate & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-muted-foreground">Tax Rate (GST)</label>
                  <select
                    value={formTax}
                    onChange={(e) => setFormTax(parseInt(e.target.value))}
                    className="px-3.5 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2 relative">
                  <label className="text-sm font-semibold text-muted-foreground">Category</label>
                  <div className="flex gap-1.5">
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="flex-1 px-3.5 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowInlineCatPopup(!showInlineCatPopup)}
                      className="p-2 border border-border bg-background rounded-xl hover:bg-muted text-primary transition-colors cursor-pointer"
                      title="Create Category Inline"
                    >
                      <Plus className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {/* Inline Category popup */}
                  {showInlineCatPopup && (
                    <div className="absolute right-0 top-18 z-20 w-64 bg-card border border-border p-4 rounded-xl shadow-xl flex flex-col gap-3">
                      <h4 className="text-xs font-bold text-foreground">Add Category Inline</h4>
                      <input
                        type="text"
                        placeholder="Category name"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="px-3 py-1.5 border border-border bg-background rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setShowInlineCatPopup(false)}
                          className="px-2 py-1 text-muted-foreground hover:bg-muted rounded"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleInlineCatCreate}
                          className="bg-primary text-primary-foreground px-2.5 py-1 rounded font-semibold hover:bg-primary/95"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-muted-foreground">Description (Optional)</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Product description and details..."
                  rows={3}
                  className="px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              {/* Veg Toggle & KDS send toggle */}
              <div className="flex items-center justify-between rounded-xl border border-border p-3.5 bg-muted/25">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">Is Vegetarian?</span>
                  <span className="text-xs text-muted-foreground">Toggle green indicator dot</span>
                </div>
                <input
                  type="checkbox"
                  checked={formIsVeg}
                  onChange={(e) => setFormIsVeg(e.target.checked)}
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border p-3.5 bg-muted/25">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">Send to Kitchen KDS?</span>
                  <span className="text-xs text-muted-foreground">Send orders automatically to preparation screen</span>
                </div>
                <input
                  type="checkbox"
                  checked={formSendToKDS}
                  onChange={(e) => setFormSendToKDS(e.target.checked)}
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                />
              </div>

              {/* Action Buttons */}
              <div className="mt-auto pt-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2 border border-border hover:bg-muted text-muted-foreground text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-5 py-2 rounded-xl text-sm transition-colors cursor-pointer shadow-md shadow-primary/10"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
