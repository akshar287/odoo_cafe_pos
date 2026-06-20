'use server';

import { publishTableUpdate } from '@/lib/realtime';

import { createOrderAction, deleteOrderAction, getActiveOrdersForTable } from './order';

export async function broadcastCartUpdateAction(tableId: string, cartData: any) {
  try {
    console.log(`Broadcasting cart update for table ${tableId} with ${cartData?.items?.length} items.`);
    await publishTableUpdate(tableId, 'cart-updated', cartData);

    // Auto-save draft order so the table shows as "occupied" globally
    if (cartData?.items && cartData.items.length > 0) {
      await createOrderAction({
        tableId,
        items: cartData.items.map((i: any) => ({
          productId: i.productId,
          qty: i.qty,
          price: i.price,
          discount: i.discount || 0
        })),
        subtotal: cartData.subtotal,
        tax: cartData.tax,
        discount: cartData.discount || 0,
        total: cartData.total,
        status: 'draft',
        source: 'pos',
      });
    } else {
      // Cart is empty, delete draft order if exists to free the table
      const draft = await getActiveOrdersForTable(tableId);
      if (draft) {
        await deleteOrderAction(draft._id.toString());
      }
    }

    return { success: true };
  } catch (e: any) {
    console.error('broadcastCartUpdateAction error:', e.message || e);
    // DEBUG: Write error to file so we can inspect it
    require('fs').appendFileSync('c:\\\\Users\\\\Akshar\\\\Desktop\\\\odoo_cafe\\\\broadcast-error.log', new Date().toISOString() + '\\n' + (e.stack || e.message) + '\\n\\n');
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
