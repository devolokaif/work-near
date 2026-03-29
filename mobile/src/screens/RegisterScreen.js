// ============================================================
// React Native — RegisterScreen.js
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';

export default function RegisterScreen({ route, navigation }) {
  const { token, phone } = route.params || {};
  const { register } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      return Alert.alert('Invalid Name', 'Enter your full name (at least 2 characters)');
    }
    if (!role) {
      return Alert.alert('Select Role', 'Please select whether you want to hire or find work');
    }
    setLoading(true);
    try {
      await register({
        full_name: fullName.trim(),
        role,
        phone: `+91${phone}`,
        token,
      });
      // Auth store sets user → Navigator auto-redirects to app
    } catch (err) {
      Alert.alert('Registration Failed', err.response?.data?.error || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    {
      value: 'employer',
      icon: 'business',
      title: 'Hire Workers',
      description: 'Post jobs and find skilled daily wage workers near you',
      color: '#1D4ED8',
      bg: '#DBEAFE',
    },
    {
      value: 'worker',
      icon: 'construct',
      title: 'Find Work',
      description: 'Browse and apply for daily wage jobs in your area',
      color: '#F4600C',
      bg: 'rgba(244,96,12,0.08)',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>WorkNear</Text>
          <Text style={styles.subtitle}>Create your account</Text>
        </View>

        {/* Phone badge */}
        {phone && (
          <View style={styles.phoneBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#1A7A4C" />
            <Text style={styles.phoneBadgeText}>Verified: +91 {phone}</Text>
          </View>
        )}

        {/* Role selection */}
        <Text style={styles.sectionLabel}>I want to...</Text>
        <View style={styles.rolesContainer}>
          {roles.map(r => (
            <TouchableOpacity
              key={r.value}
              style={[styles.roleCard, role === r.value && { borderColor: r.color, backgroundColor: r.bg }]}
              onPress={() => setRole(r.value)}
              activeOpacity={0.7}>
              <View style={[styles.roleIconContainer, { backgroundColor: r.bg }]}>
                <Ionicons name={r.icon} size={28} color={r.color} />
              </View>
              <Text style={[styles.roleTitle, role === r.value && { color: r.color }]}>
                {r.title}
              </Text>
              <Text style={styles.roleDesc}>{r.description}</Text>
              {role === r.value && (
                <View style={[styles.selectedBadge, { backgroundColor: r.color }]}>
                  <Ionicons name="checkmark" size={12} color="white" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Full name */}
        <Text style={styles.sectionLabel}>Your Name</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={18} color="#A08060" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="e.g. Ramesh Kumar"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          {[
            '✅ Free to join — no subscription fees',
            '📍 Find work or workers within your area',
            '💳 Secure payments via UPI & cards',
            '⭐ Build your reputation with reviews',
          ].map((tip, i) => (
            <Text key={i} style={styles.tipText}>{tip}</Text>
          ))}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (loading || !role || !fullName.trim()) && styles.disabledBtn]}
          onPress={handleRegister}
          disabled={loading || !role || !fullName.trim()}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>Create Account</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </Text>

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F2' },
  scroll: { padding: 24, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 28 },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F4600C',
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 16, color: '#A08060', marginTop: 4 },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
  },
  phoneBadgeText: { fontSize: 14, fontWeight: '600', color: '#1A7A4C' },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5C4A32',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rolesContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#F0EAE0',
    alignItems: 'center',
    position: 'relative',
  },
  roleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C2417',
    marginBottom: 4,
    textAlign: 'center',
  },
  roleDesc: { fontSize: 11, color: '#A08060', textAlign: 'center', lineHeight: 15 },
  selectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F0EAE0',
    marginBottom: 20,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#2C2417' },
  tipsCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F0EAE0',
    gap: 8,
  },
  tipText: { fontSize: 13, color: '#5C4A32', lineHeight: 18 },
  submitBtn: {
    backgroundColor: '#F4600C',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  disabledBtn: { backgroundColor: '#A08060' },
  submitBtnText: { color: 'white', fontWeight: '700', fontSize: 17 },
  disclaimer: {
    fontSize: 12,
    color: '#A08060',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  backBtn: { alignItems: 'center' },
  backBtnText: { color: '#A08060', fontWeight: '600', fontSize: 14 },
});