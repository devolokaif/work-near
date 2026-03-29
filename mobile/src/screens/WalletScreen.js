// ============================================================
// React Native — WalletScreen.js
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { walletAPI, paymentsAPI } from '../services/api';
import { useNotificationStore } from '../stores/authStore';

export function WalletScreen() {
  const qc = useQueryClient();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => walletAPI.balance().then(r => r.data)
  });

  const { data: transactions } = useQuery({
    queryKey: ['wallet-txns'],
    queryFn: () => walletAPI.transactions().then(r => r.data)
  });

  const withdrawMutation = useMutation({
    mutationFn: (amount) => paymentsAPI.requestPayout(amount).then(r => r.data),
    onSuccess: (data) => {
      Alert.alert('Withdrawal Requested', data.message);
      setShowWithdraw(false);
      setWithdrawAmount('');
      qc.invalidateQueries(['wallet']);
    },
    onError: (err) => Alert.alert('Error', err.response?.data?.error || 'Withdrawal failed')
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>My Wallet</Text>

        {/* Balance Card */}
        <LinearGradient colors={['#2C2417', '#5C4A32']} style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>
            ₹{Number(wallet?.balance || 0).toLocaleString('en-IN')}
          </Text>
          {wallet?.locked > 0 && (
            <Text style={styles.lockedText}>
              ₹{Number(wallet.locked).toLocaleString('en-IN')} pending
            </Text>
          )}
          <TouchableOpacity style={styles.withdrawBtn} onPress={() => setShowWithdraw(!showWithdraw)}>
            <Text style={styles.withdrawBtnText}>
              {showWithdraw ? 'Cancel' : 'Withdraw Funds'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Withdraw form */}
        {showWithdraw && (
          <View style={styles.withdrawForm}>
            <Text style={styles.fieldLabel}>Amount to Withdraw (₹)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="Minimum ₹100"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />
            <View style={styles.quickAmounts}>
              {[500, 1000, 2000, 5000].map(amt => (
                <TouchableOpacity
                  key={amt}
                  style={styles.quickAmountBtn}
                  onPress={() => setWithdrawAmount(String(Math.min(amt, wallet?.balance || 0)))}>
                  <Text style={styles.quickAmountText}>₹{amt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.withdrawNote}>
              Funds credited within 24 hours via UPI/Bank transfer
            </Text>
            <TouchableOpacity
              style={[styles.submitBtn, (!withdrawAmount || withdrawMutation.isPending) && styles.disabledBtn]}
              onPress={() => withdrawMutation.mutate(Number(withdrawAmount))}
              disabled={!withdrawAmount || withdrawMutation.isPending}>
              {withdrawMutation.isPending
                ? <ActivityIndicator color="white" />
                : <Text style={styles.submitBtnText}>Request Withdrawal</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Transactions */}
        <Text style={styles.sectionTitle}>Transactions</Text>
        {(transactions || []).length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={48} color="#D1C4B0" />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          (transactions || []).map((txn, i) => (
            <View key={i} style={styles.txnCard}>
              <View style={[styles.txnIcon, { backgroundColor: txn.type === 'credit' ? '#D1FAE5' : '#FEE2E2' }]}>
                <Ionicons
                  name={txn.type === 'credit' ? 'arrow-down' : 'arrow-up'}
                  size={18}
                  color={txn.type === 'credit' ? '#1A7A4C' : '#DC2626'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.txnNote}>{txn.note || txn.type}</Text>
                <Text style={styles.txnDate}>
                  {txn.created_at && format(new Date(txn.created_at), 'dd MMM yyyy, h:mm a')}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.txnAmount, { color: txn.type === 'credit' ? '#1A7A4C' : '#DC2626' }]}>
                  {txn.type === 'credit' ? '+' : '−'} ₹{Number(txn.amount).toLocaleString('en-IN')}
                </Text>
                {txn.balance_after != null && (
                  <Text style={styles.txnBalance}>Bal: ₹{Number(txn.balance_after).toLocaleString('en-IN')}</Text>
                )}
              </View>
            </View>
          ))
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F2' },
  pageTitle: { fontSize: 26, fontWeight: '700', color: '#2C2417', padding: 20, paddingBottom: 12 },
  balanceCard: { margin: 16, marginTop: 0, borderRadius: 20, padding: 24 },
  balanceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  balanceAmount: { fontSize: 44, fontWeight: '800', color: 'white', lineHeight: 50 },
  lockedText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  withdrawBtn: { marginTop: 18, alignSelf: 'flex-start', backgroundColor: '#F4600C', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 11 },
  withdrawBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  withdrawForm: { backgroundColor: 'white', margin: 16, marginTop: 0, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#F0EAE0' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#5C4A32', marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: '#F0EAE0', borderRadius: 10, padding: 12, fontSize: 16, color: '#2C2417', marginBottom: 12 },
  quickAmounts: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  quickAmountBtn: { flex: 1, padding: 9, borderRadius: 8, borderWidth: 1.5, borderColor: '#F0EAE0', alignItems: 'center' },
  quickAmountText: { fontSize: 13, fontWeight: '600', color: '#5C4A32' },
  withdrawNote: { fontSize: 12, color: '#A08060', marginBottom: 14, lineHeight: 18 },
  submitBtn: { backgroundColor: '#1A7A4C', borderRadius: 10, padding: 14, alignItems: 'center' },
  disabledBtn: { opacity: 0.5 },
  submitBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#2C2417', paddingHorizontal: 16, marginBottom: 12 },
  txnCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white', marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#F0EAE0' },
  txnIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txnNote: { fontSize: 14, fontWeight: '600', color: '#2C2417', textTransform: 'capitalize' },
  txnDate: { fontSize: 12, color: '#A08060', marginTop: 2 },
  txnAmount: { fontSize: 15, fontWeight: '700' },
  txnBalance: { fontSize: 11, color: '#A08060' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: '#A08060', fontSize: 15, marginTop: 12 },
});

/* ─────────────────────────────────────────────────────────── */

// ─── NotificationsScreen.js ─────────────────────────────────
import { useQuery, useMutation, useQueryClient as useQC2 } from '@tanstack/react-query';
import { notificationsAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

const NOTIF_ICONS = {
  job_posted: '📋', booking_request: '👷', booking_accepted: '✅',
  booking_rejected: '❌', job_started: '🔄', job_completed: '🎉',
  payment_received: '💰', review_received: '⭐'
};

export function NotificationsScreen({ navigation }) {
  const qc = useQC2();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.list().then(r => r.data)
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: () => qc.invalidateQueries(['notifications'])
  });

  const markOneMutation = useMutation({
    mutationFn: (id) => notificationsAPI.markRead(id),
    onSuccess: () => qc.invalidateQueries(['notifications'])
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 }}>
        <Text style={styles.pageTitle}>Notifications</Text>
        {(data?.unread > 0) && (
          <TouchableOpacity onPress={() => markAllMutation.mutate()}>
            <Text style={{ color: '#F4600C', fontWeight: '600', fontSize: 13 }}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>
      {isLoading ? (
        <ActivityIndicator color="#F4600C" style={{ marginTop: 40 }} />
      ) : (data?.notifications || []).length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🔔</Text>
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {(data?.notifications || []).map((n, i) => (
            <TouchableOpacity
              key={n.id || i}
              style={[notifStyles.notifCard, !n.is_read && notifStyles.notifUnread]}
              onPress={() => {
                if (!n.is_read) markOneMutation.mutate(n.id);
                if (n.data?.job_id) navigation.navigate('JobDetail', { id: n.data.job_id });
                if (n.data?.booking_id) navigation.navigate('BookingDetail', { id: n.data.booking_id });
              }}>
              <Text style={notifStyles.notifIcon}>{NOTIF_ICONS[n.type] || '🔔'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[notifStyles.notifTitle, !n.is_read && { fontWeight: '700' }]}>{n.title}</Text>
                <Text style={notifStyles.notifBody}>{n.body}</Text>
                <Text style={notifStyles.notifTime}>
                  {n.sent_at && formatDistanceToNow(new Date(n.sent_at), { addSuffix: true })}
                </Text>
              </View>
              {!n.is_read && <View style={notifStyles.unreadDot} />}
            </TouchableOpacity>
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const notifStyles = StyleSheet.create({
  notifCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, backgroundColor: 'white', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: '#F0EAE0' },
  notifUnread: { backgroundColor: 'rgba(244,96,12,0.04)', borderColor: 'rgba(244,96,12,0.2)' },
  notifIcon: { fontSize: 24, marginTop: 2 },
  notifTitle: { fontSize: 14, fontWeight: '500', color: '#2C2417', marginBottom: 2 },
  notifBody: { fontSize: 13, color: '#5C4A32', lineHeight: 18, marginBottom: 4 },
  notifTime: { fontSize: 11, color: '#A08060' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F4600C', marginTop: 6, flexShrink: 0 },
});

/* ─────────────────────────────────────────────────────────── */

// ─── JobsScreen.js ──────────────────────────────────────────
import { useState as useState2, useEffect as useEffect2 } from 'react';
import * as Location2 from 'expo-location';

export function JobsScreen({ navigation, route }) {
  const [search, setSearch] = useState2('');
  const [location, setLocation2] = useState2(null);
  const [nearby, setNearby] = useState2(true);
  const [urgent, setUrgent] = useState2(false);
  const [refreshing, setRefreshing] = useState2(false);
  const { jobsAPI: jAPI } = require('../services/api');

  useEffect2(() => {
    (async () => {
      const { status } = await Location2.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location2.getCurrentPositionAsync({});
        setLocation2({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    })();
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['jobs-list', nearby, location, urgent, search],
    queryFn: () => {
      if (nearby && location) {
        return jAPI.nearby(location.lat, location.lng, { limit: 20 }).then(r => ({ jobs: r.data.jobs }));
      }
      return jAPI.list({ status: 'open', limit: 20 }).then(r => r.data);
    }
  });

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const filtered = (data?.jobs || []).filter(j => {
    if (urgent && !j.is_urgent) return false;
    if (search && !j.title.toLowerCase().includes(search.toLowerCase()) && !j.city?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <Text style={styles.pageTitle}>Find Work</Text>
        <View style={jobStyles.searchBar}>
          <Ionicons name="search" size={17} color="#A08060" />
          <TextInput
            style={jobStyles.searchInput}
            placeholder="Search by skill, city..."
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close" size={17} color="#A08060" />
            </TouchableOpacity>
          )}
        </View>
        <View style={jobStyles.filterRow}>
          <TouchableOpacity
            style={[jobStyles.filterChip, nearby && jobStyles.filterChipActive]}
            onPress={() => setNearby(!nearby)}>
            <Ionicons name="locate" size={13} color={nearby ? '#F4600C' : '#A08060'} />
            <Text style={[jobStyles.filterChipText, nearby && { color: '#F4600C' }]}>Nearby</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[jobStyles.filterChip, urgent && { ...jobStyles.filterChipActive, backgroundColor: '#FEF2F2', borderColor: '#DC2626' }]}
            onPress={() => setUrgent(!urgent)}>
            <Ionicons name="flash" size={13} color={urgent ? '#DC2626' : '#A08060'} />
            <Text style={[jobStyles.filterChipText, urgent && { color: '#DC2626' }]}>Urgent</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#F4600C" style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="briefcase-outline" size={48} color="#D1C4B0" />
          <Text style={styles.emptyText}>No jobs found</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={j => j.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F4600C" />}
          renderItem={({ item: job }) => (
            <TouchableOpacity
              style={jobStyles.jobCard}
              onPress={() => navigation.navigate('JobDetail', { id: job.id })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  {job.is_urgent && <Text style={{ fontSize: 10, color: '#DC2626', fontWeight: '700', marginBottom: 2 }}>🚨 URGENT</Text>}
                  <Text style={jobStyles.jobTitle} numberOfLines={1}>{job.title}</Text>
                  <Text style={jobStyles.jobCat}>{job.category_name}</Text>
                </View>
                {job.budget_max && (
                  <Text style={jobStyles.jobBudget}>₹{Number(job.budget_max).toLocaleString('en-IN')}</Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <Text style={jobStyles.jobMeta}>📍 {job.city || 'N/A'}</Text>
                {job.distance_km && <Text style={jobStyles.jobMeta}>{Number(job.distance_km).toFixed(1)} km</Text>}
                <View style={[jobStyles.statusChip, { backgroundColor: job.status === 'open' ? '#D1FAE5' : '#F0EAE0' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: job.status === 'open' ? '#1A7A4C' : '#5C4A32', textTransform: 'capitalize' }}>{job.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const jobStyles = StyleSheet.create({
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'white', borderRadius: 12, padding: 13, borderWidth: 1.5, borderColor: '#F0EAE0', marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#2C2417' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5, borderColor: '#F0EAE0', backgroundColor: 'white' },
  filterChipActive: { borderColor: '#F4600C', backgroundColor: 'rgba(244,96,12,0.06)' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#A08060' },
  jobCard: { backgroundColor: 'white', borderRadius: 13, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#F0EAE0', shadowColor: '#2C2417', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  jobTitle: { fontSize: 15, fontWeight: '700', color: '#2C2417' },
  jobCat: { fontSize: 12, color: '#F4600C', fontWeight: '600', marginTop: 2 },
  jobBudget: { fontSize: 15, fontWeight: '700', color: '#F4600C' },
  jobMeta: { fontSize: 12, color: '#A08060' },
  statusChip: { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3, marginLeft: 'auto' },
});

/* ─────────────────────────────────────────────────────────── */

// ─── WorkerProfileScreen.js ─────────────────────────────────
import { Animated } from 'react-native';

export function WorkerProfileScreen({ route, navigation }) {
  const { id } = route.params;
  const { usersAPI: uAPI, reviewsAPI: rAPI } = require('../services/api');

  const { data: worker, isLoading } = useQuery({
    queryKey: ['worker', id],
    queryFn: () => uAPI.getWorker(id).then(r => r.data)
  });

  const { data: reviewData } = useQuery({
    queryKey: ['worker-reviews', id],
    queryFn: () => rAPI.getWorkerReviews(id).then(r => r.data)
  });

  if (isLoading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#F4600C" size="large" /></View>;
  if (!worker) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>Worker not found</Text></View>;

  const totalReviews = Number(reviewData?.stats?.total || 0);
  const avgRating = Number(reviewData?.stats?.avg_rating || 0);

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF7F2' }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#2C2417', '#5C4A32']} style={{ padding: 20, paddingTop: 50, paddingBottom: 28, alignItems: 'center' }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(244,96,12,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 30, fontWeight: '800', color: '#FF9F6A' }}>{worker.full_name?.[0]?.toUpperCase()}</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: 'white', marginBottom: 4 }}>{worker.full_name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: worker.is_available ? '#4ADE80' : '#A08060' }} />
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{worker.is_available ? 'Available now' : 'Currently busy'}</Text>
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={{ flexDirection: 'row', backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#F0EAE0' }}>
          {[
            { label: 'Rating', value: avgRating > 0 ? `${avgRating.toFixed(1)} ★` : 'N/A', color: '#F59E0B' },
            { label: 'Jobs', value: worker.total_reviews || 0, color: '#1D4ED8' },
            { label: 'Exp.', value: worker.experience_years ? `${worker.experience_years}y` : '—', color: '#1A7A4C' },
          ].map((s, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 14, borderRightWidth: i < 2 ? 1 : 0, borderColor: '#F0EAE0' }}>
              <Text style={{ fontSize: 19, fontWeight: '700', color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 11, color: '#A08060', marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Rates */}
        {(worker.hourly_rate || worker.daily_rate) && (
          <View style={{ flexDirection: 'row', gap: 10, padding: 16, backgroundColor: 'white', marginTop: 8 }}>
            {worker.hourly_rate && (
              <View style={{ flex: 1, backgroundColor: '#FAF7F2', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#2C2417' }}>₹{Number(worker.hourly_rate).toLocaleString('en-IN')}</Text>
                <Text style={{ fontSize: 12, color: '#A08060' }}>per hour</Text>
              </View>
            )}
            {worker.daily_rate && (
              <View style={{ flex: 1, backgroundColor: '#FAF7F2', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#2C2417' }}>₹{Number(worker.daily_rate).toLocaleString('en-IN')}</Text>
                <Text style={{ fontSize: 12, color: '#A08060' }}>per day</Text>
              </View>
            )}
          </View>
        )}

        {/* Bio */}
        {worker.bio && (
          <View style={{ backgroundColor: 'white', marginTop: 8, padding: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#2C2417', marginBottom: 8 }}>About</Text>
            <Text style={{ fontSize: 14, color: '#5C4A32', lineHeight: 22 }}>{worker.bio}</Text>
          </View>
        )}

        {/* Skills */}
        {(worker.skills || []).length > 0 && (
          <View style={{ backgroundColor: 'white', marginTop: 8, padding: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#2C2417', marginBottom: 12 }}>Skills</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(worker.skills || []).map((s, i) => (
                <View key={i} style={{ backgroundColor: 'rgba(244,96,12,0.08)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#F4600C' }}>{s.icon_url} {s.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Reviews */}
        {totalReviews > 0 && (
          <View style={{ backgroundColor: 'white', marginTop: 8, padding: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#2C2417', marginBottom: 14 }}>Reviews ({totalReviews})</Text>
            {(reviewData?.reviews || []).slice(0, 3).map((r, i) => (
              <View key={i} style={{ paddingVertical: 12, borderTopWidth: i > 0 ? 1 : 0, borderColor: '#F0EAE0' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#2C2417' }}>{r.reviewer_name}</Text>
                  <Text style={{ color: '#F59E0B', fontWeight: '600' }}>{'★'.repeat(r.rating)}</Text>
                </View>
                {r.comment && <Text style={{ fontSize: 13, color: '#5C4A32', lineHeight: 18 }}>{r.comment}</Text>}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Hire CTA */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: 16, paddingBottom: 32, borderTopWidth: 1, borderColor: '#F0EAE0' }}>
        <TouchableOpacity
          style={{ backgroundColor: '#F4600C', borderRadius: 12, padding: 16, alignItems: 'center' }}
          onPress={() => navigation.navigate('PostJob')}>
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
            Hire {worker.full_name?.split(' ')[0]}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default WalletScreen;