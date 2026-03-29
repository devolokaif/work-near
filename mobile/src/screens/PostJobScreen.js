// ============================================================
// React Native — PostJobScreen.js
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { jobsAPI, categoriesAPI } from '../services/api';
import { useQuery } from '@tanstack/react-query';

const STEPS = ['Category', 'Details', 'Location', 'Review'];

export default function PostJobScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    category_id: '', category_name: '',
    title: '', description: '',
    budget_min: '', budget_max: '',
    duration_hours: '', workers_needed: '1',
    is_urgent: false, scheduled_at: '',
    lat: null, lng: null, address_text: '',
    city: '', state: '', pincode: ''
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.list().then(r => r.data)
  });

  const mutation = useMutation({
    mutationFn: () => jobsAPI.create({
      ...form,
      budget_min: form.budget_min ? Number(form.budget_min) : undefined,
      budget_max: form.budget_max ? Number(form.budget_max) : undefined,
      duration_hours: form.duration_hours ? Number(form.duration_hours) : undefined,
      workers_needed: Number(form.workers_needed) || 1,
    }).then(r => r.data),
    onSuccess: (job) => {
      Alert.alert('Job Posted!', 'Workers will be notified.', [
        { text: 'View Job', onPress: () => navigation.replace('JobDetail', { id: job.id }) }
      ]);
    },
    onError: (err) => Alert.alert('Error', err.response?.data?.error || 'Failed to post job')
  });

  const detectLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Location access required');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    const [geo] = await Location.reverseGeocodeAsync({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude
    });
    setForm(f => ({
      ...f,
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      address_text: `${geo?.street || ''}, ${geo?.district || ''}, ${geo?.city || ''}`.replace(/^,\s*/, ''),
      city: geo?.city || geo?.district || '',
      state: geo?.region || '',
      pincode: geo?.postalCode || ''
    }));
  };

  const next = () => {
    if (step === 0 && !form.category_id) return Alert.alert('Select a category');
    if (step === 1 && form.title.length < 5) return Alert.alert('Enter a title (min 5 chars)');
    if (step === 2 && !form.lat) return Alert.alert('Detect or enter your location');
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else mutation.mutate();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress */}
      <View style={styles.progressBar}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.progressSegment, i <= step && styles.progressActive]} />
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.stepLabel}>Step {step + 1} of {STEPS.length}</Text>
          <Text style={styles.stepTitle}>{
            ['What type of work?', 'Job Details', 'Where is the job?', 'Review & Post'][step]
          }</Text>

          {/* STEP 0 — Category */}
          {step === 0 && (
            <View style={styles.grid}>
              {(categories || []).map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catCard, form.category_id === cat.id && styles.catCardActive]}
                  onPress={() => setForm(f => ({ ...f, category_id: cat.id, category_name: cat.name }))}>
                  <Text style={styles.catIcon}>{cat.icon_url || '🔧'}</Text>
                  <Text style={[styles.catName, form.category_id === cat.id && { color: '#F4600C' }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* STEP 1 — Details */}
          {step === 1 && (
            <>
              <Text style={styles.label}>Job Title *</Text>
              <TextInput style={styles.input} placeholder="e.g. Fix bathroom leakage" value={form.title} onChangeText={v => setForm(f => ({ ...f, title: v }))} />

              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, styles.textarea]} placeholder="Describe the work..." multiline value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Min Budget (₹)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" placeholder="500" value={form.budget_min} onChangeText={v => setForm(f => ({ ...f, budget_min: v }))} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Max Budget (₹)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" placeholder="1500" value={form.budget_max} onChangeText={v => setForm(f => ({ ...f, budget_max: v }))} />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Duration (hrs)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" placeholder="4" value={form.duration_hours} onChangeText={v => setForm(f => ({ ...f, duration_hours: v }))} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Workers Needed</Text>
                  <TextInput style={styles.input} keyboardType="numeric" placeholder="1" value={form.workers_needed} onChangeText={v => setForm(f => ({ ...f, workers_needed: v }))} />
                </View>
              </View>

              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.label}>Mark as Urgent 🚨</Text>
                  <Text style={styles.toggleSub}>Urgent jobs get higher visibility</Text>
                </View>
                <Switch
                  value={form.is_urgent}
                  onValueChange={v => setForm(f => ({ ...f, is_urgent: v }))}
                  trackColor={{ false: '#F0EAE0', true: '#FEE2E2' }}
                  thumbColor={form.is_urgent ? '#DC2626' : '#A08060'}
                />
              </View>
            </>
          )}

          {/* STEP 2 — Location */}
          {step === 2 && (
            <>
              <TouchableOpacity style={styles.detectBtn} onPress={detectLocation}>
                <Ionicons name="locate" size={18} color="#F4600C" />
                <Text style={styles.detectText}>Detect My Location</Text>
              </TouchableOpacity>

              {form.lat && (
                <View style={styles.locationConfirm}>
                  <Ionicons name="checkmark-circle" size={18} color="#1A7A4C" />
                  <Text style={styles.locationConfirmText}>Location detected!</Text>
                </View>
              )}

              <Text style={styles.label}>Address *</Text>
              <TextInput style={[styles.input, styles.textarea]} placeholder="Full address" value={form.address_text} onChangeText={v => setForm(f => ({ ...f, address_text: v }))} multiline />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>City</Text>
                  <TextInput style={styles.input} placeholder="City" value={form.city} onChangeText={v => setForm(f => ({ ...f, city: v }))} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Pincode</Text>
                  <TextInput style={styles.input} keyboardType="numeric" maxLength={6} placeholder="221001" value={form.pincode} onChangeText={v => setForm(f => ({ ...f, pincode: v }))} />
                </View>
              </View>
            </>
          )}

          {/* STEP 3 — Review */}
          {step === 3 && (
            <View style={styles.reviewCard}>
              {[
                { label: 'Category', value: form.category_name },
                { label: 'Title', value: form.title },
                { label: 'Budget', value: form.budget_max ? `₹${form.budget_min || 0} – ₹${form.budget_max}` : '—' },
                { label: 'Duration', value: form.duration_hours ? `${form.duration_hours} hrs` : '—' },
                { label: 'Workers', value: form.workers_needed },
                { label: 'Urgent', value: form.is_urgent ? 'Yes 🚨' : 'No' },
                { label: 'Location', value: form.city || form.address_text || '—' },
              ].map(({ label, value }) => (
                <View key={label} style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>{label}</Text>
                  <Text style={styles.reviewValue}>{String(value)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom nav */}
      <View style={styles.bottomBar}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
            <Ionicons name="chevron-back" size={20} color="#5C4A32" />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, { flex: step > 0 ? 1.5 : 1 }, mutation.isPending && { opacity: 0.7 }]}
          onPress={next}
          disabled={mutation.isPending}>
          {mutation.isPending
            ? <ActivityIndicator color="white" />
            : <Text style={styles.nextBtnText}>
                {step < STEPS.length - 1 ? `Next: ${STEPS[step + 1]}` : '🚀 Post Job Now'}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F2' },
  progressBar: { flexDirection: 'row', gap: 4, padding: 16, paddingBottom: 0 },
  progressSegment: { flex: 1, height: 4, borderRadius: 99, backgroundColor: '#F0EAE0' },
  progressActive: { backgroundColor: '#F4600C' },
  content: { padding: 20 },
  stepLabel: { fontSize: 13, color: '#A08060', marginBottom: 4 },
  stepTitle: { fontSize: 24, fontWeight: '700', color: '#2C2417', marginBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: { width: '30%', backgroundColor: 'white', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#F0EAE0' },
  catCardActive: { borderColor: '#F4600C', backgroundColor: 'rgba(244,96,12,0.05)' },
  catIcon: { fontSize: 26, marginBottom: 6 },
  catName: { fontSize: 11, fontWeight: '600', color: '#5C4A32', textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#5C4A32', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#F0EAE0', borderRadius: 10, padding: 12, fontSize: 15, color: '#2C2417', backgroundColor: 'white', marginBottom: 16 },
  textarea: { height: 85, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#F0EAE0', marginBottom: 16 },
  toggleSub: { fontSize: 12, color: '#A08060', marginTop: 2 },
  detectBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(244,96,12,0.08)', borderRadius: 10, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(244,96,12,0.2)' },
  detectText: { color: '#F4600C', fontWeight: '600', fontSize: 15 },
  locationConfirm: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D1FAE5', borderRadius: 8, padding: 10, marginBottom: 16 },
  locationConfirmText: { color: '#1A7A4C', fontWeight: '600', fontSize: 13 },
  reviewCard: { backgroundColor: 'white', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#F0EAE0' },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F0EAE0' },
  reviewLabel: { fontSize: 14, color: '#A08060' },
  reviewValue: { fontSize: 14, fontWeight: '600', color: '#2C2417', textAlign: 'right', maxWidth: '60%' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 32, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#F0EAE0' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#F0EAE0' },
  backBtnText: { color: '#5C4A32', fontWeight: '600', fontSize: 15 },
  nextBtn: { backgroundColor: '#F4600C', borderRadius: 12, padding: 14, alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});