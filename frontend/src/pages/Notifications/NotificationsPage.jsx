// ============================================================
// Notifications Page (src/pages/Notifications/NotificationsPage.jsx)
// ============================================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { notificationsAPI } from '../../services/api';
import { useNotificationStore } from '../../stores/notificationStore';

const TYPE_ICONS = {
  job_posted: '📋', booking_request: '👷', booking_accepted: '✅',
  booking_rejected: '❌', job_started: '🔄', job_completed: '🎉',
  payment_received: '💰', review_received: '⭐', default: '🔔'
};

const TYPE_LINKS = {
  job_posted: (data) => data?.job_id ? `/jobs/${data.job_id}` : null,
  booking_request: (data) => data?.booking_id ? `/bookings/${data.booking_id}` : null,
  booking_accepted: (data) => data?.booking_id ? `/bookings/${data.booking_id}` : null,
  job_started: (data) => data?.booking_id ? `/tracking/${data.booking_id}` : null,
  job_completed: (data) => data?.booking_id ? `/bookings/${data.booking_id}` : null,
  payment_received: () => '/payments',
};

function NotificationsPage() {
  const qc = useQueryClient();
  const { setUnreadCount } = useNotificationStore();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.list().then(r => {
      setUnreadCount(r.data.unread);
      return r.data;
    }),
    refetchInterval: 30000
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries(['notifications']);
      setUnreadCount(0);
    }
  });

  const markOneMutation = useMutation({
    mutationFn: (id) => notificationsAPI.markRead(id),
    onSuccess: () => qc.invalidateQueries(['notifications'])
  });

  const notifications = data?.notifications || [];
  const unread = data?.unread || 0;

  const getLink = (notif) => {
    const linkFn = TYPE_LINKS[notif.type];
    return linkFn ? linkFn(notif.data) : null;
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 20px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, color: '#2C2417', margin: 0 }}>
            Notifications
          </h1>
          {unread > 0 && (
            <p style={{ color: '#A08060', fontSize: 13, margin: '4px 0 0' }}>
              {unread} unread
            </p>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1.5px solid #F0EAE0', borderRadius: 8, padding: '7px 14px', color: '#5C4A32', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            <CheckCheck size={15} />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 24px', color: '#A08060' }}>
          <Bell size={52} style={{ opacity: 0.2, marginBottom: 16 }} />
          <h3 style={{ color: '#2C2417', fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>All caught up!</h3>
          <p style={{ fontSize: 14, margin: 0 }}>You have no notifications yet. Apply for jobs or post a job to get started.</p>
        </div>
      ) : (
        <AnimatePresence>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.map((notif, i) => {
              const link = getLink(notif);
              const icon = TYPE_ICONS[notif.type] || TYPE_ICONS.default;
              const Wrapper = ({ children }) => link
                ? <Link to={link} style={{ textDecoration: 'none', display: 'block' }}>{children}</Link>
                : <div>{children}</div>;

              return (
                <motion.div
                  key={notif.id || i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}>
                  <Wrapper>
                    <div
                      onClick={() => !notif.is_read && markOneMutation.mutate(notif.id)}
                      style={{
                        display: 'flex',
                        gap: 14,
                        padding: '14px 16px',
                        borderRadius: 12,
                        background: notif.is_read ? 'white' : 'rgba(244,96,12,0.04)',
                        border: `1px solid ${notif.is_read ? '#F0EAE0' : 'rgba(244,96,12,0.15)'}`,
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}>
                      <div style={{ fontSize: 26, flexShrink: 0, marginTop: 2 }}>{icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: notif.is_read ? 500 : 700, fontSize: 14, color: '#2C2417', marginBottom: 3 }}>
                          {notif.title}
                        </div>
                        {notif.body && (
                          <div style={{ fontSize: 13, color: '#5C4A32', lineHeight: 1.5, marginBottom: 5 }}>
                            {notif.body}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: '#A08060' }}>
                          {notif.sent_at && formatDistanceToNow(new Date(notif.sent_at), { addSuffix: true })}
                        </div>
                      </div>
                      {!notif.is_read && (
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#F4600C', flexShrink: 0, marginTop: 5 }} />
                      )}
                    </div>
                  </Wrapper>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}

export default NotificationsPage;