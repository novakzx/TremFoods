import Link from 'next/link';
import { Instagram, Facebook, MapPin, Phone, Mail, Clock } from 'lucide-react';

const COMPANY = {
  name: 'Trem Food, Lda.',
  nif: '517 439 802',
  address: ['Av. António José Gomes 6', '2805-085 Almada', 'Portugal'],
  phone: '+351 964 994 787',
  phoneDisplay: '964 994 787',
  whatsapp: 'https://wa.me/351964994787',
  email: 'ola@tremfood.pt',
  hours: ['Segunda a Domingo: 06h30 – 00h00', 'Comer no local · Recolha móvel · Entrega sem contacto'],
};

export function Footer() {
  return (
    <footer className="mt-20 bg-[#1A1006] text-[#C7BCA9]">
      <div className="h-[3px] w-full bg-brand" />
      <div className="container-app grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="rounded-full bg-brand p-[2px]">
              <img src="/img/brand/logo.png" alt="" className="h-9 w-9 rounded-full border-2 border-[#1A1006] object-cover" />
            </span>
            <div className="leading-tight">
              <span className="block font-display text-[16px] font-bold text-white">Trem Food</span>
              <span className="block text-[11px] text-white/40">Hamburgueria · Almada</span>
            </div>
          </div>
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-white/50">
            Hamburgueria de bairro em Almada, com menu brasileiro e português: x-salada,
            picanha, torresmo e petiscos para partilhar. Aberto todos os dias a partir das 06h30.
          </p>
          <div className="mt-5 flex gap-2">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="rounded-full border border-white/10 p-2.5 text-white/60 transition-colors hover:border-brand/60 hover:text-accent">
              <Instagram className="h-4 w-4" />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="rounded-full border border-white/10 p-2.5 text-white/60 transition-colors hover:border-brand/60 hover:text-accent">
              <Facebook className="h-4 w-4" />
            </a>
            <a href={COMPANY.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="rounded-full border border-white/10 p-2.5 text-white/60 transition-colors hover:border-brand/60 hover:text-accent">
              <Phone className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-accent/90">Navegação</h3>
          <ul className="space-y-2.5 text-[13px]">
            <li><Link href="/cardapio" className="hover:text-white">Cardápio</Link></li>
            <li><Link href="/rastreamento" className="hover:text-white">Acompanhar pedido</Link></li>
            <li><Link href="/pedidos" className="hover:text-white">Os meus pedidos</Link></li>
            <li><Link href="/carrinho" className="hover:text-white">Carrinho</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-accent/90">Contactos e morada</h3>
          <ul className="space-y-3 text-[13px]">
            <li className="flex gap-2.5"><MapPin className="mt-0.5 h-4 w-4 flex-none text-white/40" /><span>{COMPANY.address.join(', ')}</span></li>
            <li className="flex gap-2.5"><Phone className="mt-0.5 h-4 w-4 flex-none text-white/40" /><a href="tel:+351964994787" className="hover:text-white">{COMPANY.phoneDisplay}</a></li>
            <li className="flex gap-2.5"><Mail className="mt-0.5 h-4 w-4 flex-none text-white/40" /><a href="mailto:ola@tremfood.pt" className="hover:text-white">{COMPANY.email}</a></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-accent/90">Horário</h3>
          <ul className="space-y-2.5 text-[13px]">
            <li className="flex gap-2.5"><Clock className="mt-0.5 h-4 w-4 flex-none text-white/40" /><span>{COMPANY.hours[0]}</span></li>
            <li className="flex gap-2.5"><Clock className="mt-0.5 h-4 w-4 flex-none text-white/40" /><span>{COMPANY.hours[1]}</span></li>
          </ul>
          <p className="mt-4 text-[12px] text-white/40">
            {COMPANY.name} · NIF {COMPANY.nif} · Preço médio 10–15 € por pessoa
          </p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-app flex flex-col items-center justify-between gap-3 py-6 text-[12px] text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} {COMPANY.name} · Todos os direitos reservados.</p>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2" aria-label="Legal">
            <Link href="/privacidade" className="hover:text-white/80">Política de Privacidade</Link>
            <Link href="/termos" className="hover:text-white/80">Termos e Condições</Link>
            <Link href="/cookies" className="hover:text-white/80">Política de Cookies</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
