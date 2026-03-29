// ============================================================
// Bookings Page (src/pages/Bookings/BookingsPage.jsx)
// ============================================================

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, Clock, CheckCircle, XCircle, Navigation, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { bookingsAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

const tabs = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'];

const statusMeta = {
  pending:     { label: 'Pending',     color: '#D97706', bg: '#FEF3C7', icon: <Clock size={14} /> },
  accepted:    { label: 'Accepted',    color: '#1D4ED8', bg: '#DBEAFE', icon: <CheckCircle size={14} /> },
  in_progress: { label: 'In Progress', color: '#D97706', bg: '#FEF3C7', icon: <Navigation size={14} /> },
  completed:   { label: 'Completed',   color: '#1A7A4C', bg: '#D1FAE5', icon: <CheckCircle size={14} /> },
  cancelled:   { label: 'Cancelled',   color: '#DC2626', bg: '#FEE2E2', icon: <XCircle size={14} /> },
  rejected:    { label: 'Rejected',    color: '#DC2626', bg: '#FEE2E2', icon: <XCircle size={14} /> },
};

function BookingCard({ booking }) {
  const meta = statusMeta[booking.status] || statusMeta.pending;
  return (
    <Link to={`/bookings/${booking.id}`} style={{ textDecoration: 'none' }}>
      <div className="card card-hover" style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ flex: 1, marginRight: 12 }}>
            <h3 style={{ fontWeight: 700, fontSize: 15, color: '#2C2417', margin: '0 0 4px', lineHeight: 1.3 }}>
              {booking.job_title}
            </h3>
            <p style={{ fontSize: 13, color: '#A08060', margin: 0 }}>{booking.category_name}</p>
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: meta.bg, color: meta.color, borderRadius: 99, padding: '4px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
            {meta.icon} {meta.label}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', color: '#A08060', fontSize: 13 }}>
            <span>
              {booking.worker_name && `👷 ${booking.worker_name}`}
              {booking.employer_name && `🏢 ${booking.employer_name}`}
            </span>
            {booking.proposed_rate && (
              <span style={{ color: '#1A7A4C', fontWeight: 600 }}>₹{booking.proposed_rate}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#A08060', fontSize: 12 }}>
            {booking.created_at && formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })}
            <ChevronRight size={14} />
          </div>
        </div>

        {/* Active booking progress */}
        {booking.status === 'in_progress' && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: '#FEF3C7', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#D97706', fontWeight: 600 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D97706', animation: 'pulse 1s infinite' }} />
            Job in progress — tap to track
          </div>
        )}
      </div>
    </Link>
  );
}

export default function BookingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('pending');

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings', activeTab],
    queryFn: () => bookingsAPI.list({ status: activeTab }).then(r => r.data)
  });

  // Count by status for tab badges
  const { data: allBookings } = useQuery({
    queryKey: ['bookings-all'],
    queryFn: () => bookingsAPI.list({}).then(r => r.data),
    staleTime: 60000
  });

  const countByStatus = (allBookings || []).reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, color: '#2C2417', margin: 0 }}>My Bookings</h1>
      </div>

      {/* Status Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {tabs.map(tab => {
          const meta = statusMeta[tab];
          const count = countByStatus[tab] || 0;
          const isActive = activeTab === tab;
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 99, border: `1.5px solid ${isActive ? meta.color : '#F0EAE0'}`, background: isActive ? meta.bg : 'white', color: isActive ? meta.color : '#A08060', fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
              {meta.label}
              {count > 0 && (
                <span style={{ background: isActive ? meta.color : '#F0EAE0', color: isActive ? 'white' : '#A08060', borderRadius: 99, width: 18, height: 18, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />)}
        </div>
      ) : (bookings || []).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: '#A08060' }}>
          <Briefcase size={52} style={{ opacity: 0.2, marginBottom: 14 }} />
          <h3 style={{ color: '#2C2417', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No {activeTab} bookings</h3>
          <p style={{ fontSize: 14 }}>
            {user?.role === 'worker' ? 'Browse available jobs and apply!' : 'Post a job to get applications.'}
          </p>
          <Link to={user?.role === 'worker' ? '/jobs' : '/jobs/post'}
            style={{ display: 'inline-block', marginTop: 14, color: '#F4600C', fontWeight: 600, fontSize: 15 }}>
            {user?.role === 'worker' ? 'Browse Jobs →' : 'Post a Job →'}
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(bookings || []).map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <BookingCard booking={b} />
            </motion.div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
    </div>
  );
}