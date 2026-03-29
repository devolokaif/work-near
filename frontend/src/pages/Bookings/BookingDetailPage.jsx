// ============================================================
// Booking Detail Page (src/pages/Bookings/BookingDetailPage.jsx)
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Phone, MessageCircle, Navigation,
  CheckCircle, Clock, Star, IndianRupee, KeyRound,
  AlertCircle, CreditCard
} from 'lucide-react';
import { format } from 'date-fns';
import { bookingsAPI } from '../../services/api';
import { initiatePayment } from '../Payments/PaymentsPage';
import { useAuthStore } from '../../stores/authStore';
import { useSocketStore } from '../../stores/socketStore';
import { useNotificationStore } from '../../stores/notificationStore';

export default function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { emit } = useSocketStore();
  const { addToast } = useNotificationStore();
  const qc = useQueryClient();
  const [otpInput, setOtpInput] = useState(['', '', '', '', '', '']);
  const [showOtpEntry, setShowOtpEntry] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  const isWorker = user?.role === 'worker';

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsAPI.get(id).then(r => r.data),
    refetchInterval: booking?.status === 'in_progress' ? 30000 : false
  });

  // Socket events
  useEffect(() => {
    const onJobStarted = (e) => {
      if (e.detail.booking_id === id) {
        qc.invalidateQueries(['booking', id]);
        addToast({ type: 'success', title: 'Job Started!', message: 'Work has begun.' });
      }
    };
    const onJobCompleted = (e) => {
      if (e.detail.booking_id === id) {
        qc.invalidateQueries(['booking', id]);
        addToast({ type: 'success', title: 'Job Completed!', message: 'Rate your experience.' });
        setShowReviewModal(true);
      }
    };
    const onChatMessage = (e) => {
      if (e.detail.booking_id === id) setMessages(m => [...m, e.detail]);
    };
    window.addEventListener('job-started', onJobStarted);
    window.addEventListener('job-completed', onJobCompleted);
    window.addEventListener('chat-message', onChatMessage);
    return () => {
      window.removeEventListener('job-started', onJobStarted);
      window.removeEventListener('job-completed', onJobCompleted);
      window.removeEventListener('chat-message', onChatMessage);
    };
  }, [id]);

  const handleOtpChange = (val, idx) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otpInput];
    next[idx] = val.slice(-1);
    setOtpInput(next);
    if (val && idx < 5) document.getElementById(`botp-${idx + 1}`)?.focus();
  };

  const handleStartJob = () => {
    const otp = otpInput.join('');
    if (otp.length < 6) return addToast({ type: 'error', message: 'Enter all 6 digits' });
    emit('booking:start', { booking_id: id, otp });
    addToast({ type: 'info', title: 'Starting job...', message: 'Verifying OTP' });
    setShowOtpEntry(false);
    setOtpInput(['', '', '', '', '', '']);
  };

  const handleCompleteJob = () => {
    emit('booking:complete', { booking_id: id });
  };

  const handlePayment = async () => {
    setPaymentLoading(true);
    try {
      await initiatePayment(id, user.full_name, user.phone);
      addToast({ type: 'success', title: 'Payment Successful!', message: 'Worker has been paid.' });
      qc.invalidateQueries(['booking', id]);
    } catch (err) {
      addToast({ type: 'error', title: 'Payment Failed', message: err.message });
    } finally {
      setPaymentLoading(false);
    }
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    emit('chat:message', { booking_id: id, message: chatInput });
    setMessages(m => [...m, { message: chatInput, sender_id: user.id, sent_at: new Date() }]);
    setChatInput('');
  };

  const submitReview = async () => {
    try {
      await import('../../services/api').then(m => m.reviewsAPI.create(id, review));
      addToast({ type: 'success', title: 'Review Submitted!', message: 'Thank you for your feedback.' });
      setShowReviewModal(false);
      qc.invalidateQueries(['booking', id]);
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to submit review' });
    }
  };

  if (isLoading) return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
      {[120, 100, 180].map((h, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 12, marginBottom: 14 }} />)}
    </div>
  );

  if (!booking) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#A08060' }}>
      <p>Booking not found.</p>
      <Link to="/bookings" style={{ color: '#F4600C' }}>← Back</Link>
    </div>
  );

  const otherParty = isWorker
    ? { name: booking.employer_name, phone: booking.employer_phone, role: 'Employer' }
    : { name: booking.worker_name, phone: booking.worker_phone, role: 'Worker' };

  const statusSteps = [
    { key: 'pending', label: 'Applied' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'in_progress', label: 'Working' },
    { key: 'completed', label: 'Done' },
  ];
  const currentStepIdx = statusSteps.findIndex(s => s.key === booking.status);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 20px 100px' }}>
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#A08060', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, marginBottom: 20, padding: 0 }}>
        <ChevronLeft size={18} /> My Bookings
      </button>

      {/* Progress Steps */}
      {!['cancelled', 'rejected'].includes(booking.status) && (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          {statusSteps.map((step, i) => (
            <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < statusSteps.length - 1 ? 1 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: i <= currentStepIdx ? '#F4600C' : '#F0EAE0', color: i <= currentStepIdx ? 'white' : '#A08060', fontSize: 13, fontWeight: 700, transition: 'all 0.3s' }}>
                  {i < currentStepIdx ? <CheckCircle size={16} /> : i + 1}
                </div>
                <span style={{ fontSize: 11, color: i <= currentStepIdx ? '#F4600C' : '#A08060', fontWeight: 600, whiteSpace: 'nowrap' }}>{step.label}</span>
              </div>
              {i < statusSteps.length - 1 && (
                <div style={{ flex: 1, height: 3, background: i < currentStepIdx ? '#F4600C' : '#F0EAE0', margin: '0 4px 16px', borderRadius: 99, transition: 'background 0.3s' }} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cancelled/Rejected notice */}
      {['cancelled', 'rejected'].includes(booking.status) && (
        <div style={{ background: '#FEE2E2', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
          <AlertCircle size={20} color="#DC2626" />
          <span style={{ color: '#DC2626', fontWeight: 600, fontSize: 14 }}>
            This booking was {booking.status}.
          </span>
        </div>
      )}

      {/* Job Info */}
      <div className="card" style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ marginBottom: 12 }}>
          <span style={{ background: 'rgba(244,96,12,0.08)', color: '#F4600C', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{booking.category_name}</span>
        </div>
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, color: '#2C2417', margin: '0 0 8px' }}>{booking.job_title}</h2>
        <div style={{ color: '#A08060', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {booking.job_address && <span>📍 {booking.job_address}</span>}
          {booking.started_at && <span>🕐 Started: {format(new Date(booking.started_at), 'dd MMM, h:mm a')}</span>}
          {booking.completed_at && <span>✅ Completed: {format(new Date(booking.completed_at), 'dd MMM, h:mm a')}</span>}
        </div>
        {booking.proposed_rate && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F0EAE0', display: 'flex', alignItems: 'center', gap: 6, color: '#2C2417' }}>
            <IndianRupee size={18} color="#F4600C" />
            <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 24 }}>₹{Number(booking.proposed_rate).toLocaleString('en-IN')}</span>
            <span style={{ color: '#A08060', fontSize: 13 }}>agreed rate</span>
          </div>
        )}
      </div>

      {/* Other Party */}
      <div className="card" style={{ padding: 20, marginBottom: 14 }}>
        <h3 style={{ fontWeight: 700, fontSize: 15, color: '#2C2417', marginBottom: 14 }}>
          {otherParty.role}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(244,96,12,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#F4600C' }}>
            {otherParty.name?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#2C2417' }}>{otherParty.name}</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {['accepted', 'in_progress', 'completed'].includes(booking.status) && otherParty.phone && (
              <a href={`tel:${otherParty.phone}`}
                style={{ width: 40, height: 40, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Phone size={18} color="#1A7A4C" />
              </a>
            )}
            <button onClick={() => { setChatOpen(!chatOpen); emit('chat:history', { booking_id: id }); }}
              style={{ width: 40, height: 40, borderRadius: '50%', background: '#DBEAFE', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={18} color="#1D4ED8" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="card" style={{ overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #F0EAE0', fontWeight: 700, fontSize: 14, color: '#2C2417' }}>
              Chat with {otherParty.name}
            </div>
            <div style={{ height: 200, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messages.length === 0 && (
                <p style={{ textAlign: 'center', color: '#A08060', fontSize: 13 }}>No messages yet. Say hello!</p>
              )}
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.sender_id === user.id ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '75%', padding: '8px 14px', borderRadius: 12, background: msg.sender_id === user.id ? '#F4600C' : '#F0EAE0', color: msg.sender_id === user.id ? 'white' : '#2C2417', fontSize: 14 }}>
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 14px', borderTop: '1px solid #F0EAE0', display: 'flex', gap: 8 }}>
              <input className="input" style={{ flex: 1, padding: '9px 14px', fontSize: 14 }}
                placeholder="Type a message..." value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()} />
              <button onClick={sendMessage} style={{ background: '#F4600C', border: 'none', borderRadius: 8, padding: '9px 16px', color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Worker: Start Job (needs employer OTP) */}
        {isWorker && booking.status === 'accepted' && (
          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }}
            onClick={() => setShowOtpEntry(true)}>
            <KeyRound size={18} /> Start Job with OTP
          </button>
        )}

        {/* Worker: Complete Job */}
        {isWorker && booking.status === 'in_progress' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-primary" style={{ flex: 2, justifyContent: 'center', padding: 14, background: '#1A7A4C' }}
              onClick={handleCompleteJob}>
              <CheckCircle size={18} /> Mark Complete
            </button>
            <Link to={`/tracking/${id}`} className="btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none', padding: 14 }}>
              <Navigation size={18} /> Track
            </Link>
          </div>
        )}

        {/* Employer: Pay after completion */}
        {!isWorker && booking.status === 'completed' && !booking.payment_completed && (
          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }}
            onClick={handlePayment} disabled={paymentLoading}>
            <CreditCard size={18} /> {paymentLoading ? 'Processing...' : `Pay ₹${Number(booking.proposed_rate || booking.budget_max || 0).toLocaleString('en-IN')}`}
          </button>
        )}

        {/* Employer: Track worker */}
        {!isWorker && booking.status === 'in_progress' && (
          <Link to={`/tracking/${id}`} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, textDecoration: 'none' }}>
            <Navigation size={18} /> Track Worker Live
          </Link>
        )}

        {/* Leave Review */}
        {booking.status === 'completed' && (
          <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: 14 }}
            onClick={() => setShowReviewModal(true)}>
            <Star size={18} /> Leave a Review
          </button>
        )}
      </div>

      {/* OTP Entry Modal */}
      <AnimatePresence>
        {showOtpEntry && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
              onClick={() => setShowOtpEntry(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              style={{ position: 'relative', background: 'white', borderRadius: '20px 20px 0 0', padding: 28, width: '100%' }}>
              <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, color: '#2C2417', marginBottom: 6 }}>Enter Start OTP</h3>
              <p style={{ color: '#A08060', fontSize: 14, marginBottom: 24 }}>Ask the employer for the 6-digit OTP they received</p>
              <div style={{ display: 'flex', gap: 10, marginBottom: 24, justifyContent: 'center' }}>
                {otpInput.map((d, i) => (
                  <input key={i} id={`botp-${i}`} type="tel" maxLength={1} value={d}
                    onChange={e => handleOtpChange(e.target.value, i)}
                    onKeyDown={e => e.key === 'Backspace' && !d && i > 0 && document.getElementById(`botp-${i - 1}`)?.focus()}
                    style={{ width: 46, height: 54, textAlign: 'center', fontSize: 22, fontWeight: 700, border: `2px solid ${d ? '#F4600C' : '#F0EAE0'}`, borderRadius: 10, outline: 'none', background: d ? 'rgba(244,96,12,0.05)' : 'white', color: '#2C2417' }} />
                ))}
              </div>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }}
                onClick={handleStartJob} disabled={otpInput.join('').length < 6}>
                Start Job
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
              onClick={() => setShowReviewModal(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              style={{ position: 'relative', background: 'white', borderRadius: '20px 20px 0 0', padding: 28, width: '100%' }}>
              <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, color: '#2C2417', marginBottom: 6 }}>Rate your experience</h3>
              <p style={{ color: '#A08060', fontSize: 14, marginBottom: 24 }}>How was {otherParty.name}?</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 22 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setReview(r => ({ ...r, rating: star }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 36, color: star <= review.rating ? '#F59E0B' : '#E5E7EB', transition: 'color 0.15s' }}>
                    ★
                  </button>
                ))}
              </div>
              <textarea className="input" style={{ height: 90, resize: 'none', marginBottom: 20 }}
                placeholder="Write a comment (optional)..."
                value={review.comment} onChange={e => setReview(r => ({ ...r, comment: e.target.value }))} />
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }}
                onClick={submitReview}>
                Submit Review
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}