import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { User, MonitorSmartphone, LogOut, ShieldCheck, Package } from 'lucide-react';
import { AccountClient } from './account-client';
import { requireUser } from '@/domains/account/session';
import { prisma } from '@/infra/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'A minha conta',
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const { user, session } = await requireUser();
  if (!user) redirect('/login?next=/conta');

  let sessions: (typeof prisma.session extends { findMany: (...args: any[]) => Promise<infer R> } ? R : never) = [];
  try {
    sessions = await prisma.session.findMany({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
      orderBy: { lastSeen: 'desc' },
      take: 20,
    });
  } catch (err) {
    console.error('[AccountPage] Error loading sessions:', err);
    sessions = [];
  }

  return (
    <div className="container-app max-w-3xl py-8 sm:py-10">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">A minha conta</h1>

      <section className="card mt-8 flex flex-wrap items-center gap-4 p-6">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 font-display text-xl font-extrabold text-accent-ink">
          {user.name.trim().charAt(0).toUpperCase() || 'U'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold">{user.name}</p>
          <p className="text-sm text-muted">{user.email}</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-ink/60">
            {user.emailVerifiedAt ? (
              <><ShieldCheck className="h-3.5 w-3.5 text-success" /> E-mail confirmado</>
            ) : (
              <Link href="/verificar" className="text-danger underline underline-offset-2">E-mail por confirmar — ver agora</Link>
            )}
            {user.role === 'ADMIN' && <span className="chip bg-ink/5 text-ink/60">Administrador</span>}
          </p>
        </div>
        <Link href="/pedidos" className="btn-secondary">
          <Package className="h-4 w-4" /> Os meus pedidos
        </Link>
      </section>

      <section className="card mt-6 p-6">
        <h2 className="flex items-center gap-2 font-display text-base font-bold">
          <MonitorSmartphone className="h-4.5 w-4.5 text-muted" style={{ height: 18, width: 18 }} /> Sessões ativas ({sessions.length})
        </h2>
        <p className="mt-1 text-[13px] text-muted">Dispositivos com acesso à sua conta. Termine sessões que não reconhece.</p>
        <AccountClient currentHash={session?.tokenHash ?? ''} sessions={sessions.map((s) => ({ id: s.id, ip: s.ip, userAgent: s.userAgent, createdAt: s.createdAt, lastSeen: s.lastSeen, expiresAt: s.expiresAt, current: s.tokenHash === session?.tokenHash }))} />
      </section>
    </div>
  );
}
