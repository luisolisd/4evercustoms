import customerApi from './customerApi';
import api from './api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

const supported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// Estado: 'unsupported' | 'denied' | 'subscribed' | 'default'
export async function pushStatus() {
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg && (await reg.pushManager.getSubscription());
  return sub ? 'subscribed' : 'default';
}

// Pide permiso, suscribe el navegador y lo registra en el backend (cliente o personal del taller)
async function enableWith(client, subscribePath) {
  if (!supported()) throw new Error('Tu dispositivo no soporta notificaciones.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permiso de notificaciones denegado.');

  const reg = await navigator.serviceWorker.ready;
  const res = await client.get('/push/vapid-public-key');
  const publicKey = res.data?.publicKey;
  if (!publicKey) throw new Error('Las notificaciones no están configuradas en el servidor.');

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }
  const json = sub.toJSON();
  await client.post(subscribePath, { endpoint: json.endpoint, keys: json.keys });
  return true;
}

// Portal de clientes
export const enablePush = () => enableWith(customerApi, '/customer/push/subscribe');

// Panel del taller (técnico, supervisor, admin)
export const enableStaffPush = () => enableWith(api, '/notifications/push/subscribe');

// Al cerrar sesión: deja de recibir avisos en este dispositivo (no bloquea el cierre)
export async function disableStaffPush() {
  try {
    if (!supported()) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && (await reg.pushManager.getSubscription());
    if (sub) await api.post('/notifications/push/unsubscribe', { endpoint: sub.endpoint });
  } catch { /* sin conexión o sin suscripción */ }
}
