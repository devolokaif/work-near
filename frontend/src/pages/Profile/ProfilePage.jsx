// ============================================================
// Profile Page (src/pages/Profile/ProfilePage.jsx)
// ============================================================

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  User, Phone, Mail, Camera, Star, Briefcase, IndianRupee,
  MapPin, Save, Edit2, Shield, CreditCard, LogOut, ChevronRight
} from 'lucide-react';
import { usersAPI, categoriesAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuthStore();
  const { addToast } = useNotificationStore();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const photoRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    language: user?.language || 'hi'
  });
  const [workerForm, setWorkerForm] = useState({
    bio: '', hourly_rate: '', daily_rate: '', availability_radius: 10,
    upi_id: '', bank_account_number: '', bank_ifsc: ''
  });
  const [selectedSkills, setSelectedSkills] = useState([]);
  const isWorker = user?.role === 'worker';

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => usersAPI.me().then(r => {
      const d = r.data;
      if (d.worker_profile) {
        setWorkerForm(prev => ({ ...prev, ...d.worker_profile }));
        setSelectedSkills(d.worker_profile.skills?.map(s => s.category_id) || []);
      }
      return d;
    })
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.list().then(r => r.data),
    enabled: isWorker
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => usersAPI.update(data).then(r => r.data),
    onSuccess: (data) => {
      updateUser(data);
      addToast({ type: 'success', title: 'Profile Updated!' });
      setEditing(false);
    },
    onError: () => addToast({ type: 'error', message: 'Failed to update profile' })
  });

  const updateWorkerMutation = useMutation({
    mutationFn: (data) => usersAPI.updateWorkerProfile(data).then(r => r.data),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Worker profile updated!' });
      qc.invalidateQueries(['my-profile']);
    }
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: (file) => usersAPI.uploadPhoto(file).then(r => r.data),
    onSuccess: (data) => {
      updateUser({ profile_photo: data.url });
      addToast({ type: 'success', title: 'Photo updated!' });
    }
  });

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) uploadPhotoMutation.mutate(file);
  };

  const toggleSkill = (id) => {
    setSelectedSkills(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px 20px 100px' }}>
      <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, color: '#2C2417', marginBottom: 24 }}>My Profile</h1>

      {/* Avatar + basic info */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #F4600C33, #F4600C88)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: '#F4600C', overflow: 'hidden' }}>
              {user?.profile_photo
                ? <img src={user.profile_photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : user?.full_name?.[0]?.toUpperCase()}
            </div>
            <button onClick={() => photoRef.current?.click()}
              style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: '#F4600C', border: '2px solid white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Camera size={12} color="white" />
            </button>
            <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontWeight: 700, fontSize: 20, color: '#2C2417', margin: '0 0 4px' }}>{user?.full_name}</h2>
            <div style={{ fontSize: 13, color: '#A08060', textTransform: 'capitalize', marginBottom: 6 }}>{user?.role}</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {user?.rating > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#F59E0B', fontWeight: 600, fontSize: 13 }}>
                  <Star size={13} fill="#F59E0B" /> {Number(user.rating).toFixed(1)} ({user.total_reviews})
                </span>
              )}
              {user?.is_verified && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#1A7A4C', fontWeight: 600, fontSize: 13 }}>
                  <Shield size={13} /> Verified
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setEditing(!editing)}
            style={{ background: editing ? 'rgba(244,96,12,0.08)' : 'white', border: '1.5px solid #F0EAE0', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#F4600C', fontWeight: 600, fontSize: 13 }}>
            <Edit2 size={14} /> {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: editing ? 20 : 0 }}>
          {[
            { label: isWorker ? 'Earned' : 'Spent', value: `₹${Number(isWorker ? user?.total_earnings : user?.total_spent || 0).toLocaleString('en-IN')}`, icon: <IndianRupee size={16} /> },
            { label: 'Rating', value: user?.rating > 0 ? `${Number(user.rating).toFixed(1)} ★` : 'N/A', icon: <Star size={16} /> },
            { label: 'Jobs', value: user?.total_reviews || 0, icon: <Briefcase size={16} /> },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '12px 8px', background: '#FAF7F2', borderRadius: 10 }}>
              <div style={{ color: '#A08060', marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 18, color: '#2C2417' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#A08060', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Edit Form */}
        {editing && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5C4A32', marginBottom: 6 }}>Full Name</label>
                <input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5C4A32', marginBottom: 6 }}>Email</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5C4A32', marginBottom: 6 }}>Language</label>
                <select className="input" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="en">English</option>
                  <option value="mr">Marathi</option>
                  <option value="ta">Tamil</option>
                  <option value="te">Telugu</option>
                </select>
              </div>
              <button className="btn-primary" style={{ alignSelf: 'flex-start', padding: '10px 24px' }}
                onClick={() => updateProfileMutation.mutate(form)} disabled={updateProfileMutation.isPending}>
                <Save size={16} /> {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Worker Profile */}
      {isWorker && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, color: '#2C2417', marginBottom: 18 }}>Worker Profile</h3>

          {/* Skills */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5C4A32', marginBottom: 10 }}>My Skills</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(categories || []).map(cat => (
                <button key={cat.id} onClick={() => toggleSkill(cat.id)}
                  style={{ padding: '7px 14px', borderRadius: 99, border: `1.5px solid ${selectedSkills.includes(cat.id) ? '#F4600C' : '#F0EAE0'}`, background: selectedSkills.includes(cat.id) ? 'rgba(244,96,12,0.08)' : 'white', color: selectedSkills.includes(cat.id) ? '#F4600C' : '#5C4A32', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {cat.icon_url} {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5C4A32', marginBottom: 6 }}>Bio</label>
            <textarea className="input" style={{ height: 80, resize: 'none' }} placeholder="Describe your experience..."
              value={workerForm.bio} onChange={e => setWorkerForm(f => ({ ...f, bio: e.target.value }))} />
          </div>

          {/* Rates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5C4A32', marginBottom: 6 }}>Hourly Rate (₹)</label>
              <input className="input" type="number" placeholder="200" value={workerForm.hourly_rate}
                onChange={e => setWorkerForm(f => ({ ...f, hourly_rate: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5C4A32', marginBottom: 6 }}>Daily Rate (₹)</label>
              <input className="input" type="number" placeholder="1200" value={workerForm.daily_rate}
                onChange={e => setWorkerForm(f => ({ ...f, daily_rate: e.target.value }))} />
            </div>
          </div>

          {/* Work radius */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5C4A32', marginBottom: 6 }}>
              Work Radius: {workerForm.availability_radius} km
            </label>
            <input type="range" min={1} max={50} value={workerForm.availability_radius}
              onChange={e => setWorkerForm(f => ({ ...f, availability_radius: parseInt(e.target.value) }))}
              style={{ width: '100%', accentColor: '#F4600C' }} />
          </div>

          {/* Bank / UPI */}
          <h4 style={{ fontWeight: 700, fontSize: 14, color: '#2C2417', marginBottom: 10 }}>Payment Details</h4>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5C4A32', marginBottom: 6 }}>UPI ID</label>
            <input className="input" placeholder="name@upi" value={workerForm.upi_id}
              onChange={e => setWorkerForm(f => ({ ...f, upi_id: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5C4A32', marginBottom: 6 }}>Bank Account No.</label>
              <input className="input" type="password" placeholder="••••••••••" value={workerForm.bank_account_number}
                onChange={e => setWorkerForm(f => ({ ...f, bank_account_number: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5C4A32', marginBottom: 6 }}>IFSC Code</label>
              <input className="input" placeholder="SBIN0001234" value={workerForm.bank_ifsc}
                onChange={e => setWorkerForm(f => ({ ...f, bank_ifsc: e.target.value }))} />
            </div>
          </div>

          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => updateWorkerMutation.mutate({ ...workerForm, skills: selectedSkills })}
            disabled={updateWorkerMutation.isPending}>
            <Save size={16} /> {updateWorkerMutation.isPending ? 'Saving...' : 'Save Worker Profile'}
          </button>
        </div>
      )}

      {/* Account Links */}
      <div className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
        {[
          { label: 'Payment History', to: '/payments', icon: <CreditCard size={16} /> },
          isWorker && { label: 'My Wallet', to: '/wallet', icon: <IndianRupee size={16} /> },
          { label: 'Notifications', to: '/notifications', icon: <Shield size={16} /> },
        ].filter(Boolean).map((item, i, arr) => (
          <a key={item.to} href={item.to}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: i < arr.length - 1 ? '1px solid #F0EAE0' : 'none', color: '#2C2417', textDecoration: 'none', fontWeight: 500, fontSize: 15 }}>
            <span style={{ color: '#A08060' }}>{item.icon}</span>
            {item.label}
            <ChevronRight size={16} style={{ marginLeft: 'auto', color: '#A08060' }} />
          </a>
        ))}
      </div>

      {/* Logout */}
      <button onClick={() => { logout(); navigate('/'); }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px', borderRadius: 12, border: '1.5px solid #FEE2E2', background: 'white', color: '#DC2626', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
        <LogOut size={18} /> Sign Out
      </button>
    </div>
  );
}