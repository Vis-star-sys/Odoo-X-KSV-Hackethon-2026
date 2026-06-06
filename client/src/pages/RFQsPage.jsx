import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { rfqAPI, vendorAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineEye, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';
import { format } from 'date-fns';

const statusBadge = (s) => {
  const map = { draft: 'badge-gray', published: 'badge-blue', closed: 'badge-green', cancelled: 'badge-red' };
  return <span className={map[s] || 'badge-gray'}>{s}</span>;
};

export default function RFQsPage() {
  const { user, isRole } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', quantity: '', budget: '', deadline: '', vendor_ids: [] });
  const [statusFilter, setStatusFilter] = useState('');

  const { data: rfqs = [], isLoading } = useQuery({
    queryKey: ['rfqs', statusFilter],
    queryFn: () => rfqAPI.getAll({ status: statusFilter }).then(r => r.data),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => vendorAPI.getAll({}).then(r => r.data),
    enabled: isRole('admin', 'procurement_officer'),
  });

  const createMutation = useMutation({
    mutationFn: rfqAPI.create,
    onSuccess: () => { qc.invalidateQueries(['rfqs']); toast.success('RFQ created'); setShowModal(false); resetForm(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => rfqAPI.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['rfqs']); toast.success('RFQ updated'); setShowModal(false); setEditing(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: rfqAPI.delete,
    onSuccess: () => { qc.invalidateQueries(['rfqs']); toast.success('RFQ cancelled'); },
  });

  const resetForm = () => setForm({ title: '', description: '', quantity: '', budget: '', deadline: '', vendor_ids: [] });

  const openCreate = () => { resetForm(); setEditing(null); setShowModal(true); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({ title: r.title, description: r.description || '', quantity: r.quantity, budget: r.budget, deadline: r.deadline?.split('T')[0] || '', vendor_ids: r.vendors?.map(v => v.id) || [], status: r.status });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form, vendor_ids: form.vendor_ids.map(Number) };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  const toggleVendor = (id) => {
    setForm(p => ({
      ...p,
      vendor_ids: p.vendor_ids.includes(id) ? p.vendor_ids.filter(v => v !== id) : [...p.vendor_ids, id]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">RFQs</h1>
        {isRole('admin', 'procurement_officer') && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <HiOutlinePlus size={18} /> Create RFQ
          </button>
        )}
      </div>

      <div className="flex gap-3">
        <select className="input w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {['draft', 'published', 'closed', 'cancelled'].map(s => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 text-center py-12 text-gray-400">Loading...</div>
        ) : rfqs.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-gray-400">No RFQs found</div>
        ) : rfqs.map(r => (
          <div key={r.id} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">{r.title}</h3>
              {statusBadge(r.status)}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{r.description || 'No description'}</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4">
              <span>Qty: {r.quantity || '-'}</span>
              <span>Budget: {r.budget ? `₹${Number(r.budget).toLocaleString('en-IN')}` : '-'}</span>
              <span>Vendors: {r.vendor_count || 0}</span>
              <span>Quotes: {r.quotation_count || 0}</span>
              {r.deadline && <span className="col-span-2">Deadline: {format(new Date(r.deadline), 'MMM d, yyyy')}</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate(`/rfqs/${r.id}`)} className="btn-secondary flex-1 flex items-center justify-center gap-1 text-sm py-1.5">
                <HiOutlineEye size={15} /> View
              </button>
              {isRole('admin', 'procurement_officer') && (
                <>
                  <button onClick={() => openEdit(r)} className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg">
                    <HiOutlinePencil size={16} />
                  </button>
                  <button onClick={() => { if (confirm('Cancel RFQ?')) deleteMutation.mutate(r.id); }} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
                    <HiOutlineTrash size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editing ? 'Edit RFQ' : 'Create RFQ'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input className="input" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Quantity</label>
                  <input type="number" className="input" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Budget (₹)</label>
                  <input type="number" className="input" value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Deadline</label>
                <input type="date" className="input" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
              </div>
              {editing && (
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    {['draft', 'published', 'closed', 'cancelled'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
              {vendors.length > 0 && (
                <div>
                  <label className="label">Invite Vendors</label>
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                    {vendors.map(v => (
                      <label key={v.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
                        <input type="checkbox" checked={form.vendor_ids.includes(v.id)} onChange={() => toggleVendor(v.id)} />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{v.company_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editing ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); setEditing(null); }} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
