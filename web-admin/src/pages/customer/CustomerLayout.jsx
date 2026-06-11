import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, Calendar, LogOut, Tag, Bell } from 'lucide-react';
import clsx from 'clsx';
import { useCustomerStore } from '../../store/customerAuthStore';

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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 text-white sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-white rounded-md px-2 py-1">
              <img src="/color.png" alt="4EVRcustoms" className="h-5 w-auto" />
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-gray-300 hover:text-white text-sm">
            <LogOut size={16} /> Salir
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-4 pb-24">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200">
        <div className="max-w-lg mx-auto flex">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to}
              className={({ isActive }) => clsx(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs',
                isActive ? 'text-brand-600' : 'text-gray-400'
              )}>
              <t.icon size={20} />
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
