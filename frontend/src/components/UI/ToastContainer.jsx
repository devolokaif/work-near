// ============================================================
// Toast Container (src/components/UI/ToastContainer.jsx)
// ============================================================

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { useNotificationStore } from '../../stores/notificationStore';

const icons = {
  success: <CheckCircle size={18} color="#1A7A4C" />,
  error: <XCircle size={18} color="#DC2626" />,
  warning: <AlertCircle size={18} color="#D97706" />,
  info: <Info size={18} color="#1D4ED8" />
};

const borderColors = {
  success: '#1A7A4C', error: '#DC2626', warning: '#D97706', info: '#1D4ED8'
};

export default function ToastContainer() {
  const { toasts, removeToast } = useNotificationStore();

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360, width: 'calc(100% - 32px)' }}>
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div key={toast.id}
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{ background: 'white', borderRadius: 12, padding: '14px 16px', boxShadow: '0 8px 32px rgba(44,36,23,0.15)', borderLeft: `4px solid ${borderColors[toast.type] || '#5C4A32'}`, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ marginTop: 1, flexShrink: 0 }}>{icons[toast.type] || icons.info}</div>
            <div style={{ flex: 1 }}>
              {toast.title && <div style={{ fontWeight: 700, fontSize: 14, color: '#2C2417', marginBottom: 2 }}>{toast.title}</div>}
              <div style={{ fontSize: 13, color: '#5C4A32', lineHeight: 1.5 }}>{toast.message}</div>
            </div>
            <button onClick={() => removeToast(toast.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A08060', padding: 2, marginTop: -2, flexShrink: 0 }}>
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */

