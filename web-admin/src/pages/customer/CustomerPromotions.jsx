import { useQuery } from '@tanstack/react-query';
import { Tag } from 'lucide-react';
import { getPromotions } from '../../services/customer';
import { fmtDate } from './status';
import RefreshButton from './RefreshButton';

export default function CustomerPromotions() {
  const { data: promos, isLoading, refetch, isFetching } = useQuery({ queryKey: ['c-promos'], queryFn: getPromotions });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Promociones</h1>
        <RefreshButton onClick={() => refetch()} spinning={isFetching} />
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Cargando…</p>}
      {!isLoading && (!promos || promos.length === 0) && (
        <div className="bg-white rounded-xl p-6 text-center text-gray-500 text-sm shadow-sm">
          <Tag className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          No hay promociones por ahora. Te avisaremos cuando haya nuevas.
        </div>
      )}

      <div className="space-y-3">
        {promos?.map((p) => (
          <div key={p.id} className="bg-white rounded-xl overflow-hidden shadow-sm">
            {p.imageUrl && <img src={p.imageUrl} alt={p.title} className="w-full h-40 object-cover" />}
            <div className="p-4">
              <div className="flex items-start gap-2">
                <div className="bg-brand-100 text-brand-600 rounded-lg p-1.5 shrink-0"><Tag size={16} /></div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{p.title}</p>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{p.body}</p>
                  <p className="text-xs text-gray-400 mt-2">{fmtDate(p.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
