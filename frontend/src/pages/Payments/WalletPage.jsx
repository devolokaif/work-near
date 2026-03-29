// ============================================================
// Wallet Page (src/pages/Payments/WalletPage.jsx)
// ============================================================

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { IndianRupee, ArrowDownLeft, ArrowUpRight, Clock } from 'lucide-react';
import { walletAPI, paymentsAPI } from '../../services/api';
import { useNotificationStore } from '../../stores/notificationStore';
import { format } from 'date-fns';

function WalletPage() {
  const { addToast } = useNotificationStore();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);

  const { data: wallet, refetch } = useQuery({
    queryKey: ['wallet-data'],
    queryFn: () => walletAPI.balance().then(r => r.data)
  });

  const { data: txns } = useQuery({
    queryKey: ['wallet-txns'],
    queryFn: () => walletAPI.transactions().then(r => r.data)
  });

  const withdrawMutation = useMutation({
    mutationFn: (amount) => paymentsAPI.requestPayout(amount).then(r => r.data),
    onSuccess: (data) => {
      addToast({ type: 'success', title: 'Withdrawal Requested', message: data.message });
      setShowWithdraw(false);
      setWithdrawAmount('');
      refetch();
    },
    onError: (err) => addToast({ type: 'error', message: err.response?.data?.error || 'Withdrawal failed' })
  });

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 20px' }}>
      <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, color: '#2C2417', marginBottom: 24 }}>My Wallet</h1>

      {/* Balance Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: 'linear-gradient(135deg, #2C2417, #5C4A32)', borderRadius: 20, padding: 28, marginBottom: 20, color: 'white' }}>
        <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 8 }}>Available Balance</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <IndianRupee size={28} />
          <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 44 }}>
            {Number(wallet?.balance || 0).toLocaleString('en-IN')}
          </span>
        </div>
        {wallet?.locked > 0 && (
          <p style={{ fontSize: 13, opacity: 0.6 }}>₹{Number(wallet.locked).toLocaleString('en-IN')} pending</p>
        )}
        <button onClick={() => setShowWithdraw(true)}
          style={{ marginTop: 18, background: '#F4600C', border: 'none', borderRadius: 10, padding: '12px 24px', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          Withdraw Funds
        </button>
      </motion.div>

      {/* Withdraw Form */}
      {showWithdraw && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, color: '#2C2417', marginBottom: 14 }}>Request Withdrawal</h3>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5C4A32', marginBottom: 6 }}>Amount (₹)</label>
            <div style={{ position: 'relative' }}>
              <IndianRupee size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#A08060' }} />
              <input className="input" style={{ paddingLeft: 30 }} type="number" min="100"
                max={wallet?.balance} placeholder="Minimum ₹100"
                value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[500, 1000, 2000, 5000].map(amt => (
              <button key={amt} onClick={() => setWithdrawAmount(String(Math.min(amt, wallet?.balance || 0)))}
                style={{ flex: 1, padding: '7px', borderRadius: 8, border: '1.5px solid #F0EAE0', background: 'white', color: '#5C4A32', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                ₹{amt}
              </button>
            ))}
          </div>
          <p style={{ color: '#A08060', fontSize: 12, margin: '10px 0 14px' }}>Funds credited within 24 hours via UPI/Bank</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowWithdraw(false)} className="btn-ghost"
              style={{ flex: 1, border: '1.5px solid #F0EAE0', borderRadius: 8 }}>Cancel</button>
            <button className="btn-primary" style={{ flex: 2, justifyContent: 'center' }}
              onClick={() => withdrawMutation.mutate(Number(withdrawAmount))}
              disabled={withdrawMutation.isPending || !withdrawAmount}>
              {withdrawMutation.isPending ? 'Processing...' : 'Withdraw'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Transactions */}
      <h2 style={{ fontWeight: 700, fontSize: 17, color: '#2C2417', marginBottom: 14 }}>Transactions</h2>
      {(txns || []).length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#A08060' }}>
          <IndianRupee size={36} style={{ opacity: 0.2, marginBottom: 10 }} />
          <p>No transactions yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(txns || []).map((txn, i) => (
            <div key={txn.id || i} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: txn.type === 'credit' ? '#D1FAE5' : '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {txn.type === 'credit' ? <ArrowDownLeft size={18} color="#1A7A4C" /> : <ArrowUpRight size={18} color="#DC2626" />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#2C2417' }}>{txn.note || txn.type}</div>
                <div style={{ fontSize: 12, color: '#A08060' }}>
                  {txn.created_at && format(new Date(txn.created_at), 'dd MMM yyyy, h:mm a')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: txn.type === 'credit' ? '#1A7A4C' : '#DC2626' }}>
                  {txn.type === 'credit' ? '+' : '−'} ₹{Number(txn.amount).toLocaleString('en-IN')}
                </div>
                {txn.balance_after !== null && (
                  <div style={{ fontSize: 11, color: '#A08060' }}>Bal: ₹{Number(txn.balance_after).toLocaleString('en-IN')}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default WalletPage;
/* ─────────────────────────────────────────────────────────── */
