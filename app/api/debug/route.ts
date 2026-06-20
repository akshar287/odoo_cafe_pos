import { NextResponse } from 'next/server';
import { getReportDataAction } from '@/actions/reports';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getReportDataAction('today');
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
