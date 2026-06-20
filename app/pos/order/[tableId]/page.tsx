'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/store';
import { getProducts, getCategories } from '@/actions/product';
import { getFloorsAndTables } from '@/actions/booking';
import { getPaymentMethods } from '@/actions/payment-method';
import { getCustomers, createCustomerAction, createOrderAction, getActiveOrdersForTable } from '@/actions/order';
import { getCoupons } from '@/actions/coupon';
import { getCurrentSession, closeSessionAction, getSessionCloseSummary } from '@/actions/session';
import {
  ArrowLeft,
  Coffee,
  Search,
  User,
  Percent,
  ChefHat,
  Loader2,
} from 'lucide-react';
import CheckoutModal from '@/components/CheckoutModal';

interface Prod { _id: string; name: string; price: number; tax: number; isVeg: boolean; category: Cat | unknown; sendToKDS?: boolean; unitOfMeasure?: string; description?: string; image?: string; }
interface Cat { _id: string; name: string; color: string; }
interface PayMeth { _id: string; name: string; type: string; upiId?: string; active: boolean; }
interface Coup { _id: string; name: string; type: string; code: string; discountType: string; discountValue: number; minQty: number; minOrderAmount: number; active: boolean; }
interface Cust { _id: string; name: string; phone?: string; }
interface Sess { _id: string; openedBy: string; openedAt: string | Date; }
interface CloseSumm { openedBy: string; openedAt: string | Date; openingAmount: number; orderCount: number; totalSales: number; breakdown: { cash: number; card: number; upi: number; }; }

