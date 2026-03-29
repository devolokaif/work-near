// ============================================================
// Search Page (src/pages/Search/SearchPage.jsx)
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, X, MapPin } from 'lucide-react';
import { jobsAPI, categoriesAPI } from '../../services/api';
import JobCard from '../../components/Jobs/JobCard';
import { WorkerCard } from '../../components/Workers/WorkerCard';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [type, setType] = useState('jobs');
  const [location, setLocation] = useState(null);
  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(pos => {
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  }, []);

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery, type, location],
    queryFn: async () => {
      if (!debouncedQuery && !location) return { jobs: [], workers: [] };
      if (type === 'jobs') {
        if (location && !debouncedQuery) {
          const res = await jobsAPI.nearby(location.lat, location.lng, { limit: 15 });
          return { jobs: res.data.jobs };
        }
        const res = await jobsAPI.list({ city: debouncedQuery, limit: 15, status: 'open' });
        return { jobs: res.data.jobs };
      }
      // Workers search (basic — filter by skills/city via jobs nearby)
      return { jobs: [], workers: [] };
    },
    enabled: debouncedQuery.length > 1 || !!location
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.list().then(r => r.data)
  });

  const items = type === 'jobs' ? (results?.jobs || []) : (results?.workers || []);
  const hasQuery = debouncedQuery.length > 1;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 20px 80px' }}>
      <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, color: '#2C2417', marginBottom: 20 }}>Search</h1>

      {/* Type toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, background: '#F0EAE0', borderRadius: 10, padding: 4 }}>
        {['jobs', 'workers'].map(t => (
          <button key={t} onClick={() => setType(t)}
            style={{ flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, background: type === t ? 'white' : 'transparent', color: type === t ? '#2C2417' : '#A08060', boxShadow: type === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s', textTransform: 'capitalize' }}>
            {t === 'jobs' ? '🔎 Jobs' : '👷 Workers'}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#A08060' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={type === 'jobs' ? 'Search by city, job type...' : 'Search workers by skill...'}
          autoFocus
          style={{ width: '100%', padding: '13px 44px 13px 44px', borderRadius: 12, border: '1.5px solid #F0EAE0', fontSize: 16, background: 'white', color: '#2C2417', outline: 'none', boxShadow: '0 2px 8px rgba(44,36,23,0.05)' }}
        />
        {query && (
          <button onClick={() => setQuery('')}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#A08060', padding: 4 }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Category chips (when no query) */}
      {!hasQuery && !location && (
        <div>
          <p style={{ color: '#A08060', fontSize: 14, marginBottom: 14 }}>Browse by skill category</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
            {(categories || []).map((cat, i) => (
              <motion.button key={cat.id} whileTap={{ scale: 0.96 }}
                onClick={() => setQuery(cat.name)}
                style={{ padding: '12px 8px', borderRadius: 12, border: '1.5px solid #F0EAE0', background: 'white', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
                <div style={{ fontSize: 26, marginBottom: 5 }}>{cat.icon_url || '🔧'}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#5C4A32' }}>{cat.name}</div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Nearby when no query but has location */}
      {!hasQuery && location && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1A7A4C', fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
          <MapPin size={14} /> Showing jobs near you
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 12 }} />)}
        </div>
      ) : items.length > 0 ? (
        <div>
          <p style={{ color: '#A08060', fontSize: 13, marginBottom: 14 }}>
            {items.length} {type} {hasQuery ? `for "${debouncedQuery}"` : 'near you'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((item, i) => (
              <motion.div key={item.id || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                {type === 'jobs'
                  ? <JobCard job={item} />
                  : <WorkerCard worker={item} />
                }
              </motion.div>
            ))}
          </div>
        </div>
      ) : hasQuery ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: '#A08060' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <h3 style={{ color: '#2C2417', fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>No results found</h3>
          <p style={{ fontSize: 14, margin: 0 }}>Try a different search term or browse by category above.</p>
        </div>
      ) : null}
    </div>
  );
}