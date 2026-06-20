'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Coffee,
  ChefHat,
  Smartphone,
  BarChart3,
  Zap,
  ShieldCheck,
  ArrowRight,
  Star,
  CheckCircle2,
  Menu,
  X,
  Utensils,
  CreditCard,
  Users,
  MonitorPlay,
} from 'lucide-react';

const features = [
  {
    icon: Smartphone,
    title: 'Self-Ordering',
    desc: 'Customers scan a QR code and place orders directly from their phone — no waiting for a waiter.',
    color: 'from-orange-400 to-amber-500',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    iconColor: 'text-orange-500',
  },
  {
    icon: MonitorPlay,
    title: 'Kitchen Display',
    desc: 'Orders appear instantly on the KDS screen in the kitchen. Cooks can mark items ready in real time.',
    color: 'from-blue-400 to-cyan-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    iconColor: 'text-blue-500',
  },
  {
    icon: CreditCard,
    title: 'Multiple Payments',
    desc: 'Accept Cash, Card, and UPI with QR code generation — all payments handled seamlessly at checkout.',
    color: 'from-green-400 to-emerald-500',
    bg: 'bg-green-50 dark:bg-green-900/20',
    iconColor: 'text-green-500',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Reports',
    desc: 'Live analytics on revenue, top products, and category performance — all filtered by time period.',
    color: 'from-purple-400 to-violet-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    iconColor: 'text-purple-500',
  },
  {
    icon: Users,
    title: 'Staff Management',
    desc: 'Add employees, assign roles, and track who handled each order — full accountability built in.',
    color: 'from-pink-400 to-rose-500',
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    iconColor: 'text-pink-500',
  },
  {
    icon: ChefHat,
    title: 'Table Management',
    desc: 'Visual floor plans with real-time table status. See which tables are occupied at a glance.',
    color: 'from-amber-400 to-yellow-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    iconColor: 'text-amber-500',
  },
];

const steps = [
  { step: '01', title: 'Open a Session', desc: 'Staff logs in and opens the POS session with starting cash amount.' },
  { step: '02', title: 'Select a Table', desc: 'Choose any available table from the visual floor plan.' },
  { step: '03', title: 'Take the Order', desc: 'Add items to cart from the menu, apply coupons or discounts.' },
  { step: '04', title: 'Send to Kitchen', desc: 'Order is instantly pushed to the Kitchen Display System.' },
  { step: '05', title: 'Collect Payment', desc: 'Choose Cash, Card, or UPI — receipt is printed or emailed.' },
  { step: '06', title: 'View Reports', desc: 'Admin tracks daily revenue, best products, and session summaries.' },
];

const stats = [
  { value: '3x', label: 'Faster Order Processing' },
  { value: '0 Error', label: 'Order Mistakes' },
  { value: '100%', label: 'Uptime Reliability' },
  { value: '∞', label: 'Orders Per Day' },
];

import QRScannerModal from '@/components/QRScannerModal';

