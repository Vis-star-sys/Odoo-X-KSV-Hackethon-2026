import { useMutation, useQueryClient } from '@tanstack/react-query';
import { quotationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { HiOutlineCheckCircle, HiOutlineStar, HiOutlineClock, HiOutlineCurrencyRupee } from 'react-icons/hi';

const statusBadge = (s) => {
  const map = {
    submitted: 'badge-blue',
    under_review: 'badge-yellow',
    approved: 'badge-green',
    rejected: 'badge-red',
  };
  return <span className={map[s] || 'badge-gray'}>{s?.replace('_', ' ')}</span>;
};

const ScoreBar = ({ score, color = 'bg-primary-500' }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.min(score, 100)}%` }} />
    </div>
    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-8">{Number(score).toFixed(0)}</span>
  </div>
);

export default function QuotationsList({ quotations, rfqId }) {
  const { isRole } = useAuth();
  const qc = useQueryClient();

  const selectMutation = useMutation({
    mutationFn: (id) => quotationAPI.select(id),
    onSuccess: () => {
      qc.invalidateQueries(['quotations', rfqId]);
      qc.invalidateQueries(['dashboard']);
      toast.success('Quotation sent for manager approval! 🎉');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  if (quotations.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-3">📭</div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">No quotations received yet</p>
        <p className="text-sm text-gray-400 mt-1">Vendors will submit quotations once the RFQ is published</p>
      </div>
    );
  }

  const sortedByScore = [...quotations].sort((a, b) => Number(b.ai_score) - Number(a.ai_score));
  const best = sortedByScore[0];
  const lowestPrice = Math.min(...quotations.map(q => Number(q.price)));
  const fastestDelivery = Math.min(...quotations.map(q => Number(q.delivery_days)));

  return (
    <div className="space-y-4">
      {/* AI Recommendation Banner */}
      {quotations.length > 1 && best && (
        <div className="bg-gradient-to-r from-primary-600 to-violet-600 rounded-2xl p-5 text-white shadow-lg shadow-primary-600/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🤖</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg">AI Recommendation</p>
              <p className="text-primary-100 text-sm">Based on Price (50%) + Delivery (30%) + Rating (20%)</p>
              <div className="mt-3 bg-white/15 rounded-xl p-3">
                <p className="font-semibold text-white">🏆 Recommended: {best.company_name}</p>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-primary-100">
                  <span>₹{Number(best.price).toLocaleString('en-IN')}</span>
                  <span>{best.delivery_days} day delivery</span>
                  <span>⭐ {Number(best.rating).toFixed(1)} rating</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-white/20 rounded-full h-2">
                    <div className="h-2 rounded-full bg-white transition-all" style={{ width: `${Math.min(best.ai_score, 100)}%` }} />
                  </div>
                  <span className="font-bold text-sm">Score: {Number(best.ai_score).toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Quotation Comparison
            <span className="ml-2 text-sm font-normal text-gray-400">({quotations.length} received)</span>
          </h2>
        </div>

        {/* Table view for comparison */}
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="pb-2 px-2">Vendor</th>
                <th className="pb-2 px-2">Price</th>
                <th className="pb-2 px-2">Delivery</th>
                <th className="pb-2 px-2">Rating</th>
                <th className="pb-2 px-2">AI Score</th>
                <th className="pb-2 px-2">Status</th>
                <th className="pb-2 px-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {sortedByScore.map((q, i) => {
                const isLowest = Number(q.price) === lowestPrice;
                const isFastest = Number(q.delivery_days) === fastestDelivery;
                const isTop = i === 0;
                return (
                  <tr key={q.id} className={`${isTop ? 'bg-primary-50/50 dark:bg-primary-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/20'} transition-colors`}>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {isTop && <span className="text-base">🏆</span>}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{q.company_name}</p>
                          <p className="text-xs text-gray-400">{q.warranty || 'No warranty'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`font-semibold ${isLowest ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                        ₹{Number(q.price).toLocaleString('en-IN')}
                      </span>
                      {isLowest && <span className="ml-1 text-xs text-emerald-600">✓ Lowest</span>}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`font-medium ${isFastest ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {q.delivery_days}d
                      </span>
                      {isFastest && <span className="ml-1 text-xs text-blue-600">⚡ Fastest</span>}
                    </td>
                    <td className="py-3 px-2">
                      <span className="flex items-center gap-1 text-yellow-500 font-medium">
                        ⭐ {Number(q.rating).toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 px-2 w-32">
                      <ScoreBar
                        score={q.ai_score}
                        color={i === 0 ? 'bg-primary-500' : i === 1 ? 'bg-violet-400' : 'bg-gray-400'}
                      />
                    </td>
                    <td className="py-3 px-2">{statusBadge(q.status)}</td>
                    <td className="py-3 px-2">
                      {isRole('admin', 'procurement_officer') && q.status === 'submitted' && (
                        <button
                          onClick={() => selectMutation.mutate(q.id)}
                          disabled={selectMutation.isPending}
                          className="flex items-center gap-1 text-xs bg-primary-600 hover:bg-primary-700 text-white px-2.5 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          <HiOutlineCheckCircle size={14} />
                          Select
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes section */}
      {quotations.some(q => q.notes) && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Vendor Notes</h3>
          <div className="space-y-2">
            {quotations.filter(q => q.notes).map(q => (
              <div key={q.id} className="flex gap-2 text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">{q.company_name}:</span>
                <span className="text-gray-500 dark:text-gray-400">{q.notes}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
