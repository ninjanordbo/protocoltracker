import { NextResponse } from 'next/server';
import { listLogs, upsertLog } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get('days') || '30', 10) || 30, 730);
    return NextResponse.json(listLogs(days));
  } catch (error) {
    console.error('Error fetching daily logs:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const date = String(body?.date ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'A valid date (YYYY-MM-DD) is required' }, { status: 400 });
    }
    const num = (v: unknown) =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(1, Math.min(10, Math.round(v))) : null;
    const log = upsertLog(date, {
      moodX: body?.moodX === null ? null : num(body?.moodX),
      moodY: body?.moodY === null ? null : num(body?.moodY),
      sleep: body?.sleep === null ? null : num(body?.sleep),
      health: body?.health === null ? null : num(body?.health),
      pain: body?.pain === null ? null : num(body?.pain),
      protocols:
        body?.protocols && typeof body.protocols === 'object'
          ? Object.fromEntries(
              Object.entries(body.protocols).map(([k, v]) => [k, v === true ? true : v === false ? false : null])
            )
          : undefined,
    });
    return NextResponse.json(log);
  } catch (error) {
    console.error('Error saving daily log:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
