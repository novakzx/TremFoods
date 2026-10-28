import Link from 'next/link';
import { ListOrdered, BarChart3, UtensilsCrossed } from 'lucide-react';

const TABS = [
  { id: 'orders', href: '/admin', label: 'Pedidos', Icon: ListOrdered },
  { id: 'metrics', href: '/admin/dashboard', label: 'Métricas', Icon: BarChart3 },
  { id: 'menu', href: '/admin/menu', label: 'Cardápio', Icon: UtensilsCrossed },
] as const;

export function AdminNav({ active }: { active: 'orders' | 'metrics' | 'menu' }) {
  return (
    <nav className="mt-4 flex gap-1 border-b border-line" aria-label="Secções do painel">
      {TABS.map(({ id, href, label, Icon }) => (
        <Link
          key={id}
          href={href}
          aria-current={active === id ? 'page' : undefined}
          className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
            active === id ? 'border-brand text-ink' : 'border-transparent text-ink/60 hover:text-ink'
          }`}
        >
          <Icon className="h-4 w-4" /> {label}
        </Link>
      ))}
    </nav>
  );
}
