import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AccountClient, LogoutButton } from './account-client';
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

  const sessions = await prisma.session
    .findMany({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
      orderBy: { lastSeen: 'desc' },
      take: 20,
    })
    .catch((err) => {
      console.error('[AccountPage] Error loading sessions:', err);
      return [];
    });

  return (
    <div className="container-app max-w-2xl py-6 sm:py-8">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">A minha conta</h1>

      <section className="card mt-5 p-4 sm:p-5">
        <p className="font-semibold">{user.name}</p>
        <p className="text-sm text-muted">{user.email}</p>
        <p className="mt-1 text-[13px]">
          {user.emailVerifiedAt ? (
            <span className="text-success">E-mail confirmado</span>
          ) : (
            <Link href="/verificar" className="font-medium text-danger underline underline-offset-2">E-mail por confirmar — reenviar confirmação</Link>
          )}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/pedidos" className="btn-primary">Os meus pedidos</Link>
          {user.role === 'ADMIN' && <Link href="/admin" className="btn-secondary">Painel de gestão</Link>}
          <LogoutButton />
        </div>
      </section>

      <section className="card mt-4 p-4 sm:p-5">
        <h2 className="font-semibold">Sessões ativas</h2>
        <p className="mt-0.5 text-[13px] text-muted">Dispositivos com acesso à sua conta. Termine as que não reconhece.</p>
        <AccountClient
          sessions={sessions.map((s) => ({ id: s.id, ip: s.ip, userAgent: s.userAgent, lastSeen: s.lastSeen, current: s.tokenHash === session?.tokenHash }))}
        />
      </section>
    </div>
  );
}
