
// ─── socketStore.js ──────────────────────────────────────────
import { create } from 'zustand';
import { io } from 'socket.io-client';

export const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,
  workerLocation: null,

  connect: (token) => {
    if (get().socket?.connected) return;

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      set({ connected: true });
      console.log('Socket connected');
    });

    socket.on('disconnect', () => set({ connected: false }));

    socket.on('worker:location', (data) => {
      set({ workerLocation: data });
      // Also emit to map component
      window.dispatchEvent(new CustomEvent('worker-location-update', { detail: data }));
    });

    socket.on('job:started', (data) => {
      window.dispatchEvent(new CustomEvent('job-started', { detail: data }));
    });

    socket.on('job:completed', (data) => {
      window.dispatchEvent(new CustomEvent('job-completed', { detail: data }));
    });

    socket.on('booking:accepted', (data) => {
      window.dispatchEvent(new CustomEvent('booking-accepted', { detail: data }));
      // Show notification
      useNotificationStore.getState().addToast({
        type: 'success',
        title: 'Booking Accepted!',
        message: `Worker accepted your request. OTP: ${data.otp}`
      });
    });

    socket.on('chat:message', (data) => {
      window.dispatchEvent(new CustomEvent('chat-message', { detail: data }));
    });

    set({ socket });
  },

  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null, connected: false });
  },

  emit: (event, data) => {
    get().socket?.emit(event, data);
  },

  sendLocation: (lat, lng, bookingId, extras = {}) => {
    get().socket?.emit('location:update', {
      lat, lng, booking_id: bookingId, ...extras
    });
  }
}));
