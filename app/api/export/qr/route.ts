import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Table from '@/models/Table';
// Must import Floor explicitly so Mongoose registers the schema before populate
import '@/models/Floor';
import QRCode from 'qrcode';

export async function GET(request: Request) {
  try {
    await dbConnect();

    const tables = await Table.find({ active: true })
      .populate('floor', 'name')
      .sort({ number: 1 })
      .lean() as unknown as Record<string, unknown>[];

    if (tables.length === 0) {
      return new NextResponse('No active tables found. Please create tables in the Booking section first.', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const origin = new URL(request.url).origin;

    // Generate QR codes as base64 PNGs
    const qrItems: { tableNumber: string; floorName: string; qrDataUrl: string; url: string }[] = [];

    for (const table of tables) {
      const url = `${origin}/menu?table=${String(table._id)}`;
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: { dark: '#1a1a1a', light: '#ffffff' },
      });
      qrItems.push({
        tableNumber: String(table.number),
        floorName: (table.floor as { name?: string })?.name || 'Main Floor',
        qrDataUrl,
        url,
      });
    }

    // Build an HTML page that auto-prints as PDF
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Table QR Codes – Odoo Cafe</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; }

    @media print {
      body { background: white; }
      .no-print { display: none !important; }
      .page-break { page-break-after: always; }
      .card { box-shadow: none !important; border: 1px solid #ddd !important; }
    }

    .no-print {
      position: fixed; top: 0; left: 0; right: 0;
      background: #f97316; color: white;
      padding: 14px 24px;
      display: flex; align-items: center; justify-between;
      gap: 12px; z-index: 100; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .no-print h1 { font-size: 16px; font-weight: 800; }
    .no-print p { font-size: 12px; opacity: 0.85; }
    .no-print button {
      background: white; color: #f97316; border: none;
      padding: 10px 22px; border-radius: 10px;
      font-size: 14px; font-weight: 800; cursor: pointer;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      padding: 90px 24px 24px;
      max-width: 900px;
      margin: 0 auto;
    }

    @media (max-width: 700px) {
      .grid { grid-template-columns: repeat(2, 1fr); }
    }

    .card {
      background: white;
      border-radius: 16px;
      padding: 24px 20px;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      display: flex; flex-direction: column; align-items: center; gap: 12px;
    }

    .cafe-name {
      font-size: 11px; font-weight: 800; letter-spacing: 2px;
      text-transform: uppercase; color: #f97316;
    }

    .table-number {
      font-size: 32px; font-weight: 900; color: #1a1a1a;
      line-height: 1;
    }

    .floor-name {
      font-size: 10px; font-weight: 600; color: #888;
      text-transform: uppercase; letter-spacing: 1px;
      margin-top: -6px;
    }

    .qr-img {
      width: 160px; height: 160px;
      border-radius: 12px;
      border: 3px solid #f97316;
      padding: 4px;
      background: white;
    }

    .scan-text {
      font-size: 11px; font-weight: 700; color: #555;
    }

    .url-text {
      font-size: 8px; color: #aaa;
      word-break: break-all;
      max-width: 160px;
    }

    .divider {
      width: 40px; height: 3px; background: #f97316;
      border-radius: 4px;
    }
  </style>
</head>
<body>

<div class="no-print">
  <div>
    <h1>🖨️ Table QR Codes Ready</h1>
    <p>${qrItems.length} QR code(s) generated for active tables</p>
  </div>
  <button onclick="window.print()">Print / Save as PDF</button>
</div>

<div class="grid">
  ${qrItems.map((item, i) => `
    <div class="card${i > 0 && (i + 1) % 6 === 0 ? ' page-break' : ''}">
      <span class="cafe-name">☕ Odoo Cafe</span>
      <div class="divider"></div>
      <div>
        <div class="table-number">T-${item.tableNumber}</div>
        <div class="floor-name">${item.floorName}</div>
      </div>
      <img src="${item.qrDataUrl}" alt="QR Code for Table ${item.tableNumber}" class="qr-img" />
      <div>
        <div class="scan-text">📱 Scan to Order</div>
        <div class="url-text">${item.url}</div>
      </div>
    </div>
  `).join('')}
</div>

<script>
  // Auto trigger print dialog after a short delay
  window.addEventListener('load', () => {
    setTimeout(() => {
      // Don't auto-print, let user click the button
    }, 500);
  });
</script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (err: unknown) {
    console.error('QR Export error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Export failed' }, 
      { status: 500 }
    );
  }
}
