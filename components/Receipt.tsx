import React from 'react';

export const Receipt = React.forwardRef<HTMLDivElement, { order: Record<string, unknown> | null }>(({ order }, ref) => {
  if (!order) return null;

  const o = order as Record<string, unknown>;

  return (
    <div ref={ref} className="p-8 max-w-sm mx-auto bg-white text-black font-mono text-sm shadow-md" style={{ width: '80mm' }}>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-black mb-1">Odoo Cafe</h1>
        <p className="text-xs text-gray-600">123 Coffee Street, Tech Park</p>
        <p className="text-xs text-gray-600">City, Country</p>
        <div className="border-b-2 border-dashed border-gray-300 my-4" />
        <h2 className="text-lg font-bold">RECEIPT</h2>
        <p className="text-xs mt-1">Order #{o.orderNumber}</p>
        <p className="text-xs">{new Date(o.createdAt || Date.now()).toLocaleString()}</p>
      </div>

      <div className="mb-4">
        {(o.items as Array<Record<string, unknown>>)?.map((item: Record<string, unknown>, idx: number) => {
          const product = item.product as { name?: string } | undefined;
          const prodName = product?.name || (item.name as string) || 'Unknown Product';
          const price = (item.price as number) || 0;
          const qty = (item.qty as number) || 0;
          const discount = (item.discount as number) || 0;
          const lineTotal = price * qty - discount;
          return (
            <div key={idx} className="flex flex-col mb-2">
              <div className="flex justify-between font-bold">
                <span>{qty}x {prodName}</span>
                <span>₹{lineTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{qty} x ₹{price.toFixed(2)}</span>
                {(discount as number) > 0 && <span>-₹{(discount as number).toFixed(2)}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-300 pt-3 flex flex-col gap-1">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>₹{(o.subtotal as number || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Tax</span>
          <span>₹{(o.tax as number || 0).toFixed(2)}</span>
        </div>
        {((o.discount as number) || 0) > 0 && (
          <div className="flex justify-between text-gray-600">
            <span>Discount</span>
            <span>-₹{((o.discount as number) || 0).toFixed(2)}</span>
          </div>
        )}
        <div className="border-t border-black my-2" />
        <div className="flex justify-between text-lg font-black">
          <span>TOTAL</span>
          <span>₹{(o.total as number || 0).toFixed(2)}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-300 mt-6 pt-4 text-center">
        <p className="font-bold text-sm">Thank You for Visiting!</p>
        <p className="text-xs mt-1 text-gray-500">Please come again</p>
      </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';
