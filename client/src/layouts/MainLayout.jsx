import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../hooks/useSocket';
import {
  HiOutlineHome, HiOutlineUsers, HiOutlineDocumentText,
  HiOutlineClipboardList, HiOutlineCheckCircle, HiOutlineShoppingCart,
  HiOutlineReceiptTax, HiOutlineChartBar, HiOutlineCog,
  HiOutlineLogout, HiOutlineBell, HiOutlineSun, HiOutlineMoon,
  HiOutlineMenu, HiOutlineX, HiOutlineClipboard
} from 'react-icons/hi';
import { dashboardAPI } from '../services/api';
import { useQuery } from '@tanstack/react-query';

const navItems = [
  { to: '/dashboard', icon: HiOutlineHome, label: 'Dashboard', roles: ['admin', 'procurement_officer', 'vendor', 'manager'] },
  { to: '/vendors', icon: HiOutlineUsers, label: 'Vendors', roles: ['admin', 'procurement_officer', 'manager'] },
  { to: '/rfqs', icon: HiOutlineDocumentText, label: 'RFQs', roles: ['admin', 'procurement_officer', 'vendor', 'manager'] },
  { to: '/quotations', icon: HiOutlineClipboardList, label: 'Quotations', roles: ['admin', 'procurement_officer', 'vendor', 'manager'] },
  { to: '/approvals', icon: HiOutlineCheckCircle, label: 'Approvals', roles: ['admin', 'manager', 'procurement_officer'] },
  { to: '/purchase-orders', icon: HiOutlineShoppingCart, label: 'Purchase Orders', roles: ['admin', 'procurement_officer', 'vendor', 'manager'] },
  { to: '/invoices', icon: HiOutlineReceiptTax, label: 'Invoices', roles: ['admin', 'procurement_officer'] },
  { to: '/analytics', icon: HiOutlineChartBar, label: 'Analytics', roles: ['admin', 'manager'] },
  { to: '/users', icon: HiOutlineCog, label: 'Users', roles: ['admin'] },
  { to: '/activity', icon: HiOutlineClipboard, label: 'Activity Log', roles: ['admin'] },
];

export default function MainLayout() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Real-time socket connection
  useSocket();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => dashboardAPI.getNotifications().then(r => r.data),
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allowedNav = navItems.filter(item => item.roles.includes(user?.role));

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">VB</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-lg">VendorBridge</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500">
            <HiOutlineX size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {allowedNav.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
              <span className="text-primary-700 dark:text-primary-300 font-semibold text-sm">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <HiOutlineLogout size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
            <HiOutlineMenu size={22} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {isDark ? <HiOutlineSun size={20} /> : <HiOutlineMoon size={20} />}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="relative p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <HiOutlineBell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
