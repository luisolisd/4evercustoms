import { Suspense, useState } from 'react';
import PushBanner from './PushBanner';
import { disableStaffPush } from '../services/push';
import { useUnread } from '../hooks/useUnread';
import { useQuery } from '@tanstack/react-query';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, Car, CalendarDays, ClipboardList,
  FileText, Package, BarChart3, LogOut, Menu,
  ChevronRight, Megaphone, BellRing, Wallet, Images, UserCog, User, LayoutGrid, Bell,
} from 'lucide-react';
import { useAuthStore, ROLE_LABELS, selectRole } from '../store/authStore';
import { getWorkshop } from '../services/workshop';
import { APP_VERSION } from '../version';
import ToastContainer from './ui/Toast';
import clsx from 'clsx';

// roles: quién ve el elemento (A = administrador, S = supervisor, T = técnico)
const nav = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard',     roles: 'AS' },
  { to: '/mis-ordenes',  icon: ClipboardList,   label: 'Mis órdenes',   roles: 'T' },
  { to: '/notificaciones', icon: Bell,          label: 'Notificaciones', roles: 'AST' },
  { to: '/customers',    icon: Users,           label: 'Clientes',      roles: 'AS' },
  { to: '/vehicles',     icon: Car,             label: 'Vehículos',     roles: 'AS' },
  { to: '/appointments', icon: CalendarDays,    label: 'Citas',         roles: 'AS' },
  { to: '/work-orders',  icon: ClipboardList,   label: 'Órdenes',       roles: 'AS' },
  { to: '/quotes',       icon: FileText,        label: 'Cotizaciones',  roles: 'AS' },
  { to: '/reminders',    icon: BellRing,        label: 'Recordatorios', roles: 'AS' },
  { to: '/cash-close',   icon: Wallet,          label: 'Corte de caja', roles: 'AS' },
  { to: '/inventory',    icon: Package,         label: 'Inventario',    roles: 'AS' },
  { to: '/photos',       icon: Images,          label: 'Fotos',         roles: 'AS' },
  { to: '/promotions',   icon: Megaphone,       label: 'Promociones',   roles: 'AS' },
  { to: '/reports',      icon: BarChart3,       label: 'Reportes',      roles: 'A' },
  { to: '/users',        icon: UserCog,         label: 'Usuarios',      roles: 'A' },
];
const ROLE_CODE = { WORKSHOP_ADMIN: 'A', SUPERVISOR: 'S', TECHNICIAN: 'T' };

// Barra inferior del celular: accesos directos según el rol (lo demás está en "Menú")
const TAB_BAR = {
  A: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
    { to: '/work-orders', icon: ClipboardList, label: 'Órdenes' },
    { to: '/appointments', icon: CalendarDays, label: 'Citas' },
    { to: '/reminders', icon: BellRing, label: 'Avisos' },
  ],
  T: [
    { to: '/mis-ordenes', icon: ClipboardList, label: 'Mis órdenes' },
    { to: '/notificaciones', icon: Bell, label: 'Avisos' },
    { to: '/profile', icon: User, label: 'Perfil' },
  ],
};
TAB_BAR.S = TAB_BAR.A;

function MobileTabBar({ code, onMenu }) {
  const items = TAB_BAR[code] || [];
  const unread = useUnread();
  const base = 'flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition-colors';
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 glass border-t border-gray-200/70 shadow-[0_-8px_24px_-12px_rgba(16,18,27,0.18)] pb-safe">
      <div className="flex">
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} className={({ isActive }) => clsx(base, isActive ? 'text-brand-600' : 'text-gray-400')}>
            {({ isActive }) => (
              <>
                <span className={clsx('relative flex h-7 w-12 items-center justify-center rounded-full transition-all', isActive && 'bg-brand-50')}>
                  <it.icon size={20} />
                  {it.to === '/notificaciones' && unread > 0 && <span className="absolute right-2 top-0 min-w-[16px] rounded bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white">{unread > 9 ? '9+' : unread}</span>}
                </span>
                <span className="truncate max-w-full px-1">{it.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button type="button" onClick={onMenu} className={clsx(base, 'text-gray-400')}>
          <span className="flex h-7 w-12 items-center justify-center rounded-full"><LayoutGrid size={20} /></span>
          <span>Menú</span>
        </button>
      </div>
    </nav>
  );
}

function NavItem({ to, icon: Icon, label, onClick, badge = 0 }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        clsx(
          'group relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-brand-600 text-white shadow-sm'
            : 'text-ink-300 hover:bg-white/5 hover:text-white'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-brand-400" />}
          <Icon size={18} className={clsx('shrink-0 transition-transform group-hover:scale-110', !isActive && 'text-ink-400 group-hover:text-brand-400')} />
          <span className="flex-1">{label}</span>
          {badge > 0 && <span className="min-w-[20px] rounded bg-red-500 px-1.5 py-px text-center text-[11px] font-bold text-white">{badge > 99 ? '99+' : badge}</span>}
          {isActive && <ChevronRight size={14} className="opacity-70" />}
        </>
      )}
    </NavLink>
  );
}

