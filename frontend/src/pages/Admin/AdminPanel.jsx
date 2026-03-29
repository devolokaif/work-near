// ============================================================
// Admin Panel (src/pages/Admin/AdminPanel.jsx)
// ============================================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users, Briefcase, IndianRupee, TrendingUp, Shield,
  Search, ChevronDown, Check, Ban, Eye
} from 'lucide-react';
import api from '../../services/api';
import { useNotificationStore } from '../../stores/notificationStore';

const adminAPI = {
  stats: () => api.get('/admin/stats').then(r => r.data),
  users: (params) => api.get('/admin/users', { params }).then(r => r.data),
  updateStatus: (id, status) => api.patch(`/admin/users/${id}/status`, { status }).then(r => r.data),
  verifyUser: (id) => api.patch(`/admin/users/${id}/verify`).then(r => r.data),
  jobs: (params) => api.get('/admin/jobs', { params }).then(r => r.data),
  payments: (params) => api.get('/admin/payments', { params }).then(r => r.data),
};

function StatCard({ label, value, sub, icon, color }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#A08060', fontWeight: 500 }}>{label}</span>
        <div style={{ color }}>{icon}</div>
      </div>
      <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 30, color: '#2C2417', marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#A08060' }}>{sub}</div>}
    </motion.div>
  );
}