export default function HomePage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // Parallax subtle effect
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        heroRef.current.style.transform = `translateY(${window.scrollY * 0.15}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ── NAVBAR ─────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
              <Coffee className="h-5 w-5 text-white" />
            </div>
            <span className="font-black text-xl tracking-tight text-gray-900">Odoo Cafe</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-500">
            <a href="#features" className="hover:text-orange-500 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-orange-500 transition-colors">How It Works</a>
            <a href="#stats" className="hover:text-orange-500 transition-colors">About</a>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="hidden md:flex items-center gap-1.5 text-sm font-bold text-gray-600 hover:text-orange-500 px-4 py-2 rounded-xl hover:bg-orange-50 transition-all"
            >
              <ShieldCheck className="h-4 w-4" />
              Staff Login
            </Link>
            <button
              onClick={() => setScannerOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-orange-200 hover:shadow-orange-300 hover:scale-105 transition-all"
            >
              <Utensils className="h-4 w-4" />
              <span className="hidden sm:inline">Order Now</span>
              <span className="sm:hidden">Order</span>
            </button>
            {/* Mobile menu toggle */}
            <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-5 py-4 flex flex-col gap-3">
            <a href="#features" onClick={() => setMobileNavOpen(false)} className="text-sm font-semibold text-gray-600 py-2">Features</a>
            <a href="#how-it-works" onClick={() => setMobileNavOpen(false)} className="text-sm font-semibold text-gray-600 py-2">How It Works</a>
            <Link href="/sign-in" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-2 text-sm font-bold text-gray-600 py-2">
              <ShieldCheck className="h-4 w-4" /> Staff Login
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden pt-16">
        {/* Animated background blobs */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-orange-100 blur-[120px] opacity-70 animate-pulse" />
          <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-amber-100 blur-[100px] opacity-60 animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/3 right-10 h-[300px] w-[300px] rounded-full bg-rose-50 blur-[80px] opacity-50" />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 -z-10 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

        <div ref={heroRef} className="max-w-4xl mx-auto px-5 flex flex-col items-center gap-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-600 px-4 py-2 rounded-full text-xs font-bold shadow-sm">
            <Zap className="h-3.5 w-3.5 fill-current" />
            Next-Generation Café Point of Sale
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 leading-[1.05] tracking-tight">
            The Smartest Way to
            <br />
            <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-rose-400 bg-clip-text text-transparent">
              Run Your Café
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-gray-500 font-medium max-w-2xl leading-relaxed">
            Odoo Cafe POS is an all-in-one restaurant management system — from self-ordering QR menus and kitchen displays to real-time analytics and UPI payments. Built for modern cafés.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
            {/* MAIN CTA: Self Order */}
            <button
              onClick={() => setScannerOpen(true)}
              className="group relative flex items-center gap-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-lg px-8 py-4 rounded-2xl shadow-2xl shadow-orange-200 hover:shadow-orange-300 hover:scale-105 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Utensils className="relative h-6 w-6" />
              <span className="relative">Start Self Ordering</span>
              <ArrowRight className="relative h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Secondary CTA */}
            <a
              href="#how-it-works"
              className="flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 font-bold text-base px-7 py-4 rounded-2xl hover:border-orange-300 hover:text-orange-500 transition-all duration-200"
            >
              See How It Works
            </a>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-2 text-sm text-gray-400 font-semibold">
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-500" /> No signup needed</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-500" /> QR self-ordering</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-500" /> UPI + Cash + Card</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-500" /> Real-time kitchen sync</div>
          </div>
        </div>

        {/* Floating product cards decoration */}
        <div className="absolute left-6 top-1/3 hidden xl:block animate-bounce" style={{ animationDuration: '3s' }}>
          <div className="bg-white rounded-2xl p-4 shadow-xl border border-gray-100 flex items-center gap-3 text-left">
            <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center"><Coffee className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-xs font-black text-gray-800">Café Latte</p>
              <p className="text-xs text-orange-500 font-bold">₹120</p>
            </div>
          </div>
        </div>
        <div className="absolute right-6 top-1/2 hidden xl:block animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }}>
          <div className="bg-white rounded-2xl p-4 shadow-xl border border-gray-100 flex items-center gap-3">
            <div className="h-10 w-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-black text-gray-800">Order Placed!</p>
              <p className="text-xs text-green-500 font-bold">Sent to Kitchen</p>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-400 animate-bounce">
          <span className="text-xs font-semibold">Scroll to explore</span>
          <div className="h-8 w-px bg-gradient-to-b from-gray-300 to-transparent" />
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────────────── */}
      <section id="stats" className="py-16 bg-gradient-to-r from-orange-500 to-amber-500">
        <div className="max-w-5xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center text-white">
              <div className="text-4xl md:text-5xl font-black mb-1">{s.value}</div>
              <div className="text-sm font-bold opacity-80">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-5 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block bg-orange-100 text-orange-600 text-xs font-black px-4 py-2 rounded-full mb-4 uppercase tracking-wider">Everything You Need</span>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">Packed with powerful features</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">One system that handles ordering, kitchen management, payments, and analytics — so your staff can focus on serving great food.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white rounded-3xl p-7 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                  <div className={`h-12 w-12 ${f.bg} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-6 w-6 ${f.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-black text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block bg-amber-100 text-amber-600 text-xs font-black px-4 py-2 rounded-full mb-4 uppercase tracking-wider">Simple Process</span>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">How Odoo Cafe works</h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">From opening the session to collecting payment — everything flows in 6 simple steps.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <div key={s.step} className="relative bg-gray-50 rounded-3xl p-7 border border-gray-100 hover:border-orange-200 hover:bg-orange-50/30 transition-all duration-300">
                <div className="text-5xl font-black text-gray-100 mb-3 select-none">{s.step}</div>
                <h3 className="text-base font-black text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 z-10 h-6 w-6 bg-orange-100 rounded-full flex items-center justify-center text-orange-500">
                    <ArrowRight className="h-3 w-3" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SELF ORDER CTA SECTION ─────────────────────────────────── */}
      <section className="py-24 px-5 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/3 h-96 w-96 rounded-full bg-orange-500/10 blur-[80px]" />
          <div className="absolute bottom-0 right-1/3 h-80 w-80 rounded-full bg-amber-500/10 blur-[60px]" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 text-orange-400 px-4 py-2 rounded-full text-xs font-black mb-8 uppercase tracking-wider">
            <Smartphone className="h-3.5 w-3.5" />
            Self Ordering Available Now
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
            Hungry? Order
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent"> directly</span>
            <br />from your phone
          </h2>
          <p className="text-lg text-gray-400 mb-10 leading-relaxed max-w-xl mx-auto">
            Browse our full menu, add items to your cart, and place your order in seconds — no app download required. Just scan & order!
          </p>
          <button
            onClick={() => setScannerOpen(true)}
            className="group inline-flex items-center gap-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xl px-10 py-5 rounded-2xl shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 transition-all duration-300"
          >
            <Utensils className="h-6 w-6" />
            Open Digital Menu
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1.5 transition-transform" />
          </button>
          <p className="text-gray-500 text-sm mt-5 font-semibold">No app needed · Works on any device · Instant kitchen sync</p>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 border-t border-gray-800 py-12 px-5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center">
              <Coffee className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-black text-lg text-white block leading-none">Odoo Cafe</span>
              <span className="text-xs text-gray-500 font-semibold">Smart POS for Modern Cafés</span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm font-semibold text-gray-500">
            <Link href="/menu" className="hover:text-orange-400 transition-colors">Digital Menu</Link>
            <Link href="/sign-in" className="hover:text-orange-400 transition-colors">Staff Login</Link>
            <Link href="/backend" className="hover:text-orange-400 transition-colors">Admin Panel</Link>
          </div>

          <p className="text-xs text-gray-600 font-semibold">
            © 2026 Odoo Cafe. Powered by Next.js 15.
          </p>
        </div>
      </footer>

      {scannerOpen && <QRScannerModal onClose={() => setScannerOpen(false)} />}
    </div>
  );
}
