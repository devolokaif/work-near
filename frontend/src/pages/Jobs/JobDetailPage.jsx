// ============================================================
// Job Detail Page (src/pages/Jobs/JobDetailPage.jsx)
// ============================================================

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Clock, Users, IndianRupee, Zap, Star, Phone,
  ChevronLeft, CheckCircle, Share2, Bookmark, AlertCircle,
  Navigation, MessageCircle
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { jobsAPI, bookingsAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useNotificationStore();
  const qc = useQueryClient();
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState({ proposed_rate: '', message: '' });
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');

  const isWorker = user?.role === 'worker';
  const isEmployer = user?.role === 'employer';

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsAPI.get(id).then(r => r.data)
  });

  // Get my booking for this job (if worker)
  const { data: myBooking } = useQuery({
    queryKey: ['my-booking', id],
    queryFn: () => bookingsAPI.list({ job_id: id }).then(r =>
      (r.data || []).find(b => b.worker_id === user?.id)
    ),
    enabled: isWorker
  });

  // Get all applications (if employer)
  const { data: applications } = useQuery({
    queryKey: ['job-applications', id],
    queryFn: () => bookingsAPI.list({ job_id: id }).then(r => r.data),
    enabled: isEmployer && job?.employer_id === user?.id
  });

  const applyMutation = useMutation({
    mutationFn: (data) => bookingsAPI.apply(id, data).then(r => r.data),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Applied!', message: 'Your application has been sent.' });
      setShowApplyModal(false);
      qc.invalidateQueries(['my-booking', id]);
    },
    onError: (err) => addToast({ type: 'error', title: 'Failed', message: err.response?.data?.error || 'Could not apply' })
  });

  const acceptMutation = useMutation({
    mutationFn: (bookingId) => bookingsAPI.accept(bookingId).then(r => r.data),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Accepted!', message: 'Worker notified with OTP.' });
      qc.invalidateQueries(['job-applications', id]);
      qc.invalidateQueries(['job', id]);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (bookingId) => bookingsAPI.reject(bookingId).then(r => r.data),
    onSuccess: () => qc.invalidateQueries(['job-applications', id])
  });

  const cancelMutation = useMutation({
    mutationFn: () => jobsAPI.delete(id).then(r => r.data),
    onSuccess: () => {
      addToast({ type: 'info', title: 'Job Cancelled' });
      navigate('/jobs');
    }
  });

  if (isLoading) return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px' }}>
      {[140, 80, 200, 120].map((h, i) => (
        <div key={i} className="skeleton" style={{ height: h, borderRadius: 12, marginBottom: 14 }} />
      ))}
    </div>
  );

  if (!job) return (
    <div style={{ textAlign: 'center', padding: '60px 24px', color: '#A08060' }}>
      <p style={{ fontSize: 18 }}>Job not found.</p>
      <Link to="/jobs" style={{ color: '#F4600C', fontWeight: 600 }}>Back to Jobs</Link>
    </div>
  );

  const isMyJob = job.employer_id === user?.id;
  const canApply = isWorker && job.status === 'open' && !myBooking;
  const alreadyApplied = isWorker && !!myBooking;

  const statusBg = {
    open: '#D1FAE5', assigned: '#DBEAFE', in_progress: '#FEF3C7',
    completed: '#F0EAE0', cancelled: '#FEE2E2'
  };
  const statusColor = {
    open: '#1A7A4C', assigned: '#1D4ED8', in_progress: '#D97706',
    completed: '#5C4A32', cancelled: '#DC2626'
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px' }}>
      {/* Back */}
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#A08060', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, marginBottom: 20, padding: 0 }}>
        <ChevronLeft size={18} /> Back to Jobs
      </button>

      {/* Main Card */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        {/* Status + Urgent */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {job.is_urgent && (
            <span style={{ background: '#FEE2E2', color: '#DC2626', borderRadius: 99, padding: '4px 12px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Zap size={11} /> URGENT
            </span>
          )}
          <span style={{ background: statusBg[job.status], color: statusColor[job.status], borderRadius: 99, padding: '4px 12px', fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>
            {job.status?.replace('_', ' ')}
          </span>
          <span style={{ background: 'rgba(244,96,12,0.08)', color: '#F4600C', borderRadius: 99, padding: '4px 12px', fontSize: 13, fontWeight: 600 }}>
            {job.category_name}
          </span>
        </div>

        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, color: '#2C2417', margin: '0 0 14px', lineHeight: 1.2 }}>
          {job.title}
        </h1>

        {/* Meta */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 18, color: '#A08060', fontSize: 14 }}>
          {job.address_text && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <MapPin size={15} color="#F4600C" /> {job.city || job.address_text}
              {job.distance_km && ` · ${Number(job.distance_km).toFixed(1)} km away`}
            </span>
          )}
          {job.duration_hours && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={15} /> {job.duration_hours} hrs
            </span>
          )}
          {job.workers_needed > 1 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Users size={15} /> {job.workers_hired}/{job.workers_needed} workers
            </span>
          )}
          {job.scheduled_at && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              📅 {format(new Date(job.scheduled_at), 'dd MMM, h:mm a')}
            </span>
          )}
        </div>

        {/* Budget */}
        {(job.budget_min || job.budget_max) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18 }}>
            <IndianRupee size={20} color="#F4600C" />
            <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 26, color: '#2C2417' }}>
              {job.budget_min && job.budget_max
                ? `${Number(job.budget_min).toLocaleString('en-IN')} – ${Number(job.budget_max).toLocaleString('en-IN')}`
                : Number(job.budget_max || job.budget_min).toLocaleString('en-IN')}
            </span>
            {job.duration_hours && <span style={{ color: '#A08060', fontSize: 14 }}>for {job.duration_hours}h</span>}
          </div>
        )}

        {/* Description */}
        {job.description && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, fontSize: 15, color: '#2C2417', marginBottom: 8 }}>About this job</h3>
            <p style={{ color: '#5C4A32', fontSize: 15, lineHeight: 1.75, margin: 0 }}>{job.description}</p>
          </div>
        )}

        {/* Requirements */}
        {job.requirements?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, fontSize: 15, color: '#2C2417', marginBottom: 10 }}>Requirements</h3>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {job.requirements.map((r, i) => (
                <li key={i} style={{ color: '#5C4A32', fontSize: 14, marginBottom: 4 }}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Photos */}
        {job.photos?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, fontSize: 15, color: '#2C2417', marginBottom: 10 }}>Photos</h3>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {job.photos.map((url, i) => (
                <img key={i} src={url} alt={`Job photo ${i + 1}`} style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />
              ))}
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid #F0EAE0', paddingTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap', color: '#A08060', fontSize: 13 }}>
          <span>{job.views_count || 0} views</span>
          <span>{job.applications_count || 0} applications</span>
          {job.created_at && <span>Posted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>}
        </div>
      </div>

      {/* Employer info */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, fontSize: 15, color: '#2C2417', marginBottom: 14 }}>Posted by</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #F4600C22, #F4600C55)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#F4600C' }}>
            {job.employer_name?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#2C2417' }}>{job.employer_name}</div>
            {job.employer_rating > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#F59E0B', fontSize: 13, fontWeight: 600 }}>
                <Star size={13} fill="#F59E0B" /> {Number(job.employer_rating).toFixed(1)} rating
              </div>
            )}
          </div>
          {/* If worker, show call button after being accepted */}
          {myBooking?.status === 'accepted' && (
            <a href={`tel:${job.employer_phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, background: '#D1FAE5', color: '#1A7A4C', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
              <Phone size={16} /> Call
            </a>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ position: 'sticky', bottom: 80, zIndex: 20 }}>
        {/* Worker actions */}
        {isWorker && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="card" style={{ padding: 16 }}>
            {canApply && (
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '14px' }}
                onClick={() => setShowApplyModal(true)}>
                Apply for this Job
              </button>
            )}
            {alreadyApplied && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: myBooking.status === 'pending' ? '#D97706' : myBooking.status === 'accepted' ? '#1A7A4C' : '#DC2626' }} />
                  <span style={{ fontWeight: 600, fontSize: 15, color: '#2C2417' }}>
                    Application {myBooking.status.charAt(0).toUpperCase() + myBooking.status.slice(1)}
                  </span>
                </div>
                {myBooking.status === 'accepted' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Link to={`/bookings/${myBooking.id}`} className="btn-primary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none', padding: 12, justifyContent: 'center' }}>
                      View Booking
                    </Link>
                    <Link to={`/tracking/${myBooking.id}`} className="btn-secondary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none', padding: 12, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Navigation size={16} /> Track
                    </Link>
                  </div>
                )}
              </div>
            )}
            {job.status !== 'open' && !alreadyApplied && (
              <div style={{ textAlign: 'center', color: '#A08060', fontSize: 14, padding: 8 }}>This job is no longer accepting applications.</div>
            )}
          </motion.div>
        )}

        {/* Employer actions */}
        {isMyJob && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link to={`/jobs/${id}/edit`} className="btn-secondary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none', padding: '11px', justifyContent: 'center' }}>
                Edit Job
              </Link>
              {job.status === 'open' && (
                <button onClick={() => cancelMutation.mutate()} className="btn-ghost"
                  style={{ color: '#DC2626', border: '1.5px solid #FEE2E2', borderRadius: 8, padding: '11px 20px', flex: 1 }}
                  disabled={cancelMutation.isPending}>
                  Cancel Job
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Applications (employer view) */}
      {isMyJob && (applications || []).length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 80 }}>
          <h3 style={{ fontWeight: 700, fontSize: 17, color: '#2C2417', marginBottom: 16 }}>
            Applications ({applications.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(applications || []).map(app => (
              <div key={app.id} style={{ padding: 16, borderRadius: 12, background: '#FAF7F2', border: '1px solid #F0EAE0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(244,96,12,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#F4600C', fontSize: 16, flexShrink: 0 }}>
                    {app.worker_name?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#2C2417' }}>{app.worker_name}</div>
                    {app.worker_rating > 0 && (
                      <div style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>★ {Number(app.worker_rating).toFixed(1)}</div>
                    )}
                    {app.proposed_rate && (
                      <div style={{ fontSize: 13, color: '#1A7A4C', fontWeight: 600, marginTop: 2 }}>Quoted: ₹{app.proposed_rate}</div>
                    )}
                    {app.message && <p style={{ fontSize: 13, color: '#5C4A32', margin: '6px 0 0', lineHeight: 1.5 }}>{app.message}</p>}
                  </div>
                  <span style={{ fontSize: 11, color: app.status === 'pending' ? '#D97706' : app.status === 'accepted' ? '#1A7A4C' : '#DC2626', fontWeight: 700, background: app.status === 'pending' ? '#FEF3C7' : app.status === 'accepted' ? '#D1FAE5' : '#FEE2E2', padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                    {app.status}
                  </span>
                </div>
                {app.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => acceptMutation.mutate(app.id)} disabled={acceptMutation.isPending}
                      style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#1A7A4C', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      Accept
                    </button>
                    <button onClick={() => rejectMutation.mutate(app.id)} disabled={rejectMutation.isPending}
                      style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1.5px solid #FEE2E2', background: 'white', color: '#DC2626', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      Reject
                    </button>
                    <Link to={`/workers/${app.worker_id}`}
                      style={{ padding: '9px 14px', borderRadius: 8, border: '1.5px solid #F0EAE0', background: 'white', color: '#5C4A32', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                      Profile
                    </Link>
                  </div>
                )}
                {app.status === 'accepted' && (
                  <Link to={`/tracking/${app.id}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 8, background: '#1D4ED8', color: 'white', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                    <Navigation size={14} /> Track Worker
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Apply Modal */}
      <AnimatePresence>
        {showApplyModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
              onClick={() => setShowApplyModal(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              style={{ position: 'relative', background: 'white', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
              <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, color: '#2C2417', marginBottom: 6 }}>Apply for Job</h3>
              <p style={{ color: '#A08060', fontSize: 14, marginBottom: 20 }}>{job.title}</p>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5C4A32', marginBottom: 8 }}>
                  Your Rate (₹) {job.budget_max && `(Budget: ₹${job.budget_max})`}
                </label>
                <div style={{ position: 'relative' }}>
                  <IndianRupee size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#A08060' }} />
                  <input className="input" style={{ paddingLeft: 32 }} type="number" placeholder={job.budget_max || '500'}
                    value={applyForm.proposed_rate} onChange={e => setApplyForm(f => ({ ...f, proposed_rate: e.target.value }))} />
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5C4A32', marginBottom: 8 }}>Message (optional)</label>
                <textarea className="input" style={{ height: 90, resize: 'none' }} placeholder="Introduce yourself and why you're a good fit..."
                  value={applyForm.message} onChange={e => setApplyForm(f => ({ ...f, message: e.target.value }))} />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-ghost" style={{ flex: 1, border: '1.5px solid #F0EAE0', borderRadius: 8 }} onClick={() => setShowApplyModal(false)}>
                  Cancel
                </button>
                <button className="btn-primary" style={{ flex: 2, justifyContent: 'center' }}
                  onClick={() => applyMutation.mutate(applyForm)} disabled={applyMutation.isPending}>
                  {applyMutation.isPending ? 'Applying...' : 'Submit Application'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}