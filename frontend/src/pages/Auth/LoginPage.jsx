// ============================================================
// Auth Pages (src/pages/Auth/)
// ============================================================

// ─── LoginPage.jsx ───────────────────────────────────────────
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ArrowRight, ChevronLeft } from 'lucide-react';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const handleSendOTP = async () => {
    if (phone.length < 10) return setError('Enter a valid 10-digit phone number');
    setLoading(true); setError('');
    try {
      await authAPI.sendOTP(`+91${phone}`);
      setStep('otp');
      startCountdown();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const startCountdown = () => {
    setCountdown(30);
    const timer = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(timer); return 0; } return c - 1; });
    }, 1000);
  };

  const handleOTPChange = (value, idx) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[idx] = value.slice(-1);
    setOtp(next);
    if (value && idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus();
  };

  const handleVerify = async () => {
    const otpStr = otp.join('');
    if (otpStr.length < 6) return setError('Enter complete OTP');
    setLoading(true); setError('');
    try {
      const result = await login(`+91${phone}`, otpStr);
      if (result.exists) {
        navigate('/dashboard');
      } else {
        navigate(`/register?token=${result.token}&phone=${phone}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link to="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: 32, color: '#F4600C', textDecoration: 'none' }}>
            Work<span style={{ color: '#2C2417' }}>Near</span>
          </Link>
          <p style={{ color: '#A08060', marginTop: 8, fontSize: 15 }}>Sign in to your account</p>
        </div>

        <motion.div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 4px 24px rgba(44,36,23,0.08)', border: '1px solid #F0EAE0' }}>
          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.div key="phone" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <h2 style={{ fontWeight: 700, fontSize: 22, color: '#2C2417', marginBottom: 6 }}>Enter your number</h2>
                <p style={{ color: '#A08060', fontSize: 14, marginBottom: 24 }}>We'll send a 6-digit OTP to verify</p>

                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#5C4A32', marginBottom: 8 }}>Mobile Number</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <div style={{ background: '#FAF7F2', border: '1.5px solid #F0EAE0', borderRadius: 8, padding: '12px 16px', fontWeight: 600, color: '#5C4A32', whiteSpace: 'nowrap', fontSize: 15 }}>+91</div>
                  <input
                    className="input"
                    type="tel"
                    maxLength={10}
                    placeholder="98765 43210"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                    autoFocus
                  />
                </div>

                {error && <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{error}</p>}

                <button className="btn-primary" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }} onClick={handleSendOTP} disabled={loading}>
                  {loading ? 'Sending...' : <><span>Send OTP</span> <ArrowRight size={18} /></>}
                </button>
              </motion.div>
            ) : (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <button onClick={() => setStep('phone')} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#A08060', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, marginBottom: 20, padding: 0 }}>
                  <ChevronLeft size={16} /> Back
                </button>
                <h2 style={{ fontWeight: 700, fontSize: 22, color: '#2C2417', marginBottom: 6 }}>Enter OTP</h2>
                <p style={{ color: '#A08060', fontSize: 14, marginBottom: 28 }}>Sent to +91 {phone}</p>

                <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                  {otp.map((digit, i) => (
                    <input
                      key={i} id={`otp-${i}`}
                      type="tel" maxLength={1}
                      value={digit}
                      onChange={e => handleOTPChange(e.target.value, i)}
                      onKeyDown={e => {
                        if (e.key === 'Backspace' && !digit && i > 0) document.getElementById(`otp-${i - 1}`)?.focus();
                      }}
                      style={{ width: 48, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 700, border: `2px solid ${digit ? '#F4600C' : '#F0EAE0'}`, borderRadius: 10, outline: 'none', background: digit ? 'rgba(244,96,12,0.05)' : 'white', color: '#2C2417', transition: 'border-color 0.15s' }}
                    />
                  ))}
                </div>

                {error && <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{error}</p>}

                <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }} onClick={handleVerify} disabled={loading || otp.join('').length < 6}>
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </button>

                {countdown > 0 ? (
                  <p style={{ textAlign: 'center', color: '#A08060', fontSize: 14 }}>Resend OTP in {countdown}s</p>
                ) : (
                  <button onClick={handleSendOTP} style={{ display: 'block', width: '100%', textAlign: 'center', color: '#F4600C', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                    Resend OTP
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <p style={{ textAlign: 'center', color: '#A08060', fontSize: 14, marginTop: 20 }}>
          New to WorkNear? <Link to="/register" style={{ color: '#F4600C', fontWeight: 600, textDecoration: 'none' }}>Create account</Link>
        </p>
      </div>
    </div>
  );
}
