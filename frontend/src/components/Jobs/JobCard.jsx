// ============================================================
// Job Card Component (src/components/Jobs/JobCard.jsx)
// ============================================================

import { Link } from 'react-router-dom';
import { MapPin, Clock, Users, Zap, IndianRupee } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const statusColors = {
  open: { bg: '#D1FAE5', color: '#1A7A4C' },
  assigned: { bg: '#DBEAFE', color: '#1D4ED8' },
  in_progress: { bg: '#FEF3C7', color: '#D97706' },
  completed: { bg: '#F0EAE0', color: '#5C4A32' },
  cancelled: { bg: '#FEE2E2', color: '#DC2626' },
};

export default function JobCard({ job, compact = false }) {
  if (!job) return null;
  const statusStyle = statusColors[job.status] || statusColors.open;

  return (
    <Link to={`/jobs/${job.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div className="card card-hover" style={{ padding: compact ? '14px 16px' : '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ flex: 1, marginRight: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              {job.is_urgent && (
                <span style={{ background: '#FEE2E2', color: '#DC2626', borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Zap size={10} /> URGENT
                </span>
              )}
              <span style={{ background: statusStyle.bg, color: statusStyle.color, borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
                {job.status}
              </span>
            </div>
            <h3 style={{ fontWeight: 700, fontSize: compact ? 14 : 16, color: '#2C2417', margin: '0 0 4px', lineHeight: 1.3 }}>
              {job.title}
            </h3>
            {!compact && job.description && (
              <p className="truncate-2" style={{ fontSize: 13, color: '#A08060', margin: 0 }}>{job.description}</p>
            )}
          </div>

          {/* Budget */}
          {(job.budget_min || job.budget_max) && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#F4600C', fontWeight: 700, fontSize: 15 }}>
                <IndianRupee size={14} />
                {job.budget_min && job.budget_max
                  ? `${job.budget_min}–${job.budget_max}`
                  : job.budget_max || job.budget_min}
              </div>
              {job.duration_hours && (
                <div style={{ fontSize: 11, color: '#A08060' }}>/{job.duration_hours}h</div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {job.category_name && (
            <span style={{ background: 'rgba(244,96,12,0.08)', color: '#F4600C', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
              {job.category_name}
            </span>
          )}
          {job.address_text && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#A08060', fontSize: 12 }}>
              <MapPin size={12} />
              {job.city || job.address_text.slice(0, 30)}
              {job.distance_km && ` · ${Number(job.distance_km).toFixed(1)} km`}
            </span>
          )}
          {job.workers_needed > 1 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#A08060', fontSize: 12 }}>
              <Users size={12} /> {job.workers_hired || 0}/{job.workers_needed} workers
            </span>
          )}
          {job.created_at && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#A08060', fontSize: 12, marginLeft: 'auto' }}>
              <Clock size={12} />
              {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
            </span>
          )}
        </div>

        {/* Employer info */}
        {!compact && job.employer_name && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F0EAE0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #F4600C, #FF9F6A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 12 }}>
              {job.employer_name?.[0]}
            </div>
            <span style={{ fontSize: 13, color: '#5C4A32', fontWeight: 500 }}>{job.employer_name}</span>
            {job.employer_rating > 0 && (
              <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>★ {Number(job.employer_rating).toFixed(1)}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────── */
