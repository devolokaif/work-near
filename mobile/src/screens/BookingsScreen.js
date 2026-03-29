// ============================================================
// React Native — BookingsScreen.js
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { bookingsAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { formatDistanceToNow } from 'date-fns';

const STATUS_TABS = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'];

const STATUS_STYLE = {
  pending:     { bg: '#FEF3C7', color: '#D97706' },
  accepted:    { bg: '#DBEAFE', color: '#1D4ED8' },
  in_progress: { bg: '#FEF3C7', color: '#D97706' },
  completed:   { bg: '#D1FAE5', color: '#1A7A4C' },
  cancelled:   { bg: '#FEE2E2', color: '#DC2626' },
  rejected:    { bg: '#FEE2E2', color: '#DC2626' },
};

function BookingCard({ booking, onPress }) {
  const s = STATUS_STYLE[booking.status] || STATUS_STYLE.pending;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardRow}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.jobTitle} numberOfLines={1}>{booking.job_title}</Text>
          <Text style={styles.categoryText}>{booking.category_name}</Text>
          <Text style={styles.partyText}>
            {booking.worker_name
              ? `👷 ${booking.worker_name}`
              : booking.employer_name
                ? `🏢 ${booking.employer_name}`
                : ''}
          </Text>
        </View>
        <View>
          <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.color }]}>
              {booking.status.replace('_', ' ')}
            </Text>
          </View>
          {booking.proposed_rate && (
            <Text style={styles.rateText}>₹{Number(booking.proposed_rate).toLocaleString('en-IN')}</Text>
          )}
        </View>
      </View>
      {booking.status === 'in_progress' && (
        <View style={styles.activePill}>
          <View style={styles.activeDot} />
          <Text style={styles.activeText}>Tap to track worker live</Text>
        </View>
      )}
      <Text style={styles.timeText}>
        {booking.created_at
          ? formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })
          : ''}
      </Text>
    </TouchableOpacity>
  );
}

export default function BookingsScreen({ navigation }) {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('pending');
  const [refreshing, setRefreshing] = useState(false);

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ['bookings', activeTab],
    queryFn: () => bookingsAPI.list({ status: activeTab }).then(r => r.data)
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.pageTitle}>My Bookings</Text>

      {/* Status Tabs */}
      <FlatList
        data={STATUS_TABS}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabList}
        keyExtractor={t => t}
        renderItem={({ item }) => {
          const s = STATUS_STYLE[item];
          const isActive = activeTab === item;
          return (
            <TouchableOpacity
              style={[styles.tab, isActive && { backgroundColor: s.bg, borderColor: s.color }]}
              onPress={() => setActiveTab(item)}>
              <Text style={[styles.tabText, isActive && { color: s.color }]}>
                {item.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {isLoading ? (
        <ActivityIndicator color="#F4600C" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={bookings || []}
          keyExtractor={b => b.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F4600C" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="briefcase-outline" size={52} color="#D1C4B0" />
              <Text style={styles.emptyTitle}>No {activeTab.replace('_', ' ')} bookings</Text>
              <Text style={styles.emptyText}>
                {user?.role === 'worker'
                  ? 'Browse and apply for available jobs'
                  : 'Post a job to receive applications'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => navigation.navigate('BookingDetail', { id: item.id })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F2' },
  pageTitle: { fontSize: 26, fontWeight: '700', color: '#2C2417', padding: 20, paddingBottom: 12 },
  tabList: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5, borderColor: '#F0EAE0', backgroundColor: 'white', marginRight: 6 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#A08060', textTransform: 'capitalize' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { backgroundColor: 'white', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#F0EAE0', shadowColor: '#2C2417', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  jobTitle: { fontSize: 15, fontWeight: '700', color: '#2C2417', marginBottom: 2 },
  categoryText: { fontSize: 12, color: '#F4600C', fontWeight: '600', marginBottom: 3 },
  partyText: { fontSize: 12, color: '#A08060' },
  statusBadge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 4 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  rateText: { fontSize: 13, fontWeight: '700', color: '#1A7A4C', textAlign: 'right' },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', borderRadius: 8, padding: 8, marginBottom: 6 },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#D97706' },
  activeText: { fontSize: 12, fontWeight: '600', color: '#D97706' },
  timeText: { fontSize: 11, color: '#A08060' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2C2417', marginTop: 14, marginBottom: 6 },
  emptyText: { fontSize: 14, color: '#A08060', textAlign: 'center', lineHeight: 20 },
});