'use client';

import React, { useState, useRef } from 'react';
import { X, DollarSign, CreditCard, QrCode, CheckCircle2, Printer, Mail } from 'lucide-react';
import QRCode from 'qrcode';
import Image from 'next/image';
import { useReactToPrint } from 'react-to-print';
import { Receipt } from './Receipt';
import { broadcastUpiQrAction } from '@/actions/realtime';

interface CheckoutModalProps {
  tableId: string;
  calculated: { subtotal: number; tax: number; totalDiscount: number; total: number };
  paymentMethods: Array<{ _id: string; name: string; type: string; upiId?: string }>;
  onClose: () => void;
  onSubmitOrder: (methodId: string, refId?: string) => Promise<{ success: boolean; order?: Record<string, unknown>; error?: string }>;
}

export default function CheckoutModal({
  tableId,
  calculated,
  paymentMethods,
  onClose,
  onSubmitOrder,
}: CheckoutModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<{ type: string; _id: string; upiId?: string; name?: string } | null>(null);
  const [cashReceived, setCashReceived] = useState('');
  const [cardRef, setCardRef] = useState('');
  const [upiQrUrl, setUpiQrUrl] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Record<string, unknown> | null>(null);

  // Printing logic
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const [isEmailing, setIsEmailing] = useState(false);

  const handleEmail = async () => {
    const email = window.prompt('Enter customer email address:');
    if (!email) return;

    setIsEmailing(true);
    try {
      const res = await fetch('/api/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, order: successOrder }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.mock ? 'Mock Email Sent!' : 'Email Sent Successfully!');
      } else {
        alert('Failed to send email: ' + data.error);
      }
    } catch {
      alert('Error sending email');
    } finally {
      setIsEmailing(false);
    }
  };

  const handleSelectMethod = async (method: { type: string; _id: string; upiId?: string; name?: string }) => {
    setSelectedMethod(method);
    if (method.type === 'upi' && method.upiId) {
      const payUrl = `upi://pay?pa=${encodeURIComponent(method.upiId)}&pn=${encodeURIComponent(
        'Odoo Cafe'
      )}&am=${calculated.total.toFixed(2)}`;
      
      try {
        const url = await QRCode.toDataURL(payUrl, { width: 220, margin: 1 });
        setUpiQrUrl(url);
        // Broadcast to customer display
        await broadcastUpiQrAction(tableId, { url, amount: calculated.total });
      } catch (err) {
        console.error('Failed to generate QR', err);
      }
    }
  };

  const handleConfirm = async () => {
    if (!selectedMethod) return;

    let refId = undefined;
    if (selectedMethod.type === 'card') {
      if (!cardRef.trim()) {
        alert('Please enter a transaction reference for card payments.');
        return;
      }
      refId = cardRef.trim();
    }

    setIsSubmitting(true);
    const res = await onSubmitOrder(selectedMethod._id, refId);
    setIsSubmitting(false);

    if (res.success && res.order) {
      setSuccessOrder(res.order);
    } else {
      alert(res.error || 'Checkout failed');
    }
  };

  const cashDue = parseFloat(cashReceived) - calculated.total;

  if (successOrder) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
        <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center gap-4 animate-in zoom-in-95">
          <div className="h-16 w-16 bg-green-500/10 rounded-full flex items-center justify-center mb-2">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-black text-foreground">Order Confirmed!</h2>
          <p className="text-muted-foreground text-sm">
            Order <strong className="text-foreground">#{successOrder.orderNumber}</strong> has been successfully placed.
          </p>
          <div className="bg-muted/30 w-full rounded-2xl p-4 flex flex-col gap-2 my-2 border border-border text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">Total Paid</span>
              <span className="font-bold text-primary">₹{calculated.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">Method</span>
              <span className="font-bold capitalize">{selectedMethod?.name}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            <button 
              onClick={() => handlePrint()}
              className="flex items-center justify-center gap-2 border border-border hover:bg-muted py-3 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <Printer className="h-4 w-4 text-muted-foreground" />
              Print Receipt
            </button>
            <button 
              onClick={handleEmail}
              disabled={isEmailing}
              className="flex items-center justify-center gap-2 border border-border hover:bg-muted py-3 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              <Mail className="h-4 w-4 text-muted-foreground" />
              {isEmailing ? 'Sending...' : 'Email Receipt'}
            </button>
          </div>
          
          <button
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 rounded-xl text-sm mt-2 shadow-lg shadow-primary/20"
          >
            Start New Order
          </button>

          {/* Hidden receipt for printing */}
          <div className="hidden">
            <Receipt ref={printRef} order={successOrder} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[85vh] md:h-auto max-h-[800px]">
        
        {/* Left Side: Summary & Payment Method Select */}
        <div className="w-full md:w-1/2 border-b md:border-b-0 md:border-r border-border flex flex-col p-6 bg-muted/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-foreground">Checkout</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors cursor-pointer md:hidden">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2 shadow-sm mb-6">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Amount Due</span>
            <span className="text-4xl font-black text-primary">₹{calculated.total.toFixed(2)}</span>
          </div>

          <span className="text-sm font-bold text-foreground mb-3">Select Payment Method</span>
          <div className="flex flex-col gap-2 overflow-y-auto pr-2">
            {paymentMethods.map(method => {
              let Icon = DollarSign;
              if (method.type === 'card') Icon = CreditCard;
              if (method.type === 'upi') Icon = QrCode;

              const isSelected = selectedMethod?._id === method._id;

              return (
                <button
                  key={method._id}
                  onClick={() => handleSelectMethod(method)}
                  className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all cursor-pointer
                    ${isSelected 
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/5' 
                      : 'border-border bg-card hover:bg-muted/50 hover:border-primary/30'}
                  `}
                >
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary/20' : 'bg-muted'}`}>
                    <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-foreground capitalize">{method.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{method.type} Payment</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Specific Flow details */}
        <div className="w-full md:w-1/2 p-6 flex flex-col bg-card relative">
          <button onClick={onClose} className="absolute top-6 right-6 p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors cursor-pointer hidden md:flex">
            <X className="h-5 w-5" />
          </button>

          {!selectedMethod ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-muted-foreground">
              <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center border border-border">
                <DollarSign className="h-8 w-8 opacity-20" />
              </div>
              <p className="text-sm font-semibold max-w-[200px]">Select a payment method from the left to proceed.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col pt-8">
              <h3 className="text-lg font-bold text-foreground mb-1 capitalize">{selectedMethod.name} Payment</h3>
              <p className="text-xs text-muted-foreground mb-6">Complete the transaction via {selectedMethod.type}</p>

              <div className="flex-1">
                {/* Cash Flow */}
                {selectedMethod.type === 'cash' && (
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-muted-foreground">Cash Received (₹)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={cashReceived}
                        onChange={e => setCashReceived(e.target.value)}
                        className="w-full px-4 py-3 text-2xl font-black border border-border bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                        autoFocus
                      />
                    </div>
                    
                    <div className={`p-4 rounded-xl border flex flex-col gap-1 text-center transition-colors
                      ${!cashReceived ? 'bg-muted/10 border-border' : cashDue >= 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}
                    `}>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Change Due</span>
                      <span className={`text-3xl font-black ${!cashReceived ? 'text-muted-foreground' : cashDue >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-500'}`}>
                        {cashReceived && !isNaN(cashDue) ? (cashDue >= 0 ? `₹${cashDue.toFixed(2)}` : `Owe ₹${Math.abs(cashDue).toFixed(2)}`) : '₹0.00'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Card Flow */}
                {selectedMethod.type === 'card' && (
                  <div className="flex flex-col gap-4">
                    <div className="p-4 bg-muted/20 border border-border rounded-xl text-sm font-semibold text-muted-foreground text-center">
                      Swipe or tap card on the POS terminal.
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-muted-foreground">Transaction Reference (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. TXN-998822"
                        value={cardRef}
                        onChange={e => setCardRef(e.target.value)}
                        className="w-full px-4 py-3 border border-border bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                {/* UPI Flow */}
                {selectedMethod.type === 'upi' && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-48 w-48 border border-border bg-white rounded-2xl flex items-center justify-center shadow-inner p-1">
                      {upiQrUrl ? (
                        <Image src={upiQrUrl} alt="UPI QR Pay Code" fill className="object-contain" />
                      ) : (
                        <span className="text-xs text-muted-foreground animate-pulse">Rendering QR...</span>
                      )}
                    </div>
                    <div className="text-center flex flex-col gap-1">
                      <span className="text-sm font-bold text-foreground">Scan with any UPI App</span>
                      <span className="text-xs font-mono text-muted-foreground px-2 py-1 bg-muted rounded-md">{selectedMethod.upiId}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="pt-6 mt-4 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 border border-border hover:bg-muted text-foreground font-semibold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isSubmitting || (selectedMethod.type === 'cash' && cashDue < 0)}
                  className="px-6 py-3 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl text-sm transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Confirming...' : 'Mark as Paid'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
