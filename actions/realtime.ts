'use server';

import { publishTableUpdate } from '@/lib/realtime';

export async function broadcastCartUpdateAction(tableId: string, cartData: any) {
  try {
    console.log(`Broadcasting cart update for table ${tableId} with ${cartData?.items?.length} items.`);
    await publishTableUpdate(tableId, 'cart-updated', cartData);
    return { success: true };
  } catch (e) {
    console.error('broadcastCartUpdateAction error:', e);
    return { success: false };
  }
}

export async function broadcastUpiQrAction(tableId: string, upiData: { url: string; amount: number }) {
  try {
    await publishTableUpdate(tableId, 'show-upi-qr', upiData);
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}

export async function requestCartSyncAction(tableId: string) {
  try {
    await publishTableUpdate(tableId, 'customer-joined', {});
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}