export default function OrderViewPage() {
  const params = useParams();
  const router = useRouter();
  const tableId = params.tableId as string;

  // Global store states
  const {
    getCart,
    addToCart,
    removeFromCart,
    updateQty,
    updateDiscount,
    setCustomer,
    applyCoupon,
    clearCart,
    setMode,
    selectItem,
    pressKeypad,
  } = useCartStore();

  const cart = getCart(tableId);

  // DB static lists
  const [products, setProducts] = useState<Prod[]>([]);
  const [categories, setCategories] = useState<Cat[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PayMeth[]>([]);
  const [coupons, setCoupons] = useState<Coup[]>([]);
  const [session, setSession] = useState<Sess | null>(null);
  const [tables, setTables] = useState<{ _id: string; number: string; }[]>([]);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('all');

  // UI state overlays
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Cust[]>([]);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [enteredCouponCode, setEnteredCouponCode] = useState('');

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeSummary, setCloseSummary] = useState<CloseSumm | null>(null);
  const [closingCash, setClosingCash] = useState('');
  const [closingError, setClosingError] = useState('');
  const [closingSubmitting, setClosingSubmitting] = useState(false);

  const [loading, setLoading] = useState(true);

  // Fetch initial configuration
  const loadInitialData = async () => {
    setLoading(true);
    const activeSess = await getCurrentSession();
    if (!activeSess) {
      router.push('/pos');
      return;
    }
    setSession(activeSess);

    const prods = await getProducts();
    const cats = await getCategories();
    const payM = await getPaymentMethods();
    const cps = await getCoupons();
    const layout = await getFloorsAndTables();

    setProducts(prods.map((p: { _id: { toString: () => string }, category?: { _id: { toString: () => string } } }) => ({ ...p, _id: p._id.toString(), category: p.category ? { ...p.category, _id: p.category._id.toString() } : null })) as unknown as Prod[]);
    setCategories(cats.map((c: { _id: { toString: () => string } }) => ({ ...c, _id: c._id.toString() })) as unknown as Cat[]);
    setPaymentMethods(payM.filter((m: { active: boolean }) => m.active).map((m: { _id: { toString: () => string }, type: string }) => ({ ...m, _id: m._id.toString(), type: m.type as 'cash' | 'card' | 'upi' })) as unknown as PayMeth[]);
    setCoupons(cps.filter((c: { active: boolean }) => c.active).map((c: { _id: { toString: () => string }, type: string, discountType: string }) => ({ ...c, _id: c._id.toString(), type: c.type as 'coupon' | 'automated-product' | 'automated-order', discountType: c.discountType as 'percent' | 'fixed' })) as unknown as Coup[]);
    setTables(layout.tables.map((t: { _id: { toString: () => string }; number: string; }) => ({ ...t, _id: t._id.toString() })));

    // Try loading existing draft order for this table
    const draft = await getActiveOrdersForTable(tableId);
    if (draft) {
      // Sync DB draft items to client Zustand store
      clearCart(tableId);
      if (draft.customer) {
        setCustomer(tableId, draft.customer);
      }
      draft.items.forEach((item: { product: Record<string, unknown> | string; price: number; qty: number; discount: number }) => {
        const prodObj = item.product as { _id?: { toString: () => string }; name?: string; tax?: number; isVeg?: boolean };
        const prodId = prodObj._id ? prodObj._id.toString() : (item.product as string);
        addToCart(tableId, {
          _id: prodId,
          name: prodObj.name || 'Unknown',
          price: item.price,
          tax: prodObj.tax || 5,
          isVeg: prodObj.isVeg || false,
        });
        updateQty(tableId, prodId, item.qty);
        if (item.discount > 0) {
          updateDiscount(tableId, prodId, item.discount);
        }
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  // Search customers in modal
  useEffect(() => {
    if (customerSearch) {
      getCustomers(customerSearch).then((res) => {
        setCustomerResults(res.map((c: { _id: { toString: () => string }, name: string, phone?: string }) => ({
          ...c,
          _id: c._id.toString()
        })) as unknown as Cust[]);
      });
    } else {
      setCustomerResults([]);
    }
  }, [customerSearch]);

  // Client-side real-time calculation of taxes, subtotal, and promotions
  const calculateCartDetails = () => {
    let subtotal = 0;
    let itemDiscountsTotal = 0;
    let taxTotal = 0;

    const itemsWithPromo = cart.items.map((item) => {
      const lineTotalRaw = item.price * item.qty;
      
      // Look up if any automated product-level promotion applies to this item
      const productPromo = coupons.find(
        (c) =>
          c.type === 'automated-product' &&
          (c.code === item.productId || item.name.toLowerCase().includes(c.code.toLowerCase())) &&
          item.qty >= c.minQty
      );

      let inlinePromoDiscountAmt = 0;
      if (productPromo) {
        if (productPromo.discountType === 'percent') {
          inlinePromoDiscountAmt = (lineTotalRaw * productPromo.discountValue) / 100;
        } else {
          inlinePromoDiscountAmt = productPromo.discountValue * item.qty;
        }
      }

      // Base manual keypad discount
      const keypadDiscountAmt = (lineTotalRaw * item.discount) / 100;
      const finalLineDiscount = Math.max(inlinePromoDiscountAmt, keypadDiscountAmt);
      const lineTotal = Math.max(0, lineTotalRaw - finalLineDiscount);

      subtotal += lineTotal;
      itemDiscountsTotal += finalLineDiscount;

      // GST tax computation based on items
      const taxRate = item.tax || 5;
      const lineTax = (lineTotal * taxRate) / 100;
      taxTotal += lineTax;

      return {
        ...item,
        inlinePromo: productPromo ? productPromo.name : null,
        finalDiscount: finalLineDiscount,
        lineTotal,
      };
    });

    // Order level discounts
    let orderPromoDiscountAmt = 0;
    let appliedPromoName = '';

    // Check automated order promos first
    const orderPromo = coupons
      .filter((c) => c.type === 'automated-order' && subtotal >= c.minOrderAmount)
      .sort((a, b) => b.discountValue - a.discountValue)[0];

    if (orderPromo) {
      if (orderPromo.discountType === 'percent') {
        orderPromoDiscountAmt = (subtotal * orderPromo.discountValue) / 100;
      } else {
        orderPromoDiscountAmt = Math.min(subtotal, orderPromo.discountValue);
      }
      appliedPromoName = orderPromo.name;
    }

    // Check manual coupon if applied
    if (cart.couponCode) {
      const manualCoupon = coupons.find(
        (c) => c.type === 'coupon' && c.code === cart.couponCode.toUpperCase()
      );
      if (manualCoupon && subtotal >= manualCoupon.minOrderAmount) {
        let manualAmt = 0;
        if (manualCoupon.discountType === 'percent') {
          manualAmt = (subtotal * manualCoupon.discountValue) / 100;
        } else {
          manualAmt = Math.min(subtotal, manualCoupon.discountValue);
        }

        if (manualAmt > orderPromoDiscountAmt) {
          orderPromoDiscountAmt = manualAmt;
          appliedPromoName = `Coupon: ${manualCoupon.name}`;
        }
      }
    }

    const totalDiscount = itemDiscountsTotal + orderPromoDiscountAmt;
    const finalTotal = Math.max(0, subtotal + taxTotal - orderPromoDiscountAmt);

    return {
      items: itemsWithPromo,
      subtotal,
      tax: taxTotal,
      orderDiscount: orderPromoDiscountAmt,
      appliedPromoName,
      totalDiscount,
      total: finalTotal,
    };
  };

  const calculated = calculateCartDetails();

  // Create new customer inline
  const handleCreateCustomer = async () => {
    if (!newCustName.trim()) return;
    const res = await createCustomerAction({
      name: newCustName.trim(),
      phone: newCustPhone.trim() || undefined,
    });
    if (res.success && res.customer) {
      setCustomer(tableId, res.customer);
      setNewCustName('');
      setNewCustPhone('');
      setCustomerSearch('');
      setShowCustomerModal(false);
    } else {
      alert(res.error || 'Failed to create customer');
    }
  };

  // Apply Coupon code
  const handleApplyCouponCode = () => {
    if (!enteredCouponCode.trim()) return;
    const code = enteredCouponCode.toUpperCase().trim();
    const coupon = coupons.find((c) => c.type === 'coupon' && c.code === code);
    
    if (!coupon) {
      alert('Invalid or inactive coupon code.');
      return;
    }
    applyCoupon(tableId, code);
    setEnteredCouponCode('');
    setShowDiscountModal(false);
  };

  // Send order draft to kitchen
  const handleSendToKitchen = async () => {
    if (cart.items.length === 0) return;
    const items = cart.items.map((item) => ({
      productId: item.productId,
      qty: item.qty,
      price: item.price,
      discount: item.discount,
    }));

    const res = await createOrderAction({
      tableId,
      customerId: cart.customer?._id,
      items,
      subtotal: calculated.subtotal,
      tax: calculated.tax,
      discount: calculated.totalDiscount,
      total: calculated.total,
      status: 'draft',
      source: 'pos',
    });

    if (res.success) {
      alert('Ticket successfully routed to Kitchen Display System!');
      router.push('/pos');
    } else {
      alert('Failed to send to kitchen: ' + res.error);
    }
  };

  // Handle order checkout / payment
  const handlePayment = async () => {
    if (cart.items.length === 0) return;
    setShowCheckoutModal(true);
  };



  // Close Session flows
  const handleOpenCloseSessionModal = async () => {
    if (!session) return;
    setShowCloseModal(true);
    setClosingCash('');
    setClosingError('');
    const summary = await getSessionCloseSummary(session._id);
    setCloseSummary(summary as unknown as CloseSumm);
  };

  const handleCloseSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setClosingError('');
    const amt = parseFloat(closingCash);
    if (isNaN(amt) || amt < 0) {
      setClosingError('Please enter a valid cash amount.');
      return;
    }

    setClosingSubmitting(true);
    const res = await closeSessionAction(session._id, amt);
    setClosingSubmitting(false);

    if (res.success) {
      setShowCloseModal(false);
      router.push('/pos');
    } else {
      setClosingError(res.error || 'Failed to close session.');
    }
  };

  // Filter products by category and search query
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCatId === 'all' || p.category?._id === selectedCatId;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <span className="text-sm font-semibold text-muted-foreground">Loading POS terminal layout...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-hidden max-h-screen">
      {/* 1. TOP NAVBAR */}
      <header className="h-16 border-b border-border bg-card px-4 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/pos')}
            className="p-2 hover:bg-muted rounded-xl transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Coffee className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm tracking-tight hidden md:inline">Odoo Cafe</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-xs md:max-w-md w-full mx-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 border border-border bg-background rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Indicators & Profile */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-xl text-xs font-bold">
            <span>T-{(tables.find((t) => t._id === tableId) || {}).number || 'None'}</span>
          </div>

          <button
            onClick={handleOpenCloseSessionModal}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
          >
            Close Session
          </button>
        </div>
      </header>

      {/* 2. THREE COLUMN LAYOUT */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* COLUMN 1: Category tabs & Product Grid cards (LEFT) */}
        <div className="w-full md:w-1/2 lg:w-5/12 border-r border-border flex flex-col overflow-hidden bg-muted/10">
          {/* Category Tabs */}
          <div className="flex shrink-0 gap-2 overflow-x-auto p-3 border-b border-border bg-card scrollbar-none">
            <button
              onClick={() => setSelectedCatId('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap
                ${
                  selectedCatId === 'all'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-border'
                }
              `}
            >
              All Items
            </button>
            {categories.map((cat) => (
              <button
                key={cat._id}
                onClick={() => setSelectedCatId(cat._id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer
                  ${
                    selectedCatId === cat._id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-border'
                  }
                `}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground text-xs font-semibold">
                  No products match filters.
                </div>
              ) : (
                filteredProducts.map((prod) => (
                  <button
                    key={prod._id}
                    onClick={() => addToCart(tableId, prod)}
                    className="bg-card border border-border rounded-2xl flex flex-col overflow-hidden text-left cursor-pointer hover:border-primary/50 transition-colors shadow-xs group"
                  >
                    {/* Image Area */}
                    <div className="h-28 bg-muted relative w-full border-b border-border flex items-center justify-center shrink-0">
                      {prod.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                      ) : (
                        <Coffee className="h-8 w-8 text-muted-foreground/30" />
                      )}
                      {/* Veg Indicator Absolute */}
                      <span
                        className={`absolute top-2 left-2 h-3 w-3 rounded-full border-2 border-white shadow-sm ${
                          prod.isVeg ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        title={prod.isVeg ? 'Veg' : 'Non-Veg'}
                      />
                    </div>
                    {/* Details Area */}
                    <div className="p-3 flex flex-col gap-1 w-full flex-1">
                      <div className="flex justify-between items-start gap-1">
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-semibold">
                        {prod.category?.name || 'Uncategorized'}
                      </span>
                      </div>
                      <span className="font-bold text-sm text-foreground leading-tight group-hover:text-primary transition-colors">
                        {prod.name}
                      </span>
                      <div className="mt-auto pt-2 flex items-center justify-between">
                        <span className="font-black text-sm text-primary">₹{prod.price.toFixed(2)}</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* COLUMN 2: Shopping Cart Column (MIDDLE) */}
        <div className="w-full md:w-1/4 lg:w-4/12 border-r border-border bg-card flex flex-col overflow-hidden">
          {/* Cart Header */}
          <div className="p-3 border-b border-border flex items-center justify-between bg-muted/15 shrink-0">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Active Table Cart</span>
              <strong className="text-sm font-black text-foreground">
                T-{(tables.find((t) => t._id === tableId) || {}).number || 'None'}
              </strong>
            </div>

            {/* Quick customer view */}
            {cart.customer ? (
              <span className="text-[11px] font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-xl flex items-center gap-1 max-w-[150px] truncate">
                <User className="h-3 w-3 shrink-0" />
                {cart.customer.name}
              </span>
            ) : (
              <button
                onClick={() => setShowCustomerModal(true)}
                className="text-[11px] font-semibold text-muted-foreground hover:text-primary flex items-center gap-1 hover:underline cursor-pointer"
              >
                <User className="h-3 w-3" />
                Add Customer
              </button>
            )}
          </div>

          {/* Cart Items list */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {calculated.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs p-6 text-center gap-2">
                <ChefHat className="h-8 w-8 stroke-[1.5]" />
                <span>Cart is empty. Tap items on the left grid to place order.</span>
              </div>
            ) : (
              calculated.items.map((item) => {
                const isSelected = cart.selectedItemId === item.productId;
                return (
                  <div
                    key={item.productId}
                    onClick={() => selectItem(tableId, item.productId)}
                    className={`border p-2.5 rounded-xl cursor-pointer transition-all flex flex-col gap-1.5
                      ${isSelected ? 'border-primary bg-primary/5 shadow-xs' : 'border-border bg-card hover:bg-muted/10'}
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-0.5 max-w-[70%]">
                        <span className="font-bold text-xs text-foreground truncate">{item.name}</span>
                        {item.inlinePromo && (
                          <span className="text-[9px] font-bold text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded w-max">
                            {item.inlinePromo} Applied
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromCart(tableId, item.productId);
                        }}
                        className="text-[10px] text-destructive hover:underline p-1 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="flex justify-between items-center text-xs mt-1">
                      {/* Qty Steppers */}
                      <div className="flex items-center gap-1.5 border border-border bg-card p-0.5 rounded-lg">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQty(tableId, item.productId, item.qty - 1);
                          }}
                          className="h-5 w-5 bg-muted rounded flex items-center justify-center font-bold text-xs"
                        >
                          -
                        </button>
                        <span className="font-bold px-1 text-xs">{item.qty}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQty(tableId, item.productId, item.qty + 1);
                          }}
                          className="h-5 w-5 bg-muted rounded flex items-center justify-center font-bold text-xs"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        <div className="flex gap-1 items-center justify-end">
                          {item.finalDiscount > 0 && (
                            <span className="text-[10px] text-muted-foreground line-through">
                              ₹{(item.price * item.qty).toFixed(2)}
                            </span>
                          )}
                          <span className="font-black text-xs">₹{item.lineTotal.toFixed(2)}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          ₹{item.price.toFixed(2)} x {item.qty} {item.discount > 0 ? `(-${item.discount}%)` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart actions row */}
          <div className="p-3 border-t border-border bg-muted/10 grid grid-cols-3 gap-2 shrink-0">
            <button
              onClick={() => setShowCustomerModal(true)}
              className="py-2 border border-border bg-card hover:bg-muted rounded-xl text-xs font-bold flex flex-col items-center gap-1 cursor-pointer"
            >
              <User className="h-4 w-4 text-primary" />
              <span>Customer</span>
            </button>
            <button
              onClick={() => setShowDiscountModal(true)}
              className="py-2 border border-border bg-card hover:bg-muted rounded-xl text-xs font-bold flex flex-col items-center gap-1 cursor-pointer"
            >
              <Percent className="h-4 w-4 text-primary" />
              <span>Coupon</span>
            </button>
            <button
              onClick={handleSendToKitchen}
              disabled={cart.items.length === 0}
              className="py-2 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 rounded-xl text-xs font-black flex flex-col items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <ChefHat className="h-4 w-4 text-primary" />
              <span>Send Kitchen</span>
            </button>
          </div>

          {/* Checkout Summary */}
          <div className="p-4 border-t border-border bg-muted/30 shrink-0 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold text-foreground">₹{calculated.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST Taxes</span>
              <span className="font-semibold text-foreground">+₹{calculated.tax.toFixed(2)}</span>
            </div>
            {calculated.orderDiscount > 0 && (
              <div className="flex justify-between text-green-600 font-bold bg-green-500/10 p-1.5 rounded-lg">
                <span>{calculated.appliedPromoName}</span>
                <span>-₹{calculated.orderDiscount.toFixed(2)}</span>
              </div>
            )}
            <hr className="border-border" />
            <div className="flex justify-between items-center pt-1 text-sm font-bold">
              <span className="font-black uppercase text-foreground">Total Amount</span>
              <span className="text-lg font-black text-primary">₹{calculated.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* COLUMN 3: Numerical Keypad & Checkout (RIGHT) */}
        <div className="w-full md:w-1/4 lg:w-3/12 bg-muted/20 flex flex-col overflow-y-auto p-4 gap-4 shrink-0">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Keypad Editor Mode</span>
            {/* Keypad Mode Selectors */}
            <div className="grid grid-cols-3 gap-1.5 border border-border bg-card p-1 rounded-xl">
              {(['qty', 'price', 'disc'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setMode(tableId, mode)}
                  className={`py-2 rounded-lg text-xs font-black capitalize cursor-pointer transition-colors
                    ${
                      cart.activeMode === mode
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:bg-muted'
                    }
                  `}
                >
                  {mode === 'disc' ? 'Disc %' : mode}
                </button>
              ))}
            </div>
          </div>

          {/* Numeric Buttons Grid */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫', 'C'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => pressKeypad(tableId, key)}
                className={`py-3 bg-card border border-border rounded-xl text-sm font-bold cursor-pointer hover:bg-muted/10 transition-colors
                  ${key === 'C' ? 'col-span-3 text-destructive bg-destructive/5 hover:bg-destructive/10' : ''}
                `}
              >
                {key}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Payment Gateway Selectors</span>
            {/* Payment triggers */}
            {paymentMethods.length === 0 ? (
              <span className="text-xs text-muted-foreground text-center p-4 border border-dashed border-border rounded-xl bg-card">
                No active settlement methods available.
              </span>
            ) : (
              <div className="flex flex-col gap-2">
                {paymentMethods.map((method) => {
                  return (
                    <button
                      key={method._id}
                      disabled={cart.items.length === 0}
                      onClick={() => handlePayment()}
                      className={`w-full py-3.5 rounded-2xl flex items-center justify-between px-4 font-bold text-sm transition-all shadow-xs cursor-pointer border
                        ${
                          cart.items.length === 0
                            ? 'opacity-40 cursor-not-allowed border-border bg-card text-muted-foreground'
                            : 'bg-card hover:bg-muted/10 border-border text-foreground hover:scale-[1.01]'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="capitalize">{method.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Customer Search / Inline Addition */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-xs" onClick={() => setShowCustomerModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh]">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-base font-bold text-foreground">Link Customer Profile</h3>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="p-1 hover:bg-muted rounded text-muted-foreground font-bold text-lg"
              >
                &times;
              </button>
            </div>

            {/* Existing search */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Search Database</span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, phone or email..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-border bg-background rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {customerResults.length > 0 && (
                <div className="border border-border bg-background rounded-xl divide-y divide-border overflow-hidden max-h-40 overflow-y-auto">
                  {customerResults.map((cust) => (
                    <button
                      key={cust._id}
                      onClick={() => {
                        setCustomer(tableId, cust);
                        setShowCustomerModal(false);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-primary/10 text-xs font-bold transition-colors cursor-pointer"
                    >
                      {cust.name} {cust.phone ? `(${cust.phone})` : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <hr className="flex-1 border-border" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase">OR CREATE INLINE</span>
              <hr className="flex-1 border-border" />
            </div>

            {/* Create Inline form */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Customer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Akshar Patel"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="px-3.5 py-2 border border-border bg-background rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Mobile Phone</label>
                <input
                  type="text"
                  placeholder="e.g. +91 99999 99999"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="px-3.5 py-2 border border-border bg-background rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <button
                type="button"
                onClick={handleCreateCustomer}
                className="w-full bg-primary text-primary-foreground font-semibold py-2 rounded-xl text-xs mt-1"
              >
                Create and Link Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Discount Coupon Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-xs" onClick={() => setShowDiscountModal(false)} />
          <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-base font-bold text-foreground">Apply Promo Coupon</h3>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="p-1 hover:bg-muted rounded text-muted-foreground font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Coupon Redemption Code</label>
                <input
                  type="text"
                  placeholder="e.g. MONSOON10"
                  value={enteredCouponCode}
                  onChange={(e) => setEnteredCouponCode(e.target.value.toUpperCase())}
                  className="px-4 py-2 border border-border bg-background rounded-xl text-sm font-mono tracking-wider font-bold focus:outline-none focus:ring-1 focus:ring-primary text-center"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyCouponCode}
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-xl text-xs"
              >
                Validate and Apply Coupon
              </button>
            </div>
          </div>
        </div>
      )}

      {showCheckoutModal && (
        <CheckoutModal
          tableId={tableId}
          calculated={calculated}
          paymentMethods={paymentMethods}
          onClose={() => setShowCheckoutModal(false)}
          onSuccess={() => {
            clearCart(tableId);
            router.push('/pos');
          }}
          onSubmitOrder={async (methodId) => {
            const res = await createOrderAction({
              tableId,
              customerId: cart.customer?._id,
              items: cart.items.map((item) => ({
                productId: item.productId,
                qty: item.qty,
                price: item.price,
                discount: item.discount,
              })),
              subtotal: calculated.subtotal,
              tax: calculated.tax,
              discount: calculated.totalDiscount,
              total: calculated.total,
              status: 'paid',
              paymentMethodId: methodId,
              source: 'pos',
            });
            return res as { success: boolean; order?: Record<string, unknown>; error?: string };
          }}
        />
      )}

      {/* MODAL 4: Close Session Summary Panel */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-xs" onClick={() => setShowCloseModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground">Close POS Session</h3>
              <button
                onClick={() => setShowCloseModal(false)}
                className="p-1 hover:bg-muted rounded text-muted-foreground font-bold text-lg"
              >
                &times;
              </button>
            </div>

            {closeSummary ? (
              <form onSubmit={handleCloseSessionSubmit} className="flex-1 flex flex-col gap-4 py-4 overflow-y-auto">
                <div className="p-4 bg-muted/30 border border-border rounded-2xl flex flex-col gap-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-semibold">Opened By:</span>
                    <span className="font-bold text-foreground">{closeSummary.openedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-semibold">Opened At:</span>
                    <span className="font-bold text-foreground">{new Date(closeSummary.openedAt).toLocaleString()}</span>
                  </div>
                  <hr className="border-border" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-semibold">Opening Balance:</span>
                    <span className="font-bold text-foreground">₹{closeSummary.openingAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-semibold">Orders Placed count:</span>
                    <span className="font-bold text-foreground">{closeSummary.orderCount} order(s)</span>
                  </div>
                  <div className="flex justify-between text-primary font-bold">
                    <span>Total Sales revenue:</span>
                    <span>₹{closeSummary.totalSales.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Settlement Breakdown</span>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="border border-border bg-background p-2.5 rounded-xl">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Cash</span>
                      <p className="font-bold text-foreground">₹{(closeSummary.breakdown?.cash || 0).toFixed(2)}</p>
                    </div>
                    <div className="border border-border bg-background p-2.5 rounded-xl">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Card</span>
                      <p className="font-bold text-foreground">₹{(closeSummary.breakdown?.card || 0).toFixed(2)}</p>
                    </div>
                    <div className="border border-border bg-background p-2.5 rounded-xl">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">UPI</span>
                      <p className="font-bold text-foreground">₹{(closeSummary.breakdown?.upi || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Actual Cash in Drawer (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Enter final cash drawer count"
                    value={closingCash}
                    onChange={(e) => setClosingCash(e.target.value)}
                    className="px-4 py-2.5 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                  />
                  {closingError && <span className="text-xs text-destructive font-semibold">{closingError}</span>}
                </div>

                <div className="flex justify-end gap-2 text-sm pt-4 border-t border-border mt-2">
                  <button
                    type="button"
                    onClick={() => setShowCloseModal(false)}
                    className="px-4 py-2 border border-border hover:bg-muted rounded-xl text-muted-foreground font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={closingSubmitting}
                    className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-xl shadow-md hover:bg-primary/95 disabled:opacity-50"
                  >
                    {closingSubmitting ? 'Closing...' : 'Close & Lock Session'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground font-semibold">Aggregating checkout metrics...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
