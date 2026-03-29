// ============================================================
// Jobs Page (src/pages/Jobs/JobsPage.jsx)
// ============================================================

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, MapPin, X, ChevronDown, Zap } from 'lucide-react';
import { jobsAPI, categoriesAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import JobCard from '../../components/Jobs/JobCard';

const statusOptions = ['open', 'assigned', 'in_progress', 'completed', 'cancelled'];

export default function JobsPage() {
  const { user } = useAuthStore();
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [location, setLocation] = useState(null);
  const [searchInput, setSearchInput] = useState(params.get('q') || '');
  const [page, setPage] = useState(1);

  const filters = {
    status: params.get('status') || '',
    category: params.get('category') || '',
    city: params.get('city') || '',
    urgent: params.get('urgent') === 'true',
    mine: params.get('mine') === 'true',
    nearby: params.get('nearby') === 'true',
  };

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(pos => {
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  }, []);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.list().then(r => r.data)
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['jobs', filters, page, location],
    queryFn: async () => {
      if (filters.nearby && location) {
        return jobsAPI.nearby(location.lat, location.lng, {
          category: filters.category,
          page, limit: 15
        }).then(r => ({ jobs: r.data.jobs, total: r.data.count, pages: 1 }));
      }
      return jobsAPI.list({
        status: filters.status || 'open',
        category: filters.category,
        city: filters.city,
        mine: filters.mine ? true : undefined,
        page, limit: 15
      }).then(r => r.data);
    },
    keepPreviousData: true
  });

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
    setPage(1);
  };

  const clearFilters = () => {
    setParams({});
    setSearchInput('');
    setPage(1);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 26, color: '#2C2417', margin: 0 }}>
          {filters.mine ? 'My Posted Jobs' : user?.role === 'worker' ? 'Find Work' : 'Browse Jobs'}
        </h1>
        {user?.role === 'employer' && (
          <Link to="/jobs/post" style={{ background: '#F4600C', color: 'white', borderRadius: 10, padding: '9px 18px', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
            + Post Job
          </Link>
        )}
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#A08060' }} />
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && setFilter('city', searchInput)}
          placeholder="Search by city, skill..."
          style={{ width: '100%', padding: '12px 44px 12px 42px', borderRadius: 10, border: '1.5px solid #F0EAE0', fontSize: 15, background: 'white', color: '#2C2417', outline: 'none', boxShadow: '0 2px 8px rgba(44,36,23,0.05)' }}
        />
        {searchInput && (
          <button onClick={() => { setSearchInput(''); setFilter('city', ''); }}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#A08060', padding: 4 }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {/* Nearby toggle */}
        {location && (
          <button onClick={() => setFilter('nearby', !filters.nearby)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 99, border: `1.5px solid ${filters.nearby ? '#F4600C' : '#F0EAE0'}`, background: filters.nearby ? 'rgba(244,96,12,0.08)' : 'white', color: filters.nearby ? '#F4600C' : '#5C4A32', fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
            <MapPin size={13} /> Nearby
          </button>
        )}

        {/* Urgent */}
        <button onClick={() => setFilter('urgent', !filters.urgent)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 99, border: `1.5px solid ${filters.urgent ? '#DC2626' : '#F0EAE0'}`, background: filters.urgent ? '#FEF2F2' : 'white', color: filters.urgent ? '#DC2626' : '#5C4A32', fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <Zap size={13} /> Urgent
        </button>

        {/* Status filter */}
        <div style={{ position: 'relative' }}>
          <select onChange={e => setFilter('status', e.target.value)} value={filters.status}
            style={{ padding: '7px 28px 7px 12px', borderRadius: 99, border: `1.5px solid ${filters.status ? '#F4600C' : '#F0EAE0'}`, background: filters.status ? 'rgba(244,96,12,0.08)' : 'white', color: filters.status ? '#F4600C' : '#5C4A32', fontWeight: 600, fontSize: 13, cursor: 'pointer', appearance: 'none', outline: 'none' }}>
            <option value="">All Status</option>
            {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>)}
          </select>
          <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#A08060' }} />
        </div>

        {/* Category filter */}
        <div style={{ position: 'relative' }}>
          <select onChange={e => setFilter('category', e.target.value)} value={filters.category}
            style={{ padding: '7px 28px 7px 12px', borderRadius: 99, border: `1.5px solid ${filters.category ? '#F4600C' : '#F0EAE0'}`, background: filters.category ? 'rgba(244,96,12,0.08)' : 'white', color: filters.category ? '#F4600C' : '#5C4A32', fontWeight: 600, fontSize: 13, cursor: 'pointer', appearance: 'none', outline: 'none' }}>
            <option value="">All Categories</option>
            {(categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#A08060' }} />
        </div>

        {/* My jobs (employer) */}
        {user?.role === 'employer' && (
          <button onClick={() => setFilter('mine', !filters.mine)}
            style={{ padding: '7px 14px', borderRadius: 99, border: `1.5px solid ${filters.mine ? '#F4600C' : '#F0EAE0'}`, background: filters.mine ? 'rgba(244,96,12,0.08)' : 'white', color: filters.mine ? '#F4600C' : '#5C4A32', fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            My Jobs
          </button>
        )}

        {/* Clear all */}
        {activeFilterCount > 0 && (
          <button onClick={clearFilters}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 99, border: '1.5px solid #F0EAE0', background: 'white', color: '#A08060', fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <X size={13} /> Clear ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Results count */}
      {data && (
        <p style={{ color: '#A08060', fontSize: 13, marginBottom: 14 }}>
          {data.total !== undefined ? `${data.total} jobs found` : `${(data.jobs || []).length} jobs near you`}
          {isFetching && ' · Updating...'}
        </p>
      )}

      {/* Job List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />)}
        </div>
      ) : (data?.jobs || []).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 24px', color: '#A08060' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <h3 style={{ color: '#2C2417', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No jobs found</h3>
          <p style={{ fontSize: 14 }}>Try changing your filters or search in a different area.</p>
          {user?.role === 'employer' && (
            <Link to="/jobs/post" style={{ display: 'inline-block', marginTop: 16, color: '#F4600C', fontWeight: 600, fontSize: 15 }}>
              Post the first job →
            </Link>
          )}
        </div>
      ) : (
        <AnimatePresence>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(data?.jobs || []).map((job, i) => (
              <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <JobCard job={job} />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Pagination */}
      {data?.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 28 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid #F0EAE0', background: 'white', color: page === 1 ? '#A08060' : '#2C2417', fontWeight: 600, fontSize: 14, cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
            ← Prev
          </button>
          {Array.from({ length: Math.min(5, data.pages) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              style={{ padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${page === p ? '#F4600C' : '#F0EAE0'}`, background: page === p ? '#F4600C' : 'white', color: page === p ? 'white' : '#2C2417', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              {p}
            </button>
          ))}
          <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages}
            style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid #F0EAE0', background: 'white', color: page === data.pages ? '#A08060' : '#2C2417', fontWeight: 600, fontSize: 14, cursor: page === data.pages ? 'not-allowed' : 'pointer' }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}