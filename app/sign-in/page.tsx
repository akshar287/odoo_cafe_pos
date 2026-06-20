'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/actions/auth';
import { Loader2, User, Key, Mail } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'staff' | 'admin'>('staff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    formData.append('type', tab);

    const result = await loginAction(formData);
    
    if (result.success && result.redirect) {
      router.push(result.redirect);
    } else {
      setError(result.error || 'Failed to login');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, oklch(0.58 0.22 28) 0%, oklch(0.68 0.19 28) 40%, oklch(0.78 0.14 35) 100%)',
        }}
      >
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'oklch(0.88 0.09 35)' }} />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full opacity-15"
          style={{ background: 'oklch(0.58 0.22 28)' }} />
        <div className="absolute top-1/3 right-8 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'oklch(0.98 0.005 35)' }} />

        <div className="relative z-10 text-center px-12 max-w-md">
          <div className="mx-auto mb-8 w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl"
            style={{ background: 'oklch(0.98 0.005 35 / 20%)' }}>
            <span className="text-5xl">☕</span>
          </div>

          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Odoo Cafe POS
          </h1>
          <p className="text-white/80 text-lg leading-relaxed mb-8">
            Smart restaurant management at your fingertips. Manage orders, track tables, and grow your business.
          </p>

          <div className="space-y-3 text-left">
            {[
              { icon: '🏪', text: 'Multi-floor table management' },
              { icon: '📋', text: 'Real-time Kitchen Display System' },
              { icon: '💳', text: 'Flexible payment methods' },
              { icon: '📊', text: 'Sales analytics & reports' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-white/85 text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-0 right-0 text-center">
          <span className="text-white/50 text-xs">© 2025 Odoo Cafe · All rights reserved</span>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 py-12"
        style={{ background: 'oklch(0.985 0.005 35)' }}
      >
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <span className="text-4xl">☕</span>
          <span className="text-2xl font-bold" style={{ color: 'oklch(0.68 0.19 28)' }}>
            Odoo Cafe POS
          </span>
        </div>

        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back
            </h2>
            <p className="text-sm text-gray-500">
              Sign in to your account to continue
            </p>
          </div>

          {/* Tabs */}
          <div className="flex p-1 bg-gray-100 rounded-xl mb-8">
            <button
              type="button"
              onClick={() => setTab('staff')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                tab === 'staff' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Staff Login
            </button>
            <button
              type="button"
              onClick={() => setTab('admin')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                tab === 'admin' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Admin Login
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {tab === 'staff' ? (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Employee ID</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    name="username"
                    required
                    autoFocus
                    placeholder="e.g. cashier1"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-medium"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Admin Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    name="email"
                    type="email"
                    required
                    autoFocus
                    placeholder="admin@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-medium"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/20 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
