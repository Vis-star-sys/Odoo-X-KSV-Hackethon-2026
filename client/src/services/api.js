import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => API.post('/auth/login', data),
  register: (data) => API.post('/auth/register', data),
  getProfile: () => API.get('/auth/profile'),
  changePassword: (data) => API.put('/auth/change-password', data),
  getUsers: () => API.get('/auth/users'),
  updateUser: (id, data) => API.put(`/auth/users/${id}`, data),
  deleteUser: (id) => API.delete(`/auth/users/${id}`),
  resetUserPassword: (id, data) => API.put(`/auth/users/${id}/reset-password`, data),
};

export const vendorAPI = {
  getAll: (params) => API.get('/vendors', { params }),
  getById: (id) => API.get(`/vendors/${id}`),
  create: (data) => API.post('/vendors', data),
  update: (id, data) => API.put(`/vendors/${id}`, data),
  toggleStatus: (id, status) => API.patch(`/vendors/${id}/status`, { status }),
  delete: (id) => API.delete(`/vendors/${id}`),
  getStats: () => API.get('/vendors/stats'),
};

export const rfqAPI = {
  getAll: (params) => API.get('/rfqs', { params }),
  getById: (id) => API.get(`/rfqs/${id}`),
  create: (data) => API.post('/rfqs', data),
  update: (id, data) => API.put(`/rfqs/${id}`, data),
  delete: (id) => API.delete(`/rfqs/${id}`),
};

export const quotationAPI = {
  getAll: (params) => API.get('/quotations', { params }),
  submit: (data) => API.post('/quotations', data),
  update: (id, data) => API.put(`/quotations/${id}`, data),
  select: (id) => API.post(`/quotations/${id}/select`),
};

export const approvalAPI = {
  getAll: () => API.get('/approvals'),
  approveReject: (id, data) => API.put(`/approvals/${id}`, data),
};

export const poAPI = {
  getAll: () => API.get('/purchase-orders'),
  getById: (id) => API.get(`/purchase-orders/${id}`),
  updateStatus: (id, status) => API.patch(`/purchase-orders/${id}/status`, { status }),
  downloadPdf: (id) => API.get(`/purchase-orders/${id}/pdf`, { responseType: 'blob' }),
};

export const invoiceAPI = {
  getAll: () => API.get('/invoices'),
  generate: (data) => API.post('/invoices', data),
  updateStatus: (id, status) => API.patch(`/invoices/${id}/status`, { status }),
  downloadPdf: (id) => API.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
};

export const dashboardAPI = {
  getStats: () => API.get('/dashboard/stats'),
  getNotifications: () => API.get('/dashboard/notifications'),
  markNotificationsRead: () => API.put('/dashboard/notifications/read'),
  getActivityLogs: () => API.get('/dashboard/activity'),
};
