import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { poAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { HiOutlineDownload, HiOutlineChevronDown } from 'react-icons/hi';

const STATUS_FLOW = {
  generated:    { next: 'sent',         label: 'Mark as Sent',        color: 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400' },
  sent:         { next: 'acknowledged', label: 'Mark Acknowledged',   color: 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400' },
  acknowledged: { next: 'completed',   label: 'Mark Completed',      color: 'text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400' },
  completed:    { next: null,           label: 'Completed',           color: 'text-green-600' },
  cancelled:    { next: null,           label: 'Cancelled',           color: 'text-red-600' },
};

const statusBadge = (s) => {
  const map = {
    generated:    'badge-blue',
    sent:         'badge-yellow',
    acknowledged: 'badge-gray',
    completed:    'badge-green',
    cancelled:    'badge-red',
  };
  return <span className={map[s] || 'badge-gray'}>{s}</span>;
};

export default function PurchaseOrdersPage() {
  const { isRole } = useAuth();
  const qc = useQueryClient();

  const { data: pos = [], isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => poAPI.getAll().then(r => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => poAPI.updateStatus(id, status),
    onSuccess: (_, vars) => {
      qc.invalidateQueries(['purchase-orders']);
      qc.invalidateQueries(['invoices']);
      toast.success(`PO status updated to: ${vars.status}`);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error updating status'),
  });

  const downloadPdf = async (id, poNumber) => {
    try {
      const res = await poAPI.downloadPdf(id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${poNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Orders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            POs are auto-generated when a manager approves a quotation
          </p>
        </div>
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {['generated','sent','acknowledged','completed','cancelled'].map(s => (
          <span key={s} className={`${statusBadge(s).props.className} px-2 py-1`}>{s}</span>
        ))}
        <span className="text-gray-400">← workflow progresses left to right</span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
              <tr>
                {['PO Number', 'RFQ', 'Vendor', 'Amount', 'Delivery', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : pos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="text-4xl mb-2">📋</div>
                    <p className="text-gray-500 font-medium">No purchase orders yet</p>
                    <p className="text-gray-400 text-xs mt-1">POs appear here after a manager approves a quotation</p>
                  </td>
                </tr>
              ) : pos.map(po => {
                const flow = STATUS_FLOW[po.status] || {};
                return (
                  <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-primary-600 dark:text-primary-400">{po.po_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 dark:text-white font-medium">{po.rfq_title}</p>
                      <p className="text-xs text-gray-400">Qty: {po.quantity}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700 dark:text-gray-300 font-medium">{po.company_name}</p>
                      <p className="text-xs text-gray-400">{po.gst_number || ''}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      ₹{Number(po.price).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{po.delivery_days} days</td>
                    <td className="px-4 py-3">{statusBadge(po.status)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {format(new Date(po.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status advance button — procurement officer / admin only */}
                        {isRole('admin', 'procurement_officer') && flow.next && (
                          <button
                            onClick={() => statusMutation.mutate({ id: po.id, status: flow.next })}
                            disabled={statusMutation.isPending}
                            className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${flow.color}`}
                          >
                            {flow.label}
                          </button>
                        )}
                        {/* Download PDF */}
                        <button
                          onClick={() => downloadPdf(po.id, po.po_number)}
                          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 font-medium border border-primary-200 dark:border-primary-700 px-2 py-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                        >
                          <HiOutlineDownload size={13} /> PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
