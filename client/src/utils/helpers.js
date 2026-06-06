/**
 * Format a number as Indian Rupee currency
 */
export const formatINR = (amount) => {
  const num = Number(amount || 0);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)} K`;
  return `₹${num.toLocaleString('en-IN')}`;
};

/**
 * Format a number as Indian Rupee currency (full)
 */
export const formatINRFull = (amount) => {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
};

/**
 * Download a blob as file
 */
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

/**
 * Get initials from a name
 */
export const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
};

/**
 * Status badge classes
 */
export const getStatusClass = (status) => {
  const map = {
    active: 'badge-green',
    inactive: 'badge-gray',
    blacklisted: 'badge-red',
    draft: 'badge-gray',
    published: 'badge-blue',
    closed: 'badge-green',
    cancelled: 'badge-red',
    submitted: 'badge-blue',
    under_review: 'badge-yellow',
    approved: 'badge-green',
    rejected: 'badge-red',
    pending: 'badge-yellow',
    generated: 'badge-blue',
    sent: 'badge-yellow',
    acknowledged: 'badge-gray',
    completed: 'badge-green',
    paid: 'badge-green',
  };
  return map[status] || 'badge-gray';
};

/**
 * Role display name
 */
export const getRoleLabel = (role) => {
  const map = {
    admin: 'Admin',
    manager: 'Manager',
    procurement_officer: 'Procurement Officer',
    vendor: 'Vendor',
  };
  return map[role] || role;
};
