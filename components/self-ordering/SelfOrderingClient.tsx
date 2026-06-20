'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingBag, Coffee, Minus, Plus, ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, X, Clock, PlayCircle, Search, QrCode, Banknote } from 'lucide-react';
import { createSelfOrderAction, getOrdersByIds } from '@/actions/order';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';

interface Category {
  _id: string;
  name: string;
  color: string;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  tax: number;
  category: Category;
  description?: string;
  isVeg: boolean;
  image?: string;
}

interface CartItem {
  id: string; // unique for each configuration
  product: Product;
  qty: number;
  variant: string;
  addons: string[];
}

interface Coupon {
  _id: string;
  name: string;
  code: string;
  type: string; // 'automated-order' | 'automated-product' | 'manual'
  discountType: string; // 'percentage' | 'fixed'
  discountValue: number;
  minOrderAmount?: number;
}

interface PaymentMethod {
  _id: string;
  name: string;
  type: string; // 'cash' | 'upi' | 'card'
  upiId?: string;
}

type ScreenState = 'SPLASH' | 'MENU' | 'PRODUCT_DETAIL' | 'CART' | 'PAYMENT' | 'CONFIRMATION' | 'HISTORY';

export default function SelfOrderingClient({
  categories,
  products,
  coupons = [],
  paymentMethods = [],
}: {
  categories: Category[];
  products: Product[];
  coupons?: Coupon[];
  paymentMethods?: PaymentMethod[];
}) {
  const searchParams = useSearchParams();
  const tableId = searchParams.get('table');

  const [screen, setScreen] = useState<ScreenState>('SPLASH');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [search, setSearch] = useState('');
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>('Regular');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [recentOrderNumber, setRecentOrderNumber] = useState<string>('');
  const [couponCode, setCouponCode] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [couponError, setCouponError] = useState('');

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [upiQrUrl, setUpiQrUrl] = useState('');

  interface MyOrder { _id: string; orderNumber: string; status: string; kdsStatus?: string; createdAt: string; total: number; }
  const [myOrders, setMyOrders] = useState<MyOrder[]>([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackedIds, setTrackedIds] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('odooCafeSelfOrders');
    if (saved) {
      const ids = JSON.parse(saved);
      if (ids.length > 0) {
        setTrackedIds(ids);
      }
    }
  }, []);

  useEffect(() => {
    if (trackedIds.length > 0) {
      fetchMyOrders(trackedIds, true);
      const interval = setInterval(() => {
        fetchMyOrders(trackedIds, false);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [trackedIds]);

  const fetchMyOrders = async (ids: string[], showLoading = true) => {
    if (showLoading) setTrackingLoading(true);
    const orders = await getOrdersByIds(ids);
    setMyOrders(orders);
    if (showLoading) setTrackingLoading(false);
  };

  const trackNewOrder = (id: string) => {
    const saved = localStorage.getItem('odooCafeSelfOrders');
    let ids = saved ? JSON.parse(saved) : [];
    ids = [id, ...ids];
    localStorage.setItem('odooCafeSelfOrders', JSON.stringify(ids));
    setTrackedIds(ids);
  };

  // Derived
  const filteredProducts = products.filter(p => {
    if (activeCategoryId !== 'all' && p.category?._id !== activeCategoryId) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const cartQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.qty, 0);
  const taxTotal = cart.reduce((acc, item) => acc + (item.product.price * (item.product.tax / 100)) * item.qty, 0);

  // Re-evaluate automated coupons if no manual coupon is applied
  useEffect(() => {
    if (!appliedCoupon || appliedCoupon.type !== 'manual') {
      let best: Coupon | null = null;
      let maxD = 0;
      for (const c of coupons) {
        if (c.type === 'automated-order' || c.type === 'automated-product') {
          if (!c.minOrderAmount || subtotal >= c.minOrderAmount) {
            const d = c.discountType === 'percentage' ? (subtotal * c.discountValue) / 100 : c.discountValue;
            if (d > maxD) { maxD = d; best = c; }
          }
        }
      }
      if (best && maxD > 0) {
        setAppliedCoupon(best);
        setCouponCode(best.code || best.name);
      } else if (appliedCoupon && appliedCoupon.type !== 'manual') {
        setAppliedCoupon(null);
        setCouponCode('');
      }
    }
  }, [subtotal, coupons, appliedCoupon]);

  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      discountAmount = (subtotal * appliedCoupon.discountValue) / 100;
    } else {
      discountAmount = appliedCoupon.discountValue;
    }
    if (discountAmount > subtotal) discountAmount = subtotal; // cap discount at subtotal
  }
  const total = Math.max(0, subtotal + taxTotal - discountAmount);

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    
    // Generate unique ID based on product, variant, and addons
    const addonsStr = [...selectedAddons].sort().join(',');
    const cartItemId = `${selectedProduct._id}-${selectedVariant}-${addonsStr}`;

    setCart(prev => {
      const existing = prev.find(i => i.id === cartItemId);
      if (existing) {
        return prev.map(i => i.id === cartItemId ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        id: cartItemId,
        product: selectedProduct,
        qty: 1,
        variant: selectedVariant,
        addons: selectedAddons
      }];
    });
    setScreen('MENU');
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));
  };

  const openProductDetail = (p: Product) => {
    setSelectedProduct(p);
    setSelectedVariant('Regular');
    setSelectedAddons([]);
    setScreen('PRODUCT_DETAIL');
  };

  const applyCoupon = (code: string) => {
    setCouponError('');
    if (!code.trim()) {
      setAppliedCoupon(null);
      setCouponCode('');
      setCouponModalOpen(false);
      return;
    }
    const c = coupons.find(c => c.code.toLowerCase() === code.trim().toLowerCase() && c.type === 'manual');
    if (!c) {
      setCouponError('Invalid or expired coupon code');
      return;
    }
    if (c.minOrderAmount && subtotal < c.minOrderAmount) {
      setCouponError(`Minimum order amount of ₹${c.minOrderAmount} required`);
      return;
    }
    setAppliedCoupon(c);
    setCouponCode(c.code);
    setCouponModalOpen(false);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setScreen('PAYMENT');
  };

  const handleSelectPayment = async (pm: PaymentMethod) => {
    setSelectedPaymentMethod(pm);
    if (pm.type === 'upi' && pm.upiId) {
      const upiString = `upi://pay?pa=${pm.upiId}&pn=OdooCafe&am=${total.toFixed(2)}&cu=INR`;
      try {
        const url = await QRCode.toDataURL(upiString, { width: 250, margin: 2 });
        setUpiQrUrl(url);
      } catch (err) {
        console.error(err);
      }
    } else {
      setUpiQrUrl('');
    }
  };

  const confirmOrder = async () => {
    if (!selectedPaymentMethod) return;
    setIsCheckingOut(true);
    try {
      const items = cart.map(item => ({
        productId: item.product._id,
        qty: item.qty,
        price: item.product.price,
        discount: 0,
      }));

      const res = await createSelfOrderAction({
        items,
        subtotal,
        tax: taxTotal,
        discount: discountAmount,
        total,
        status: selectedPaymentMethod.type === 'upi' ? 'paid' : 'draft',
        source: 'self-order',
        tableId: tableId || undefined,
      });

      if (res.success && res.order) {
        setRecentOrderNumber(res.order.orderNumber);
        trackNewOrder(res.order._id);
        setCart([]);
        setScreen('CONFIRMATION');
      } else {
        alert(res.error || 'Checkout failed');
      }
    } catch {
      alert('Checkout error');
    }
    setIsCheckingOut(false);
  };

  // --- SCREENS --- //

  if (screen === 'SPLASH') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-orange-400 to-amber-500 flex flex-col items-center justify-center animate-in fade-in duration-500">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="h-24 w-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-600 mb-6 animate-bounce">
            <Coffee className="h-12 w-12 text-orange-500" />
          </div>
          <h1 className="text-4xl font-black text-white mb-2">Odoo Cafe</h1>
          <p className="text-orange-100 font-semibold text-lg">{tableId ? `Table ${tableId.substring(tableId.length - 4)}` : 'Digital Menu'}</p>
        </div>
        <div className="w-full px-6 pb-12">
          <button
            onClick={() => setScreen('MENU')}
            className="w-full bg-white text-orange-500 font-black text-xl py-4 rounded-2xl shadow-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
          >
            Order Here <ArrowRight className="h-5 w-5" />
          </button>
          <div className="mt-4 flex justify-center">
            <button onClick={() => setScreen('HISTORY')} className="text-orange-100 font-semibold text-sm underline">
              View Order History
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'MENU') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
        {/* Header */}
        <div className="bg-white sticky top-0 z-10 border-b border-gray-100 px-4 py-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setScreen('SPLASH')} className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search product"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-gray-100 rounded-xl py-2 pl-9 pr-4 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <button onClick={() => setScreen('HISTORY')} className="p-2 bg-orange-50 text-orange-500 rounded-full">
              <Clock className="h-5 w-5" />
            </button>
          </div>

          {/* Categories */}
          <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
            <button
              onClick={() => setActiveCategoryId('all')}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeCategoryId === 'all' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-gray-100 text-gray-600'}`}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button
                key={cat._id}
                onClick={() => setActiveCategoryId(cat._id)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeCategoryId === cat._id ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-gray-100 text-gray-600'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="p-4 grid grid-cols-2 gap-4">
          {filteredProducts.map(p => (
            <div key={p._id} onClick={() => openProductDetail(p)} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm cursor-pointer flex flex-col hover:border-orange-200 hover:shadow-md transition-all">
              <div className="aspect-square bg-gray-100 rounded-xl mb-3 flex items-center justify-center overflow-hidden relative">
                 {p.image ? (
                   // eslint-disable-next-line @next/next/no-img-element
                   <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                 ) : (
                   <Coffee className="h-8 w-8 text-gray-300" />
                 )}
                 <div className={`absolute top-2 right-2 h-3 w-3 rounded-full border-2 border-white ${p.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1">{p.name}</h3>
                <p className="text-orange-500 font-black text-sm">₹{p.price}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Sticky Cart Banner */}
        {cartQty > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 z-20">
            <button onClick={() => setScreen('CART')} className="w-full bg-orange-500 text-white rounded-2xl p-4 flex items-center justify-between shadow-xl shadow-orange-500/30">
              <div className="flex items-center gap-2 font-bold">
                <span className="bg-white/20 px-2 py-0.5 rounded-lg text-sm">{cartQty} QTY</span>
                <span className="text-sm">Total: ₹{total.toFixed(0)}</span>
              </div>
              <div className="flex items-center gap-1 font-black">
                Next <ChevronRight className="h-5 w-5" />
              </div>
            </button>
          </div>
        )}
      </div>
    );
  }

  if (screen === 'PRODUCT_DETAIL' && selectedProduct) {
    return (
      <div className="min-h-screen bg-white flex flex-col pb-24">
        <div className="relative aspect-video bg-gray-100 w-full flex items-center justify-center overflow-hidden">
          {selectedProduct.image ? (
             // eslint-disable-next-line @next/next/no-img-element
             <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
          ) : (
            <Coffee className="h-16 w-16 text-gray-300" />
          )}
          <button onClick={() => setScreen('MENU')} className="absolute top-4 left-4 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 flex-1">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900">{selectedProduct.name}</h2>
              {selectedProduct.description && <p className="text-sm text-gray-500 mt-1">{selectedProduct.description}</p>}
            </div>
            <div className="bg-orange-50 text-orange-500 px-3 py-1 rounded-xl font-black text-lg">
              ₹{selectedProduct.price}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-orange-500 rounded-full" /> Size
              </h3>
              <div className="flex gap-3">
                {['Regular', 'Large'].map(v => (
                  <button
                    key={v}
                    onClick={() => setSelectedVariant(v)}
                    className={`flex-1 py-3 border-2 rounded-xl font-bold text-sm transition-all ${selectedVariant === v ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-600 hover:border-orange-200'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-orange-500 rounded-full" /> Add-ons
              </h3>
              <div className="space-y-2">
                {['Extra Cheese (₹20)', 'Extra Sauce (₹10)', 'Premium Packaging (₹15)'].map(addon => {
                  const isSelected = selectedAddons.includes(addon);
                  return (
                    <button
                      key={addon}
                      onClick={() => setSelectedAddons(prev => isSelected ? prev.filter(a => a !== addon) : [...prev, addon])}
                      className="w-full flex items-center justify-between p-3 border-2 border-gray-100 rounded-xl hover:border-gray-200 transition-colors"
                    >
                      <span className="text-sm font-semibold text-gray-700">{addon}</span>
                      <div className={`h-5 w-5 rounded border flex items-center justify-center ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                        {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100">
          <button onClick={handleAddToCart} className="w-full bg-orange-500 text-white rounded-2xl py-4 font-black text-lg shadow-xl shadow-orange-500/30 hover:scale-[1.02] transition-transform">
            Add to Order
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'CART') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <button onClick={() => setScreen('MENU')} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h2 className="font-black text-gray-900">Payment</h2>
          <div className="w-9" />
        </div>

        <div className="p-4 flex-1">
          {/* Cart Items */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 mb-4">
            {cart.map(item => (
              <div key={item.id} className="p-3 flex items-center justify-between border-b border-gray-50 last:border-0">
                <div className="flex-1 pr-4">
                  <h4 className="font-bold text-gray-900 text-sm leading-tight">{item.product.name}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{item.variant}</p>
                  {item.addons.map(a => <p key={a} className="text-[10px] text-orange-500 font-semibold">{a}</p>)}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button onClick={() => updateCartQty(item.id, -1)} className="p-1 hover:bg-white rounded shadow-sm text-gray-600"><Minus className="h-3 w-3" /></button>
                    <span className="w-6 text-center font-bold text-sm text-gray-900">{item.qty}</span>
                    <button onClick={() => updateCartQty(item.id, 1)} className="p-1 hover:bg-white rounded shadow-sm text-gray-600"><Plus className="h-3 w-3" /></button>
                  </div>
                  <span className="font-black text-gray-900 w-12 text-right">₹{item.product.price * item.qty}</span>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="p-8 text-center text-gray-500 font-semibold">Cart is empty</div>
            )}
          </div>

          {/* Coupon */}
          <button onClick={() => setCouponModalOpen(true)} className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between mb-4 hover:border-orange-200 transition-colors text-left">
            <div className="flex items-center gap-3">
              <div className="bg-green-50 p-2 rounded-xl text-green-500"><CheckCircle2 className="h-5 w-5" /></div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Discount</h4>
                <p className="text-xs text-gray-500">{couponCode || 'Have a coupon code?'}</p>
              </div>
            </div>
            {couponCode ? (
              <span className="text-sm font-black text-green-500">-₹{discountAmount.toFixed(0)}</span>
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </button>

          {/* Bill Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex justify-between text-sm font-semibold text-gray-600">
              <span>Sub total</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-gray-600">
              <span>Tax (GST)</span>
              <span>₹{taxTotal.toFixed(2)}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-sm font-semibold text-green-500">
                <span>Discount ({appliedCoupon.code || appliedCoupon.name})</span>
                <span>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="pt-3 border-t border-dashed border-gray-200 flex justify-between text-lg font-black text-gray-900">
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-gray-100">
          <button
            onClick={handleCheckout}
            disabled={isCheckingOut || cart.length === 0}
            className="w-full bg-orange-500 text-white font-black text-lg py-4 rounded-2xl shadow-xl shadow-orange-500/30 flex justify-center items-center gap-2 hover:bg-orange-600 disabled:opacity-50"
          >
            {isCheckingOut ? 'Processing...' : `Pay ₹${total.toFixed(0)} & Confirm`}
          </button>
        </div>

        {/* Coupon Modal */}
        {couponModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
            <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-in slide-in-from-bottom-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-lg text-gray-900">Coupon Code</h3>
                <button onClick={() => setCouponModalOpen(false)} className="p-1 bg-gray-100 rounded-full"><X className="h-4 w-4" /></button>
              </div>
              <input
                type="text"
                placeholder="Enter a coupon code"
                value={couponInput}
                onChange={e => setCouponInput(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-semibold text-sm mb-4 focus:outline-none focus:border-orange-500 uppercase"
              />
              
              {couponError && <p className="text-red-500 text-xs font-bold mb-4">{couponError}</p>}
              
              <button onClick={() => applyCoupon(couponInput)} className="w-full bg-orange-500 text-white font-black py-3 rounded-xl mb-3">Apply Code</button>
              {appliedCoupon && appliedCoupon.type === 'manual' && (
                <button onClick={() => applyCoupon('')} className="w-full bg-gray-100 text-gray-600 font-black py-3 rounded-xl">Remove Coupon</button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (screen === 'PAYMENT') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-white sticky top-0 z-10 border-b border-gray-100 px-4 py-4 flex items-center gap-3">
          <button onClick={() => setScreen('MENU')} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h2 className="font-black text-xl text-gray-900">Payment</h2>
        </div>
        
        <div className="p-6 flex-1 max-w-lg mx-auto w-full">
          <h3 className="font-black text-gray-900 mb-4">Select Payment Method</h3>
          <div className="space-y-3 mb-8">
            {paymentMethods.map(pm => (
              <button
                key={pm._id}
                onClick={() => handleSelectPayment(pm)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${selectedPaymentMethod?._id === pm._id ? 'border-orange-500 bg-orange-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${selectedPaymentMethod?._id === pm._id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {pm.type === 'upi' ? <QrCode className="h-6 w-6" /> : <Banknote className="h-6 w-6" />}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900 capitalize">{pm.name}</p>
                    <p className="text-xs text-gray-500">{pm.type === 'upi' ? 'Pay via UPI App' : 'Pay at counter'}</p>
                  </div>
                </div>
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${selectedPaymentMethod?._id === pm._id ? 'border-orange-500' : 'border-gray-300'}`}>
                  {selectedPaymentMethod?._id === pm._id && <div className="h-2.5 w-2.5 bg-orange-500 rounded-full" />}
                </div>
              </button>
            ))}
          </div>

          {selectedPaymentMethod?.type === 'upi' && upiQrUrl && (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center animate-in zoom-in-95 duration-300 mb-8">
              <p className="font-bold text-gray-900 mb-4">Scan to Pay</p>
              <div className="bg-white p-2 rounded-2xl border-2 border-gray-100 mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={upiQrUrl} alt="UPI QR" className="w-48 h-48 rounded-xl" />
              </div>
              <p className="font-black text-2xl text-gray-900 mb-1">₹{total.toFixed(2)}</p>
              <p className="text-sm font-semibold text-gray-500 mb-4">{selectedPaymentMethod.upiId}</p>
              <div className="w-full bg-blue-50 text-blue-600 font-bold text-sm p-3 rounded-xl flex items-center justify-center gap-2">
                <Clock className="h-4 w-4" /> Awaiting Payment...
              </div>
            </div>
          )}

          {selectedPaymentMethod?.type === 'cash' && (
            <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 mb-8 flex items-start gap-4">
              <Banknote className="h-8 w-8 text-orange-500 shrink-0" />
              <div>
                <p className="font-bold text-gray-900 mb-1">Pay at Counter</p>
                <p className="text-sm text-gray-600 font-medium">Your order will be sent to the kitchen. Please pay ₹{total.toFixed(2)} to the waiter or at the counter.</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-gray-100 sticky bottom-0">
          <button
            onClick={confirmOrder}
            disabled={!selectedPaymentMethod || isCheckingOut}
            className="w-full max-w-lg mx-auto block bg-orange-500 text-white font-black text-lg py-4 rounded-2xl shadow-xl shadow-orange-500/30 hover:bg-orange-600 disabled:opacity-50 transition-all"
          >
            {isCheckingOut ? 'Processing...' : `Confirm Order • ₹${total.toFixed(0)}`}
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'CONFIRMATION') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-500">
        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-xl shadow-green-500/20 mb-8 border-4 border-green-50">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-1">#{recentOrderNumber}</h2>
        <p className="text-green-500 font-bold text-lg mb-8">Order Confirmed</p>
        <p className="text-2xl font-black text-gray-900 mb-12">₹{total.toFixed(0)}</p>
        
        <button
          onClick={() => setScreen('HISTORY')}
          className="w-full max-w-sm bg-orange-500 text-white font-black text-lg py-4 rounded-2xl shadow-xl shadow-orange-500/30 hover:scale-105 transition-transform"
        >
          Track My Order
        </button>
      </div>
    );
  }

  if (screen === 'HISTORY') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <button onClick={() => setScreen('MENU')} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h2 className="font-black text-gray-900 text-lg">Order History</h2>
        </div>

        <div className="p-4 flex-1">
          {trackingLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <PlayCircle className="h-8 w-8 animate-spin mb-3 text-orange-500" />
              <p className="font-semibold text-sm">Fetching statuses...</p>
            </div>
          ) : myOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <ShoppingBag className="h-12 w-12 mb-3 opacity-50" />
              <p className="font-bold">No recent orders found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myOrders.map(order => {
                let badgeClass = 'bg-gray-100 text-gray-600';
                let statusLabel = 'Received';
                if (order.status === 'cancelled') {
                  badgeClass = 'bg-red-100 text-red-600';
                  statusLabel = 'Cancelled';
                } else if (order.kdsStatus === 'to-cook') {
                  badgeClass = 'bg-orange-100 text-orange-600';
                  statusLabel = 'To Cook';
                } else if (order.kdsStatus === 'preparing') {
                  badgeClass = 'bg-blue-100 text-blue-600';
                  statusLabel = 'Preparing';
                } else if (order.kdsStatus === 'completed') {
                  badgeClass = 'bg-green-100 text-green-600';
                  statusLabel = 'Completed';
                } else {
                  if (order.status === 'draft') {
                    badgeClass = 'bg-orange-100 text-orange-600';
                    statusLabel = 'To Cook';
                  } else if (order.status === 'paid') {
                    badgeClass = 'bg-blue-100 text-blue-600';
                    statusLabel = 'Preparing';
                  } else {
                    badgeClass = 'bg-green-100 text-green-600';
                    statusLabel = 'Completed';
                  }
                }

                return (
                  <div key={order._id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-gray-900">#{order.orderNumber}</h4>
                      <p className="text-xs text-gray-500 font-semibold mt-0.5">
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ₹{order.total.toFixed(0)}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase ${badgeClass}`}>
                      {statusLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-gray-100">
          <button
            onClick={() => setScreen('MENU')}
            className="w-full bg-orange-100 text-orange-600 font-black text-lg py-4 rounded-2xl hover:bg-orange-200 transition-colors"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  return null;
}
