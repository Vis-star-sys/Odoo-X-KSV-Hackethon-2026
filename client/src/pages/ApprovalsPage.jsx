import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { HiOutlineCheckCircle, HiOutlineXCircle } from 'react-icons/hi';

const statusBadge = (s) => {
  if (s === 'approved') return <span className="badge-green">Approved</span>;
  if (s === 'rejected') return <span className="badge-red">Rejected</span>;
  return <span className="badge-yellow">Pending</span>;
};

export default function ApprovalsPage() {
  const { isRole } = useAuth();
  const qc = useQueryClient();
  const [activeModal, setActiveModal] = useState(null);
  const [remarks, setRemarks] = useState('');

  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ['approvals'],
    queryFn: () => approvalAPI.getAll().then(r => r.data),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, status, remarks }) => approvalAPI.approveReject(id, { status, remarks }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries(['approvals']);
      toast.success(vars.status === 'approved' ? 'Quotation approved & PO generated!' : 'Quotation rejected');
      setActiveModal(null);
      setRemarks('');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const handleAction = (status) => {
    actionMutation.mutate({ id: activeModal.id, status, remarks });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Approvals</h1>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
              <tr>
                {['RFQ', 'Vendor', 'Price', 'Delivery', 'AI Score', 'Budget', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : approvals.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">No approvals found</td></tr>
              ) : approvals.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{a.rfq_title}</p>
                    <p className="text-xs text-gray-400">Qty: {a.quantity}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.company_name}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">₹{Number(a.price).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.delivery_days} days</td>
                  <td className="px-4 py-3 font-semibold text-primary-600 dark:text-primary-400">{a.ai_score}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.budget ? `₹${Number(a.budget).toLocaleString('en-IN')}` : '-'}</td>
                  <td className="px-4 py-3">{statusBadge(a.status)}</td>
                  <td className="px-4 py-3">
                    {isRole('manager') && a.status === 'pending' && (
                      <button
                        onClick={() => setActiveModal(a)}
                        className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                      >
                        Review
                      </button>
                    )}
                    {a.remarks && <p className="text-xs text-gray-400 mt-1">Note: {a.remarks}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Review Quotation</h2>
            <div className="space-y-2 text-sm mb-4">
              <p><span className="text-gray-500">Vendor:</span> <span className="font-medium text-gray-900 dark:text-white">{activeModal.company_name}</span></p>
              <p><span className="text-gray-500">RFQ:</span> <span className="font-medium text-gray-900 dark:text-white">{activeModal.rfq_title}</span></p>
              <p><span className="text-gray-500">Price:</span> <span className="font-bold text-gray-900 dark:text-white">₹{Number(activeModal.price).toLocaleString('en-IN')}</span></p>
              <p><span className="text-gray-500">Delivery:</span> {activeModal.delivery_days} days</p>
              <p><span className="text-gray-500">Warranty:</span> {activeModal.warranty || '-'}</p>
              <p><span className="text-gray-500">AI Score:</span> <span className="font-semibold text-primary-600">{activeModal.ai_score}</span></p>
              {activeModal.notes && <p><span className="text-gray-500">Notes:</span> {activeModal.notes}</p>}
            </div>
            <div>
              <label className="label">Remarks (optional)</label>
              <textarea className="input" rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add your remarks..." />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => handleAction('approved')} disabled={actionMutation.isPending} className="btn-success flex-1 flex items-center justify-center gap-2">
                <HiOutlineCheckCircle size={18} /> Approve
              </button>
              <button onClick={() => handleAction('rejected')} disabled={actionMutation.isPending} className="btn-danger flex-1 flex items-center justify-center gap-2">
                <HiOutlineXCircle size={18} /> Reject
              </button>
              <button onClick={() => { setActiveModal(null); setRemarks(''); }} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
