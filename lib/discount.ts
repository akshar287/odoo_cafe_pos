import dbConnect from './db';
import Coupon from '@/models/Coupon';

export interface CartItemInput {
  productId: string;
  name: string;
  qty: number;
  price: number;
}

export interface DiscountResult {
  promoDiscounts: Array<{
    productId: string;
    name: string;
    discountAmount: number;
  }>;
  orderDiscount: {
    name: string;
    code: string;
    discountAmount: number;
  } | null;
}

/**
 * Evaluates the active cart against all active coupons and automated promotions.
 */
export async function evaluateDiscounts(
  items: CartItemInput[],
  subtotal: number,
  couponCode?: string
): Promise<DiscountResult> {
  await dbConnect();

  const activePromos = await Coupon.find({ active: true }).lean();
  const result: DiscountResult = {
    promoDiscounts: [],
    orderDiscount: null,
  };

  // 1. Evaluate Automated Product-Level Promotions (automated-product)
  // For each automated-product promo, we check if the coupon code (or name) matches the product name or ID.
  const productPromos = activePromos.filter((p) => p.type === 'automated-product');
  
  for (const promo of productPromos) {
    for (const item of items) {
      // Check if product matches code (case-insensitive name or ID)
      const matches =
        item.productId === promo.code ||
        item.name.toLowerCase().includes(promo.code.toLowerCase()) ||
        promo.code.toLowerCase().includes(item.name.toLowerCase());

      if (matches && item.qty >= promo.minQty) {
        let discountAmount = 0;
        const itemTotal = item.price * item.qty;
        
        if (promo.discountType === 'percent') {
          discountAmount = (itemTotal * promo.discountValue) / 100;
        } else {
          // Fixed discount applies per unit or overall? Let's apply per unit or flat, flat is standard.
          discountAmount = Math.min(itemTotal, promo.discountValue * item.qty);
        }
        
        result.promoDiscounts.push({
          productId: item.productId,
          name: promo.name,
          discountAmount,
        });
      }
    }
  }

  // 2. Evaluate Automated Order-Level Promotions (automated-order)
  // Find automated order promos where subtotal >= minOrderAmount
  const orderPromos = activePromos
    .filter((p) => p.type === 'automated-order' && subtotal >= p.minOrderAmount)
    .sort((a, b) => b.discountValue - a.discountValue); // Pick the highest discount

  const activeOrderPromo = orderPromos[0] || null;

  // 3. Evaluate Manual Coupon Code (if provided)
  let manualCoupon = null;
  if (couponCode) {
    const formattedCode = couponCode.toUpperCase().trim();
    const coupon = activePromos.find((p) => p.type === 'coupon' && p.code === formattedCode);
    
    if (coupon && subtotal >= coupon.minOrderAmount) {
      manualCoupon = coupon;
    }
  }

  // Choose the best order-level discount between auto-promotion and manual coupon
  let bestOrderDiscount: typeof activeOrderPromo | typeof manualCoupon = null;
  let maxOrderDiscountAmount = 0;

  if (activeOrderPromo) {
    let amt = 0;
    if (activeOrderPromo.discountType === 'percent') {
      amt = (subtotal * activeOrderPromo.discountValue) / 100;
    } else {
      amt = Math.min(subtotal, activeOrderPromo.discountValue);
    }
    if (amt > maxOrderDiscountAmount) {
      maxOrderDiscountAmount = amt;
      bestOrderDiscount = activeOrderPromo;
    }
  }

  if (manualCoupon) {
    let amt = 0;
    if (manualCoupon.discountType === 'percent') {
      amt = (subtotal * manualCoupon.discountValue) / 100;
    } else {
      amt = Math.min(subtotal, manualCoupon.discountValue);
    }
    if (amt > maxOrderDiscountAmount) {
      maxOrderDiscountAmount = amt;
      bestOrderDiscount = manualCoupon;
    }
  }

  if (bestOrderDiscount) {
    result.orderDiscount = {
      name: bestOrderDiscount.name,
      code: bestOrderDiscount.code,
      discountAmount: maxOrderDiscountAmount,
    };
  }

  return result;
}
