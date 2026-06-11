import customerApi from './customerApi';

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

// Pide permiso, suscribe el navegador y registra la suscripción en el backend
export async function enablePush() {
  if (!supported()) throw new Error('Tu dispositivo no soporta notificaciones.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permiso de notificaciones denegado.');

  const reg = await navigator.serviceWorker.ready;
  const res = await customerApi.get('/push/vapid-public-key');
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
  await customerApi.post('/customer/push/subscribe', { endpoint: json.endpoint, keys: json.keys });
  return true;
}
