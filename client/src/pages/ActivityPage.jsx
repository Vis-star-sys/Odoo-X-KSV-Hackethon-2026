import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../services/api';
import { format } from 'date-fns';

const entityColors = {
  user: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  vendor: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  rfq: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  quotation: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  approval: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  po: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  invoice: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
};

export default function ActivityPage() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activity'],
    queryFn: () => dashboardAPI.getActivityLogs().then(r => r.data),
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Log</h1>

      <div className="card p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No activity recorded yet</div>
        ) : (
          <div className="space-y-4">
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-700 dark:text-primary-300 font-semibold text-sm">
                    {log.user_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{log.user_name}</p>
                    {log.entity_type && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${entityColors[log.entity_type] || 'bg-gray-100 text-gray-600'}`}>
                        {log.entity_type}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{log.action}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(log.created_at), 'MMM d, yyyy · HH:mm:ss')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
