import { NextResponse } from 'next/server';
import { log } from '@/infra/logging';
import { prisma } from '@/infra/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, service: 'trem-food', db: 'up', ts: Date.now() });
  } catch (e) {
    log('error', 'health.db.down', { error: (e as Error).message });
    return NextResponse.json({ ok: false, service: 'trem-food', db: 'down' }, { status: 503 });
  }
}
