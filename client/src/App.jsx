import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import MainLayout from './layouts/MainLayout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VendorsPage from './pages/VendorsPage';
import RFQsPage from './pages/RFQsPage';
import RFQDetailPage from './pages/RFQDetailPage';
import QuotationsPage from './pages/QuotationsPage';
import ApprovalsPage from './pages/ApprovalsPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import InvoicesPage from './pages/InvoicesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import UsersPage from './pages/UsersPage';
import ActivityPage from './pages/ActivityPage';

const ProtectedRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/vendors" element={<ProtectedRoute roles={['admin', 'procurement_officer', 'manager']}><VendorsPage /></ProtectedRoute>} />
        <Route path="/rfqs" element={<ProtectedRoute roles={['admin', 'procurement_officer', 'vendor', 'manager']}><RFQsPage /></ProtectedRoute>} />
        <Route path="/rfqs/:id" element={<RFQDetailPage />} />
        <Route path="/quotations" element={<QuotationsPage />} />
        <Route path="/approvals" element={<ProtectedRoute roles={['admin', 'manager', 'procurement_officer']}><ApprovalsPage /></ProtectedRoute>} />
        <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="/invoices" element={<ProtectedRoute roles={['admin', 'procurement_officer']}><InvoicesPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute roles={['admin', 'manager']}><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
        <Route path="/activity" element={<ProtectedRoute roles={['admin']}><ActivityPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{
            className: 'dark:bg-gray-800 dark:text-white',
            duration: 3000,
          }} />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
