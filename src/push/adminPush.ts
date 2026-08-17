import { api } from '../api/client';
import { VAPID_PUBLIC_KEY } from '../config';

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function ensureAdminPushRegistration(): Promise<void> {
  if (!VAPID_PUBLIC_KEY) return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    await navigator.serviceWorker.ready;
    await subscribeAdminPush();
  } catch {
    // silent
  }
}

export async function subscribeAdminPush(): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }
    await api.post('/admin/push-subscriptions', sub.toJSON());
    return true;
  } catch {
    return false;
  }
}
