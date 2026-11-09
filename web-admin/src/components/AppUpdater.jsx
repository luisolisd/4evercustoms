import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, ArrowUpCircle, AlertTriangle } from 'lucide-react';
import Button from './ui/Button';
import { APP_VERSION } from '../version';
import { fetchLatestVersion, isNewer, clearCacheAndReload } from '../utils/appUpdate';
import { fDateTime } from '../utils/formatters';

/**
 * "Actualizar versión": consulta la última versión publicada, muestra si hay una nueva,
 * borra el caché de la app y recarga. Después confirma con un aviso a qué versión se actualizó.
 */
export default function AppUpdater() {
  const [state, setState] = useState('checking'); // checking | latest | available | unknown | updating
  const [latest, setLatest] = useState(null);

  const check = useCallback(async () => {
    setState('checking');
    try {
      const data = await fetchLatestVersion();
      setLatest(data);
      setState(isNewer(data.version) ? 'available' : 'latest');
    } catch {
      setLatest(null);
      setState('unknown');
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  const update = () => { setState('updating'); clearCacheAndReload(latest?.version || ''); };

  return (
    <div className="space-y-5 max-w-md">
      <div className="rounded-md border border-gray-200 divide-y divide-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-gray-500">Versión instalada</span>
          <span className="text-sm font-semibold text-gray-900">{APP_VERSION}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-gray-500">Última versión publicada</span>
          <span className="text-sm font-semibold text-gray-900">
            {state === 'checking' ? 'Consultando…' : latest?.version || 'No disponible'}
          </span>
        </div>
        {latest?.builtAt && (
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-500">Publicada</span>
            <span className="text-sm text-gray-700">{fDateTime(latest.builtAt)}</span>
          </div>
        )}
      </div>

      {state === 'latest' && (
        <p className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> Ya tienes la última versión. Si algo se ve desactualizado, puedes limpiar el caché igualmente.
        </p>
      )}
      {state === 'available' && (
        <p className="flex items-start gap-2 rounded-md border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm text-brand-800">
          <ArrowUpCircle size={16} className="mt-0.5 shrink-0" /> Hay una versión nueva ({latest.version}). Actualiza para usarla.
        </p>
      )}
      {state === 'unknown' && (
        <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> No se pudo confirmar la última versión (sin conexión o sitio en despliegue). Puedes limpiar el caché y recargar de todos modos.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button icon={RefreshCw} onClick={update} loading={state === 'updating'} disabled={state === 'checking'}>
          {state === 'available' ? 'Actualizar a la última versión' : 'Limpiar caché y recargar'}
        </Button>
        <Button variant="secondary" onClick={check} disabled={state === 'checking' || state === 'updating'}>Buscar de nuevo</Button>
      </div>
      <p className="text-xs text-gray-400">Se borra el caché de la app y se recarga. Tu sesión sigue abierta.</p>
    </div>
  );
}
