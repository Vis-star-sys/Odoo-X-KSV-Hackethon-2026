import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceAPI, poAPI } from '../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineDownload } from 'react-icons/hi';

const statusBadge = (s) => {
  if (s === 'paid') return <span className="badge-green">Paid</span>;
  if (s === 'sent') return <span className="badge-yellow">Sent</span>;
  return <span className="badge-blue">Generated</span>;
};

export default function InvoicesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ po_id: '', tax: 18 });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoiceAPI.getAll().then(r => r.data),
  });

  const { data: pos = [] } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => poAPI.getAll().then(r => r.data),
  });

  const generateMutation = useMutation({
    mutationFn: invoiceAPI.generate,
    onSuccess: (res) => {
      qc.invalidateQueries(['invoices']);
      toast.success(`Invoice ${res.data.invoice_number} generated!`);
      setShowModal(false);
      setForm({ po_id: '', tax: 18 });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error generating invoice'),
  });

  const downloadPdf = async (id, invNumber) => {
    try {
      const res = await invoiceAPI.downloadPdf(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `INV-${invNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus size={18} /> Generate Invoice
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
              <tr>
                {['Invoice No', 'PO Number', 'Vendor', 'Subtotal', 'Tax', 'Total', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">No invoices yet</td></tr>
              ) : invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 font-mono text-primary-600 dark:text-primary-400 font-medium">{inv.invoice_number}</td>
                  <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-300">{inv.po_number}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{inv.company_name}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">₹{Number(inv.subtotal).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-gray-500">{inv.tax}%</td>
                  <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">₹{Number(inv.total).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">{statusBadge(inv.status)}</td>
                  <td className="px-4 py-3 text-gray-500">{format(new Date(inv.created_at), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => downloadPdf(inv.id, inv.invoice_number)}
                      className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium"
                    >
                      <HiOutlineDownload size={14} /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Generate Invoice</h2>
            <form onSubmit={(e) => { e.preventDefault(); generateMutation.mutate(form); }} className="space-y-4">
              <div>
                <label className="label">Purchase Order</label>
                <select className="input" required value={form.po_id} onChange={e => setForm(p => ({ ...p, po_id: e.target.value }))}>
                  <option value="">Select PO...</option>
                  {pos.filter(p => p.status !== 'cancelled').map(po => (
                    <option key={po.id} value={po.id}>{po.po_number} - {po.company_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">GST Tax (%)</label>
                <input type="number" className="input" min="0" max="100" value={form.tax}
                  onChange={e => setForm(p => ({ ...p, tax: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={generateMutation.isPending}>Generate</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
