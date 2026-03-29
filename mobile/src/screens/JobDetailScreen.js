// ============================================================
// React Native — JobDetailScreen.js
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, Modal, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDistanceToNow, format } from 'date-fns';
import { jobsAPI, bookingsAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export default function JobDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showApply, setShowApply] = useState(false);
  const [proposedRate, setProposedRate] = useState('');
  const [message, setMessage] = useState('');
  const isWorker = user?.role === 'worker';

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsAPI.get(id).then(r => r.data)
  });

  const { data: myBooking } = useQuery({
    queryKey: ['my-booking-job', id],
    queryFn: () => bookingsAPI.list({ job_id: id }).then(r =>
      (r.data || []).find(b => b.worker_id === user?.id)
    ),
    enabled: isWorker
  });

  const { data: applications } = useQuery({
    queryKey: ['job-apps', id],
    queryFn: () => bookingsAPI.list({ job_id: id }).then(r => r.data),
    enabled: !isWorker && job?.employer_id === user?.id
  });

  const applyMutation = useMutation({
    mutationFn: () => bookingsAPI.apply(id, { proposed_rate: Number(proposedRate), message }).then(r => r.data),
    onSuccess: () => {
      Alert.alert('Applied!', 'Your application has been submitted.');
      setShowApply(false);
      qc.invalidateQueries(['my-booking-job', id]);
    },
    onError: (err) => Alert.alert('Error', err.response?.data?.error || 'Could not apply')
  });

  const acceptMutation = useMutation({
    mutationFn: (bookingId) => bookingsAPI.accept(bookingId).then(r => r.data),
    onSuccess: () => {
      Alert.alert('Accepted!', 'Worker notified. OTP sent to confirm job start.');
      qc.invalidateQueries(['job-apps', id]);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (bookingId) => bookingsAPI.reject(bookingId).then(r => r.data),
    onSuccess: () => qc.invalidateQueries(['job-apps', id])
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F4600C" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Job not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.linkText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isMyJob = job.employer_id === user?.id;
  const canApply = isWorker && job.status === 'open' && !myBooking;
  const alreadyApplied = isWorker && !!myBooking;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with gradient */}
        <LinearGradient colors={['#2C2417', '#5C4A32']} style={styles.headerGradient}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="white" />
          </TouchableOpacity>
          <View style={styles.statusRow}>
            {job.is_urgent && (
              <View style={styles.urgentPill}>
                <Ionicons name="flash" size={11} color="#DC2626" />
                <Text style={styles.urgentText}>URGENT</Text>
              </View>
            )}
            <View style={[styles.statusPill, { backgroundColor: job.status === 'open' ? '#D1FAE5' : '#FEF3C7' }]}>
              <Text style={[styles.statusPillText, { color: job.status === 'open' ? '#1A7A4C' : '#D97706' }]}>
                {job.status.replace('_', ' ')}
              </Text>
            </View>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{job.category_name}</Text>
            </View>
          </View>
          <Text style={styles.jobTitle}>{job.title}</Text>
          {(job.budget_min || job.budget_max) && (
            <Text style={styles.budget}>
              ₹{job.budget_min && job.budget_max
                ? `${Number(job.budget_min).toLocaleString('en-IN')} – ${Number(job.budget_max).toLocaleString('en-IN')}`
                : Number(job.budget_max || job.budget_min).toLocaleString('en-IN')}
              {job.duration_hours ? ` for ${job.duration_hours}h` : ''}
            </Text>
          )}
        </LinearGradient>

        {/* Meta info */}
        <View style={styles.metaRow}>
          {job.address_text && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={15} color="#F4600C" />
              <Text style={styles.metaText}>{job.city || job.address_text.slice(0, 25)}</Text>
            </View>
          )}
          {job.duration_hours && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={15} color="#A08060" />
              <Text style={styles.metaText}>{job.duration_hours}h</Text>
            </View>
          )}
          {job.workers_needed > 1 && (
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={15} color="#A08060" />
              <Text style={styles.metaText}>{job.workers_hired || 0}/{job.workers_needed}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {job.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this Job</Text>
            <Text style={styles.descText}>{job.description}</Text>
          </View>
        )}

        {/* Requirements */}
        {job.requirements?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            {job.requirements.map((r, i) => (
              <View key={i} style={styles.requirementRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.requirementText}>{r}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Employer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Posted by</Text>
          <View style={styles.employerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{job.employer_name?.[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.employerName}>{job.employer_name}</Text>
              {job.employer_rating > 0 && (
                <Text style={styles.ratingText}>★ {Number(job.employer_rating).toFixed(1)}</Text>
              )}
            </View>
            {job.created_at && (
              <Text style={styles.timeSmall}>
                {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
              </Text>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Text style={styles.statText}>{job.views_count || 0} views</Text>
          <Text style={styles.statDot}>·</Text>
          <Text style={styles.statText}>{job.applications_count || 0} applications</Text>
        </View>

        {/* Applications (Employer only) */}
        {isMyJob && (applications || []).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Applications ({applications.length})</Text>
            {(applications || []).map(app => (
              <View key={app.id} style={styles.appCard}>
                <View style={styles.appHeader}>
                  <View style={styles.appAvatar}>
                    <Text style={styles.appAvatarText}>{app.worker_name?.[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.appName}>{app.worker_name}</Text>
                    {app.worker_rating > 0 && (
                      <Text style={styles.appRating}>★ {Number(app.worker_rating).toFixed(1)}</Text>
                    )}
                    {app.proposed_rate && (
                      <Text style={styles.appRate}>Quoted: ₹{app.proposed_rate}</Text>
                    )}
                  </View>
                  <View style={[styles.appStatusBadge, { backgroundColor: app.status === 'pending' ? '#FEF3C7' : app.status === 'accepted' ? '#D1FAE5' : '#FEE2E2' }]}>
                    <Text style={[styles.appStatusText, { color: app.status === 'pending' ? '#D97706' : app.status === 'accepted' ? '#1A7A4C' : '#DC2626' }]}>
                      {app.status}
                    </Text>
                  </View>
                </View>
                {app.message && <Text style={styles.appMessage}>{app.message}</Text>}
                {app.status === 'pending' && (
                  <View style={styles.appActions}>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => acceptMutation.mutate(app.id)}
                      disabled={acceptMutation.isPending}>
                      <Text style={styles.acceptBtnText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => rejectMutation.mutate(app.id)}
                      disabled={rejectMutation.isPending}>
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.profileBtn}
                      onPress={() => navigation.navigate('WorkerProfile', { id: app.worker_id })}>
                      <Text style={styles.profileBtnText}>Profile</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {app.status === 'accepted' && (
                  <TouchableOpacity
                    style={styles.trackBtn}
                    onPress={() => navigation.navigate('Tracking', { bookingId: app.id })}>
                    <Ionicons name="navigate" size={14} color="white" />
                    <Text style={styles.trackBtnText}>Track Worker</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        {canApply && (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowApply(true)}>
            <Text style={styles.primaryBtnText}>Apply for this Job</Text>
          </TouchableOpacity>
        )}
        {alreadyApplied && (
          <View style={styles.appliedBar}>
            <View style={[styles.appliedDot, { backgroundColor: myBooking.status === 'accepted' ? '#1A7A4C' : '#D97706' }]} />
            <Text style={styles.appliedText}>
              Application {myBooking.status}
            </Text>
            {myBooking.status === 'accepted' && (
              <TouchableOpacity
                style={styles.trackSmallBtn}
                onPress={() => navigation.navigate('Tracking', { bookingId: myBooking.id })}>
                <Ionicons name="navigate" size={14} color="#1D4ED8" />
                <Text style={styles.trackSmallText}>Track</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {isMyJob && job.status === 'open' && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#2C2417' }]}
            onPress={() => navigation.navigate('PostJob', { editId: id })}>
            <Text style={styles.primaryBtnText}>Edit Job</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Apply Modal */}
      <Modal visible={showApply} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowApply(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Apply for Job</Text>
          <Text style={styles.modalSub}>{job.title}</Text>

          <Text style={styles.fieldLabel}>
            Your Rate (₹){job.budget_max ? ` — Budget: ₹${job.budget_max}` : ''}
          </Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder={`${job.budget_max || 500}`}
            value={proposedRate}
            onChangeText={setProposedRate}
          />

          <Text style={styles.fieldLabel}>Message (optional)</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Introduce yourself and why you're a good fit..."
            multiline numberOfLines={3}
            value={message}
            onChangeText={setMessage}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowApply(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, applyMutation.isPending && { opacity: 0.7 }]}
              onPress={() => applyMutation.mutate()}
              disabled={applyMutation.isPending}>
              <Text style={styles.submitBtnText}>
                {applyMutation.isPending ? 'Applying...' : 'Submit Application'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F2' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF7F2' },
  errorText: { fontSize: 16, color: '#A08060', marginBottom: 12 },
  linkText: { color: '#F4600C', fontWeight: '600', fontSize: 15 },
  headerGradient: { padding: 20, paddingTop: 50, paddingBottom: 24 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  urgentPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEE2E2', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  urgentText: { fontSize: 11, fontWeight: '700', color: '#DC2626' },
  statusPill: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  categoryPill: { backgroundColor: 'rgba(244,96,12,0.2)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  categoryPillText: { fontSize: 12, fontWeight: '600', color: '#FF9F6A' },
  jobTitle: { fontSize: 24, fontWeight: '700', color: 'white', lineHeight: 30, marginBottom: 8 },
  budget: { fontSize: 20, fontWeight: '700', color: '#FF9F6A' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, padding: 16, paddingBottom: 0, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#F0EAE0' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 13, color: '#5C4A32', fontWeight: '500' },
  section: { backgroundColor: 'white', margin: 0, marginTop: 8, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2C2417', marginBottom: 10 },
  descText: { fontSize: 15, color: '#5C4A32', lineHeight: 24 },
  requirementRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  bullet: { color: '#F4600C', fontSize: 16, lineHeight: 22 },
  requirementText: { fontSize: 14, color: '#5C4A32', flex: 1, lineHeight: 22 },
  employerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(244,96,12,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#F4600C' },
  employerName: { fontSize: 15, fontWeight: '700', color: '#2C2417' },
  ratingText: { fontSize: 13, color: '#F59E0B', fontWeight: '600' },
  timeSmall: { fontSize: 12, color: '#A08060' },
  statsRow: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 10, backgroundColor: 'white', marginTop: 1 },
  statText: { fontSize: 12, color: '#A08060' },
  statDot: { fontSize: 12, color: '#A08060', marginHorizontal: 6 },
  appCard: { backgroundColor: '#FAF7F2', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F0EAE0' },
  appHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  appAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(244,96,12,0.15)', alignItems: 'center', justifyContent: 'center' },
  appAvatarText: { fontSize: 16, fontWeight: '700', color: '#F4600C' },
  appName: { fontSize: 14, fontWeight: '700', color: '#2C2417' },
  appRating: { fontSize: 12, color: '#F59E0B', fontWeight: '600' },
  appRate: { fontSize: 12, color: '#1A7A4C', fontWeight: '600' },
  appStatusBadge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  appStatusText: { fontSize: 11, fontWeight: '700' },
  appMessage: { fontSize: 13, color: '#5C4A32', lineHeight: 18, marginBottom: 10 },
  appActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: { flex: 1, backgroundColor: '#1A7A4C', borderRadius: 8, padding: 10, alignItems: 'center' },
  acceptBtnText: { color: 'white', fontWeight: '600', fontSize: 13 },
  rejectBtn: { flex: 1, backgroundColor: 'white', borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1.5, borderColor: '#FEE2E2' },
  rejectBtnText: { color: '#DC2626', fontWeight: '600', fontSize: 13 },
  profileBtn: { flex: 1, backgroundColor: 'white', borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1.5, borderColor: '#F0EAE0' },
  profileBtnText: { color: '#5C4A32', fontWeight: '600', fontSize: 13 },
  trackBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#1D4ED8', borderRadius: 8, padding: 10, marginTop: 4 },
  trackBtnText: { color: 'white', fontWeight: '600', fontSize: 13 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: 16, paddingBottom: 32, borderTopWidth: 1, borderColor: '#F0EAE0', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8 },
  primaryBtn: { backgroundColor: '#F4600C', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  appliedBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FAF7F2', borderRadius: 12, padding: 14 },
  appliedDot: { width: 10, height: 10, borderRadius: 5 },
  appliedText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#2C2417', textTransform: 'capitalize' },
  trackSmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8, borderRadius: 8, backgroundColor: '#DBEAFE' },
  trackSmallText: { color: '#1D4ED8', fontWeight: '600', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#F0EAE0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#2C2417', marginBottom: 4 },
  modalSub: { fontSize: 14, color: '#A08060', marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#5C4A32', marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: '#F0EAE0', borderRadius: 10, padding: 13, fontSize: 15, color: '#2C2417', backgroundColor: 'white', marginBottom: 16 },
  textarea: { height: 85, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#F0EAE0', alignItems: 'center' },
  cancelBtnText: { color: '#A08060', fontWeight: '600', fontSize: 15 },
  submitBtn: { flex: 2, padding: 14, borderRadius: 10, backgroundColor: '#F4600C', alignItems: 'center' },
  submitBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});