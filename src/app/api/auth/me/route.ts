import { NextResponse } from 'next/server';
import { requireUser } from '@/domains/account/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { user } = await requireUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: !!user.emailVerifiedAt },
  });
}
