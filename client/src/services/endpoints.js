import api from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  deleteAccount: () => api.delete('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (email, password) => api.post('/auth/reset-password', { email, password }),
};

export const subscriptionService = {
  getPlans: () => api.get('/subscriptions/plans'),
  createOrder: (planType) => api.post('/subscriptions/create-order', { plan_type: planType }),
  verifyPayment: (data) => api.post('/subscriptions/verify-payment', data),
  getStatus: () => api.get('/subscriptions/status'),
};

export const scoreService = {
  getScores: () => api.get('/scores'),
  addScore: (data) => api.post('/scores', data),
  updateScore: (id, data) => api.put(`/scores/${id}`, data),
  deleteScore: (id) => api.delete(`/scores/${id}`),
};

export const charityService = {
  getAll: () => api.get('/charities'),
  getFeatured: () => api.get('/charities/featured'),
  getById: (id) => api.get(`/charities/${id}`),
  create: (data) => api.post('/charities', data),
  update: (id, data) => api.put(`/charities/${id}`, data),
  delete: (id) => api.delete(`/charities/${id}`),
  createDonationOrder: (data) => api.post('/charities/donate/create-order', data),
  verifyDonationPayment: (data) => api.post('/charities/donate/verify-payment', data),
  getTotalDonations: (id) => api.get(`/charities/${id}/total-donations`),
};

export const drawService = {
  getAll: () => api.get('/draws'),
  getById: (id) => api.get(`/draws/${id}`),
  simulate: (logicOption) => api.post('/draws/simulate', { logicOption }, { timeout: 60000 }),
  publish: (id) => api.post(`/draws/${id}/publish`, {}, { timeout: 60000 }),
};

export const winnerService = {
  getAll: (params) => api.get('/winners', { params }),
  getMyWinnings: () => api.get('/winners/me'),
  uploadProof: (id, formData) => api.post(`/winners/${id}/upload-proof`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  verify: (id, status) => api.put(`/winners/${id}/verify`, { status }),
  markPaid: (id) => api.put(`/winners/${id}/mark-paid`),
};

export const adminService = {
  getAnalytics: () => api.get('/admin/analytics'),
  getUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  changeUserPassword: (id, password) => api.put(`/admin/users/${id}/password`, { password }),
  suspendUser: (id) => api.put(`/admin/users/${id}/suspend`),
  unsuspendUser: (id) => api.put(`/admin/users/${id}/unsuspend`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getUserScores: (id) => api.get(`/admin/users/${id}/scores`),
  getSubscriptions: () => api.get('/admin/subscriptions'),
  cancelSubscription: (id) => api.put(`/admin/subscriptions/${id}/cancel`),
};
