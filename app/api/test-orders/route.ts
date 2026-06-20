import { NextResponse } from 'next/server';
import { getSessionOrdersAction } from '@/actions/order';

export async function GET(request: Request) {
  try {
    const data = await getSessionOrdersAction('');
    return NextResponse.json({ success: true, count: data.length, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
