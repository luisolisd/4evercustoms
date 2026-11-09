import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

const KEY = '4evr-install-dismissed';
const HIDE_DAYS = 7;

const isStandalone = () =>
  (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) || window.navigator.standalone === true;

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const recentlyDismissed = () => {
  try {
    const t = Number(localStorage.getItem(KEY) || 0);
    return t && Date.now() - t < HIDE_DAYS * 86400000;
  } catch { return false; }
};

/**
 * Ofrece "Agregar a inicio" al abrir el portal desde el QR.
 *  · Android / Chrome: botón que lanza el aviso de instalación del navegador.
 *  · iPhone / iPad (Safari no permite instalar por código): muestra los pasos de Compartir → Agregar a inicio.
 *  offset: separación inferior (por ejemplo, sobre la barra de navegación del portal)
 */
export default function InstallPrompt({ offset = 'bottom-4' }) {
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);
  const ios = isIos();

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return undefined;

    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); setShow(true); };
    const onInstalled = () => { setShow(false); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // iOS no dispara beforeinstallprompt: se muestran las instrucciones
    const t = ios ? setTimeout(() => setShow(true), 1200) : null;
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      if (t) clearTimeout(t);
    };
  }, [ios]);

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(KEY, String(Date.now())); } catch { /* sin almacenamiento */ }
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch { /* cancelado */ }
    setDeferred(null);
    setShow(false);
  };

  if (!show || (!deferred && !ios)) return null;

  return (
    <div className={`fixed inset-x-3 ${offset} z-40 mx-auto max-w-md rounded-md border border-gray-200 bg-white shadow-elevated animate-fade-up`}>
      <div className="flex items-start gap-3 p-3.5">
        <img src="/pwa-192.png" alt="" className="h-11 w-11 rounded-md shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">Instala la app en tu inicio</p>
          {deferred ? (
            <p className="text-xs text-gray-500 mt-0.5">Consulta el estatus de tu vehículo y tus citas con un toque, sin abrir el navegador.</p>
          ) : (
            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
              Toca <Share size={13} className="inline -mt-0.5 text-brand-600" /> <b>Compartir</b> y elige <b>“Agregar a pantalla de inicio”</b>.
            </p>
          )}
          {deferred && (
            <button
              onClick={install}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <Download size={15} /> Agregar a inicio
            </button>
          )}
        </div>
        <button onClick={dismiss} aria-label="Cerrar" className="-mr-1 -mt-1 p-2 text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>
    </div>
  );
}
