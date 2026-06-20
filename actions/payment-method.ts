'use server';

import dbConnect from '@/lib/db';
import PaymentMethod from '@/models/PaymentMethod';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';

// Helper to ensure admin access
async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
}

export async function getPaymentMethods() {
  try {
    const methods = await PaymentMethod.find({}).sort({ createdAt: 1 }).lean();
    return JSON.parse(JSON.stringify(methods));
  } catch (err) {
    console.error('getPaymentMethods error:', err);
    return [];
  }
}

export interface SavePaymentMethodInput {
  id?: string;
  name: string;
  type: 'cash' | 'card' | 'upi';
  upiId?: string;
  active: boolean;
}

export async function savePaymentMethodAction(input: SavePaymentMethodInput) {
  try {
    await requireAdmin();
    await dbConnect();

    if (input.type === 'upi' && !input.upiId) {
      return { success: false, error: 'UPI ID is required for UPI payment type.' };
    }

    const data: any = {
      name: input.name,
      type: input.type,
      active: input.active,
    };

    if (input.type === 'upi') {
      data.upiId = input.upiId;
    } else {
      data.upiId = undefined;
    }

    let saved;
    if (input.id) {
      saved = await PaymentMethod.findByIdAndUpdate(input.id, data, { new: true });
    } else {
      saved = await PaymentMethod.create(data);
    }

    revalidatePath('/backend/payment-method');
    revalidatePath('/pos');
    return { success: true, paymentMethod: JSON.parse(JSON.stringify(saved)) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save payment method' };
  }
}

export async function deletePaymentMethodAction(id: string) {
  try {
    await requireAdmin();
    await dbConnect();

    await PaymentMethod.findByIdAndDelete(id);

    revalidatePath('/backend/payment-method');
    revalidatePath('/pos');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete payment method' };
  }
}
