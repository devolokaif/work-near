// ============================================================
// React Native — ProfileScreen.js
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Switch, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { usersAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export default function ProfileScreen({ navigation }) {
  const { user, updateUser, logout } = useAuthStore();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const isWorker = user?.role === 'worker';

  const { data: profile } = useQuery({
    queryKey: ['profile-full'],
    queryFn: () => usersAPI.me().then(r => r.data)
  });

  const updateMutation = useMutation({
    mutationFn: (data) => usersAPI.update(data).then(r => r.data),
    onSuccess: (data) => {
      updateUser(data);
      setEditing(false);
      Alert.alert('Success', 'Profile updated!');
    }
  });

  const availabilityMutation = useMutation({
    mutationFn: (val) => usersAPI.updateAvailability(val)
  });

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission needed');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8
    });
    if (!result.canceled) {
      // Upload in production
      Alert.alert('Photo selected', 'Upload functionality requires S3 setup.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout }
    ]);
  };

  const menuItems = [
    { icon: 'wallet-outline', label: 'My Wallet', onPress: () => navigation.navigate('Wallet'), show: isWorker },
    { icon: 'card-outline', label: 'Payment History', onPress: () => navigation.navigate('Payments') },
    { icon: 'notifications-outline', label: 'Notifications', onPress: () => navigation.navigate('Notifications') },
    { icon: 'bar-chart-outline', label: 'Dashboard', onPress: () => navigation.navigate('Dashboard') },
    { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => Alert.alert('Support', 'Email: support@worknear.in') },
  ].filter(i => i.show !== false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.photoContainer} onPress={pickPhoto}>
            {user?.profile_photo ? (
              <Image source={{ uri: user.profile_photo }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoInitial}>{user?.full_name?.[0]?.toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={14} color="white" />
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>{user?.full_name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role}</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { label: isWorker ? 'Earned' : 'Spent', value: `₹${Number(isWorker ? user?.total_earnings : user?.total_spent || 0).toLocaleString('en-IN', { notation: 'compact' })}` },
              { label: 'Rating', value: user?.rating > 0 ? `${Number(user.rating).toFixed(1)}★` : 'N/A' },
              { label: 'Jobs', value: user?.total_reviews || 0 },
            ].map((s, i) => (
              <View key={i} style={styles.statItem}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Availability toggle (worker only) */}
        {isWorker && (
          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>Available for Work</Text>
                <Text style={styles.toggleSub}>Let employers find you</Text>
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

        {/* Edit Profile */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Info</Text>
            <TouchableOpacity onPress={() => setEditing(!editing)}>
              <Text style={styles.editLink}>{editing ? 'Cancel' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>

          {editing ? (
            <>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="your@email.com" />
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => updateMutation.mutate({ full_name: fullName, email })}
                disabled={updateMutation.isPending}>
                <Text style={styles.saveBtnText}>{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={16} color="#A08060" />
                <Text style={styles.infoText}>{user?.full_name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={16} color="#A08060" />
                <Text style={styles.infoText}>{user?.phone}</Text>
              </View>
              {user?.email && (
                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={16} color="#A08060" />
                  <Text style={styles.infoText}>{user.email}</Text>
                </View>
              )}
              {user?.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#1A7A4C" />
                  <Text style={styles.verifiedText}>Identity Verified</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Worker Profile Link */}
        {isWorker && (
          <TouchableOpacity style={styles.section} onPress={() => navigation.navigate('Dashboard')}>
            <View style={styles.menuItem}>
              <Ionicons name="construct-outline" size={20} color="#F4600C" />
              <Text style={styles.menuLabel}>Edit Worker Profile & Skills</Text>
              <Ionicons name="chevron-forward" size={16} color="#A08060" style={{ marginLeft: 'auto' }} />
            </View>
          </TouchableOpacity>
        )}

        {/* Menu items */}
        <View style={styles.section}>
          {menuItems.map((item, i) => (
            <TouchableOpacity key={i} style={[styles.menuItem, i < menuItems.length - 1 && styles.menuBorder]} onPress={item.onPress}>
              <Ionicons name={item.icon} size={20} color="#A08060" />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#A08060" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>WorkNear v1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F2' },
  header: { backgroundColor: 'white', alignItems: 'center', padding: 24, paddingBottom: 20, borderBottomWidth: 1, borderColor: '#F0EAE0' },
  photoContainer: { position: 'relative', marginBottom: 14 },
  photo: { width: 80, height: 80, borderRadius: 40 },
  photoPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(244,96,12,0.15)', alignItems: 'center', justifyContent: 'center' },
  photoInitial: { fontSize: 28, fontWeight: '700', color: '#F4600C' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: '#F4600C', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
  userName: { fontSize: 22, fontWeight: '700', color: '#2C2417', marginBottom: 4 },
  roleBadge: { backgroundColor: 'rgba(244,96,12,0.1)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 16 },
  roleText: { fontSize: 12, fontWeight: '700', color: '#F4600C', textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', gap: 0, width: '100%' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRightWidth: 1, borderColor: '#F0EAE0' },
  statValue: { fontSize: 17, fontWeight: '700', color: '#2C2417' },
  statLabel: { fontSize: 11, color: '#A08060', marginTop: 2 },
  section: { backgroundColor: 'white', marginTop: 10, padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2C2417' },
  editLink: { color: '#F4600C', fontWeight: '600', fontSize: 14 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: '#2C2417' },
  toggleSub: { fontSize: 12, color: '#A08060', marginTop: 2 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#5C4A32', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#F0EAE0', borderRadius: 10, padding: 12, fontSize: 15, color: '#2C2417', marginBottom: 14 },
  saveBtn: { backgroundColor: '#F4600C', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#F0EAE0' },
  infoText: { fontSize: 15, color: '#2C2417' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#D1FAE5', borderRadius: 8, padding: 8 },
  verifiedText: { fontSize: 13, fontWeight: '600', color: '#1A7A4C' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  menuBorder: { borderBottomWidth: 1, borderColor: '#F0EAE0' },
  menuLabel: { fontSize: 15, color: '#2C2417', fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 16, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#FEE2E2', backgroundColor: 'white' },
  logoutText: { color: '#DC2626', fontWeight: '600', fontSize: 15 },
  version: { textAlign: 'center', color: '#A08060', fontSize: 12 },
});