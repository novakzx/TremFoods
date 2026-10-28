import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { KitchenBoard } from './kitchen-board';
import { requireUser } from '@/domains/account/session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Cozinha — Painel de gestão',
  robots: { index: false, follow: false },
};

export default async function KitchenPage() {
  const { user } = await requireUser();
  if (!user) redirect('/login?next=/admin/cozinha');
  if (user.role !== 'ADMIN') redirect('/');
  return <KitchenBoard />;
}
