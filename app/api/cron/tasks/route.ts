import { NextResponse } from 'next/server';
import { runTasks } from '@/actions/taskRunner';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const logs = await runTasks();
    return NextResponse.json({ success: true, logs });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
