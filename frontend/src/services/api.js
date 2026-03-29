// ============================================================
// API Service (src/services/api.js)
// Axios instance with JWT refresh + retry logic
// ============================================================

import axios from 'axios';

const BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  const auth = JSON.parse(localStorage.getItem('worknear-auth') || '{}');
  const token = auth.state?.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — auto refresh on 401
let refreshing = false;
let queue = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (refreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then(() => api(original));
      }

      original._retry = true;
      refreshing = true;

      try {
        const auth = JSON.parse(localStorage.getItem('worknear-auth') || '{}');
        const refreshToken = auth.state?.refreshToken;

        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/auth/refresh-token`, { refresh_token: refreshToken });

        // Update stored tokens
        const stored = JSON.parse(localStorage.getItem('worknear-auth') || '{}');
        stored.state.accessToken = data.access_token;
        stored.state.refreshToken = data.refresh_token;
        localStorage.setItem('worknear-auth', JSON.stringify(stored));

        original.headers.Authorization = `Bearer ${data.access_token}`;
        queue.forEach(({ resolve }) => resolve());
        queue = [];

        return api(original);
      } catch {
        queue.forEach(({ reject }) => reject(error));
        queue = [];
        localStorage.removeItem('worknear-auth');
        window.location.href = '/login';
      } finally {
        refreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── API Modules ──────────────────────────────────────────────

export const authAPI = {
  sendOTP: (phone) => api.post('/auth/send-otp', { phone }),
  verifyOTP: (phone, otp) => api.post('/auth/verify-otp', { phone, otp }),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout')
};

export const jobsAPI = {
  list: (params) => api.get('/jobs', { params }),
  nearby: (lat, lng, params) => api.get('/jobs/nearby', { params: { lat, lng, ...params } }),
  get: (id) => api.get(`/jobs/${id}`),
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.patch(`/jobs/${id}`, data),
  delete: (id) => api.delete(`/jobs/${id}`)
};

export const bookingsAPI = {
  list: (params) => api.get('/bookings', { params }),
  get: (id) => api.get(`/bookings/${id}`),
  apply: (jobId, data) => api.post(`/bookings/apply/${jobId}`, data),
  accept: (id) => api.post(`/bookings/${id}/accept`),
  reject: (id) => api.post(`/bookings/${id}/reject`),
  cancel: (id) => api.post(`/bookings/${id}/cancel`)
};

export const paymentsAPI = {
  createOrder: (bookingId) => api.post('/payments/create-order', { booking_id: bookingId }),
  verify: (data) => api.post('/payments/verify', data),
  history: (params) => api.get('/payments/history', { params }),
  requestPayout: (amount) => api.post('/payments/payout', { amount })
};

export const usersAPI = {
  me: () => api.get('/users/me'),
  update: (data) => api.patch('/users/me', data),
  uploadPhoto: (file) => {
    const form = new FormData();
    form.append('photo', file);
    return api.post('/users/me/photo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getWorker: (id) => api.get(`/users/workers/${id}`),
  updateWorkerProfile: (data) => api.patch('/users/worker-profile', data),
  updateAvailability: (is_available) => api.patch('/users/worker-profile/availability', { is_available })
};

export const trackingAPI = {
  getLocation: (bookingId) => api.get(`/tracking/${bookingId}/location`)
};

export const reviewsAPI = {
  create: (bookingId, data) => api.post(`/reviews/${bookingId}`, data),
  getWorkerReviews: (workerId, params) => api.get(`/reviews/worker/${workerId}`, { params })
};

export const categoriesAPI = {
  list: () => api.get('/categories')
};

export const notificationsAPI = {
  list: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all')
};

export const walletAPI = {
  balance: () => api.get('/payments/wallet'),
  transactions: (params) => api.get('/payments/wallet/transactions', { params })
};


export default api;