// ============================================================
// React Native — BookingDetailScreen.js
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, ActivityIndicator, FlatList,
  KeyboardAvoidingView, Platform, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { bookingsAPI, reviewsAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useSocket } from '../hooks/useSocket';

const STATUS_STEPS = [
  { key: 'pending',     label: 'Applied' },
  { key: 'accepted',    label: 'Accepted' },
  { key: 'in_progress', label: 'Working' },
  { key: 'completed',   label: 'Done' },
];

export default function BookingDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuthStore();
  const { emit, on, off } = useSocket();
  const qc = useQueryClient();
  const isWorker = user?.role === 'worker';

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const otpRefs = useRef([]);
  const chatScrollRef = useRef(null);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsAPI.get(id).then(r => r.data),
    refetchInterval: (data) => data?.status === 'in_progress' ? 30000 : false
  });

  // Listen for real-time events
  useEffect(() => {
    const handleJobStarted = (data) => {
      if (data.booking_id === id) {
        qc.invalidateQueries(['booking', id]);
        Alert.alert('Job Started!', 'Work has begun.');
      }
    };
    const handleJobCompleted = (data) => {
      if (data.booking_id === id) {
        qc.invalidateQueries(['booking', id]);
        setShowReviewModal(true);
      }
    };
    const handleChatMessage = (data) => {
      if (data.booking_id === id) {
        setChatMessages(prev => [...prev, data]);
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }
    };

    on('job:started', handleJobStarted);
    on('job:completed', handleJobCompleted);
    on('chat:message', handleChatMessage);

    // Load chat history
    emit('chat:history', { booking_id: id });
    on('chat:history', (messages) => {
      setChatMessages(messages);
    });

    return () => {
      off('job:started', handleJobStarted);
      off('job:completed', handleJobCompleted);
      off('chat:message', handleChatMessage);
    };
  }, [id]);

  const handleOtpChange = (value, index) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value.slice(-1);
    setOtpDigits(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (!value && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleStartJob = () => {
    const otp = otpDigits.join('');
    if (otp.length < 6) {
      Alert.alert('Error', 'Enter all 6 OTP digits');
      return;
    }
    emit('booking:start', { booking_id: id, otp });
    setShowOtpModal(false);
    setOtpDigits(['', '', '', '', '', '']);
    Alert.alert('Starting...', 'Verifying OTP with server');
  };

  const handleCompleteJob = () => {
    Alert.alert(
      'Complete Job?',
      'Confirm that the work is done.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', onPress: () => emit('booking:complete', { booking_id: id }) }
      ]
    );
  };

  const handleCall = () => {
    const phone = isWorker ? booking?.employer_phone : booking?.worker_phone;
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const submitReview = async () => {
    try {
      await reviewsAPI.create(id, { rating, comment: reviewComment });
      Alert.alert('Review Submitted!', 'Thank you for your feedback.');
      setShowReviewModal(false);
      qc.invalidateQueries(['booking', id]);
    } catch {
      Alert.alert('Error', 'Failed to submit review');
    }
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    emit('chat:message', { booking_id: id, message: chatInput.trim() });
    setChatMessages(prev => [...prev, {
      message: chatInput.trim(),
      sender_id: user.id,
      sent_at: new Date()
    }]);
    setChatInput('');
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#F4600C" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: '#A08060' }}>Booking not found</Text>
      </View>
    );
  }

  const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === booking.status);
  const otherParty = isWorker
    ? { name: booking.employer_name, phone: booking.employer_phone, label: 'Employer' }
    : { name: booking.worker_name, phone: booking.worker_phone, label: 'Worker' };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Progress stepper */}
        {!['cancelled', 'rejected'].includes(booking.status) && (
          <View style={styles.stepperContainer}>
            {STATUS_STEPS.map((step, i) => (
              <React.Fragment key={step.key}>
                <View style={styles.stepItem}>
                  <View style={[
                    styles.stepCircle,
                    i <= currentStepIdx && styles.stepCircleActive,
                    i < currentStepIdx && styles.stepCircleDone
                  ]}>
                    {i < currentStepIdx
                      ? <Ionicons name="checkmark" size={14} color="white" />
                      : <Text style={[styles.stepNum, i <= currentStepIdx && { color: 'white' }]}>{i + 1}</Text>
                    }
                  </View>
                  <Text style={[styles.stepLabel, i <= currentStepIdx && styles.stepLabelActive]}>
                    {step.label}
                  </Text>
                </View>
                {i < STATUS_STEPS.length - 1 && (
                  <View style={[styles.stepLine, i < currentStepIdx && styles.stepLineActive]} />
                )}
              </React.Fragment>
            ))}
          </View>
        )}

        {/* Status banner */}
        {['cancelled', 'rejected'].includes(booking.status) && (
          <View style={styles.cancelBanner}>
            <Ionicons name="close-circle" size={20} color="#DC2626" />
            <Text style={styles.cancelText}>This booking was {booking.status}</Text>
          </View>
        )}

        {/* Job Info */}
        <LinearGradient colors={['#2C2417', '#5C4A32']} style={styles.jobHeader}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>{booking.category_name}</Text>
          </View>
          <Text style={styles.jobTitle}>{booking.job_title}</Text>
          {booking.job_address && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.7)" />
              <Text style={styles.locationText}>{booking.job_address}</Text>
            </View>
          )}
          {booking.proposed_rate && (
            <Text style={styles.rateText}>
              ₹{Number(booking.proposed_rate).toLocaleString('en-IN')} agreed
            </Text>
          )}
        </LinearGradient>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {[
            { label: 'Applied', time: booking.created_at },
            { label: 'Accepted', time: booking.status !== 'pending' ? booking.updated_at : null },
            { label: 'Started', time: booking.started_at },
            { label: 'Completed', time: booking.completed_at },
          ].filter(t => t.time).map((t, i) => (
            <View key={i} style={styles.timelineRow}>
              <View style={styles.timelineDot} />
              <Text style={styles.timelineLabel}>{t.label}</Text>
              <Text style={styles.timelineTime}>
                {format(new Date(t.time), 'dd MMM, h:mm a')}
              </Text>
            </View>
          ))}
        </View>

        {/* Other party card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{otherParty.label}</Text>
          <View style={styles.partyRow}>
            <View style={styles.partyAvatar}>
              <Text style={styles.partyAvatarText}>{otherParty.name?.[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.partyName}>{otherParty.name}</Text>
            </View>
            <View style={styles.partyActions}>
              {['accepted', 'in_progress', 'completed'].includes(booking.status) && (
                <TouchableOpacity style={styles.actionIcon} onPress={handleCall}>
                  <Ionicons name="call" size={18} color="#1A7A4C" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.actionIcon, { backgroundColor: '#DBEAFE' }]}
                onPress={() => setShowChatModal(true)}>
                <Ionicons name="chatbubble-ellipses" size={18} color="#1D4ED8" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Accepted — OTP info */}
        {booking.status === 'accepted' && isWorker && (
          <View style={styles.infoBanner}>
            <Ionicons name="key" size={18} color="#D97706" />
            <Text style={styles.infoBannerText}>
              Ask the employer for the 6-digit OTP to start the job
            </Text>
          </View>
        )}
        {booking.status === 'accepted' && !isWorker && booking.otp && (
          <View style={[styles.infoBanner, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="lock-open" size={18} color="#1A7A4C" />
            <View>
              <Text style={[styles.infoBannerText, { color: '#1A7A4C' }]}>
                Your start OTP (share with worker):
              </Text>
              <Text style={styles.otpDisplay}>{booking.otp}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        {/* Worker: Start with OTP */}
        {isWorker && booking.status === 'accepted' && (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowOtpModal(true)}>
            <Ionicons name="key" size={18} color="white" />
            <Text style={styles.primaryBtnText}>Enter OTP to Start</Text>
          </TouchableOpacity>
        )}

        {/* Worker: Complete */}
        {isWorker && booking.status === 'in_progress' && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 2, backgroundColor: '#1A7A4C' }]}
              onPress={handleCompleteJob}>
              <Ionicons name="checkmark-circle" size={18} color="white" />
              <Text style={styles.primaryBtnText}>Mark Complete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { flex: 1 }]}
              onPress={() => navigation.navigate('Tracking', { bookingId: id })}>
              <Ionicons name="navigate" size={18} color="#F4600C" />
              <Text style={styles.secondaryBtnText}>Track</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Employer: Track */}
        {!isWorker && booking.status === 'in_progress' && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#1D4ED8' }]}
            onPress={() => navigation.navigate('Tracking', { bookingId: id })}>
            <Ionicons name="navigate" size={18} color="white" />
            <Text style={styles.primaryBtnText}>Track Worker Live</Text>
          </TouchableOpacity>
        )}

        {/* Review button */}
        {booking.status === 'completed' && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowReviewModal(true)}>
            <Ionicons name="star" size={18} color="#F4600C" />
            <Text style={styles.secondaryBtnText}>Leave a Review</Text>
          </TouchableOpacity>
        )}

        {/* Idle cancelled state */}
        {['cancelled', 'rejected'].includes(booking.status) && (
          <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.navigate('Jobs')}>
            <Text style={styles.ghostBtnText}>Browse More Jobs</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── OTP Modal ── */}
      <Modal visible={showOtpModal} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowOtpModal(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Enter Start OTP</Text>
          <Text style={styles.sheetSub}>Ask the employer for their 6-digit OTP</Text>
          <View style={styles.otpRow}>
            {otpDigits.map((d, i) => (
              <TextInput
                key={i}
                ref={ref => otpRefs.current[i] = ref}
                style={[styles.otpBox, d && styles.otpBoxFilled]}
                maxLength={1}
                keyboardType="number-pad"
                value={d}
                onChangeText={v => handleOtpChange(v, i)}
              />
            ))}
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 8 }]}
            onPress={handleStartJob}
            disabled={otpDigits.join('').length < 6}>
            <Text style={styles.primaryBtnText}>Start Job</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Review Modal ── */}
      <Modal visible={showReviewModal} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowReviewModal(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Rate Your Experience</Text>
          <Text style={styles.sheetSub}>How was {otherParty.name}?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(s => (
              <TouchableOpacity key={s} onPress={() => setRating(s)}>
                <Text style={[styles.star, s <= rating && styles.starActive]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.input, styles.textarea, { marginBottom: 16 }]}
            placeholder="Write a comment (optional)..."
            multiline
            numberOfLines={3}
            value={reviewComment}
            onChangeText={setReviewComment}
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={submitReview}>
            <Text style={styles.primaryBtnText}>Submit Review</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Chat Modal ── */}
      <Modal visible={showChatModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF7F2' }}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setShowChatModal(false)}>
              <Ionicons name="close" size={24} color="#2C2417" />
            </TouchableOpacity>
            <Text style={styles.chatHeaderTitle}>Chat with {otherParty.name}</Text>
            <View style={{ width: 24 }} />
          </View>

          <FlatList
            ref={chatScrollRef}
            data={chatMessages}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.chatList}
            onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <Text style={styles.chatEmpty}>No messages yet. Say hello!</Text>
            }
            renderItem={({ item }) => {
              const isMine = item.sender_id === user.id;
              return (
                <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
                  <Text style={[styles.bubbleText, isMine && { color: 'white' }]}>
                    {item.message}
                  </Text>
                  <Text style={[styles.bubbleTime, isMine && { color: 'rgba(255,255,255,0.7)' }]}>
                    {item.sent_at ? format(new Date(item.sent_at), 'h:mm a') : ''}
                  </Text>
                </View>
              );
            }}
          />

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="Type a message..."
                value={chatInput}
                onChangeText={setChatInput}
                multiline
              />
              <TouchableOpacity style={styles.sendBtn} onPress={sendChat}>
                <Ionicons name="send" size={18} color="white" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F2' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 0, backgroundColor: 'white' },
  stepItem: { alignItems: 'center', gap: 5 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F0EAE0', alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { backgroundColor: '#F4600C' },
  stepCircleDone: { backgroundColor: '#1A7A4C' },
  stepNum: { fontSize: 13, fontWeight: '700', color: '#A08060' },
  stepLine: { flex: 1, height: 3, backgroundColor: '#F0EAE0', marginBottom: 18, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: '#F4600C' },
  stepLabel: { fontSize: 10, fontWeight: '600', color: '#A08060', textAlign: 'center' },
  stepLabelActive: { color: '#F4600C' },
  cancelBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, padding: 14, backgroundColor: '#FEE2E2', borderRadius: 12 },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#DC2626', textTransform: 'capitalize' },
  jobHeader: { padding: 20 },
  categoryPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(244,96,12,0.25)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 10 },
  categoryPillText: { fontSize: 12, fontWeight: '600', color: '#FF9F6A' },
  jobTitle: { fontSize: 22, fontWeight: '700', color: 'white', marginBottom: 8, lineHeight: 28 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  locationText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  rateText: { fontSize: 18, fontWeight: '700', color: '#FF9F6A' },
  section: { backgroundColor: 'white', marginTop: 8, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#2C2417', marginBottom: 12 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F4600C' },
  timelineLabel: { fontSize: 13, fontWeight: '600', color: '#2C2417', flex: 1 },
  timelineTime: { fontSize: 12, color: '#A08060' },
  partyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  partyAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(244,96,12,0.15)', alignItems: 'center', justifyContent: 'center' },
  partyAvatarText: { fontSize: 18, fontWeight: '700', color: '#F4600C' },
  partyName: { fontSize: 16, fontWeight: '700', color: '#2C2417' },
  partyActions: { flexDirection: 'row', gap: 8 },
  actionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  infoBanner: { margin: 16, marginTop: 8, padding: 14, backgroundColor: '#FEF3C7', borderRadius: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  infoBannerText: { fontSize: 13, fontWeight: '500', color: '#D97706', flex: 1 },
  otpDisplay: { fontSize: 28, fontWeight: '800', color: '#1A7A4C', letterSpacing: 6, marginTop: 4 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: 16, paddingBottom: 32, borderTopWidth: 1, borderColor: '#F0EAE0', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8 },
  primaryBtn: { backgroundColor: '#F4600C', borderRadius: 12, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  secondaryBtn: { borderRadius: 12, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: '#F4600C', backgroundColor: 'white' },
  secondaryBtnText: { color: '#F4600C', fontWeight: '700', fontSize: 16 },
  ghostBtn: { borderRadius: 12, padding: 15, alignItems: 'center', backgroundColor: '#FAF7F2' },
  ghostBtnText: { color: '#5C4A32', fontWeight: '600', fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#F0EAE0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 22, fontWeight: '700', color: '#2C2417', marginBottom: 4 },
  sheetSub: { fontSize: 14, color: '#A08060', marginBottom: 24 },
  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 8 },
  otpBox: { width: 46, height: 54, textAlign: 'center', fontSize: 22, fontWeight: '700', borderWidth: 2, borderColor: '#F0EAE0', borderRadius: 10, color: '#2C2417', backgroundColor: 'white' },
  otpBoxFilled: { borderColor: '#F4600C', backgroundColor: 'rgba(244,96,12,0.05)' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  star: { fontSize: 40, color: '#E5E7EB' },
  starActive: { color: '#F59E0B' },
  input: { borderWidth: 1.5, borderColor: '#F0EAE0', borderRadius: 10, padding: 12, fontSize: 15, color: '#2C2417', backgroundColor: 'white' },
  textarea: { height: 90, textAlignVertical: 'top' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#F0EAE0' },
  chatHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#2C2417' },
  chatList: { padding: 16, gap: 8, flexGrow: 1 },
  chatEmpty: { textAlign: 'center', color: '#A08060', fontSize: 14, marginTop: 40 },
  bubble: { maxWidth: '75%', padding: 10, borderRadius: 14, marginBottom: 4 },
  bubbleMine: { backgroundColor: '#F4600C', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: 'white', alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#F0EAE0' },
  bubbleText: { fontSize: 15, color: '#2C2417', lineHeight: 20 },
  bubbleTime: { fontSize: 10, color: '#A08060', marginTop: 3, textAlign: 'right' },
  chatInputRow: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 24, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#F0EAE0' },
  chatInput: { flex: 1, borderWidth: 1.5, borderColor: '#F0EAE0', borderRadius: 12, padding: 12, fontSize: 15, maxHeight: 100, color: '#2C2417' },
  sendBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#F4600C', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
});