import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

import LoginPage      from './pages/LoginPage';
import SetupPage      from './pages/SetupPage';
import DashboardPage  from './pages/DashboardPage';
import CustomersPage  from './pages/CustomersPage';
import VehiclesPage   from './pages/VehiclesPage';
import AppointmentsPage from './pages/AppointmentsPage';
import WorkOrdersPage from './pages/WorkOrdersPage';
import WorkOrderDetail from './pages/WorkOrderDetail';
import QuotesPage     from './pages/QuotesPage';
import InventoryPage  from './pages/InventoryPage';
import ReportsPage    from './pages/ReportsPage';
import ProfilePage    from './pages/ProfilePage';
import Layout         from './components/Layout';

const PrivateRoute = ({ children }) => {
  const { token, workshopId } = useAuthStore((s) => ({ token: s.token, workshopId: s.workshopId }));
  if (!token) return <Navigate to="/login" replace />;
  if (!workshopId) return <Navigate to="/setup" replace />;
  return children;
};

const SetupRoute = () => {
  const { token, workshopId } = useAuthStore((s) => ({ token: s.token, workshopId: s.workshopId }));
  if (!token) return <Navigate to="/login" replace />;
  if (workshopId) return <Navigate to="/dashboard" replace />;
  return <SetupPage />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupRoute />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"    element={<DashboardPage />} />
        <Route path="customers"    element={<CustomersPage />} />
        <Route path="vehicles"     element={<VehiclesPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="work-orders"  element={<WorkOrdersPage />} />
        <Route path="work-orders/:id" element={<WorkOrderDetail />} />
        <Route path="quotes"       element={<QuotesPage />} />
        <Route path="inventory"    element={<InventoryPage />} />
        <Route path="reports"      element={<ReportsPage />} />
        <Route path="profile"      element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}
