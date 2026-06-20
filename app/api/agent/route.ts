import { NextResponse } from 'next/server';
import { askAgentAction } from '@/actions/agent';

export async function POST(req: Request) {
  try {
    const { history } = await req.json();
    const res = await askAgentAction(history);
    return NextResponse.json(res);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
