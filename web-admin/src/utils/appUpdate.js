import { APP_VERSION } from '../version';

const TARGET_KEY = '4evr-update-target';
const RESULT_KEY = '4evr-update-result';

// Última versión desplegada: el build publica /version.json (nunca se guarda en caché)
export async function fetchLatestVersion() {
  const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo consultar la versión publicada');
  const data = await res.json(); // en desarrollo devuelve HTML → lanza y se trata como "sin dato"
  if (!data?.version) throw new Error('Respuesta de versión inválida');
  return data; // { version, builtAt }
}

export const isNewer = (latest) => !!latest && latest !== APP_VERSION;

// Borra el caché de la app (service workers + Cache Storage) y recarga desde el servidor.
// La sesión NO se cierra: no se tocan los datos de inicio de sesión.
export async function clearCacheAndReload(targetVersion) {
  try { localStorage.setItem(TARGET_KEY, targetVersion || ''); } catch { /* sin almacenamiento */ }
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch { /* se recarga de todos modos */ }
  // Parámetro único: obliga al navegador a pedir el HTML nuevo al servidor
  window.location.replace(`${window.location.pathname}?_u=${Date.now()}`);
}

// Al arrancar tras una actualización: compara lo que se pidió con lo que quedó cargado
export function consumeUpdateResult() {
  let target = null;
  try {
    target = localStorage.getItem(TARGET_KEY);
    if (target === null) return null;
    localStorage.removeItem(TARGET_KEY);
  } catch { return null; }

  // Limpia el parámetro de la barra de direcciones
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has('_u')) { url.searchParams.delete('_u'); window.history.replaceState({}, '', url.pathname + url.search + url.hash); }
  } catch { /* nada */ }

  if (!target || target === APP_VERSION) return { ok: true, message: `Actualizado: ahora usas la versión ${APP_VERSION}.` };
  return { ok: false, message: `Seguías en ${APP_VERSION}; la última publicada es ${target}. Si no cambia, espera unos minutos a que termine el despliegue.` };
}

export { RESULT_KEY };
