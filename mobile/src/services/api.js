// ============================================================
// Mobile API Service (src/services/api.js)
// ============================================================

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL
  ? `${process.env.EXPO_PUBLIC_API_URL}/api/v1`
  : 'http://192.168.1.100:5000/api/v1';  // Replace with your local IP

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor — attach token
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — auto refresh
api.interceptors.response.use(
  res => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        const { data } = await axios.post(`${BASE_URL}/auth/refresh-token`, { refresh_token: refreshToken });
        await SecureStore.setItemAsync('access_token', data.access_token);
        await SecureStore.setItemAsync('refresh_token', data.refresh_token);
        error.config.headers.Authorization = `Bearer ${data.access_token}`;
        return api(error.config);
      } catch {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        // Navigate to login — handled by auth store
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  sendOTP: (phone) => api.post('/auth/send-otp', { phone }),
  verifyOTP: (phone, otp) => api.post('/auth/verify-otp', { phone, otp }),
  register: (data) => api.post('/auth/register', data),
};

export const jobsAPI = {
  list: (params) => api.get('/jobs', { params }),
  nearby: (lat, lng, params) => api.get('/jobs/nearby', { params: { lat, lng, ...params } }),
  get: (id) => api.get(`/jobs/${id}`),
  create: (data) => api.post('/jobs', data),
};

export const bookingsAPI = {
  list: (params) => api.get('/bookings', { params }),
  get: (id) => api.get(`/bookings/${id}`),
  apply: (jobId, data) => api.post(`/bookings/apply/${jobId}`, data),
  accept: (id) => api.post(`/bookings/${id}/accept`),
  reject: (id) => api.post(`/bookings/${id}/reject`),
  cancel: (id) => api.post(`/bookings/${id}/cancel`),
};

export const usersAPI = {
  me: () => api.get('/users/me'),
  update: (data) => api.patch('/users/me', data),
  getWorker: (id) => api.get(`/users/workers/${id}`),
  updateAvailability: (is_available) => api.patch('/users/worker-profile/availability', { is_available }),
};

export const reviewsAPI = {
  create: (bookingId, data) => api.post(`/reviews/${bookingId}`, data),
  getWorkerReviews: (workerId) => api.get(`/reviews/worker/${workerId}`),
};

export const categoriesAPI = {
  list: () => api.get('/categories'),
};

export const notificationsAPI = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
};

export default api;

/* ─────────────────────────────────────────────────────────── */
