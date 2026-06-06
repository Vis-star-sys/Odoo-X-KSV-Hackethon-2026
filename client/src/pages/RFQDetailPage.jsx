import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { rfqAPI, quotationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { HiOutlineArrowLeft } from 'react-icons/hi';
import QuotationSubmitForm from '../components/QuotationSubmitForm';
import QuotationsList from '../components/QuotationsList';

export default function RFQDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isRole } = useAuth();

  const { data: rfq, isLoading } = useQuery({
    queryKey: ['rfq', id],
    queryFn: () => rfqAPI.getById(id).then(r => r.data),
  });

  const { data: quotations = [] } = useQuery({
    queryKey: ['quotations', id],
    queryFn: () => quotationAPI.getAll({ rfq_id: id }).then(r => r.data),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
    </div>
  );

  if (!rfq) return <div className="text-center py-12 text-gray-400">RFQ not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <HiOutlineArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{rfq.title}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RFQ Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">RFQ Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Description:</span><p className="text-gray-900 dark:text-white mt-1">{rfq.description || '-'}</p></div>
              <div><span className="text-gray-500">Quantity:</span><p className="text-gray-900 dark:text-white mt-1">{rfq.quantity || '-'}</p></div>
              <div><span className="text-gray-500">Budget:</span><p className="text-gray-900 dark:text-white mt-1">{rfq.budget ? `₹${Number(rfq.budget).toLocaleString('en-IN')}` : '-'}</p></div>
              <div><span className="text-gray-500">Deadline:</span><p className="text-gray-900 dark:text-white mt-1">{rfq.deadline ? format(new Date(rfq.deadline), 'MMM d, yyyy') : '-'}</p></div>
              <div><span className="text-gray-500">Created by:</span><p className="text-gray-900 dark:text-white mt-1">{rfq.created_by_name}</p></div>
              <div><span className="text-gray-500">Status:</span><p className="capitalize mt-1 font-medium text-primary-600">{rfq.status}</p></div>
            </div>
          </div>

          {/* Invited Vendors */}
          {rfq.vendors?.length > 0 && (
            <div className="card p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Invited Vendors ({rfq.vendors.length})</h2>
              <div className="space-y-2">
                {rfq.vendors.map(v => (
                  <div key={v.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                      <span className="text-primary-700 dark:text-primary-300 text-xs font-semibold">{v.company_name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{v.company_name}</p>
                      <p className="text-xs text-gray-400">{v.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quotations list for non-vendors */}
          {!isRole('vendor') && (
            <QuotationsList quotations={quotations} rfqId={id} />
          )}
        </div>

        {/* Submit quotation sidebar for vendors */}
        <div>
          {isRole('vendor') && rfq.status === 'published' && (
            <QuotationSubmitForm rfqId={id} existingQuotations={quotations} />
          )}
          {isRole('vendor') && (
            <div className="card p-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Your Quotation</h3>
              {quotations.length > 0 ? (
                <div className="text-sm space-y-1">
                  <p className="text-gray-600 dark:text-gray-300">Price: ₹{Number(quotations[0].price).toLocaleString('en-IN')}</p>
                  <p className="text-gray-600 dark:text-gray-300">Delivery: {quotations[0].delivery_days} days</p>
                  <p className="text-gray-600 dark:text-gray-300">AI Score: {quotations[0].ai_score}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No quotation submitted yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
