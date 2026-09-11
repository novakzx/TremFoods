import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { PwaRegister } from '@/components/pwa-register';
import { InstallBanner } from '@/components/install-banner';
import { CookieConsent } from '@/components/cookie-consent';
import './globals.css';
import { requireUser, secrets } from '@/domains/account/session';
import { loadBasket, summarizeBasket } from '@/domains/basket/basket-store';

export const dynamic = 'force-dynamic';

const SITE = {
  name: 'Trem Food — Hamburgueria em Almada',
  url: 'https://tremfood.pt',
  description:
    'Hamburgueria em Almada com menu brasileiro e português: x-salada, picanha com ovo frito, torresmo, kibe e petiscos. Aberto todos os dias, 06h30-00h00. Recolha móvel e entrega sem contacto.',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.name, template: '%s · Trem Food' },
  description: SITE.description,
  applicationName: 'Trem Food',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Trem Food' },
  formatDetection: { telephone: true },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_PT',
    url: SITE.url,
    siteName: 'Trem Food',
    title: SITE.name,
    description: SITE.description,
    images: [{ url: '/img/og/og-1200x630.png', width: 1200, height: 630, alt: 'Trem Food — Hamburgueria em Almada' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.name,
    description: SITE.description,
    images: ['/img/og/og-1200x630.png'],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#231506',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  let cartCount = 0;
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(secrets.CART_COOKIE)?.value ?? null;
    const cart = await loadBasket(user?.id ?? null, token);
    cartCount = summarizeBasket(cart).count;
  } catch {
    cartCount = 0;
  }

  return (
    <html lang="pt-PT">
      <body className="flex min-h-screen flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Restaurant',
              name: 'Trem Food',
              servesCuisine: ['Hambúrgueres', 'Brasileira', 'Petiscos'],
              priceRange: '€10-15',
              telephone: '+351 964 994 787',
              email: 'ola@tremfood.pt',
              url: SITE.url,
              image: `${SITE.url}/img/items/real-x-salada.jpg`,
              address: {
                '@type': 'PostalAddress',
                streetAddress: 'Av. António José Gomes 6',
                postalCode: '2805-085',
                addressLocality: 'Almada',
                addressRegion: 'Setúbal',
                addressCountry: 'PT',
              },
              geo: { '@type': 'GeoCoordinates', latitude: 38.6792, longitude: -9.1566 },
              openingHoursSpecification: [
                { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '06:30', closes: '23:59' },
              ],
              acceptsReservations: 'False',
            }),
          }}
        />
        <PwaRegister />
        <Header user={user ? { name: user.name, email: user.email, role: user.role } : null} cartCount={cartCount} />
        <main className="flex-1">{children}</main>
        <Footer />
        <InstallBanner />
        <CookieConsent />
      </body>
    </html>
  );
}
