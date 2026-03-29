
// ─── src/hooks/useSocket.js ──────────────────────────────────
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:5000';

let socketInstance = null;

export function useSocket() {
  const listenersRef = useRef({});

  useEffect(() => {
    initSocket();
    return () => {};
  }, []);

  const initSocket = async () => {
    if (socketInstance?.connected) return;
    const token = await SecureStore.getItemAsync('access_token');
    if (!token) return;

    socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    socketInstance.on('connect', () => console.log('Socket connected'));
    socketInstance.on('disconnect', () => console.log('Socket disconnected'));
  };

  const emit = useCallback((event, data) => {
    socketInstance?.emit(event, data);
  }, []);

  const on = useCallback((event, handler) => {
    if (!socketInstance) return;
    socketInstance.on(event, handler);
    if (!listenersRef.current[event]) listenersRef.current[event] = [];
    listenersRef.current[event].push(handler);
  }, []);

  const off = useCallback((event, handler) => {
    socketInstance?.off(event, handler);
  }, []);

  return { emit, on, off, socket: socketInstance };
}

/* ─────────────────────────────────────────────────────────── */
