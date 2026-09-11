import 'server-only';
import webpush from 'web-push';
import { prisma } from '@/infra/db';
import { env } from '@/infra/config';
import { log } from '@/infra/logging';

export function pushEnabled() {
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

// Notifica todas as subscrições ligadas ao pedido. Endpoints mortos (404/410 —
// app desinstalada) são removidos para não acumularem.
export async function notifyOrderStatus(orderNumber: string, title: string, body: string, url: string) {
  if (!pushEnabled()) return;
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  const subs = await prisma.pushSubscription.findMany({ where: { orderNumber } });
  const payload = JSON.stringify({ title, body, url, tag: orderNumber });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.keysP256dh, auth: sub.keysAuth } }, payload);
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          log('warn', 'push.send.failed', { orderNumber, error: (e as Error).message });
        }
      }
    }),
  );
}
