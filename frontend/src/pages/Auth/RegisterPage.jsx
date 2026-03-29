import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, HardHat, ChevronRight, User, Phone, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const {
    requestRegisterOtp,
    register,
    isLoading,
  } = useAuthStore();

  const [step, setStep] = useState('details'); // 'details' | 'otp'
  const [form, setForm] = useState({
    full_name: '',
    role: params.get('role') || '',
    phone: params.get('phone') || '',
    otp: '',
  });

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSendOtp = async () => {
    setError('');
    setMessage('');

    if (!form.full_name.trim()) return setError('Enter your full name');
    if (!form.role) return setError('Select your role');
    if (!form.phone.trim()) return setError('Enter your phone number');

    try {
      await requestRegisterOtp({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        role: form.role,
      });

      setStep('otp');
      setMessage('OTP sent to your phone number.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    }
  };

  const handleVerifyAndRegister = async () => {
    setError('');
    setMessage('');

    if (!form.otp.trim()) return setError('Enter the OTP');

    try {
      await register({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        role: form.role,
        otp: form.otp.trim(),
      });

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  const handlePrimaryAction = () => {
    if (step === 'details') return handleSendOtp();
    return handleVerifyAndRegister();
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FAF7F2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link
            to="/"
            style={{
              fontFamily: 'DM Serif Display, serif',
              fontSize: 32,
              color: '#F4600C',
              textDecoration: 'none',
            }}
          >
            Work<span style={{ color: '#2C2417' }}>Near</span>
          </Link>
          <p style={{ color: '#A08060', marginTop: 8, fontSize: 15 }}>
            Create your account
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'white',
            borderRadius: 20,
            padding: 32,
            boxShadow: '0 4px 24px rgba(44,36,23,0.08)',
            border: '1px solid #F0EAE0',
          }}
        >
          <h2
            style={{
              fontWeight: 700,
              fontSize: 22,
              color: '#2C2417',
              marginBottom: 8,
            }}
          >
            Tell us about yourself
          </h2>

          <p style={{ color: '#A08060', fontSize: 13, marginBottom: 24 }}>
            {step === 'details'
              ? 'Enter your details to receive an OTP.'
              : 'Enter the OTP sent to your phone to complete registration.'}
          </p>

          {/* Role Selection */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#5C4A32',
                marginBottom: 10,
              }}
            >
              I want to...
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                {
                  value: 'employer',
                  icon: <Briefcase size={24} />,
                  label: 'Hire Workers',
                  sub: 'Post jobs & find workers',
                },
                {
                  value: 'worker',
                  icon: <HardHat size={24} />,
                  label: 'Find Work',
                  sub: 'Apply for daily wage jobs',
                },
              ].map((r) => (
                <button
                  key={r.value}
                  onClick={() => setForm((f) => ({ ...f, role: r.value }))}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    border: `2px solid ${form.role === r.value ? '#F4600C' : '#F0EAE0'}`,
                    background: form.role === r.value ? 'rgba(244,96,12,0.05)' : 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <div
                    style={{
                      color: form.role === r.value ? '#F4600C' : '#A08060',
                      marginBottom: 8,
                    }}
                  >
                    {r.icon}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#2C2417' }}>
                    {r.label}
                  </div>
                  <div style={{ fontSize: 12, color: '#A08060', marginTop: 2 }}>
                    {r.sub}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#5C4A32',
                marginBottom: 8,
              }}
            >
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <User
                size={16}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#A08060',
                }}
              />
              <input
                className="input"
                style={{ paddingLeft: 40 }}
                placeholder="Your Name"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                disabled={step === 'otp'}
              />
            </div>
          </div>

          {/* Phone */}
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#5C4A32',
                marginBottom: 8,
              }}
            >
              Phone No.
            </label>
            <div style={{ position: 'relative' }}>
              <Phone
                size={16}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#A08060',
                }}
              />
              <input
                className="input"
                style={{ paddingLeft: 40 }}
                placeholder="Your Phone No."
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                disabled={step === 'otp'}
              />
            </div>
          </div>

          {/* OTP */}
          {step === 'otp' && (
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#5C4A32',
                  marginBottom: 8,
                }}
              >
                OTP
              </label>
              <div style={{ position: 'relative' }}>
                <ShieldCheck
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#A08060',
                  }}
                />
                <input
                  className="input"
                  style={{ paddingLeft: 40 }}
                  placeholder="Enter OTP"
                  value={form.otp}
                  onChange={(e) => setForm((f) => ({ ...f, otp: e.target.value }))}
                />
              </div>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isLoading}
                style={{
                  marginTop: 10,
                  border: 'none',
                  background: 'transparent',
                  color: '#F4600C',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Resend OTP
              </button>
            </div>
          )}

          {message && (
            <p style={{ color: '#166534', fontSize: 13, marginBottom: 12 }}>
              {message}
            </p>
          )}

          {error && (
            <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>
              {error}
            </p>
          )}

          <button
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            onClick={handlePrimaryAction}
            disabled={isLoading}
          >
            {isLoading ? (
              step === 'details' ? 'Sending OTP...' : 'Verifying...'
            ) : step === 'details' ? (
              <>
                <span>Send OTP</span>
                <ChevronRight size={18} />
              </>
            ) : (
              <>
                <span>Verify & Register</span>
                <ChevronRight size={18} />
              </>
            )}
          </button>

          <p
            style={{
              textAlign: 'center',
              color: '#A08060',
              fontSize: 12,
              marginTop: 16,
              lineHeight: 1.6,
            }}
          >
            By continuing, you agree to WorkNear's Terms of Service and Privacy Policy.
          </p>
        </motion.div>

        <p style={{ textAlign: 'center', color: '#A08060', fontSize: 14, marginTop: 20 }}>
          Already have an account?{' '}
          <Link
            to="/login"
            style={{ color: '#F4600C', fontWeight: 600, textDecoration: 'none' }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}