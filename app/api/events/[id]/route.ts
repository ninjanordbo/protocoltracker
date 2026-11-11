import { NextResponse } from 'next/server';
import { updateEvent, deleteEvent } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const patch: { date?: string; title?: string } = {};
    if (typeof body?.date === 'string') patch.date = body.date;
    if (typeof body?.title === 'string') patch.title = body.title;
    const updated = updateEvent(params.id, patch);
    if (!updated) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const ok = deleteEvent(params.id);
    if (!ok) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
