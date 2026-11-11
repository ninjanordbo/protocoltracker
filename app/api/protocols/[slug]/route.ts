import { NextResponse } from 'next/server';
import { updateProtocol, deleteProtocol } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json();
    const patch: { name?: string; archived?: string | null } = {};
    if (typeof body?.name === 'string') patch.name = body.name;
    if (body?.archived === null || typeof body?.archived === 'string') {
      patch.archived = body.archived;
    }
    const updated = updateProtocol(params.slug, patch);
    if (!updated) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating protocol:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const ok = deleteProtocol(params.slug);
    if (!ok) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting protocol:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
