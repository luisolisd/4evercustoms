import clsx from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatsCard({ icon: Icon, label, value, trend, trendLabel, color = 'brand', loading }) {
  const colors = {
    brand:  { icon: 'bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow', ring: 'group-hover:ring-brand-200/70' },
    blue:   { icon: 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-[0_8px_24px_-8px_rgb(37,99,235,0.45)]', ring: 'group-hover:ring-blue-200/70' },
    green:  { icon: 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_8px_24px_-8px_rgb(5,150,105,0.45)]', ring: 'group-hover:ring-emerald-200/70' },
    purple: { icon: 'bg-gradient-to-br from-purple-400 to-purple-600 shadow-[0_8px_24px_-8px_rgb(147,51,234,0.45)]', ring: 'group-hover:ring-purple-200/70' },
    yellow: { icon: 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-[0_8px_24px_-8px_rgb(245,158,11,0.45)]', ring: 'group-hover:ring-amber-200/70' },
  };
  const c = colors[color] || colors.brand;

  return (
    <div className={clsx('group card p-6 ring-1 ring-transparent hover:shadow-elevated hover:-translate-y-1 transition-all duration-300', c.ring)}>
      <div className="flex items-start justify-between mb-4">
        <div className={clsx('p-3 rounded-2xl text-white', c.icon)}>
          <Icon size={20} />
        </div>
        {trend != null && (
          <div className={clsx('flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full', trend >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50')}>
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      {loading ? (
        <div className="h-9 w-24 skeleton mb-2" />
      ) : (
        <p className="font-display text-3xl font-bold text-gray-900 mb-1 tabular-nums">{value ?? '—'}</p>
      )}
      <p className="text-sm font-medium text-gray-500">{label}</p>
      {trendLabel && <p className="text-xs text-gray-400 mt-1">{trendLabel}</p>}
    </div>
  );
}
