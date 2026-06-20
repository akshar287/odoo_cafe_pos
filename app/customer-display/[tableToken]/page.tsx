'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Coffee, CheckCircle2, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { getPusherClient } from '@/lib/realtime';

interface CartItem { name: string; qty: number; price: number; discount?: number; }
interface CartData { items: CartItem[]; subtotal: number; tax: number; discount: number; total: number; }

export default function CustomerDisplayPage() {
  const params = useParams();
  const tableToken = params.tableToken as string; // in our case we are using tableId directly for simplicity

  const [cart, setCart] = useState<CartData>({ items: [], subtotal: 0, tax: 0, discount: 0, total: 0 });
  const [upiData, setUpiData] = useState<{ url: string; amount: number } | null>(null);
  const [orderStatus, setOrderStatus] = useState<'browsing' | 'paid'>('browsing');

  useEffect(() => {
    const pusher = getPusherClient();
    if (pusher) {
      const channel = pusher.subscribe(`table-${tableToken}`);

      channel.bind('cart-updated', (data: CartData) => {
        setCart(data);
        setUpiData(null);
        setOrderStatus('browsing');
      });

      channel.bind('show-upi-qr', (data: { url: string; amount: number }) => {
        setUpiData(data);
      });

      channel.bind('order-updated', (data: { status: string }) => {
        if (data.status === 'paid') {
          setOrderStatus('paid');
          setUpiData(null);
          // Reset after a delay
          setTimeout(() => {
            setOrderStatus('browsing');
            setCart({ items: [], subtotal: 0, tax: 0, discount: 0, total: 0 });
          }, 5000);
        }
      });

      return () => {
        pusher.unsubscribe(`table-${tableToken}`);
      };
    }
  }, [tableToken]);

  if (orderStatus === 'paid') {
    return (
      <div className="min-h-screen bg-green-500 flex flex-col items-center justify-center text-white p-12 text-center animate-in zoom-in duration-500">
        <CheckCircle2 className="h-48 w-48 mb-8 opacity-90" />
        <h1 className="text-6xl font-black mb-4 tracking-tight">Payment Successful!</h1>
        <p className="text-3xl font-medium opacity-90">Thank you for visiting Odoo Cafe. We hope to see you again!</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground overflow-hidden font-sans">
      {/* Left Panel: Branding / Marketing */}
      <div className="w-1/2 bg-gradient-to-br from-primary via-orange-500 to-amber-500 flex flex-col justify-between p-16 text-primary-foreground relative">
        <div className="absolute top-0 right-0 h-[800px] w-[800px] rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="flex items-center gap-4 z-10">
          <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
            <Coffee className="h-8 w-8 text-white" />
          </div>
          <span className="font-black text-3xl tracking-widest uppercase">Odoo Cafe</span>
        </div>

        <div className="z-10 max-w-lg">
          <h2 className="text-6xl font-black leading-tight mb-6">
            Welcome!<br />Please review your order.
          </h2>
          <p className="text-2xl text-white/80 font-medium">
            Let us know if you have any allergies or dietary preferences before paying.
          </p>
        </div>

        <div className="z-10 flex items-center gap-2 text-white/60">
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-semibold uppercase tracking-wider">Syncing live with terminal</span>
        </div>
      </div>

      {/* Right Panel: Cart / Payment */}
      <div className="w-1/2 bg-card p-12 flex flex-col shadow-2xl relative z-20">
        {upiData ? (
          <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in slide-in-from-right-8 duration-500">
            <h3 className="text-3xl font-black mb-2 text-foreground">Scan to Pay</h3>
            <p className="text-muted-foreground text-lg mb-12">Use any UPI app to complete your payment.</p>
            
            <div className="p-4 bg-white rounded-3xl shadow-2xl border border-border">
              <div className="h-80 w-80 relative">
                <Image src={upiData.url} alt="UPI QR" fill className="object-contain" />
              </div>
            </div>

            <div className="mt-12 text-center flex flex-col items-center gap-2">
              <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Amount Payable</span>
              <span className="text-6xl font-black text-primary">₹{upiData.amount.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <h3 className="text-2xl font-black mb-8 flex items-center gap-3 border-b border-border pb-6">
              <ShoppingBag className="h-6 w-6 text-primary" />
              Your Cart
            </h3>

            {cart.items.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-xl font-medium">
                Your cart is empty.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-4 flex flex-col gap-6">
                {cart.items.map((item: CartItem, idx: number) => (
                  <div key={idx} className="flex justify-between items-center bg-muted/20 p-4 rounded-2xl border border-border">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center font-black text-lg text-primary">
                        {item.qty}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xl font-bold">{item.name}</span>
                        {(item.discount || 0) > 0 && <span className="text-sm text-green-600 font-semibold">Discount applied</span>}
                      </div>
                    </div>
                    <span className="text-2xl font-black">₹{((item.price * item.qty) - (item.discount || 0)).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 pt-8 border-t border-border flex flex-col gap-4">
              <div className="flex justify-between text-xl text-muted-foreground font-semibold">
                <span>Subtotal</span>
                <span>₹{(cart.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl text-muted-foreground font-semibold">
                <span>Tax</span>
                <span>₹{(cart.tax || 0).toFixed(2)}</span>
              </div>
              {(cart.discount || 0) > 0 && (
                <div className="flex justify-between text-xl text-green-600 font-semibold">
                  <span>Discount</span>
                  <span>-₹{(cart.discount || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-5xl font-black mt-4 pt-4 border-t border-border">
                <span>Total</span>
                <span className="text-primary">₹{(cart.total || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
