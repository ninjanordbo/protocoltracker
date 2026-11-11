import { NextResponse } from 'next/server';
import { listProtocols, createProtocol } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(listProtocols());
  } catch (error) {
    console.error('Error fetching protocols:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body?.name ?? '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const protocol = createProtocol(name);
    return NextResponse.json(protocol, { status: 201 });
  } catch (error) {
    console.error('Error creating protocol:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
