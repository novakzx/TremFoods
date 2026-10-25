import Link from 'next/link';

const COMPANY = {
  name: 'Trem Food, Lda.',
  nif: '517 439 802',
  address: 'Av. António José Gomes 6, 2805-085 Almada',
  phone: '+351964994787',
  phoneDisplay: '964 994 787',
  whatsapp: 'https://wa.me/351964994787',
  email: 'ola@tremfood.pt',
};

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-surface text-[13px] text-muted">
      <div className="container-app grid gap-8 py-10 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="rounded-full bg-brand p-[2px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/brand/logo.png" alt="" className="h-9 w-9 rounded-full border-2 border-surface object-cover" />
            </span>
            <span className="font-display text-base font-bold text-ink">Trem Food</span>
          </div>
          <p className="mt-3 leading-relaxed">{COMPANY.address}</p>
          <p className="mt-1">Todos os dias · 06h30–00h00</p>
        </div>

        <div>
          <p className="mb-2 font-semibold text-ink">Contactos</p>
          <ul className="space-y-1.5">
            <li><a href={`tel:${COMPANY.phone}`} className="hover:text-ink">{COMPANY.phoneDisplay}</a></li>
            <li><a href={COMPANY.whatsapp} target="_blank" rel="noopener noreferrer" className="hover:text-ink">WhatsApp</a></li>
            <li><a href={`mailto:${COMPANY.email}`} className="hover:text-ink">{COMPANY.email}</a></li>
          </ul>
        </div>

        <div>
          <p className="mb-2 font-semibold text-ink">Pedidos</p>
          <ul className="space-y-1.5">
            <li><Link href="/cardapio" className="hover:text-ink">Cardápio</Link></li>
            <li><Link href="/rastreamento" className="hover:text-ink">Acompanhar pedido</Link></li>
            <li><Link href="/pedidos" className="hover:text-ink">Os meus pedidos</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-app flex flex-col gap-2 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {COMPANY.name} · NIF {COMPANY.nif}</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Legal">
            <Link href="/privacidade" className="hover:text-ink">Privacidade</Link>
            <Link href="/termos" className="hover:text-ink">Termos</Link>
            <Link href="/cookies" className="hover:text-ink">Cookies</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
