import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, Car, CalendarDays, ClipboardList,
  FileText, Package, BarChart3, LogOut, Menu, X, Bell,
  ChevronRight, Megaphone,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getWorkshop } from '../services/workshop';
import { APP_VERSION } from '../version';
import ToastContainer from './ui/Toast';
import clsx from 'clsx';

const nav = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/customers',    icon: Users,            label: 'Clientes' },
  { to: '/vehicles',     icon: Car,              label: 'Vehículos' },
  { to: '/appointments', icon: CalendarDays,     label: 'Citas' },
  { to: '/work-orders',  icon: ClipboardList,    label: 'Órdenes' },
  { to: '/quotes',       icon: FileText,         label: 'Cotizaciones' },
  { to: '/inventory',    icon: Package,          label: 'Inventario' },
  { to: '/promotions',   icon: Megaphone,        label: 'Promociones' },
  { to: '/reports',      icon: BarChart3,        label: 'Reportes' },
];

function NavItem({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        clsx(
          'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
          isActive
            ? 'bg-brand-600 text-white shadow-sm'
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={18} className="shrink-0" />
          <span className="flex-1">{label}</span>
          {isActive && <ChevronRight size={14} className="opacity-60" />}
        </>
      )}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuthStore();
  const workshopId = useAuthStore((s) => s.workshopId);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: wRes } = useQuery({
    queryKey: ['workshop', workshopId],
    queryFn: () => getWorkshop(workshopId),
    enabled: !!workshopId,
  });
  const workshopName = wRes?.data?.name;

  const handleLogout = () => { logout(); navigate('/login'); };
  const close = () => setSidebarOpen(false);

  const Sidebar = ({ mobile = false }) => (
    <div className={clsx('flex flex-col h-full', mobile ? 'w-72' : 'w-64')}>
      {/* Logo a color contrastado sobre pastilla blanca */}
      <div className="px-5 py-6 border-b border-gray-800">
        <div className="bg-white rounded-xl px-3 py-2.5 flex items-center justify-center shadow-sm">
          <img src="/color.png" alt="4EVRcustoms" className="h-7 w-auto select-none" draggable={false} />
        </div>
        <p className="text-white text-sm font-semibold mt-2 text-center truncate">{workshopName || '4EVRcustoms'}</p>
        <p className="text-gray-500 text-xs text-center">Panel Administrativo</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map((item) => <NavItem key={item.to} {...item} onClick={mobile ? close : undefined} />)}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-gray-800">
        <Link to="/profile" onClick={mobile ? close : undefined} className="flex items-center gap-3 mb-3 group px-1 rounded-xl hover:bg-gray-800 py-1.5 -mx-1 transition-colors">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {(user?.firstName?.[0] || 'A')}{user?.lastName?.[0] || ''}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate group-hover:text-brand-300 transition-colors">
              {`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Administrador'}
            </p>
            <p className="text-gray-500 text-xs truncate">{(user?.phone || '').replace(/\D/g, '').slice(-10) || '—'}</p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-800"
        >
          <LogOut size={15} /> Cerrar sesión
        </button>
        <p className="text-center text-[10px] text-gray-600 mt-3">{APP_VERSION}</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex bg-gray-900 shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={close} />
          <div className="relative bg-gray-900 z-50">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100">
            <Menu size={20} />
          </button>
          <img src="/color.png" alt="4EVRcustoms" className="h-6 w-auto select-none" draggable={false} />
          <div className="w-9" />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
