'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import {
  Coffee,
  Package,
  FolderOpen,
  CreditCard,
  Tag,
  Grid,
  Users,
  BarChart3,
  MonitorPlay,
  LogOut,
  Menu,
  X
} from 'lucide-react';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const menuItems: SidebarItem[] = [
  { name: 'Products', href: '/backend/products', icon: Package },
  { name: 'Category', href: '/backend/category', icon: FolderOpen },
  { name: 'Payment Method', href: '/backend/payment-method', icon: CreditCard },
  { name: 'Coupon & Promotion', href: '/backend/coupon-promotion', icon: Tag },
  { name: 'Booking', href: '/backend/booking', icon: Grid },
  { name: 'User/Employee', href: '/backend/user-employee', icon: Users },
  { name: 'Reports', href: '/backend/reports', icon: BarChart3 },
];

export default function BackendLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = () => {
    signOut(() => window.location.href = '/sign-in');
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all duration-300 lg:static
          ${collapsed ? 'w-20' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Coffee className="h-5 w-5" />
            </div>
            {!collapsed && (
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                Odoo Cafe
              </span>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex lg:hidden items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Menu items */}
        <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200 cursor-pointer
                  ${isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
                onClick={() => setMobileOpen(false)}
              >
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'scale-110' : ''}`} />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}

          <hr className="my-4 border-border" />

          {/* POS Terminal Quick Link */}
          <Link
            href="/pos"
            className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 cursor-pointer"
          >
            <MonitorPlay className="h-5 w-5 shrink-0 text-amber-500" />
            {!collapsed && <span className="truncate">POS Terminal</span>}
          </Link>
        </nav>

        {/* Footer actions */}
        <div className="p-3 border-t border-border bg-muted/20">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Log-Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-x-hidden min-h-screen">
        {/* Mobile top-bar */}
        <div className="flex h-16 items-center border-b border-border bg-card px-4 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="ml-4 font-semibold text-foreground">Backend Layout</span>
        </div>

        <main className="flex-1 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
