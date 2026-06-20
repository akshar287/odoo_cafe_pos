'use client';

import React, { useEffect, useState } from 'react';
import BackendHeader from '@/components/BackendHeader';
import { getSettingsAction, saveSettingsAction } from '@/actions/settings';
import { Loader2, Save, Image as ImageIcon, ExternalLink, QrCode } from 'lucide-react';
import Link from 'next/link';

export default function MobileOrderSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<'online-ordering' | 'qr-menu'>('online-ordering');
  const [backgrounds, setBackgrounds] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const res = await getSettingsAction();
      if (res) {
        setEnabled(res.mobileOrderEnabled);
        setMode(res.mobileOrderMode);
        setBackgrounds(res.mobileOrderBackgrounds || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const res = await saveSettingsAction({
      mobileOrderEnabled: enabled,
      mobileOrderMode: mode,
      mobileOrderBackgrounds: backgrounds,
    });
    setSaving(false);
    if (res.success) {
      setMessage({ type: 'success', text: 'Settings saved successfully.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to save.' });
    }
  };

  const handleAddBg = () => {
    const url = prompt('Enter image URL or color hex code:');
    if (url) {
      setBackgrounds([...backgrounds, url]);
    }
  };

  const removeBg = (idx: number) => {
    setBackgrounds(backgrounds.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/10">
      <BackendHeader title="Mobile Order Settings" />

      <div className="p-6 max-w-4xl w-full mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Configure how customers interact with the self-ordering system and digital menus.
          </p>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Settings</span>
          </button>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between ${
              message.type === 'success'
                ? 'bg-green-500/10 border-green-500/20 text-green-700'
                : 'bg-destructive/10 border-destructive/20 text-destructive'
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="font-bold hover:scale-105">
              &times;
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 flex flex-col gap-8">
              
              {/* Enable Toggle */}
              <div className="flex items-start gap-4 pb-6 border-b border-border">
                <input
                  type="checkbox"
                  id="enable_mo"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-border text-primary focus:ring-primary"
                />
                <div className="flex flex-col gap-1">
                  <label htmlFor="enable_mo" className="font-bold text-lg text-foreground cursor-pointer">
                    Enable Self Ordering / Digital Menu
                  </label>
                  <p className="text-sm text-muted-foreground">
                    If disabled, scanning QR codes or visiting the self-ordering URL will show a &quot;temporarily offline&quot; message.
                  </p>
                </div>
              </div>

              {/* Settings (Only visible if enabled) */}
              <div className={`flex flex-col gap-8 transition-all ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                
                {/* Mode Selection */}
                <div className="flex flex-col gap-3">
                  <label className="font-bold text-foreground">Ordering Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as 'online-ordering' | 'qr-menu')}
                    className="max-w-md px-4 py-2 border border-border rounded-xl bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="online-ordering">Online Ordering (Customers can build cart & order)</option>
                    <option value="qr-menu">QR Menu (View-only digital menu)</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {mode === 'online-ordering'
                      ? 'Customers can add items to their cart and submit orders directly to the Kitchen Display.'
                      : 'Customers can only view the menu. They must place their order with a waiter or cashier.'}
                  </p>
                </div>

                {/* Payment Method */}
                {mode === 'online-ordering' && (
                  <div className="flex flex-col gap-3">
                    <label className="font-bold text-foreground">Payment Method</label>
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border max-w-md">
                      <input type="checkbox" checked readOnly className="rounded text-primary" />
                      <span>Pay at Counter</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Online payments (Stripe/Razorpay) are currently disabled. Customers will pay at the counter.
                    </p>
                  </div>
                )}

                {/* Appearance */}
                <div className="flex flex-col gap-4 pt-6 border-t border-border">
                  <div className="flex items-center gap-2">
                    <label className="font-bold text-foreground">Appearance Backgrounds</label>
                    <button
                      onClick={handleAddBg}
                      className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg font-semibold hover:bg-primary/20"
                    >
                      + Add Image/Color
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload images or set colors to brand your digital menu.
                  </p>
                  
                  <div className="flex flex-col gap-2 max-w-md">
                    {backgrounds.map((bg, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 border border-border rounded-xl bg-background">
                        <div
                          className="w-10 h-10 rounded-lg bg-cover bg-center border border-border"
                          style={{ background: bg.startsWith('#') || bg.startsWith('rgb') ? bg : `url(${bg})` }}
                        />
                        <span className="flex-1 text-sm font-mono truncate">{bg}</span>
                        <button
                          onClick={() => removeBg(i)}
                          className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    {backgrounds.length === 0 && (
                      <div className="p-4 border border-dashed border-border rounded-xl text-center text-xs text-muted-foreground flex items-center justify-center gap-2 bg-muted/20">
                        <ImageIcon className="w-4 h-4 opacity-50" />
                        Using default theme
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 pt-6 border-t border-border">
                  <label className="font-bold text-foreground">Quick Actions</label>
                  <div className="flex gap-4">
                    <Link
                      href="/"
                      target="_blank"
                      className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl text-sm transition-colors border border-border"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Preview Webpage
                    </Link>
                    <Link
                      href="/api/export/qr"
                      target="_blank"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/20"
                    >
                      <QrCode className="w-4 h-4" />
                      Download Table QR Codes (PDF)
                    </Link>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
