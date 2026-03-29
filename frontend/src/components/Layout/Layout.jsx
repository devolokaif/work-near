// ============================================================
// Layout Component (src/components/Layout/Layout.jsx)
// ============================================================

import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Home, Search, Briefcase, Bell, User, LogOut,
  MapPin, Wallet, Settings, Menu, X, PlusCircle
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useSocketStore } from '../../stores/socketStore';
import ToastContainer from '../UI/ToastContainer';

export default function Layout() {
  const { user, accessToken, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const { connect } = useSocketStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (accessToken) connect(accessToken);
  }, [accessToken]);

  const isWorker = user?.role === 'worker';
  const isEmployer = user?.role === 'employer';

  const navItems = [
    { to: '/home', icon: <Home size={22} />, label: 'Home' },
    { to: '/search', icon: <Search size={22} />, label: 'Explore' },
    { to: '/bookings', icon: <Briefcase size={22} />, label: 'Bookings' },
    { to: '/notifications', icon: <Bell size={22} />, label: 'Alerts', badge: unreadCount },
    { to: '/profile', icon: <User size={22} />, label: 'Profile' },
  ];

  const sidebarItems = [
    { to: '/home', icon: <Home size={18} />, label: 'Home' },
    { to: '/jobs', icon: <Search size={18} />, label: isWorker ? 'Find Jobs' : 'Browse Jobs' },
    { to: '/bookings', icon: <Briefcase size={18} />, label: 'Bookings' },
    { to: '/dashboard', icon: <Settings size={18} />, label: 'Dashboard' },
    { to: '/notifications', icon: <Bell size={18} />, label: 'Notifications' },
    { to: '/wallet', icon: <Wallet size={18} />, label: 'Wallet', show: isWorker },
    { to: '/payments', icon: <Wallet size={18} />, label: 'Payments' },
    { to: '/profile', icon: <User size={18} />, label: 'Profile' },
  ].filter(i => i.show !== false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FAF7F2' }}>
      {/* Desktop Sidebar */}
      <aside style={{
        width: 240, background: 'white', borderRight: '1px solid #F0EAE0',
        display: 'flex', flexDirection: 'column', position: 'fixed',
        top: 0, left: 0, height: '100vh', zIndex: 50,
        padding: '0 0 24px'
      }} className="hidden-mobile">

        {/* Logo */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F0EAE0' }}>
          <NavLink to="/home" style={{ fontFamily: 'DM Serif Display, serif', fontSize: 26, color: '#F4600C', textDecoration: 'none' }}>
            Work<span style={{ color: '#2C2417' }}>Near</span>
          </NavLink>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #F4600C, #FF9F6A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>
              {user?.full_name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#2C2417', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.full_name}</div>
              <div style={{ fontSize: 11, color: '#A08060', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          {sidebarItems.map(item => (
            <NavLink key={item.to} to={item.to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10, marginBottom: 2,
                color: isActive ? '#F4600C' : '#5C4A32',
                background: isActive ? 'rgba(244,96,12,0.08)' : 'transparent',
                fontWeight: isActive ? 600 : 500, fontSize: 14, textDecoration: 'none',
                transition: 'all 0.15s'
              })}>
              {item.icon}
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ marginLeft: 'auto', background: '#F4600C', color: 'white', borderRadius: 99, padding: '2px 7px', fontSize: 11, fontWeight: 700 }}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}

          {/* Post Job CTA for Employer */}
          {isEmployer && (
            <NavLink to="/jobs/post" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 10, background: '#F4600C', color: 'white', marginTop: 12, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
              <PlusCircle size={18} /> Post a Job
            </NavLink>
          )}
        </nav>

        {/* Logout */}
        <div style={{ padding: '0 12px' }}>
          <button onClick={() => { logout(); navigate('/'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 10, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, marginLeft: 240, minHeight: '100vh', display: 'flex', flexDirection: 'column' }} className="main-content">
        {/* Mobile Top Bar */}
        <header style={{
          background: 'white', borderBottom: '1px solid #F0EAE0',
          padding: '12px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 40
        }} className="mobile-header">
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2C2417', padding: 4 }}>
            <Menu size={24} />
          </button>
          <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 20, color: '#F4600C' }}>
            Work<span style={{ color: '#2C2417' }}>Near</span>
          </span>
          <NavLink to="/notifications" style={{ position: 'relative', color: '#5C4A32' }}>
            <Bell size={22} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, background: '#F4600C', color: 'white', borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unreadCount}
              </span>
            )}
          </NavLink>
        </header>

        {/* Page Content */}
        <div style={{ flex: 1, padding: '0 0 80px' }}>
          <Outlet />
        </div>

        {/* Mobile Bottom Navigation */}
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'white', borderTop: '1px solid #F0EAE0',
          display: 'flex', justifyContent: 'space-around', padding: '8px 0 12px',
          zIndex: 40
        }} className="bottom-nav">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to}
              style={({ isActive }) => ({
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, padding: '4px 12px', color: isActive ? '#F4600C' : '#A08060',
                textDecoration: 'none', fontSize: 11, fontWeight: 500, position: 'relative'
              })}>
              {item.icon}
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ position: 'absolute', top: 0, right: 8, background: '#F4600C', color: 'white', borderRadius: '50%', width: 14, height: 14, fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </main>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setSidebarOpen(false)} />
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 260, background: 'white', padding: '20px 16px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 24, color: '#F4600C' }}>Work<span style={{ color: '#2C2417' }}>Near</span></span>
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A08060' }}><X size={22} /></button>
            </div>
            {sidebarItems.map(item => (
              <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px',
                  borderRadius: 10, marginBottom: 2, color: isActive ? '#F4600C' : '#5C4A32',
                  background: isActive ? 'rgba(244,96,12,0.08)' : 'transparent',
                  fontWeight: isActive ? 600 : 500, fontSize: 15, textDecoration: 'none'
                })}>
                {item.icon}<span>{item.label}</span>
              </NavLink>
            ))}
            <button onClick={() => { logout(); navigate('/'); setSidebarOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 12px', borderRadius: 10, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: 15, marginTop: 8 }}>
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        </div>
      )}

      <ToastContainer />

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .main-content { margin-left: 0 !important; }
        }
        @media (min-width: 769px) {
          .mobile-header { display: none !important; }
          .bottom-nav { display: none !important; }
        }
      `}</style>
    </div>
  );
}