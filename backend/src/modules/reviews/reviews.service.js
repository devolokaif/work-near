// ============================================================
// Reviews Module (src/modules/reviews/)
// ============================================================

// ─── reviews.service.js ─────────────────────────────────────
const { db } = require('../../config/database');
const AppError = require('../../utils/AppError');

const reviewsService = {
  async createReview(bookingId, reviewerId, { rating, comment, photos = [] }) {
    if (rating < 1 || rating > 5) throw new AppError('Rating must be 1-5', 400);

    const booking = await db.query(`
      SELECT * FROM bookings WHERE id = $1 AND status = 'completed'
        AND (worker_id = $2 OR employer_id = $2)
    `, [bookingId, reviewerId]).then(r => r.rows[0]);

    if (!booking) throw new AppError('Booking not found or not completed', 404);

    const revieweeId = booking.worker_id === reviewerId ? booking.employer_id : booking.worker_id;

    // Check if already reviewed
    const existing = await db.query(
      'SELECT id FROM reviews WHERE booking_id = $1 AND reviewer_id = $2',
      [bookingId, reviewerId]
    ).then(r => r.rows[0]);
    if (existing) throw new AppError('Already reviewed this booking', 409);

    const review = await db.query(`
      INSERT INTO reviews (booking_id, reviewer_id, reviewee_id, rating, comment, photos)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [bookingId, reviewerId, revieweeId, rating, comment, photos]).then(r => r.rows[0]);

    return review;
  },

  async getWorkerReviews(workerId, { page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    const [reviews, stats] = await Promise.all([
      db.query(`
        SELECT r.*, u.full_name as reviewer_name, u.profile_photo as reviewer_photo
        FROM reviews r
        JOIN users u ON u.id = r.reviewer_id
        WHERE r.reviewee_id = $1 AND r.is_public = TRUE
        ORDER BY r.created_at DESC
        LIMIT $2 OFFSET $3
      `, [workerId, limit, offset]).then(r => r.rows),
      db.query(`
        SELECT COUNT(*) as total, AVG(rating)::DECIMAL(3,2) as avg_rating,
          COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
          COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
          COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
          COUNT(CASE WHEN rating <= 2 THEN 1 END) as low_star
        FROM reviews WHERE reviewee_id = $1 AND is_public = TRUE
      `, [workerId]).then(r => r.rows[0])
    ]);

    return { reviews, stats };
  }
};

module.exports = reviewsService;



// ─── Worker Profile Page (src/pages/Workers/WorkerProfilePage.jsx)
// Exported as a string for the frontend build
const workerProfilePageCode = `
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Star, MapPin, Clock, Shield, Briefcase, IndianRupee, ChevronLeft } from 'lucide-react';
import { usersAPI, reviewsAPI } from '../../services/api';
import { format } from 'date-fns';

export default function WorkerProfilePage() {
  const { id } = useParams();

  const { data: worker, isLoading } = useQuery({
    queryKey: ['worker', id],
    queryFn: () => usersAPI.getWorker(id).then(r => r.data)
  });

  const { data: reviewData } = useQuery({
    queryKey: ['worker-reviews', id],
    queryFn: () => reviewsAPI.getWorkerReviews(id).then(r => r.data)
  });

  if (isLoading) return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
      {[100, 60, 180, 120].map((h, i) => (
        <div key={i} className="skeleton" style={{ height: h, borderRadius: 12, marginBottom: 14 }} />
      ))}
    </div>
  );

  if (!worker) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#A08060' }}>
      <p>Worker not found.</p>
      <Link to="/jobs" style={{ color: '#F4600C' }}>← Back to Jobs</Link>
    </div>
  );

  const ratingBars = [
    { stars: 5, count: reviewData?.stats?.five_star || 0 },
    { stars: 4, count: reviewData?.stats?.four_star || 0 },
    { stars: 3, count: reviewData?.stats?.three_star || 0 },
    { stars: 2, count: 0 },
    { stars: 1, count: reviewData?.stats?.low_star || 0 },
  ];
  const totalReviews = Number(reviewData?.stats?.total || 0);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 20px 100px' }}>
      <Link to={-1} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#A08060', fontSize: 14, textDecoration: 'none', marginBottom: 20 }}>
        <ChevronLeft size={18} /> Back
      </Link>

      {/* Header */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', marginBottom: 18 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(244,96,12,0.15), rgba(244,96,12,0.4))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#F4600C', flexShrink: 0, overflow: 'hidden' }}>
            {worker.profile_photo
              ? <img src={worker.profile_photo} alt={worker.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : worker.full_name?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 24, color: '#2C2417', margin: '0 0 4px' }}>{worker.full_name}</h1>
                {worker.is_available !== undefined && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: worker.is_available ? '#1A7A4C' : '#A08060' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: worker.is_available ? '#1A7A4C' : '#A08060' }} />
                    {worker.is_available ? 'Available now' : 'Currently busy'}
                  </div>
                )}
              </div>
              {worker.documents_verified && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#D1FAE5', color: '#1A7A4C', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 700 }}>
                  <Shield size={12} /> Verified
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
          {[
            { label: 'Rating', value: worker.rating > 0 ? \`\${Number(worker.rating).toFixed(1)} ★\` : '—', color: '#F59E0B' },
            { label: 'Jobs Done', value: worker.total_reviews || 0, color: '#1D4ED8' },
            { label: 'Experience', value: worker.experience_years ? \`\${worker.experience_years} yrs\` : '—', color: '#1A7A4C' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '12px 6px', background: '#FAF7F2', borderRadius: 10 }}>
              <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 20, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#A08060', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Rates */}
        {(worker.hourly_rate || worker.daily_rate) && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
            {worker.hourly_rate && (
              <div style={{ flex: 1, padding: '12px', background: '#FAF7F2', borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#2C2417' }}>₹{Number(worker.hourly_rate).toLocaleString('en-IN')}/hr</div>
                <div style={{ fontSize: 12, color: '#A08060' }}>Hourly Rate</div>
              </div>
            )}
            {worker.daily_rate && (
              <div style={{ flex: 1, padding: '12px', background: '#FAF7F2', borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#2C2417' }}>₹{Number(worker.daily_rate).toLocaleString('en-IN')}/day</div>
                <div style={{ fontSize: 12, color: '#A08060' }}>Daily Rate</div>
              </div>
            )}
          </div>
        )}

        {/* Bio */}
        {worker.bio && (
          <p style={{ color: '#5C4A32', fontSize: 15, lineHeight: 1.75, margin: 0 }}>{worker.bio}</p>
        )}
      </div>

      {/* Skills */}
      {(worker.skills || []).length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, color: '#2C2417', marginBottom: 14 }}>Skills</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(worker.skills || []).map((s, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(244,96,12,0.08)', color: '#F4600C', borderRadius: 8, padding: '7px 14px', fontSize: 14, fontWeight: 600 }}>
                {s.icon_url} {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      {totalReviews > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, color: '#2C2417', marginBottom: 16 }}>Reviews ({totalReviews})</h3>
          <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 48, color: '#2C2417', lineHeight: 1 }}>
                {Number(reviewData?.stats?.avg_rating || 0).toFixed(1)}
              </div>
              <div style={{ color: '#F59E0B', fontSize: 20, margin: '4px 0' }}>
                {'★'.repeat(Math.round(reviewData?.stats?.avg_rating || 0))}{'☆'.repeat(5 - Math.round(reviewData?.stats?.avg_rating || 0))}
              </div>
              <div style={{ fontSize: 12, color: '#A08060' }}>{totalReviews} reviews</div>
            </div>
            <div style={{ flex: 1 }}>
              {ratingBars.map(({ stars, count }) => (
                <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#A08060', width: 18 }}>{stars}★</span>
                  <div style={{ flex: 1, height: 8, background: '#F0EAE0', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: totalReviews ? \`\${(count / totalReviews) * 100}%\` : '0%', height: '100%', background: '#F59E0B', borderRadius: 99, transition: 'width 0.5s' }} />
                  </div>
                  <span style={{ fontSize: 12, color: '#A08060', width: 20, textAlign: 'right' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {(reviewData?.reviews || []).slice(0, 5).map((r, i) => (
            <div key={i} style={{ paddingTop: 14, borderTop: i > 0 ? '1px solid #F0EAE0' : 'none', marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#2C2417' }}>{r.reviewer_name}</div>
                <div style={{ color: '#F59E0B', fontSize: 13 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
              </div>
              {r.comment && <p style={{ color: '#5C4A32', fontSize: 14, margin: 0, lineHeight: 1.6 }}>{r.comment}</p>}
              <div style={{ fontSize: 11, color: '#A08060', marginTop: 4 }}>
                {r.created_at && format(new Date(r.created_at), 'dd MMM yyyy')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hire CTA */}
      <div style={{ position: 'sticky', bottom: 80 }}>
        <Link to={\`/jobs/post?worker=\${worker.id}\`} className="btn-primary"
          style={{ display: 'flex', width: '100%', justifyContent: 'center', padding: 16, textDecoration: 'none', fontSize: 16, borderRadius: 12 }}>
          Hire {worker.full_name?.split(' ')[0]}
        </Link>
      </div>
    </div>
  );
}
`;

// Write the actual file
const fs = require('fs');

const path = require('path');

const dir = path.join(__dirname, '../../../../frontend/src/pages/Workers');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'WorkerProfilePage.jsx'), workerProfilePageCode.trim());

module.exports = reviewsService;
