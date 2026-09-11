import { apiPost, apiDelete } from '@/infra/http-client';

// O browser só permite subscrever via service worker ativo; sem suporte
// (HTTP, browsers antigos) a funcionalidade esconde-se na interface.
export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function pushPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
}

const ENDPOINT_STORAGE = 'tf-push-endpoint';

export function savedPushEndpoint(): string | null {
  return localStorage.getItem(ENDPOINT_STORAGE);
}

export async function subscribeToOrder(orderNumber: string, code?: string) {
  if (!pushSupported() || !pushPublicKey()) return { ok: false as const, status: 'UNSUPPORTED' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false as const, status: 'DENIED' };

  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(pushPublicKey()!),
  });
  const json = subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };

  const r = await apiPost('/api/push/subscribe', {
    endpoint: json.endpoint,
    keysP256dh: json.keys.p256dh,
    keysAuth: json.keys.auth,
    orderNumber,
    code,
  });
  if (r.ok) localStorage.setItem(ENDPOINT_STORAGE, json.endpoint);
  return r;
}

export async function unsubscribeFromOrder() {
  const endpoint = savedPushEndpoint();
  if (endpoint && pushSupported()) {
    await apiDelete('/api/push/subscribe', { endpoint });
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  }
  localStorage.removeItem(ENDPOINT_STORAGE);
}

export async function currentPushStatus(): Promise<'active' | 'parked'> {
  if (!pushSupported() || !pushPublicKey()) return 'parked';
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub && savedPushEndpoint() ? 'active' : 'parked';
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
