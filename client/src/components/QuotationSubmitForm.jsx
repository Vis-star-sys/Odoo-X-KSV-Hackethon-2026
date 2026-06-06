import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { quotationAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function QuotationSubmitForm({ rfqId, existingQuotations }) {
  const qc = useQueryClient();
  const hasSubmitted = existingQuotations.length > 0;
  const [form, setForm] = useState({ price: '', delivery_days: '', warranty: '', notes: '' });

  const submitMutation = useMutation({
    mutationFn: (data) => quotationAPI.submit(data),
    onSuccess: () => {
      qc.invalidateQueries(['quotations', rfqId]);
      toast.success('Quotation submitted successfully!');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error submitting quotation'),
  });

  if (hasSubmitted) {
    return (
      <div className="card p-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-green-600 dark:text-green-400 text-xl">✓</span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Quotation Submitted</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your quotation has been submitted and is under review.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    submitMutation.mutate({ rfq_id: rfqId, ...form });
  };

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Submit Quotation</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Price (₹)</label>
          <input type="number" className="input" required min="0" step="0.01"
            value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
        </div>
        <div>
          <label className="label">Delivery Days</label>
          <input type="number" className="input" required min="1"
            value={form.delivery_days} onChange={e => setForm(p => ({ ...p, delivery_days: e.target.value }))} />
        </div>
        <div>
          <label className="label">Warranty</label>
          <input type="text" className="input" placeholder="e.g., 1 year"
            value={form.warranty} onChange={e => setForm(p => ({ ...p, warranty: e.target.value }))} />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={3}
            value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={submitMutation.isPending}>
          {submitMutation.isPending ? 'Submitting...' : 'Submit Quotation'}
        </button>
      </form>
    </div>
  );
}
