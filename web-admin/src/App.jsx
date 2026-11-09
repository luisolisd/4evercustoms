import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, selectIsAdmin, selectIsStaff, selectIsTech } from './store/authStore';
import { useCustomerStore } from './store/customerAuthStore';

const CustomerLogin = lazy(() => import('./pages/customer/CustomerLogin'));
const CustomerLayout = lazy(() => import('./pages/customer/CustomerLayout'));
const CustomerHome = lazy(() => import('./pages/customer/CustomerHome'));
const CustomerVehicle = lazy(() => import('./pages/customer/CustomerVehicle'));
const CustomerOrder = lazy(() => import('./pages/customer/CustomerOrder'));
const CustomerAppointments = lazy(() => import('./pages/customer/CustomerAppointments'));
const CustomerPromotions = lazy(() => import('./pages/customer/CustomerPromotions'));
const CustomerNotices = lazy(() => import('./pages/customer/CustomerNotices'));

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));
const VehiclesPage = lazy(() => import('./pages/VehiclesPage'));
const AppointmentsPage = lazy(() => import('./pages/AppointmentsPage'));
const WorkOrdersPage = lazy(() => import('./pages/WorkOrdersPage'));
const WorkOrderDetail = lazy(() => import('./pages/WorkOrderDetail'));
const QuotesPage = lazy(() => import('./pages/QuotesPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const PromotionsPage = lazy(() => import('./pages/PromotionsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const PhotosPage = lazy(() => import('./pages/PhotosPage'));
const CashClosePage = lazy(() => import('./pages/CashClosePage'));
const RemindersPage = lazy(() => import('./pages/RemindersPage'));
const TechOrdersPage = lazy(() => import('./pages/tech/TechOrdersPage'));
const TechOrderPage = lazy(() => import('./pages/tech/TechOrderPage'));
import Layout         from './components/Layout';

const PrivateRoute = ({ children }) => {
  const { token, workshopId } = useAuthStore((s) => ({ token: s.token, workshopId: s.workshopId }));
  if (!token || !workshopId) return <Navigate to="/login" replace />;
  return children;
};

// Guardas por rol: cada rol tiene su pantalla de inicio
const AdminRoute = ({ children }) => {
  const ok = useAuthStore(selectIsAdmin);
  return ok ? children : <Navigate to="/" replace />;
};
const StaffRoute = ({ children }) => {
  const ok = useAuthStore(selectIsStaff);
  return ok ? children : <Navigate to="/" replace />;
};
const TechRoute = ({ children }) => {
  const ok = useAuthStore(selectIsTech);
  return ok ? children : <Navigate to="/" replace />;
};
const HomeRedirect = () => {
  const isTech = useAuthStore(selectIsTech);
  return <Navigate to={isTech ? '/mis-ordenes' : '/dashboard'} replace />;
};

const CustomerRoute = ({ children }) => {
  const token = useCustomerStore((s) => s.token);
  if (!token) return <Navigate to="/cliente/acceso" replace />;
  return children;
};

const Loading = () => (
  <div className="flex justify-center py-24">
    <div className="animate-spin h-8 w-8 rounded-full border-4 border-brand-600 border-t-transparent" />
  </div>
);

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* ── Portal de cliente (PWA) ─────────────────────────────── */}
      <Route path="/cliente/acceso" element={<CustomerLogin />} />
      <Route path="/cliente" element={<CustomerRoute><CustomerLayout /></CustomerRoute>}>
        <Route index element={<Navigate to="/cliente/inicio" replace />} />
        <Route path="inicio" element={<CustomerHome />} />
        <Route path="vehiculo/:id" element={<CustomerVehicle />} />
        <Route path="orden/:id" element={<CustomerOrder />} />
        <Route path="promociones" element={<CustomerPromotions />} />
        <Route path="citas" element={<CustomerAppointments />} />
        <Route path="avisos" element={<CustomerNotices />} />
      </Route>
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route path="dashboard"     element={<StaffRoute><DashboardPage /></StaffRoute>} />
        <Route path="customers"     element={<StaffRoute><CustomersPage /></StaffRoute>} />
        <Route path="customers/:id" element={<StaffRoute><CustomerDetail /></StaffRoute>} />
        <Route path="vehicles"      element={<StaffRoute><VehiclesPage /></StaffRoute>} />
        <Route path="appointments"  element={<StaffRoute><AppointmentsPage /></StaffRoute>} />
        <Route path="work-orders"   element={<StaffRoute><WorkOrdersPage /></StaffRoute>} />
        <Route path="work-orders/:id" element={<StaffRoute><WorkOrderDetail /></StaffRoute>} />
        <Route path="quotes"        element={<StaffRoute><QuotesPage /></StaffRoute>} />
        <Route path="inventory"     element={<StaffRoute><InventoryPage /></StaffRoute>} />
        <Route path="promotions"    element={<StaffRoute><PromotionsPage /></StaffRoute>} />
        <Route path="reminders"     element={<StaffRoute><RemindersPage /></StaffRoute>} />
        <Route path="cash-close"    element={<StaffRoute><CashClosePage /></StaffRoute>} />
        <Route path="photos"        element={<StaffRoute><PhotosPage /></StaffRoute>} />
        <Route path="reports"       element={<AdminRoute><ReportsPage /></AdminRoute>} />
        <Route path="users"         element={<AdminRoute><UsersPage /></AdminRoute>} />
        <Route path="mis-ordenes"     element={<TechRoute><TechOrdersPage /></TechRoute>} />
        <Route path="mis-ordenes/:id" element={<TechRoute><TechOrderPage /></TechRoute>} />
        <Route path="profile"      element={<ProfilePage />} />
      </Route>
    </Routes>
    </Suspense>
  );
}
