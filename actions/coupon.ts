'use server';

import dbConnect from '@/lib/db';
import Coupon from '@/models/Coupon';
import { revalidatePath } from 'next/cache';
import type { UserRole } from '@/types/clerk';
import { auth } from '@clerk/nextjs/server';

async function requireAdmin() {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error('Unauthorized');
  const role = (sessionClaims?.metadata as { role?: UserRole })?.role;
  if (role !== 'admin') throw new Error('Forbidden: Admin access required');
}

export async function getCoupons() {
  try {
    await dbConnect();
    return await Coupon.find({}).sort({ createdAt: -1 }).lean();
  } catch (err) {
    console.error('getCoupons error:', err);
    return [];
  }
}

export interface SaveCouponInput {
  id?: string;
  name: string;
  code: string;
  type: 'coupon' | 'automated-product' | 'automated-order';
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minQty?: number;
  minOrderAmount?: number;
  active: boolean;
}

export async function saveCouponAction(input: SaveCouponInput) {
  try {
    await requireAdmin();
    await dbConnect();

    // Enforce coupon code uppercase and uniqueness check (except same ID)
    const code = input.code.toUpperCase().trim();
    if (input.type === 'coupon') {
      const existing = await Coupon.findOne({ code });
      if (existing && (!input.id || existing._id.toString() !== input.id)) {
        return { success: false, error: 'Coupon code already exists.' };
      }
    }

    const data: any = {
      name: input.name,
      code,
      type: input.type,
      discountType: input.discountType,
      discountValue: input.discountValue,
      active: input.active,
      minQty: input.type === 'automated-product' ? (input.minQty ?? 1) : 1,
      minOrderAmount: input.type === 'automated-order' ? (input.minOrderAmount ?? 0) : 0,
    };

    let saved;
    if (input.id) {
      saved = await Coupon.findByIdAndUpdate(input.id, data, { new: true });
    } else {
      saved = await Coupon.create(data);
    }

    revalidatePath('/backend/coupon-promotion');
    revalidatePath('/pos');
    return { success: true, coupon: JSON.parse(JSON.stringify(saved)) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save coupon/promotion' };
  }
}

export async function deleteCouponAction(id: string) {
  try {
    await requireAdmin();
    await dbConnect();

    await Coupon.findByIdAndDelete(id);

    revalidatePath('/backend/coupon-promotion');
    revalidatePath('/pos');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete coupon/promotion' };
  }
}
