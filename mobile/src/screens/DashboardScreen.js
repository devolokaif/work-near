// ============================================================
// React Native — DashboardScreen.js
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Switch, Alert, TextInput, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usersAPI, categoriesAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useSocket } from '../hooks/useSocket';

export default function DashboardScreen({ navigation }) {
  const { user, updateUser } = useAuthStore();
  const { emit } = useSocket();
  const qc = useQueryClient();
  const isWorker = user?.role === 'worker';

  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [upiId, setUpiId] = useState('');
  const [radius, setRadius] = useState(10);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['dashboard-profile'],
    queryFn: () => usersAPI.me().then(r => {
      const d = r.data;
      if (!profileLoaded && d.worker_profile) {
        setBio(d.worker_profile.bio || '');
        setHourlyRate(String(d.worker_profile.hourly_rate || ''));
        setDailyRate(String(d.worker_profile.daily_rate || ''));
        setUpiId(d.worker_profile.upi_id || '');
        setRadius(d.worker_profile.availability_radius || 10);
        setSelectedSkills(d.worker_profile.skills?.map(s => s.category_id) || []);
        setProfileLoaded(true);
      }
      return d;
    })
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.list().then(r => r.data),
    enabled: isWorker
  });

  const availabilityMutation = useMutation({
    mutationFn: (val) => usersAPI.updateAvailability(val),
    onSuccess: (_, val) => emit('availability:set', { is_available: val })
  });

  const saveWorkerMutation = useMutation({
    mutationFn: () => usersAPI.updateWorkerProfile({
      bio, hourly_rate: Number(hourlyRate), daily_rate: Number(dailyRate),
      upi_id: upiId, availability_radius: radius, skills: selectedSkills
    }).then(r => r.data),
    onSuccess: () => {
      Alert.alert('Saved!', 'Worker profile updated.');
      qc.invalidateQueries(['dashboard-profile']);
    },
    onError: () => Alert.alert('Error', 'Failed to save profile')
  });

  const toggleSkill = (id) => {
    setSelectedSkills(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const stats = isWorker ? [
    { label: 'Earned', value: `₹${Number(user?.total_earnings || 0).toLocaleString('en-IN', { notation: 'compact' })}`, icon: 'cash', color: '#1A7A4C' },
    { label: 'Rating', value: user?.rating > 0 ? `${Number(user.rating).toFixed(1)} ★` : 'N/A', icon: 'star', color: '#F59E0B' },
    { label: 'Reviews', value: user?.total_reviews || 0, icon: 'chatbubbles', color: '#1D4ED8' },
    { label: 'Jobs', value: profile?.worker_profile?.total_jobs || 0, icon: 'briefcase', color: '#F4600C' },
  ] : [
    { label: 'Jobs Posted', value: profile?.total_jobs_posted || 0, icon: 'add-circle', color: '#F4600C' },
    { label: 'Active', value: profile?.active_jobs || 0, icon: 'flash', color: '#1A7A4C' },
    { label: 'Completed', value: profile?.completed_jobs || 0, icon: 'checkmark-circle', color: '#1D4ED8' },
    { label: 'Spent', value: `₹${Number(user?.total_spent || 0).toLocaleString('en-IN', { notation: 'compact' })}`, icon: 'card', color: '#D97706' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#2C2417', '#5C4A32']} style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSub}>{isWorker ? 'Worker' : 'Employer'} Overview</Text>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {stats.map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Ionicons name={s.icon} size={22} color={s.color} style={{ marginBottom: 6 }} />
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Worker: Availability */}
        {isWorker && (
          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleTitle}>Available for Work</Text>
                <Text style={styles.toggleSub}>Toggle to receive job notifications</Text>
              </View>
              <Switch
                value={profile?.worker_profile?.is_available ?? true}
                onValueChange={(val) => availabilityMutation.mutate(val)}
                trackColor={{ false: '#F0EAE0', true: '#D1FAE5' }}
                thumbColor={profile?.worker_profile?.is_available ? '#1A7A4C' : '#A08060'}
              />
            </View>
          </View>
        )}

        {/* Worker: Skills Editor */}
        {isWorker && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Skills</Text>
            <View style={styles.skillsGrid}>
              {(categories || []).map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.skillChip, selectedSkills.includes(cat.id) && styles.skillChipActive]}
                  onPress={() => toggleSkill(cat.id)}>
                  <Text style={styles.skillIcon}>{cat.icon_url || '🔧'}</Text>
                  <Text style={[styles.skillText, selectedSkills.includes(cat.id) && { color: '#F4600C' }]}>
                    {cat.name}
                  </Text>
                  {selectedSkills.includes(cat.id) && (
                    <Ionicons name="checkmark-circle" size={14} color="#F4600C" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Worker: Rates & Bio */}
        {isWorker && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Details</Text>

            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Describe your experience and skills..."
              multiline
              value={bio}
              onChangeText={setBio}
            />

            <View style={styles.rateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Hourly Rate (₹)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="200"
                  value={hourlyRate}
                  onChangeText={setHourlyRate}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Daily Rate (₹)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="1200"
                  value={dailyRate}
                  onChangeText={setDailyRate}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>UPI ID</Text>
            <TextInput
              style={styles.input}
              placeholder="name@upi or phone@paytm"
              value={upiId}
              onChangeText={setUpiId}
            />

            <Text style={styles.fieldLabel}>Work Radius: {radius} km</Text>
            <View style={styles.radiusRow}>
              {[5, 10, 20, 30, 50].map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.radiusChip, radius === r && styles.radiusChipActive]}
                  onPress={() => setRadius(r)}>
                  <Text style={[styles.radiusChipText, radius === r && { color: '#F4600C' }]}>{r} km</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saveWorkerMutation.isPending && styles.disabledBtn]}
              onPress={() => saveWorkerMutation.mutate()}
              disabled={saveWorkerMutation.isPending}>
              {saveWorkerMutation.isPending
                ? <ActivityIndicator color="white" />
                : <>
                  <Ionicons name="save" size={18} color="white" />
                  <Text style={styles.saveBtnText}>Save Worker Profile</Text>
                </>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Employer: Quick Actions */}
        {!isWorker && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            {[
              { icon: 'add-circle', label: 'Post a New Job', color: '#F4600C', onPress: () => navigation.navigate('PostJob') },
              { icon: 'briefcase', label: 'View My Jobs', color: '#1D4ED8', onPress: () => navigation.navigate('Jobs') },
              { icon: 'people', label: 'Browse Workers', color: '#1A7A4C', onPress: () => navigation.navigate('Jobs') },
              { icon: 'card', label: 'Payment History', color: '#D97706', onPress: () => navigation.navigate('Payments') },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={styles.actionRow} onPress={item.onPress}>
                <View style={[styles.actionIcon, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <Text style={styles.actionLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#A08060" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F2' },
  header: { padding: 20, paddingBottom: 24 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: 'white' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  statCard: { width: '47%', backgroundColor: 'white', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F0EAE0' },
  statValue: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#A08060', fontWeight: '500' },
  section: { backgroundColor: 'white', marginHorizontal: 0, marginTop: 8, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#2C2417', marginBottom: 14 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleTitle: { fontSize: 15, fontWeight: '600', color: '#2C2417' },
  toggleSub: { fontSize: 12, color: '#A08060', marginTop: 2 },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#F0EAE0', backgroundColor: 'white' },
  skillChipActive: { borderColor: '#F4600C', backgroundColor: 'rgba(244,96,12,0.06)' },
  skillIcon: { fontSize: 16 },
  skillText: { fontSize: 13, fontWeight: '600', color: '#5C4A32' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#5C4A32', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#F0EAE0', borderRadius: 10, padding: 12, fontSize: 15, color: '#2C2417', backgroundColor: 'white', marginBottom: 14 },
  textarea: { height: 80, textAlignVertical: 'top' },
  rateRow: { flexDirection: 'row' },
  radiusRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  radiusChip: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#F0EAE0', alignItems: 'center', backgroundColor: 'white' },
  radiusChipActive: { borderColor: '#F4600C', backgroundColor: 'rgba(244,96,12,0.06)' },
  radiusChipText: { fontSize: 12, fontWeight: '600', color: '#5C4A32' },
  saveBtn: { backgroundColor: '#F4600C', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  disabledBtn: { opacity: 0.6 },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderColor: '#F0EAE0' },
  actionIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { flex: 1, fontSize: 15, color: '#2C2417', fontWeight: '500' },
});