// Menú lateral: componente propio (no se vuelve a crear al cambiar de ruta, conserva su scroll)
function Sidebar({ mobile = false, onNavigate }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const workshopId = useAuthStore((s) => s.workshopId);
  const role = useAuthStore(selectRole);
  const code = ROLE_CODE[role] || '';
  const navigate = useNavigate();

  const { data: wRes } = useQuery({
    queryKey: ['workshop', workshopId],
    queryFn: () => getWorkshop(workshopId),
    enabled: !!workshopId,
  });
  const workshopName = wRes?.data?.name;
  const unread = useUnread();
  // Al salir se desactivan los avisos push de este dispositivo (máx. 1.5 s de espera)
  const handleLogout = async () => {
    await Promise.race([disableStaffPush(), new Promise((r) => setTimeout(r, 1500))]);
    logout();
    navigate('/login');
  };

  return (
    <div
      className={clsx('relative flex flex-col h-full bg-ink-gradient', mobile ? 'w-72 max-w-full' : 'w-64')}
      style={mobile ? { paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' } : undefined}
    >
      {/* Halo de marca en la parte superior */}
      <div className="pointer-events-none absolute inset-0 bg-mesh opacity-70" />
      <div className="relative flex flex-col h-full">
        {/* Logo a color contrastado sobre pastilla blanca */}
        <div className="px-5 py-6 border-b border-white/10">
          <div className="bg-white rounded-md px-3 py-2.5 flex items-center justify-center shadow-sm">
            <img src="/color.png" alt="4EVRcustoms" className="h-7 w-auto select-none" draggable={false} />
          </div>
          <p className="text-white font-display text-sm font-bold mt-3 text-center truncate">{workshopName || '4EVRcustoms'}</p>
          <p className="eyebrow text-ink-400 text-center mt-0.5">Panel Administrativo</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {nav
            .filter((item) => item.roles.includes(code))
            .map(({ roles, ...item }) => <NavItem key={item.to} {...item} badge={item.to === '/notificaciones' ? unread : 0} onClick={mobile ? onNavigate : undefined} />)}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-white/10">
          <Link to="/profile" onClick={mobile ? onNavigate : undefined} className="flex items-center gap-3 mb-3 group px-2 rounded-md hover:bg-white/5 py-2 -mx-1 transition-colors">
            <div className="w-9 h-9 rounded-md bg-brand-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
              {(user?.firstName?.[0] || 'A')}{user?.lastName?.[0] || ''}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate group-hover:text-brand-300 transition-colors">
                {`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Administrador'}
              </p>
              <p className="text-ink-400 text-xs truncate">{ROLE_LABELS[role] || '—'}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-ink-300 hover:text-white text-sm font-medium transition-colors px-2 py-2 rounded hover:bg-white/5"
          >
            <LogOut size={15} /> Cerrar sesión
          </button>
          <p className="text-center text-[10px] text-ink-500 mt-3 tracking-wide">{APP_VERSION}</p>
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const close = () => setSidebarOpen(false);
  const code = ROLE_CODE[useAuthStore(selectRole)] || '';
  const headerUnread = useUnread();

  return (
    <div className="flex h-[100dvh] bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm animate-fade-in" onClick={close} />
          <div className="relative z-50 max-w-[86vw] animate-slide-in-right">
            <Sidebar mobile onNavigate={close} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header
          className="lg:hidden flex items-center justify-between px-4 pb-3 glass border-b border-gray-200/70 shadow-sm shrink-0 sticky top-0 z-30"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
        >
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-md hover:bg-gray-100 active:scale-95 transition">
            <Menu size={20} />
          </button>
          <img src="/color.png" alt="4EVRcustoms" className="h-6 w-auto select-none" draggable={false} />
          <Link to="/notificaciones" aria-label="Notificaciones" className="relative p-2 rounded-md hover:bg-gray-100">
            <Bell size={20} />
            {headerUnread > 0 && <span className="absolute right-0.5 top-0.5 min-w-[16px] rounded bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white">{headerUnread > 9 ? '9+' : headerUnread}</span>}
          </Link>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div className="w-full max-w-[2000px] mx-auto p-4 pb-28 sm:p-6 sm:pb-28 lg:px-8 lg:py-8 xl:px-10 lg:pb-8 animate-fade-up">
            <PushBanner />
            <Suspense fallback={<div className="flex justify-center py-24"><div className="animate-spin h-8 w-8 rounded-full border-4 border-brand-600 border-t-transparent" /></div>}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      <MobileTabBar code={code} onMenu={() => setSidebarOpen(true)} />
      <ToastContainer />
    </div>
  );
}
