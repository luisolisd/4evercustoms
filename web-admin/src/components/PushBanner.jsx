import { useEffect, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { pushStatus, enableStaffPush } from '../services/push';
import { useToast } from '../hooks/useToast';

const KEY = '4evr-staff-push-dismissed';
const HIDE_DAYS = 3;

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

const recentlyDismissed = () => {
  try {
    const t = Number(localStorage.getItem(KEY) || 0);
    return t && Date.now() - t < HIDE_DAYS * 86400000;
  } catch { return false; }
};

// Invita a activar los avisos push (nuevas órdenes y citas asignadas) en este dispositivo
export default function PushBanner() {
  const toast = useToast();
  const [state, setState] = useState(null); // null = oculto · 'ask' | 'ios-install'
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (recentlyDismissed()) return;
    // iPhone: las notificaciones web solo funcionan con la app instalada en inicio
    if (isIos() && !isStandalone()) { setState('ios-install'); return; }
    pushStatus().then((s) => { if (s === 'default') setState('ask'); }).catch(() => {});
  }, []);

  const dismiss = () => {
    setState(null);
    try { localStorage.setItem(KEY, String(Date.now())); } catch { /* sin almacenamiento */ }
  };

  const enable = async () => {
    setBusy(true);
    try {
      await enableStaffPush();
      toast.success('Notificaciones activadas');
      setState(null);
    } catch (e) {
      toast.error(e.message || 'No se pudieron activar');
    } finally { setBusy(false); }
  };

  if (!state) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-md border border-brand-200 border-l-[3px] border-l-brand-500 bg-brand-50/60 px-4 py-3">
      <BellRing size={18} className="mt-0.5 shrink-0 text-brand-600" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">Recibe avisos de nuevas órdenes y citas</p>
        {state === 'ask' ? (
          <>
            <p className="text-xs text-gray-600 mt-0.5">Te notificamos en el celular cuando te asignen una orden o una cita por ingresar.</p>
            <button onClick={enable} disabled={busy} className="mt-2 rounded bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              {busy ? 'Activando…' : 'Activar notificaciones'}
            </button>
          </>
        ) : (
          <p className="text-xs text-gray-600 mt-0.5">En iPhone, primero agrega esta app a tu pantalla de inicio (Compartir → Agregar a pantalla de inicio) y ábrela desde el icono para activarlas.</p>
        )}
      </div>
      <button onClick={dismiss} aria-label="Cerrar" className="-mr-1 -mt-1 p-2 text-gray-400 hover:text-gray-600"><X size={16} /></button>
    </div>
  );
}
