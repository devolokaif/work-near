// ============================================================
// Worker Dashboard (src/pages/Dashboard/WorkerDashboard.jsx)
// ============================================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, Star, Briefcase, TrendingUp, ToggleLeft, ToggleRight, IndianRupee, Clock, MapPin } from 'lucide-react';
import { usersAPI, walletAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useSocketStore } from '../../stores/socketStore';
import { format } from 'date-fns';

export default function WorkerDashboard() {
  const { user, updateUser } = useAuthStore();
  const { emit } = useSocketStore();
  const qc = useQueryClient();
  const [available, setAvailable] = useState(user?.worker_profile?.is_available ?? true);

  const { data: profile } = useQuery({
    queryKey: ['worker-profile'],
    queryFn: () => usersAPI.me().then(r => r.data)
  });

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => walletAPI.balance().then(r => r.data)
  });

  const toggleMutation = useMutation({
    mutationFn: (val) => usersAPI.updateAvailability(val),
    onSuccess: (_, val) => {
      setAvailable(val);
      emit('availability:set', { is_available: val });
    }
  });

  const stats = [
    { label: 'Total Earned', value: `₹${Number(user?.total_earnings || 0).toLocaleString('en-IN')}`, icon: <IndianRupee size={20} />, color: '#1A7A4C' },
    { label: 'Rating', value: `${Number(user?.rating || 0).toFixed(1)} ★`, icon: <Star size={20} />, color: '#D97706' },
    { label: 'Total Jobs', value: user?.total_reviews || 0, icon: <Briefcase size={20} />, color: '#1D4ED8' },
    { label: 'Wallet', value: `₹${Number(wallet?.balance || 0).toLocaleString('en-IN')}`, icon: <Wallet size={20} />, color: '#F4600C' },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, color: '#2C2417', margin: 0 }}>My Dashboard</h1>
        {/* Availability Toggle */}
        <button onClick={() => toggleMutation.mutate(!available)} disabled={toggleMutation.isPending}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: available ? '#D1FAE5' : '#F0EAE0', border: 'none', cursor: 'pointer', color: available ? '#1A7A4C' : '#A08060', fontWeight: 600, fontSize: 14, transition: 'all 0.2s' }}>
          {available ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
          {available ? 'Available' : 'Unavailable'}
        </button>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 28 }}>
        {stats.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <span style={{ color: '#A08060', fontSize: 13 }}>{s.label}</span>
              <div style={{ color: s.color }}>{s.icon}</div>
            </div>
            <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 26, color: '#2C2417' }}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Skills section */}
      <section className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontWeight: 700, fontSize: 17, color: '#2C2417', margin: 0 }}>My Skills</h2>
          <Link to="/profile" style={{ color: '#F4600C', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Edit →</Link>
        </div>
        {(profile?.worker_profile?.skills || []).length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#A08060' }}>
            <p style={{ fontSize: 14 }}>No skills added yet.</p>
            <Link to="/profile" style={{ color: '#F4600C', fontWeight: 600, fontSize: 14 }}>Add skills to get more jobs</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(profile?.worker_profile?.skills || []).map((s, i) => (
              <span key={i} style={{ background: 'rgba(244,96,12,0.08)', color: '#F4600C', borderRadius: 8, padding: '6px 14px', fontSize: 14, fontWeight: 600 }}>{s.name}</span>
            ))}
          </div>
        )}
      </section>

      {/* Wallet section */}
      <section className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontWeight: 700, fontSize: 17, color: '#2C2417', margin: 0 }}>Wallet</h2>
          <Link to="/wallet" style={{ color: '#F4600C', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>View all →</Link>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#A08060', fontSize: 13, marginBottom: 4 }}>Available Balance</div>
            <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 32, color: '#1A7A4C' }}>
              ₹{Number(wallet?.balance || 0).toLocaleString('en-IN')}
            </div>
            {wallet?.locked > 0 && (
              <div style={{ fontSize: 12, color: '#D97706', marginTop: 4 }}>₹{wallet.locked} pending</div>
            )}
          </div>
          <Link to="/wallet" style={{ background: '#1A7A4C', color: 'white', borderRadius: 10, padding: '12px 20px', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
            Withdraw
          </Link>
        </div>
      </section>

      {/* Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Link to="/jobs" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: 18, textAlign: 'center' }}>
            <Briefcase size={28} color="#F4600C" style={{ marginBottom: 8 }} />
            <div style={{ fontWeight: 600, color: '#2C2417', fontSize: 14 }}>Find Jobs</div>
          </div>
        </Link>
        <Link to="/bookings" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: 18, textAlign: 'center' }}>
            <Clock size={28} color="#1D4ED8" style={{ marginBottom: 8 }} />
            <div style={{ fontWeight: 600, color: '#2C2417', fontSize: 14 }}>My Bookings</div>
          </div>
        </Link>
      </div>
    </div>
  );
}


