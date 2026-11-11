import { NextResponse } from 'next/server';
import { listEvents, createEvent } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(listEvents());
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const date = String(body?.date ?? '').trim();
    const title = String(body?.title ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !title) {
      return NextResponse.json({ error: 'A valid date and title are required' }, { status: 400 });
    }
    return NextResponse.json(createEvent({ date, title }), { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
