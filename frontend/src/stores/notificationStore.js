
// ─── notificationStore.js ────────────────────────────────────
import { create } from 'zustand';

export const useNotificationStore = create((set, get) => ({
  toasts: [],
  unreadCount: 0,

  addToast: ({ type = 'info', title, message, duration = 5000 }) => {
    const id = Date.now().toString();
    set(state => ({ toasts: [...state.toasts, { id, type, title, message }] }));
    setTimeout(() => get().removeToast(id), duration);
  },

  removeToast: (id) => {
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
  },

  setUnreadCount: (count) => set({ unreadCount: count })
}));