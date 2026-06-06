import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../services/api';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js';
import { Bar, Line, Doughnut, Radar } from 'react-chartjs-2';
import {
  HiOutlineUsers, HiOutlineDocumentText, HiOutlineShoppingCart,
  HiOutlineReceiptTax, HiOutlineCheckCircle, HiOutlineTrendingUp
} from 'react-icons/hi';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement, Filler);

const KpiCard = ({ label, value, icon: Icon, color, subtext }) => (
  <div className="card p-5">
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <div className={`w-9 h-9 ${color.bg} rounded-xl flex items-center justify-center`}>
        <Icon className={color.text} size={18} />
      </div>
    </div>
    <p className={`text-3xl font-bold ${color.text}`}>{value}</p>
    {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
  </div>
);

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardAPI.getStats().then(r => r.data),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent" />
    </div>
  );

  const monthlySpend = data?.monthlySpend || [];
  const vendorPerformance = data?.vendorPerformance || [];
  const rfqTrend = data?.rfqTrend || [];
  const stats = data?.stats || {};

  const spendData = {
    labels: [...monthlySpend].reverse().map(m => m.month),
    datasets: [{
      label: 'Spend (₹)',
      data: [...monthlySpend].reverse().map(m => Number(m.amount)),
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37,99,235,0.1)',
      borderWidth: 2.5,
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#2563eb',
      pointRadius: 5,
      pointHoverRadius: 7,
    }]
  };

  const vendorBarData = {
    labels: vendorPerformance.map(v => v.company_name.split(' ')[0]),
    datasets: [
      {
        label: 'Rating (x20)',
        data: vendorPerformance.map(v => Number(v.rating) * 20),
        backgroundColor: 'rgba(37,99,235,0.8)',
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Quotations',
        data: vendorPerformance.map(v => Number(v.total_quotations) || 0),
        backgroundColor: 'rgba(16,185,129,0.8)',
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Approved',
        data: vendorPerformance.map(v => Number(v.approved_quotations) || 0),
        backgroundColor: 'rgba(245,158,11,0.8)',
        borderRadius: 6,
        borderSkipped: false,
      }
    ]
  };

  const rfqBarData = {
    labels: [...rfqTrend].reverse().map(r => r.month),
    datasets: [{
      label: 'RFQs',
      data: [...rfqTrend].reverse().map(r => Number(r.count)),
      backgroundColor: 'rgba(139,92,246,0.8)',
      borderRadius: 8,
      borderSkipped: false,
    }]
  };

  const doughnutData = {
    labels: ['Active Vendors', 'Active RFQs', 'Purchase Orders', 'Invoices', 'Pending Approvals'],
    datasets: [{
      data: [
        stats.vendors || 0,
        stats.rfqs || 0,
        stats.purchaseOrders || 0,
        stats.invoices || 0,
        stats.pendingApprovals || 0,
      ],
      backgroundColor: ['#2563eb', '#8b5cf6', '#10b981', '#ec4899', '#f59e0b'],
      borderWidth: 0,
      hoverOffset: 8,
    }]
  };

  const commonOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: 'rgba(156,163,175,0.1)' }, beginAtZero: true },
    },
  };

  const kpiList = [
    { label: 'Active Vendors', value: stats.vendors || 0, icon: HiOutlineUsers, color: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' }, subtext: 'registered vendors' },
    { label: 'Active RFQs', value: stats.rfqs || 0, icon: HiOutlineDocumentText, color: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400' }, subtext: 'open requests' },
    { label: 'Pending Approvals', value: stats.pendingApprovals || 0, icon: HiOutlineCheckCircle, color: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' }, subtext: 'awaiting review' },
    { label: 'Purchase Orders', value: stats.purchaseOrders || 0, icon: HiOutlineShoppingCart, color: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' }, subtext: 'generated POs' },
    { label: 'Invoices', value: stats.invoices || 0, icon: HiOutlineReceiptTax, color: { bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-600 dark:text-pink-400' }, subtext: 'total invoices' },
    { label: 'Total Spend', value: `₹${Number(stats.totalSpend || 0).toLocaleString('en-IN', { notation: 'compact' })}`, icon: HiOutlineTrendingUp, color: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-400' }, subtext: 'procurement value' },
  ];

  const noData = (icon, text) => (
    <div className="h-44 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
      <span className="text-4xl mb-2">{icon}</span>
      <span className="text-sm">{text}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Procurement insights and performance metrics</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiList.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Vendor performance + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Vendor Performance</h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />Rating×20</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />Quotes</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />Approved</span>
            </div>
          </div>
          {vendorPerformance.length > 0
            ? <Bar data={vendorBarData} options={{ ...commonOptions, plugins: { legend: { display: false } }, scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, ticks: { precision: 0 } } } }} height={110} />
            : noData('🏢', 'No vendor performance data')
          }
        </div>

        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Distribution</h2>
          <div className="flex justify-center">
            <div className="w-56 h-56">
              <Doughnut data={doughnutData} options={{ cutout: '60%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 8, font: { size: 11 } } } } }} />
            </div>
          </div>
        </div>
      </div>

      {/* Spend + RFQ trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Monthly Spend</h2>
            <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg">Last 6 months</span>
          </div>
          {monthlySpend.length > 0
            ? <Line data={spendData} options={{ ...commonOptions, scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, ticks: { callback: v => `₹${(v/100000).toFixed(0)}L` } } } }} height={130} />
            : noData('📈', 'No spend data yet')
          }
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">RFQ Creation Trend</h2>
            <span className="text-xs bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 px-2 py-1 rounded-lg">Last 6 months</span>
          </div>
          {rfqTrend.length > 0
            ? <Bar data={rfqBarData} options={{ ...commonOptions, scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, ticks: { precision: 0 } } } }} height={130} />
            : noData('📋', 'No RFQ trend data')
          }
        </div>
      </div>

      {/* Vendor rating leaderboard */}
      {vendorPerformance.length > 0 && (
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Vendor Leaderboard</h2>
          <div className="space-y-3">
            {vendorPerformance.map((v, i) => (
              <div key={v.company_name} className="flex items-center gap-4">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0
                  ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-700' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{v.company_name}</span>
                    <span className="text-sm font-bold text-primary-600 dark:text-primary-400">⭐ {Number(v.rating).toFixed(1)}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all"
                      style={{ width: `${(v.rating / 5) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-500">{v.total_quotations} quotes</p>
                  <p className="text-xs text-emerald-600">{v.approved_quotations} approved</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