export default function AdminPanel() {
  const { addToast } = useNotificationStore();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userStatus, setUserStatus] = useState('');

  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: adminAPI.stats });

  const { data: usersData } = useQuery({
    queryKey: ['admin-users', userSearch, userRole, userStatus],
    queryFn: () => adminAPI.users({ search: userSearch, role: userRole, status: userStatus }),
    enabled: activeTab === 'users'
  });

  const { data: jobs } = useQuery({
    queryKey: ['admin-jobs'],
    queryFn: () => adminAPI.jobs({}),
    enabled: activeTab === 'jobs'
  });

  const { data: payments } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: () => adminAPI.payments({}),
    enabled: activeTab === 'payments'
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => adminAPI.updateStatus(id, status),
    onSuccess: () => { addToast({ type: 'success', title: 'User status updated' }); qc.invalidateQueries(['admin-users']); }
  });

  const verifyMutation = useMutation({
    mutationFn: (id) => adminAPI.verifyUser(id),
    onSuccess: () => { addToast({ type: 'success', title: 'User verified!' }); qc.invalidateQueries(['admin-users']); }
  });

  const tabs = ['overview', 'users', 'jobs', 'payments'];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Shield size={22} color="#F4600C" />
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, color: '#2C2417', margin: 0 }}>Admin Panel</h1>
        </div>
        <p style={{ color: '#A08060', fontSize: 14, margin: 0 }}>WorkNear platform management</p>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 28, background: '#F0EAE0', borderRadius: 12, padding: 4 }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ flex: 1, padding: '9px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, background: activeTab === tab ? 'white' : 'transparent', color: activeTab === tab ? '#2C2417' : '#A08060', boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s', textTransform: 'capitalize' }}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && stats && (
        <div>
          <h2 style={{ fontWeight: 700, fontSize: 18, color: '#2C2417', marginBottom: 16 }}>Platform Overview</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            <StatCard label="Total Users" value={Number(stats.users?.total || 0).toLocaleString()} sub={`+${stats.users?.new_today || 0} today`} icon={<Users size={20} />} color="#1D4ED8" />
            <StatCard label="Workers" value={Number(stats.users?.workers || 0).toLocaleString()} sub={`${stats.users?.suspended || 0} suspended`} icon={<Users size={20} />} color="#F4600C" />
            <StatCard label="Total Jobs" value={Number(stats.jobs?.total || 0).toLocaleString()} sub={`${stats.jobs?.active || 0} active`} icon={<Briefcase size={20} />} color="#1A7A4C" />
            <StatCard label="Platform Revenue" value={`₹${Number(stats.revenue?.total_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} sub={`₹${Number(stats.revenue?.revenue_30d || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} this month`} icon={<IndianRupee size={20} />} color="#D97706" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16, color: '#2C2417', marginBottom: 14 }}>Job Status Breakdown</h3>
              {[
                { label: 'Open', value: stats.jobs?.open || 0, color: '#1A7A4C' },
                { label: 'Active', value: stats.jobs?.active || 0, color: '#D97706' },
                { label: 'Completed', value: stats.jobs?.completed || 0, color: '#1D4ED8' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F0EAE0' }}>
                  <span style={{ color: '#5C4A32', fontSize: 14 }}>{s.label}</span>
                  <span style={{ fontWeight: 700, color: s.color, fontSize: 14 }}>{s.value}</span>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16, color: '#2C2417', marginBottom: 14 }}>Booking Stats</h3>
              {[
                { label: 'Total Bookings', value: stats.bookings?.total || 0, color: '#2C2417' },
                { label: 'Completed', value: stats.bookings?.completed || 0, color: '#1A7A4C' },
                { label: 'Cancelled', value: stats.bookings?.cancelled || 0, color: '#DC2626' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F0EAE0' }}>
                  <span style={{ color: '#5C4A32', fontSize: 14 }}>{s.label}</span>
                  <span style={{ fontWeight: 700, color: s.color, fontSize: 14 }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Users ── */}
      {activeTab === 'users' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#A08060' }} />
              <input className="input" style={{ paddingLeft: 36, fontSize: 14 }} placeholder="Search by name, phone..."
                value={userSearch} onChange={e => setUserSearch(e.target.value)} />
            </div>
            <select className="input" style={{ width: 'auto', fontSize: 14 }} value={userRole} onChange={e => setUserRole(e.target.value)}>
              <option value="">All Roles</option>
              <option value="worker">Workers</option>
              <option value="employer">Employers</option>
            </select>
            <select className="input" style={{ width: 'auto', fontSize: 14 }} value={userStatus} onChange={e => setUserStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending_verification">Pending</option>
            </select>
          </div>

          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #F0EAE0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FAF7F2' }}>
                  {['User', 'Role', 'Status', 'Rating', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#A08060', borderBottom: '1px solid #F0EAE0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(usersData?.users || []).map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #F0EAE0' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#2C2417' }}>{u.full_name}</div>
                      <div style={{ fontSize: 12, color: '#A08060' }}>{u.phone}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: u.role === 'worker' ? 'rgba(244,96,12,0.08)' : '#DBEAFE', color: u.role === 'worker' ? '#F4600C' : '#1D4ED8', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: u.status === 'active' ? '#D1FAE5' : u.status === 'suspended' ? '#FEE2E2' : '#FEF3C7', color: u.status === 'active' ? '#1A7A4C' : u.status === 'suspended' ? '#DC2626' : '#D97706', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#F59E0B', fontWeight: 600, fontSize: 14 }}>
                      {u.rating > 0 ? `★ ${Number(u.rating).toFixed(1)}` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#A08060' }}>
                      {u.created_at && new Date(u.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {!u.is_verified && (
                          <button onClick={() => verifyMutation.mutate(u.id)}
                            title="Verify" style={{ background: '#D1FAE5', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Check size={13} color="#1A7A4C" />
                          </button>
                        )}
                        {u.status !== 'suspended' ? (
                          <button onClick={() => statusMutation.mutate({ id: u.id, status: 'suspended' })}
                            title="Suspend" style={{ background: '#FEE2E2', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer' }}>
                            <Ban size={13} color="#DC2626" />
                          </button>
                        ) : (
                          <button onClick={() => statusMutation.mutate({ id: u.id, status: 'active' })}
                            title="Activate" style={{ background: '#D1FAE5', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer' }}>
                            <Check size={13} color="#1A7A4C" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!usersData?.users?.length && (
              <div style={{ padding: 32, textAlign: 'center', color: '#A08060', fontSize: 14 }}>No users found</div>
            )}
          </div>
        </div>
      )}

      {/* ── Jobs ── */}
      {activeTab === 'jobs' && (
        <div>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #F0EAE0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FAF7F2' }}>
                  {['Title', 'Category', 'Employer', 'Status', 'Budget', 'Apps', 'Posted'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#A08060', borderBottom: '1px solid #F0EAE0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(jobs || []).map((j, i) => (
                  <tr key={j.id} style={{ borderBottom: '1px solid #F0EAE0' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#2C2417', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</div>
                      {j.is_urgent && <span style={{ fontSize: 10, color: '#DC2626', fontWeight: 700 }}>🚨 URGENT</span>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#5C4A32' }}>{j.category_name}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#5C4A32' }}>{j.employer_name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: j.status === 'open' ? '#D1FAE5' : j.status === 'in_progress' ? '#FEF3C7' : '#F0EAE0', color: j.status === 'open' ? '#1A7A4C' : j.status === 'in_progress' ? '#D97706' : '#5C4A32', borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
                        {j.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#1A7A4C', fontWeight: 600 }}>
                      {j.budget_max ? `₹${Number(j.budget_max).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#5C4A32' }}>{j.applications_count || 0}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#A08060' }}>
                      {j.created_at && new Date(j.created_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!(jobs || []).length && (
              <div style={{ padding: 32, textAlign: 'center', color: '#A08060', fontSize: 14 }}>No jobs found</div>
            )}
          </div>
        </div>
      )}

      {/* ── Payments ── */}
      {activeTab === 'payments' && (
        <div>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #F0EAE0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FAF7F2' }}>
                  {['Payer', 'Payee', 'Amount', 'Fee', 'Worker Payout', 'Status', 'Date'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#A08060', borderBottom: '1px solid #F0EAE0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(payments || []).map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F0EAE0' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#2C2417', fontWeight: 600 }}>{p.payer_name}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#5C4A32' }}>{p.payee_name}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#2C2417' }}>₹{Number(p.amount).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#D97706', fontWeight: 600 }}>₹{Number(p.platform_fee || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#1A7A4C', fontWeight: 600 }}>₹{Number(p.worker_payout || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: p.status === 'completed' ? '#D1FAE5' : p.status === 'failed' ? '#FEE2E2' : '#FEF3C7', color: p.status === 'completed' ? '#1A7A4C' : p.status === 'failed' ? '#DC2626' : '#D97706', borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 600 }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#A08060' }}>
                      {p.created_at && new Date(p.created_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!(payments || []).length && (
              <div style={{ padding: 32, textAlign: 'center', color: '#A08060', fontSize: 14 }}>No payments found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}