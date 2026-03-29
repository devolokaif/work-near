import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      otpSession: null, // optional: used if backend returns a session/id

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),

      // Step 1: send OTP for registration
      requestRegisterOtp: async ({ full_name, phone, role }) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/send-otp', {
            full_name,
            phone,
            role,
          });

          // If your backend returns a session/token for OTP verification, store it
          set({ otpSession: data.otp_session || data.session_id || null });
          return data;
        } finally {
          set({ isLoading: false });
        }
      },

      // Step 2: verify OTP and create account
      // register: async ({ full_name, phone, role, otp }) => {
      //   set({ isLoading: true });
      //   try {
      //     const payload = { full_name, phone, role, otp };

      //     const otpSession = get().otpSession;
      //     if (otpSession) payload.otp_session = otpSession;

      //     const { data } = await api.post('/auth/verify-otp', payload);

      //     set({
      //       user: data.user,
      //       accessToken: data.access_token,
      //       refreshToken: data.refresh_token,
      //       otpSession: null,
      //     });

      //     return data;
      //   } finally {
      //     set({ isLoading: false });
      //   }
      // },

      register: async ({ full_name, phone, role, otp }) => {
        set({ isLoading: true });
        try {
          // Step 1: Verify OTP
          const verifyRes = await api.post('/auth/verify-otp', { phone, otp });

          // If existing user → login
          if (verifyRes.data.exists) {
            set({
              user: verifyRes.data.user,
              accessToken: verifyRes.data.access_token,
              refreshToken: verifyRes.data.refresh_token,
            });
            return verifyRes.data;
          }

          // Step 2: New user → Register
          const token = verifyRes.data.token;

          const { data } = await api.post('/auth/register', {
            full_name,
            phone,
            role,
            token,
          });

          set({
            user: data.user,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
          });

          return data;
        } finally {
          set({ isLoading: false });
        }
      },

      // Login OTP flow (keep or adapt to your backend)
      login: async (phone, otp) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/verify-otp', {
            phone,
            otp,
            purpose: 'login',
          });

          if (data.exists) {
            set({
              user: data.user,
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
            });
          }

          return data;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch { }
        set({ user: null, accessToken: null, refreshToken: null, otpSession: null });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: { ...state.user, ...updates },
        })),
    }),
    {
      name: 'worknear-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);


