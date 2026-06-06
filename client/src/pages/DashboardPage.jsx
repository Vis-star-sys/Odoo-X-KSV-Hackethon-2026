import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  HiOutlineUsers, HiOutlineDocumentText, HiOutlineCheckCircle,
  HiOutlineShoppingCart, HiOutlineReceiptTax, HiOutlineTrendingUp,
  HiOutlineBell, HiOutlineCheck
} from 'react-icons/hi';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement, Filler);

const kpiCards = [
  { key: 'vendors', label: 'Active Vendors', icon: HiOutlineUsers, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', link: '/vendors' },
  { key: 'rfqs', label: 'Active RFQs', icon: HiOutlineDocumentText, color: 'from-violet-500 to-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', link: '/rfqs' },
  { key: 'pendingApprovals', label: 'Pending Approvals', icon: HiOutlineCheckCircle, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', link: '/approvals' },
  { key: 'purchaseOrders', label: 'Purchase Orders', icon: HiOutlineShoppingCart, color: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', link: '/purchase-orders' },
  { key: 'invoices', label: 'Invoices', icon: HiOutlineReceiptTax, color: 'from-pink-500 to-rose-500', bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-600 dark:text-pink-400', link: '/invoices' },
  { key: 'totalSpend', label: 'Total Spend', icon: HiOutlineTrendingUp, color: 'from-cyan-500 to-teal-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-400', isAmount: true },
];

const entityColors = {
  user: '#3b82f6', vendor: '#10b981', rfq: '#8b5cf6',
  quotation: '#f59e0b', approval: '#ef4444', po: '#6366f1', invoice: '#ec4899',
};

const chartOptions = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false } },
    y: { grid: { color: 'rgba(156,163,175,0.15)' }, beginAtZero: true },
  },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardAPI.getStats().then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => dashboardAPI.getNotifications().then(r => r.data),
  });

  const markReadMutation = useMutation({
    mutationFn: () => dashboardAPI.markNotificationsRead(),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent" />
        <p className="text-sm text-gray-400">Loading dashboard...</p>
      </div>
    </div>
  );

  const stats = data?.stats || {};
  const monthlySpend = data?.monthlySpend || [];
  const vendorPerformance = data?.vendorPerformance || [];
  const recentActivity = data?.recentActivity || [];
  const rfqTrend = data?.rfqTrend || [];
  const unread = notifications.filter(n => !n.is_read);

  const spendChartData = {
    labels: [...monthlySpend].reverse().map(m => m.month),
    datasets: [{
      label: 'Spend (₹)',
      data: [...monthlySpend].reverse().map(m => Number(m.amount)),
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37,99,235,0.08)',
      borderWidth: 2.5,
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#2563eb',
      pointRadius: 4,
    }]
  };

  const vendorChartData = {
    labels: vendorPerformance.map(v => v.company_name.split(' ')[0]),
    datasets: [{
      label: 'Rating',
      data: vendorPerformance.map(v => Number(v.rating)),
      backgroundColor: vendorPerformance.map((_, i) => `hsl(${220 + i * 20}, 80%, ${60 - i * 5}%)`),
      borderRadius: 8,
    }]
  };

  const summaryData = {
    labels: ['Vendors', 'RFQs', 'POs', 'Invoices'],
    datasets: [{
      data: [stats.vendors || 0, stats.rfqs || 0, stats.purchaseOrders || 0, stats.invoices || 0],
      backgroundColor: ['#2563eb', '#8b5cf6', '#10b981', '#ec4899'],
      borderWidth: 0,
      hoverOffset: 8,
    }]
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} · {user?.role?.replace('_', ' ')}
          </p>
        </div>
        {unread.length > 0 && (
          <button
            onClick={() => markReadMutation.mutate()}
            className="flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
          >
            <HiOutlineBell size={16} />
            {unread.length} new notification{unread.length !== 1 ? 's' : ''}
            <HiOutlineCheck size={14} />
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map(({ key, label, icon: Icon, bg, text, link, isAmount }) => (
          <div
            key={key}
            onClick={() => link && navigate(link)}
            className={`card p-5 cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ${link ? 'cursor-pointer' : ''}`}
          >
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={text} size={20} />
            </div>
            <p className={`text-2xl font-bold ${text}`}>
              {isAmount
                ? `₹${Number(stats[key] || 0).toLocaleString('en-IN', { notation: 'compact', compactDisplay: 'short' })}`
                : (stats[key] ?? 0)
              }
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spend trend - wide */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Monthly Spend Trend</h2>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">Last 6 months</span>
          </div>
          {monthlySpend.length > 0 ? (
            <Line data={spendChartData} options={{ ...chartOptions, scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, ticks: { callback: v => `₹${(v/100000).toFixed(0)}L` } } } }} height={100} />
          ) : (
            <div className="h-36 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
              <span className="text-4xl mb-2">📈</span>
              <span className="text-sm">No spend data yet</span>
            </div>
          )}
        </div>

        {/* Doughnut summary */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Activity Summary</h2>
          <div className="flex flex-col items-center">
            <div className="w-48 h-48">
              <Doughnut data={summaryData} options={{ responsive: true, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 11 } } } } }} />
            </div>
          </div>
        </div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendor performance */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Top Vendor Ratings</h2>
          {vendorPerformance.length > 0 ? (
            <Bar data={vendorChartData} options={{ ...chartOptions, scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, min: 0, max: 5, ticks: { stepSize: 1 } } } }} height={120} />
          ) : (
            <div className="h-36 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
              <span className="text-4xl mb-2">🏢</span>
              <span className="text-sm">No vendors yet</span>
            </div>
          )}
        </div>

        {/* Notifications panel */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recent Notifications</h2>
            {notifications.length > 0 && (
              <span className="text-xs text-gray-400">{notifications.length} total</span>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-36 text-gray-300 dark:text-gray-600">
              <span className="text-4xl mb-2">🔔</span>
              <span className="text-sm">No notifications</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {notifications.slice(0, 6).map(n => (
                <div key={n.id} className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors ${!n.is_read ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{format(new Date(n.created_at), 'MMM d, HH:mm')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity feed */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
        {recentActivity.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-gray-300 dark:text-gray-600">
            <span className="text-3xl mb-2">📋</span>
            <span className="text-sm">No activity yet</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentActivity.slice(0, 8).map(log => (
              <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                  style={{ backgroundColor: entityColors[log.entity_type] || '#6b7280' }}
                >
                  {log.user_name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{log.action}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    <span className="font-medium">{log.user_name}</span> · {format(new Date(log.created_at), 'MMM d, HH:mm')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
