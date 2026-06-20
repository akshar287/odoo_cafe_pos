import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Provide a mock default or require real API key
const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');

export async function POST(req: Request) {
  try {
    const { email, order } = await req.json();

    if (!email || !order) {
      return NextResponse.json({ success: false, error: 'Email and order data are required' }, { status: 400 });
    }

    const htmlContent = `
      <div style="font-family: monospace; max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
        <h1 style="text-align: center;">Odoo Cafe</h1>
        <p style="text-align: center;">Order #${order.orderNumber}</p>
        <hr />
        ${order.items.map((item: { qty: number, price: number, discount?: number, name?: string, product?: { name: string } }) => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>${item.qty}x ${item.product?.name || item.name}</span>
            <span>₹${(item.price * item.qty - (item.discount || 0)).toFixed(2)}</span>
          </div>
        `).join('')}
        <hr />
        <div style="display: flex; justify-content: space-between;">
          <strong>Total</strong>
          <strong>₹${order.total.toFixed(2)}</strong>
        </div>
        <p style="text-align: center; margin-top: 20px;">Thank you for your business!</p>
      </div>
    `;

    // Only send if we have a real key configured, otherwise mock success
    if (process.env.RESEND_API_KEY) {
      const data = await resend.emails.send({
        from: 'Odoo Cafe <receipts@odoocafe.com>', // Usually needs to be a verified domain
        to: [email],
        subject: `Your Receipt for Order #${order.orderNumber}`,
        html: htmlContent,
      });

      return NextResponse.json({ success: true, data });
    } else {
      console.log('MOCK EMAIL SENT TO:', email);
      return NextResponse.json({ success: true, mock: true, message: 'Email sent (mock)' });
    }

  } catch (error: unknown) {
    console.error('Email sending error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
