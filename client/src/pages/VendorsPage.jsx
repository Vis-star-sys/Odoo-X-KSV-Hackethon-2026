import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineTrash,
  HiOutlineStar, HiOutlineClipboardCopy, HiOutlineCheckCircle,
} from 'react-icons/hi';

const statusBadge = (s) => {
  if (s === 'active') return <span className="badge-green">Active</span>;
  if (s === 'inactive') return <span className="badge-gray">Inactive</span>;
  return <span className="badge-red">Blacklisted</span>;
};

// Shown after vendor is created — displays login credentials
function CredentialsModal({ credentials, onClose }) {
  const [copied, setCopied] = useState(false);

  const copyAll = () => {
    const text = `Email: ${credentials.email}\nPassword: ${credentials.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
            <HiOutlineCheckCircle className="text-green-600 dark:text-green-400" size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Vendor Created!</h2>
            <p className="text-sm text-gray-500">Share these login credentials with the vendor</p>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-4">
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-3">
            ⚠️ Save these credentials now — the password won't be shown again
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg px-3 py-2">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Email</p>
                <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white">{credentials.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg px-3 py-2">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Password</p>
                <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white">{credentials.password}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={copyAll} className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <HiOutlineClipboardCopy size={16} />
            {copied ? 'Copied!' : 'Copy Credentials'}
          </button>
          <button onClick={onClose} className="btn-primary flex-1">Done</button>
        </div>
      </div>
    </div>
  );
}

export default function VendorsPage() {
  const { isRole } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [credentials, setCredentials] = useState(null); // for post-create dialog
  const [form, setForm] = useState({
    company_name: '', vendor_category: '', gst_number: '',
    contact_person: '', email: '', phone: '', address: '', password: '',
  });

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['vendors', search, statusFilter],
    queryFn: () => vendorAPI.getAll({ search, status: statusFilter }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => vendorAPI.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries(['vendors']);
      setShowModal(false);
      resetForm();
      // Show credentials modal
      setCredentials({ email: res.data.loginEmail, password: res.data.loginPassword });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error creating vendor'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => vendorAPI.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['vendors']);
      toast.success('Vendor updated');
      setShowModal(false);
      setEditing(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error updating vendor'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => vendorAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries(['vendors']); toast.success('Vendor deactivated'); },
  });

  const resetForm = () => setForm({
    company_name: '', vendor_category: '', gst_number: '',
    contact_person: '', email: '', phone: '', address: '', password: '',
  });

  const openCreate = () => { resetForm(); setEditing(null); setShowModal(true); };
  const openEdit = (v) => {
    setEditing(v);
    setForm({
      company_name: v.company_name, vendor_category: v.vendor_category || '',
      gst_number: v.gst_number || '', contact_person: v.contact_person || '',
      email: v.email, phone: v.phone || '', address: v.address || '',
      status: v.status, rating: v.rating, password: '',
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendors</h1>
        {isRole('admin') && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <HiOutlinePlus size={18} /> Add Vendor
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input className="input pl-9" placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blacklisted">Blacklisted</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
              <tr>
                {['Company', 'Category', 'Contact', 'Phone', 'Rating', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : vendors.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No vendors found</td></tr>
              ) : vendors.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{v.company_name}</p>
                    <p className="text-xs text-gray-400">{v.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{v.vendor_category || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{v.contact_person || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{v.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-yellow-500">
                      <HiOutlineStar size={14} />
                      {Number(v.rating).toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">{statusBadge(v.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isRole('admin', 'procurement_officer') && (
                        <button onClick={() => openEdit(v)} className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors">
                          <HiOutlinePencil size={16} />
                        </button>
                      )}
                      {isRole('admin') && (
                        <button
                          onClick={() => { if (window.confirm('Deactivate this vendor?')) deleteMutation.mutate(v.id); }}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <HiOutlineTrash size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editing ? 'Edit Vendor' : 'Add Vendor'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: 'Company Name', key: 'company_name', required: true },
                { label: 'Category', key: 'vendor_category' },
                { label: 'GST Number', key: 'gst_number' },
                { label: 'Contact Person', key: 'contact_person' },
                { label: 'Email', key: 'email', type: 'email', required: true, disabled: !!editing },
                { label: 'Phone', key: 'phone' },
              ].map(({ label, key, type = 'text', required, disabled }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input
                    type={type} className="input" required={required} disabled={disabled}
                    value={form[key] || ''}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  />
                </div>
              ))}

              <div>
                <label className="label">Address</label>
                <textarea className="input" rows={2} value={form.address || ''} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
              </div>

              {/* Password field — only on create */}
              {!editing && (
                <div>
                  <label className="label">
                    Login Password
                    <span className="ml-1 text-xs text-gray-400 font-normal">(leave blank to use default: vendor@123)</span>
                  </label>
                  <input
                    type="text"
                    className="input font-mono"
                    placeholder="vendor@123"
                    value={form.password || ''}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    This will be the vendor's login password. Share it with them after creation.
                  </p>
                </div>
              )}

              {editing && (
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={form.status || 'active'} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blacklisted">Blacklisted</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editing ? 'Update' : 'Create Vendor'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); setEditing(null); }} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials display modal */}
      {credentials && (
        <CredentialsModal
          credentials={credentials}
          onClose={() => setCredentials(null)}
        />
      )}
    </div>
  );
}
