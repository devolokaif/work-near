// ============================================================
// Landing Page (src/pages/LandingPage.jsx)
// ============================================================

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Shield, Zap, Star, ChevronRight, Wrench, Paintbrush, Truck } from 'lucide-react';

const categories = [
  { icon: '🔧', name: 'Plumber' },
  { icon: '⚡', name: 'Electrician' },
  { icon: '🪚', name: 'Carpenter' },
  { icon: '🎨', name: 'Painter' },
  { icon: '🧹', name: 'Cleaner' },
  { icon: '🚗', name: 'Driver' },
  { icon: '👨‍🍳', name: 'Cook' },
  { icon: '🏗️', name: 'Mason' },
];

export default function LandingPage() {
  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', background: '#FAF7F2', minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{ background: 'white', borderBottom: '1px solid #F0EAE0', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 24, color: '#F4600C' }}>
          Work<span style={{ color: '#2C2417' }}>Near</span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link to="/login" style={{ color: '#5C4A32', fontWeight: 500, textDecoration: 'none', fontSize: 15 }}>Sign in</Link>
          <Link to="/register" className="btn-primary" style={{ padding: '8px 20px', borderRadius: 8, background: '#F4600C', color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '80px 24px 64px', maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(244,96,12,0.1)', color: '#F4600C', borderRadius: 99, padding: '6px 14px', fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
            <MapPin size={14} /> Location-based hiring
          </div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 52, lineHeight: 1.1, color: '#2C2417', marginBottom: 24 }}>
            Find skilled workers<br /><em style={{ color: '#F4600C' }}>near you,</em> instantly
          </h1>
          <p style={{ fontSize: 17, color: '#5C4A32', lineHeight: 1.7, marginBottom: 36, maxWidth: 480 }}>
            WorkNear connects employers with verified daily wage workers in your area. Plumbers, electricians, carpenters, and more — within minutes.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link to="/register?role=employer" style={{ background: '#F4600C', color: 'white', padding: '14px 28px', borderRadius: 10, fontWeight: 600, fontSize: 16, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Hire Workers <ChevronRight size={18} />
            </Link>
            <Link to="/register?role=worker" style={{ background: 'transparent', color: '#F4600C', border: '2px solid #F4600C', padding: '12px 26px', borderRadius: 10, fontWeight: 600, fontSize: 16, textDecoration: 'none' }}>
              Find Jobs
            </Link>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }}>
          {/* Hero illustration card */}
          <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 20px 60px rgba(44,36,23,0.12)', border: '1px solid #F0EAE0' }}>
            <div style={{ background: '#FAF7F2', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#A08060', marginBottom: 12 }}>Nearby Workers</div>
              {[
                { name: 'Ramesh K.', skill: 'Plumber', rating: 4.8, distance: '0.8 km', available: true },
                { name: 'Suresh P.', skill: 'Electrician', rating: 4.9, distance: '1.2 km', available: true },
                { name: 'Mohan L.', skill: 'Carpenter', rating: 4.7, distance: '2.1 km', available: false },
              ].map((w, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 2 ? '1px solid #F0EAE0' : 'none' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 99, background: `hsl(${i * 60 + 20}, 50%, 85%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#2C2417' }}>
                    {w.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#2C2417' }}>{w.name}</div>
                    <div style={{ fontSize: 12, color: '#A08060' }}>{w.skill} · {w.distance}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>★ {w.rating}</div>
                    <div style={{ fontSize: 11, color: w.available ? '#1A7A4C' : '#A08060', fontWeight: 600 }}>
                      {w.available ? '● Available' : '○ Busy'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button style={{ width: '100%', background: '#F4600C', color: 'white', border: 'none', borderRadius: 10, padding: 14, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
              Book a Worker Now
            </button>
          </div>
        </motion.div>
      </section>

      {/* Categories */}
      <section style={{ background: 'white', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 36, color: '#2C2417', textAlign: 'center', marginBottom: 8 }}>
            All types of skilled work
          </h2>
          <p style={{ textAlign: 'center', color: '#A08060', fontSize: 16, marginBottom: 40 }}>
            From repairs to renovation, find the right worker for any job
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {categories.map((c, i) => (
              <motion.div key={i} whileHover={{ y: -4 }} style={{ background: '#FAF7F2', borderRadius: 12, padding: 24, textAlign: 'center', cursor: 'pointer', border: '1px solid #F0EAE0', transition: 'all 0.2s' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>{c.icon}</div>
                <div style={{ fontWeight: 600, color: '#2C2417', fontSize: 15 }}>{c.name}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '64px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
          {[
            { icon: <Shield size={28} />, title: 'Verified Workers', desc: 'Every worker is background-verified with Aadhaar. Work with confidence.' },
            { icon: <MapPin size={28} />, title: 'Live Tracking', desc: 'Track worker location in real-time once they accept your job.' },
            { icon: <Zap size={28} />, title: 'Instant Matching', desc: 'Get matched with available workers near you in under 2 minutes.' }
          ].map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} style={{ background: 'white', borderRadius: 16, padding: 28, border: '1px solid #F0EAE0' }}>
              <div style={{ color: '#F4600C', marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, color: '#2C2417', fontSize: 18, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: '#A08060', fontSize: 14, lineHeight: 1.7 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#2C2417', color: '#A08060', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 20, color: '#F4600C', marginBottom: 8 }}>WorkNear</div>
        <p style={{ fontSize: 14 }}>© 2026 WorkNear. Connecting workers and employers across India.</p>
      </footer>
    </div>
  );
}