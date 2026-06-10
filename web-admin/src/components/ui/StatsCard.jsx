import clsx from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatsCard({ icon: Icon, label, value, trend, trendLabel, color = 'brand', loading }) {
  const colors = {
    brand:  { bg: 'bg-brand-50',  icon: 'bg-brand-600',  text: 'text-brand-600'  },
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-600',   text: 'text-blue-600'   },
    green:  { bg: 'bg-green-50',  icon: 'bg-green-600',  text: 'text-green-600'  },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-600', text: 'text-purple-600' },
    yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-500', text: 'text-yellow-600' },
  };
  const c = colors[color] || colors.brand;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={clsx('p-3 rounded-xl', c.icon)}>
          <Icon size={20} className="text-white" />
        </div>
        {trend != null && (
          <div className={clsx('flex items-center gap-1 text-xs font-medium', trend >= 0 ? 'text-green-600' : 'text-red-600')}>
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      {loading ? (
        <div className="h-8 bg-gray-200 rounded animate-pulse mb-2" />
      ) : (
        <p className="text-3xl font-bold text-gray-900 mb-1">{value ?? '—'}</p>
      )}
      <p className="text-sm text-gray-500">{label}</p>
      {trendLabel && <p className="text-xs text-gray-400 mt-1">{trendLabel}</p>}
    </div>
  );
}
