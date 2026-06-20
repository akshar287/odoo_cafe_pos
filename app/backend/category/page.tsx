'use client';

import React, { useState, useEffect } from 'react';
import BackendHeader from '@/components/BackendHeader';
import { getCategories, saveCategoriesAction, deleteCategoryAction } from '@/actions/product';
import { Plus, GripVertical, Trash2, ArrowUp, ArrowDown, Save, Check } from 'lucide-react';

const SWATCH_COLORS = [
  '#f97316', // Coral/Orange
  '#10b981', // Emerald/Green
  '#6366f1', // Indigo/Blue
  '#f59e0b', // Amber/Yellow
  '#f43f5e', // Rose/Red
];

interface Category {
  _id: string;
  name: string;
  color: string;
}

export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const loadCategories = async () => {
    setLoading(true);
    const list = await getCategories();
    setCategories(list.map((c: { _id: { toString: () => string }, name: string, color: string }) => ({
      ...c,
      _id: c._id.toString()
    })));
    setLoading(false);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAddNewRow = () => {
    const newId = `new_${Math.random().toString(36).substr(2, 9)}`;
    const newCat = {
      _id: newId,
      name: '',
      color: SWATCH_COLORS[0],
    };
    setCategories((prev) => [...prev, newCat]);
  };

  const handleNameChange = (index: number, newName: string) => {
    setCategories((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], name: newName };
      return copy;
    });
  };

  const handleColorChange = (index: number, newColor: string) => {
    setCategories((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], color: newColor };
      return copy;
    });
  };

  const handleDelete = async (index: number) => {
    const cat = categories[index];
    if (cat._id.startsWith('new_')) {
      // Just remove from client state
      setCategories((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    const res = await deleteCategoryAction(cat._id);
    if (res.success) {
      setCategories((prev) => prev.filter((_, i) => i !== index));
      setMessage({ type: 'success', text: 'Category deleted successfully.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to delete category.' });
    }
  };

  const handleSaveChanges = async () => {
    // Validate names are not empty
    const emptyCheck = categories.some((c) => !c.name.trim());
    if (emptyCheck) {
      setMessage({ type: 'error', text: 'All category names must be filled in.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    const dataToSave = categories.map((c) => ({
      _id: c._id,
      name: c.name.trim(),
      color: c.color,
    }));

    const res = await saveCategoriesAction(dataToSave);
    setSaving(false);

    if (res.success) {
      setMessage({ type: 'success', text: 'Categories saved and reordered successfully!' });
      // Refresh list to update temporary IDs to MongoDB IDs
      loadCategories();
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to save categories.' });
    }
  };

  // Reorder buttons
  const moveUp = (index: number) => {
    if (index === 0) return;
    setCategories((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const moveDown = (index: number) => {
    if (index === categories.length - 1) return;
    setCategories((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  // HTML5 Drag and Drop events
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setCategories((prev) => {
      const copy = [...prev];
      const draggedItem = copy[draggedIndex];
      copy.splice(draggedIndex, 1);
      copy.splice(index, 0, draggedItem);
      setDraggedIndex(index);
      return copy;
    });
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <BackendHeader title="Category Customization" />

      <div className="p-6 flex flex-col gap-6 max-w-4xl w-full mx-auto">
        {/* Intro and actions */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Drag and drop to reorder category tabs. Adjust names and swatch colors to customize POS layout.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAddNewRow}
              className="flex items-center gap-2 bg-muted hover:bg-muted/70 text-foreground font-semibold px-4 py-2 rounded-xl text-sm transition-all duration-200 cursor-pointer border border-border"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>Add Blank Row</span>
            </button>

            <button
              onClick={handleSaveChanges}
              disabled={saving}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2 rounded-xl text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-primary/10 disabled:opacity-50"
            >
              <Save className="h-4.5 w-4.5" />
              <span>{saving ? 'Saving...' : 'Save Layout'}</span>
            </button>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between ${
              message.type === 'success'
                ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400'
                : 'bg-destructive/10 border-destructive/30 text-destructive'
            }`}
          >
            <span>{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded"
            >
              &times;
            </button>
          </div>
        )}

        {/* Categories drag-reorder list */}
        <div className="border border-border bg-card rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-muted/40 border-b border-border py-4 px-6 grid grid-cols-[auto_1fr_auto_auto] gap-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="w-8" />
            <div>Category Name</div>
            <div className="text-center w-52">Color Theme Swatch</div>
            <div className="text-right w-36">Actions</div>
          </div>

          <div className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="py-4 px-6 grid grid-cols-[auto_1fr_auto_auto] gap-4 animate-pulse">
                  <div className="w-8 h-6 bg-muted rounded" />
                  <div className="h-6 bg-muted rounded w-48" />
                  <div className="h-6 bg-muted rounded w-48 mx-auto" />
                  <div className="h-6 bg-muted rounded w-20 ml-auto" />
                </div>
              ))
            ) : categories.length === 0 ? (
              <div className="py-12 px-6 text-center text-muted-foreground">
                No categories configured. Click &quot;Add Blank Row&quot; to begin.
              </div>
            ) : (
              categories.map((cat, index) => (
                <div
                  key={cat._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`py-3.5 px-6 grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center bg-card transition-all duration-200 hover:bg-muted/5 ${
                    draggedIndex === index ? 'opacity-40 border-2 border-primary border-dashed bg-primary/5' : ''
                  }`}
                >
                  {/* Drag Handle */}
                  <div className="cursor-grab text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors">
                    <GripVertical className="h-5 w-5" />
                  </div>

                  {/* Inline Name Input */}
                  <div>
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => handleNameChange(index, e.target.value)}
                      placeholder="Category name (e.g. Drinks, Desserts)"
                      className="w-full px-3 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium"
                    />
                  </div>

                  {/* 5-Color Swatch picker */}
                  <div className="flex justify-center items-center gap-2 w-52">
                    {SWATCH_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleColorChange(index, c)}
                        className={`h-7 w-7 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center
                          ${cat.color === c ? 'border-primary scale-110 shadow-sm' : 'border-transparent hover:scale-105'}
                        `}
                        style={{ backgroundColor: c }}
                      >
                        {cat.color === c && <Check className="h-4.5 w-4.5 text-white" />}
                      </button>
                    ))}
                  </div>

                  {/* Move up / down / delete buttons */}
                  <div className="flex items-center justify-end gap-1.5 w-36">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="h-4.5 w-4.5" />
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === categories.length - 1}
                      className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="h-4.5 w-4.5" />
                    </button>
                    <div className="h-4 w-px bg-border mx-1" />
                    <button
                      onClick={() => handleDelete(index)}
                      className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
