'use client';

import React from 'react';
import { UserButton } from '@clerk/nextjs';
import { Printer, Scan, Share2, Coffee } from 'lucide-react';
import Link from 'next/link';

interface BackendHeaderProps {
  title: string;
}

export default function BackendHeader({ title }: BackendHeaderProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Odoo Cafe - ${title}`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-card/85 px-6 backdrop-blur-md transition-all duration-300">
      <div className="flex items-center gap-3">
        {/* Logo/Icon */}
        <Link href="/backend" className="flex items-center gap-2 text-primary font-bold text-lg md:hidden">
          <Coffee className="h-6 w-6 stroke-[2.5]" />
          <span>Odoo Cafe</span>
        </Link>
        <span className="hidden h-5 w-px bg-border md:block" />
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Quick action buttons */}
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 p-1">
          <button
            onClick={handlePrint}
            title="Print Page"
            className="rounded-md p-2 text-muted-foreground hover:bg-background hover:text-primary transition-all duration-250 cursor-pointer"
          >
            <Printer className="h-4.5 w-4.5" />
          </button>
          <button
            title="Scan QR Code"
            className="rounded-md p-2 text-muted-foreground hover:bg-background hover:text-primary transition-all duration-250 cursor-pointer"
            onClick={() => alert('Scanner initialized... (mock)')}
          >
            <Scan className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={handleShare}
            title="Share"
            className="rounded-md p-2 text-muted-foreground hover:bg-background hover:text-primary transition-all duration-250 cursor-pointer"
          >
            <Share2 className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Clerk User Button */}
        <div className="flex items-center justify-center rounded-full border border-primary/20 p-0.5 hover:scale-105 transition-all duration-200">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>
    </header>
  );
}
