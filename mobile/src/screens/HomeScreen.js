// ============================================================
// React Native Screens
// ============================================================

// ─── HomeScreen.js ──────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, ActivityIndicator, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { jobsAPI, categoriesAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';

const CATEGORIES = [
  { name: 'Plumber', icon: '🔧' },
  { name: 'Electrician', icon: '⚡' },
  { name: 'Carpenter', icon: '🪚' },
  { name: 'Painter', icon: '🎨' },
  { name: 'Cleaner', icon: '🧹' },
  { name: 'Driver', icon: '🚗' },
  { name: 'Cook', icon: '👨‍🍳' },
  { name: 'Helper', icon: '🏗️' },
];

export default function HomeScreen({ navigation }) {
  const { user } = useAuthStore();
  const [location, setLocation] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const isWorker = user?.role === 'worker';

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    })();
  }, []);

  const { data: jobs, isLoading, refetch } = useQuery({
    queryKey: ['home-jobs', location],
    queryFn: () => location
      ? jobsAPI.nearby(location.lat, location.lng, { limit: 8 }).then(r => r.data.jobs)
      : jobsAPI.list({ status: 'open', limit: 8 }).then(r => r.data.jobs)
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F4600C" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.name}>{user?.full_name?.split(' ')[0]} 👋</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={26} color="#2C2417" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <TouchableOpacity style={styles.searchBar} onPress={() => navigation.navigate('Jobs')}>
          <Ionicons name="search" size={18} color="#A08060" />
          <Text style={styles.searchPlaceholder}>
            {isWorker ? 'Find jobs near you...' : 'Search workers...'}
          </Text>
        </TouchableOpacity>

        {/* Post Job CTA (employer) */}
        {!isWorker && (
          <TouchableOpacity style={styles.ctaBanner} onPress={() => navigation.navigate('PostJob')}>
            <View>
              <Text style={styles.ctaTitle}>Need a worker today?</Text>
              <Text style={styles.ctaSub}>Post a job, get applications instantly</Text>
            </View>
            <View style={styles.ctaBtn}>
              <Text style={styles.ctaBtnText}>Post Job</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Categories */}
        <Text style={styles.sectionTitle}>Browse by Skill</Text>
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          keyExtractor={item => item.name}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.categoryCard} onPress={() => navigation.navigate('Jobs', { category: item.name })}>
              <Text style={styles.categoryIcon}>{item.icon}</Text>
              <Text style={styles.categoryName}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />

        {/* Nearby Jobs */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {location ? 'Jobs Near You' : 'Recent Jobs'}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Jobs')}>
            <Text style={styles.seeAll}>See all →</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#F4600C" style={{ marginTop: 20 }} />
        ) : (jobs || []).map((job, i) => (
          <TouchableOpacity key={job.id || i} style={styles.jobCard}
            onPress={() => navigation.navigate('JobDetail', { id: job.id })}>
            <View style={styles.jobCardHeader}>
              <View style={{ flex: 1 }}>
                {job.is_urgent && (
                  <Text style={styles.urgentBadge}>🚨 URGENT</Text>
                )}
                <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                <Text style={styles.jobCategory}>{job.category_name}</Text>
              </View>
              {job.budget_max && (
                <Text style={styles.jobBudget}>₹{Number(job.budget_max).toLocaleString('en-IN')}</Text>
              )}
            </View>
            <View style={styles.jobMeta}>
              <Text style={styles.jobMetaText}>📍 {job.city || 'N/A'}</Text>
              {job.distance_km && <Text style={styles.jobMetaText}>{Number(job.distance_km).toFixed(1)} km</Text>}
              <View style={[styles.statusBadge, { backgroundColor: job.status === 'open' ? '#D1FAE5' : '#F0EAE0' }]}>
                <Text style={[styles.statusText, { color: job.status === 'open' ? '#1A7A4C' : '#5C4A32' }]}>
                  {job.status}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F2' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  greeting: { fontSize: 14, color: '#A08060', marginBottom: 2 },
  name: { fontFamily: 'serif', fontSize: 24, color: '#2C2417', fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: '0 20px 16px', marginHorizontal: 20, marginBottom: 16, backgroundColor: 'white', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#F0EAE0' },
  searchPlaceholder: { color: '#A08060', fontSize: 15 },
  ctaBanner: { margin: 20, marginTop: 0, backgroundColor: '#F4600C', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ctaTitle: { color: 'white', fontWeight: '700', fontSize: 16, marginBottom: 3 },
  ctaSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  ctaBtn: { backgroundColor: 'white', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  ctaBtnText: { color: '#F4600C', fontWeight: '700', fontSize: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#2C2417', paddingHorizontal: 20, marginBottom: 12, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20 },
  seeAll: { color: '#F4600C', fontWeight: '600', fontSize: 14 },
  categoryCard: { backgroundColor: 'white', borderRadius: 12, padding: 14, alignItems: 'center', marginRight: 10, width: 80, borderWidth: 1, borderColor: '#F0EAE0' },
  categoryIcon: { fontSize: 26, marginBottom: 5 },
  categoryName: { fontSize: 10, fontWeight: '600', color: '#5C4A32', textAlign: 'center' },
  jobCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginHorizontal: 20, marginBottom: 10, borderWidth: 1, borderColor: '#F0EAE0', shadowColor: '#2C2417', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  jobCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  urgentBadge: { fontSize: 10, color: '#DC2626', fontWeight: '700', marginBottom: 3 },
  jobTitle: { fontSize: 15, fontWeight: '700', color: '#2C2417', marginBottom: 2 },
  jobCategory: { fontSize: 12, color: '#F4600C', fontWeight: '600' },
  jobBudget: { fontSize: 15, fontWeight: '700', color: '#F4600C' },
  jobMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  jobMetaText: { fontSize: 12, color: '#A08060' },
  statusBadge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3, marginLeft: 'auto' },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
});

/* ─────────────────────────────────────────────────────────── */
