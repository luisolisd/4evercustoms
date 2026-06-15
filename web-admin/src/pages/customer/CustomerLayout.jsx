import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, Calendar, LogOut, Tag, Bell } from 'lucide-react';
import clsx from 'clsx';
import { useCustomerStore } from '../../store/customerAuthStore';
import { APP_VERSION } from '../../version';

const tabs = [
  { to: '/cliente/inicio', icon: Home, label: 'Inicio' },
  { to: '/cliente/promociones', icon: Tag, label: 'Promos' },
  { to: '/cliente/citas', icon: Calendar, label: 'Citas' },
  { to: '/cliente/avisos', icon: Bell, label: 'Avisos' },
];

export default function CustomerLayout() {
  const navigate = useNavigate();
  const { customer, logout } = useCustomerStore();

  const handleLogout = () => { logout(); navigate('/cliente/acceso', { replace: true }); };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="relative bg-ink-gradient text-white sticky top-0 z-20 shadow-elevated" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="pointer-events-none absolute inset-0 bg-mesh opacity-60" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-500/60 to-transparent" />
        <div className="relative max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-white rounded-lg px-2 py-1 shadow-soft">
              <img src="/color.png" alt="4EVRcustoms" className="h-5 w-auto" />
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-ink-300 hover:text-white text-sm font-medium transition-colors">
            <LogOut size={16} /> Salir
          </button>
        </div>
      </header>

      {/* Content */}
      <main
        className="flex-1 max-w-lg w-full mx-auto px-4 pt-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
      >
        <Outlet />
        <p className="text-center text-[10px] text-gray-400 pt-6">4EVRcustoms {APP_VERSION}</p>
      </main>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 inset-x-0 glass border-t border-gray-200/70 z-20 shadow-[0_-8px_24px_-12px_rgba(16,18,27,0.18)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="max-w-lg mx-auto flex">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to}
              className={({ isActive }) => clsx(
                'group flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors',
                isActive ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'
              )}>
              {({ isActive }) => (
                <>
                  <span className={clsx('flex items-center justify-center w-11 h-7 rounded-full transition-all', isActive ? 'bg-brand-50' : 'group-active:scale-90')}>
                    <t.icon size={20} className={clsx('transition-transform', isActive && 'scale-110')} />
                  </span>
                  {t.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
