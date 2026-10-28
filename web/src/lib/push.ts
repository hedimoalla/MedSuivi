import { apiFetch } from '../api/client';

/** Vrai si le navigateur sait recevoir des notifications push (Android, ordinateur, iPhone installé). */
export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** Abonnement de cet appareil, s'il existe. */
export async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

// La clé VAPID est transmise en base64url ; le navigateur attend des octets.
function urlBase64ToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export type EnableResult = 'enabled' | 'denied' | 'unavailable';

/** Demande la permission, crée l'abonnement sur cet appareil et l'enregistre sur le serveur. */
export async function enableAlerts(): Promise<EnableResult> {
  const { publicKey } = await apiFetch<{ publicKey: string | null }>('/api/push/config');
  if (!publicKey) return 'unavailable';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToBytes(publicKey),
  });
  const json = subscription.toJSON();
  await apiFetch('/api/push/subscriptions', {
    method: 'POST',
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
  return 'enabled';
}

/** Retire l'abonnement de cet appareil, côté serveur puis côté navigateur. */
export async function disableAlerts(): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await apiFetch('/api/push/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}
