// ============================================================
// Payments Page (src/pages/Payments/PaymentsPage.jsx)
// ============================================================

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { IndianRupee, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, Wallet } from 'lucide-react';
import { paymentsAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { format } from 'date-fns';

function loadRazorpay() {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function initiatePayment(bookingId, userName, userPhone) {
  const loaded = await loadRazorpay();
  if (!loaded) throw new Error('Razorpay SDK failed to load');

  // Create order on backend
  const { data: orderData } = await paymentsAPI.createOrder(bookingId);

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: orderData.key,
      amount: orderData.amount * 100,
      currency: orderData.currency,
      order_id: orderData.order_id,
      name: 'WorkNear',
      description: 'Job Payment',
      image: '/logo.png',
      prefill: { name: userName, contact: userPhone },
      theme: { color: '#F4600C' },
      handler: async (response) => {
        try {
          const result = await paymentsAPI.verify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
          resolve(result.data);
        } catch (err) {
          reject(err);
        }
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) }
    });
    rzp.open();
  });
}

export default function PaymentsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('history');

  const { data: history, isLoading } = useQuery({
    queryKey: ['payment-history'],
    queryFn: () => paymentsAPI.history().then(r => r.data)
  });

  const { data: walletData } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => paymentsAPI.createOrder && fetch('/api/v1/payments/wallet').then(r => r.json())
  });

  const statusIcon = {
    completed: <CheckCircle size={16} color="#1A7A4C" />,
    pending: <Clock size={16} color="#D97706" />,
    failed: <XCircle size={16} color="#DC2626" />,
    refunded: <ArrowDownLeft size={16} color="#1D4ED8" />
  };

  const statusBadge = {
    completed: 'badge-green',
    pending: 'badge-amber',
    failed: 'badge-red',
    refunded: 'badge-blue'
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 20px' }}>
      <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, color: '#2C2417', marginBottom: 24 }}>Payments</h1>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ color: '#A08060', fontSize: 13, marginBottom: 8 }}>
            {user?.role === 'worker' ? 'Total Earned' : 'Total Spent'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'DM Serif Display, serif', fontSize: 28, color: '#2C2417' }}>
            <IndianRupee size={22} />
            {Number(user?.role === 'worker' ? user?.total_earnings : user?.total_spent || 0).toLocaleString('en-IN')}
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ color: '#A08060', fontSize: 13, marginBottom: 8 }}>Platform Fee</div>
          <div style={{ fontSize: 13, color: '#5C4A32', lineHeight: 1.7 }}>
            <div>12% + GST on each job</div>
            <div style={{ color: '#A08060', fontSize: 11, marginTop: 4 }}>Workers receive 100% of agreed amount</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: '#F0EAE0', borderRadius: 10, padding: 4 }}>
        {['history', 'methods'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, background: activeTab === tab ? 'white' : 'transparent', color: activeTab === tab ? '#2C2417' : '#A08060', boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s', textTransform: 'capitalize' }}>
            {tab === 'history' ? 'Transaction History' : 'Payment Methods'}
          </button>
        ))}
      </div>

      {activeTab === 'history' && (
        <div>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
            </div>
          ) : (history || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#A08060' }}>
              <IndianRupee size={48} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p style={{ fontSize: 16, fontWeight: 600, color: '#2C2417' }}>No transactions yet</p>
              <p style={{ fontSize: 14 }}>Complete a job to see payment history</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(history || []).map((payment, i) => (
                <motion.div key={payment.id || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="card" style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: payment.payer_id === user?.id ? '#FEE2E2' : '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {payment.payer_id === user?.id
                          ? <ArrowUpRight size={20} color="#DC2626" />
                          : <ArrowDownLeft size={20} color="#1A7A4C" />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#2C2417', marginBottom: 2 }}>
                          {payment.job_title || 'Job Payment'}
                        </div>
                        <div style={{ fontSize: 12, color: '#A08060' }}>
                          {payment.payer_id === user?.id ? `To ${payment.payee_name}` : `From ${payment.payer_name}`}
                        </div>
                        <div style={{ fontSize: 11, color: '#A08060', marginTop: 2 }}>
                          {payment.created_at && format(new Date(payment.created_at), 'dd MMM yyyy, h:mm a')}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: payment.payer_id === user?.id ? '#DC2626' : '#1A7A4C' }}>
                        {payment.payer_id === user?.id ? '−' : '+'} ₹{Number(payment.payer_id === user?.id ? payment.amount : payment.worker_payout).toLocaleString('en-IN')}
                      </div>
                      <span className={`badge ${statusBadge[payment.status] || 'badge-stone'}`} style={{ marginTop: 4 }}>
                        {statusIcon[payment.status]} {payment.status}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'methods' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { icon: '📱', name: 'UPI', desc: 'Pay via any UPI app (GPay, PhonePe, Paytm)', enabled: true },
            { icon: '💳', name: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay', enabled: true },
            { icon: '🏦', name: 'Net Banking', desc: 'All major banks supported', enabled: true },
            { icon: '👜', name: 'Wallets', desc: 'Paytm, PhonePe, Amazon Pay', enabled: true },
            { icon: '💵', name: 'Cash', desc: 'Pay worker directly in cash', enabled: true },
          ].map((m, i) => (
            <div key={i} className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 28 }}>{m.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#2C2417' }}>{m.name}</div>
                <div style={{ fontSize: 13, color: '#A08060' }}>{m.desc}</div>
              </div>
              <span className="badge badge-green">Available</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}