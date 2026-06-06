import { useQuery } from '@tanstack/react-query';
import { quotationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const statusBadge = (s) => {
  const map = {
    submitted: 'badge-blue',
    under_review: 'badge-yellow',
    approved: 'badge-green',
    rejected: 'badge-red',
  };
  return <span className={map[s] || 'badge-gray'}>{s?.replace('_', ' ')}</span>;
};

export default function QuotationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => quotationAPI.getAll({}).then(r => r.data),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quotations</h1>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
              <tr>
                {['RFQ', 'Vendor', 'Price', 'Delivery', 'AI Score', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : quotations.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">No quotations found</td></tr>
              ) : quotations.map(q => (
                <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{q.rfq_title}</p>
                    <p className="text-xs text-gray-400">Qty: {q.quantity}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{q.company_name}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">₹{Number(q.price).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{q.delivery_days} days</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-primary-600 dark:text-primary-400">{q.ai_score}</span>
                  </td>
                  <td className="px-4 py-3">{statusBadge(q.status)}</td>
                  <td className="px-4 py-3 text-gray-500">{format(new Date(q.created_at), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/rfqs/${q.rfq_id}`)}
                      className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                    >
                      View RFQ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
