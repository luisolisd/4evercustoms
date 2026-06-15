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
          'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-brand-gradient text-white shadow-glow'
            : 'text-ink-300 hover:bg-white/5 hover:text-white'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-brand-400" />}
          <Icon size={18} className={clsx('shrink-0 transition-transform group-hover:scale-110', !isActive && 'text-ink-400 group-hover:text-brand-400')} />
          <span className="flex-1">{label}</span>
          {isActive && <ChevronRight size={14} className="opacity-70" />}
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
    <div className={clsx('relative flex flex-col h-full bg-ink-gradient', mobile ? 'w-72' : 'w-64')}>
      {/* Halo de marca en la parte superior */}
      <div className="pointer-events-none absolute inset-0 bg-mesh opacity-70" />
      <div className="relative flex flex-col h-full">
        {/* Logo a color contrastado sobre pastilla blanca */}
        <div className="px-5 py-6 border-b border-white/10">
          <div className="bg-white rounded-2xl px-3 py-2.5 flex items-center justify-center shadow-elevated ring-1 ring-black/5">
            <img src="/color.png" alt="4EVRcustoms" className="h-7 w-auto select-none" draggable={false} />
          </div>
          <p className="text-white font-display text-sm font-bold mt-3 text-center truncate">{workshopName || '4EVRcustoms'}</p>
          <p className="eyebrow text-ink-400 text-center mt-0.5">Panel Administrativo</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {nav.map((item) => <NavItem key={item.to} {...item} onClick={mobile ? close : undefined} />)}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-white/10">
          <Link to="/profile" onClick={mobile ? close : undefined} className="flex items-center gap-3 mb-3 group px-2 rounded-xl hover:bg-white/5 py-2 -mx-1 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-glow">
              {(user?.firstName?.[0] || 'A')}{user?.lastName?.[0] || ''}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate group-hover:text-brand-300 transition-colors">
                {`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Administrador'}
              </p>
              <p className="text-ink-400 text-xs truncate">{(user?.phone || '').replace(/\D/g, '').slice(-10) || '—'}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-ink-300 hover:text-white text-sm font-medium transition-colors px-2 py-2 rounded-lg hover:bg-white/5"
          >
            <LogOut size={15} /> Cerrar sesión
          </button>
          <p className="text-center text-[10px] text-ink-500 mt-3 tracking-wide">{APP_VERSION}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm animate-fade-in" onClick={close} />
          <div className="relative z-50 animate-slide-in-right">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 glass border-b border-gray-200/70 shadow-soft shrink-0 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-gray-100 active:scale-95 transition">
            <Menu size={20} />
          </button>
          <img src="/color.png" alt="4EVRcustoms" className="h-6 w-auto select-none" draggable={false} />
          <div className="w-9" />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-5 sm:p-6 lg:p-8 animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
