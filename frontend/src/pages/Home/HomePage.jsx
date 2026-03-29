// ============================================================
// Home Page (src/pages/Home/HomePage.jsx)
// ============================================================

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MapPin, Search, Star, ChevronRight, Zap, Clock, PlusCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { jobsAPI, categoriesAPI } from '../../services/api';
import JobCard from '../../components/Jobs/JobCard';
import {WorkerCard} from '../../components/Workers/WorkerCard';

export default function HomePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [location, setLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const isWorker = user?.role === 'worker';

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(pos => {
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  }, []);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.list().then(r => r.data)
  });

  const { data: nearbyJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['nearby-jobs', location?.lat, location?.lng],
    queryFn: () => location
      ? jobsAPI.nearby(location.lat, location.lng, { limit: 6 }).then(r => r.data.jobs)
      : jobsAPI.list({ status: 'open', limit: 6 }).then(r => r.data.jobs),
    enabled: true
  });

  const { data: urgentJobs } = useQuery({
    queryKey: ['urgent-jobs'],
    queryFn: () => jobsAPI.list({ status: 'open', limit: 4 }).then(r => r.data.jobs)
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
      {/* Header greeting */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <p style={{ color: '#A08060', fontSize: 14, marginBottom: 4 }}>{greeting()},</p>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, color: '#2C2417', margin: 0 }}>
          {user?.full_name?.split(' ')[0]} 👋
        </h1>
        {location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, color: '#A08060', fontSize: 13 }}>
            <MapPin size={13} /> <span>Location detected</span>
          </div>
        )}
      </motion.div>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: 28 }} onClick={() => navigate('/search')}>
        <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#A08060' }} />
        <input
          readOnly
          placeholder={isWorker ? 'Search jobs by skill, location...' : 'Search workers, skills...'}
          style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: 12, border: '1.5px solid #F0EAE0', background: 'white', fontSize: 15, color: '#2C2417', cursor: 'pointer', boxShadow: '0 2px 8px rgba(44,36,23,0.05)' }}
        />
      </div>

      {/* Employer CTA */}
      {!isWorker && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          style={{ background: 'linear-gradient(135deg, #F4600C, #C84E00)', borderRadius: 16, padding: 24, marginBottom: 32, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, margin: '0 0 6px' }}>Need a worker today?</h3>
            <p style={{ fontSize: 14, opacity: 0.85, margin: 0 }}>Post a job and get applications within minutes</p>
          </div>
          <Link to="/jobs/post" style={{ background: 'white', color: '#F4600C', borderRadius: 10, padding: '12px 20px', fontWeight: 700, fontSize: 14, textDecoration: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
            <PlusCircle size={16} /> Post Job
          </Link>
        </motion.div>
      )}

      {/* Categories */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontWeight: 700, fontSize: 18, color: '#2C2417', marginBottom: 16 }}>Browse by skill</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {(categories || [
            { name: 'Plumber', icon_url: '🔧' },
            { name: 'Electrician', icon_url: '⚡' },
            { name: 'Carpenter', icon_url: '🪚' },
            { name: 'Painter', icon_url: '🎨' },
            { name: 'Cleaner', icon_url: '🧹' },
            { name: 'Driver', icon_url: '🚗' },
            { name: 'Cook', icon_url: '👨‍🍳' },
            { name: 'Helper', icon_url: '🏗️' },
          ]).slice(0, 8).map((cat, i) => (
            <motion.div key={i} whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/jobs?category=${cat.id || ''}`)}
              style={{ background: 'white', borderRadius: 12, padding: '14px 10px', textAlign: 'center', cursor: 'pointer', border: '1px solid #F0EAE0', transition: 'box-shadow 0.2s' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{cat.icon_url}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#5C4A32', lineHeight: 1.3 }}>{cat.name}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Urgent Jobs Banner */}
      {isWorker && (urgentJobs || []).some(j => j?.is_urgent) && (
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Zap size={18} color="#F4600C" />
            <h2 style={{ fontWeight: 700, fontSize: 18, color: '#2C2417', margin: 0 }}>Urgent Jobs</h2>
            <span style={{ background: '#FEE2E2', color: '#DC2626', borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>High pay</span>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {(urgentJobs || []).filter(j => j?.is_urgent).map((job, i) => (
              <div key={i} style={{ minWidth: 240, flex: '0 0 auto' }}>
                <JobCard job={job} compact />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Nearby / Recent Jobs */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontWeight: 700, fontSize: 18, color: '#2C2417', margin: 0 }}>
            {location ? 'Jobs near you' : 'Recent Jobs'}
          </h2>
          <Link to="/jobs" style={{ color: '#F4600C', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            See all <ChevronRight size={16} />
          </Link>
        </div>

        {jobsLoading ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: 110, borderRadius: 12 }} />
            ))}
          </div>
        ) : (nearbyJobs || []).length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#A08060' }}>
            <p style={{ fontSize: 16 }}>No jobs found in your area yet.</p>
            {!isWorker && <Link to="/jobs/post" style={{ color: '#F4600C', fontWeight: 600 }}>Post the first job!</Link>}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {(nearbyJobs || []).map((job, i) => (
              <motion.div key={job?.id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <JobCard job={job} />
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}