
// ─── TrackingScreen.js (Key mobile screen) ──────────────────
// src/screens/TrackingScreen.js

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Dimensions, ActivityIndicator
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSocket } from '../hooks/useSocket';
import { bookingsAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';

const { height } = Dimensions.get('window');

export function TrackingScreen({ route, navigation }) {
  const { bookingId } = route.params;
  const { user } = useAuthStore();
  const { emit, on, off } = useSocket();
  const mapRef = useRef(null);
  const [workerCoord, setWorkerCoord] = useState(null);
  const [jobCoord, setJobCoord] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [eta, setEta] = useState(null);
  const locationWatchRef = useRef(null);
  const isWorker = user?.role === 'worker';

  const { data: booking } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingsAPI.get(bookingId).then(r => r.data)
  });

  // Worker: Send live location
  useEffect(() => {
    if (!isWorker || booking?.status !== 'in_progress') return;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location access is required for job tracking');
        return;
      }

      await Location.requestBackgroundPermissionsAsync();

      locationWatchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (location) => {
          const { latitude, longitude, accuracy, speed, heading } = location.coords;
          emit('location:update', {
            lat: latitude, lng: longitude,
            accuracy, speed, heading,
            booking_id: bookingId
          });
        }
      );
    })();

    return () => { locationWatchRef.current?.remove(); };
  }, [isWorker, booking?.status, bookingId]);

  // Employer: Receive worker location
  useEffect(() => {
    if (isWorker) return;

    const handler = (data) => {
      if (data.booking_id !== bookingId) return;
      const coord = { latitude: data.lat, longitude: data.lng };
      setWorkerCoord(coord);

      if (mapRef.current) {
        mapRef.current.animateToRegion({
          ...coord, latitudeDelta: 0.01, longitudeDelta: 0.01
        }, 800);
      }
    };

    on('worker:location', handler);
    return () => off('worker:location', handler);
  }, [bookingId, isWorker]);

  // Set job location from booking data
  useEffect(() => {
    if (booking?.job_lat && booking?.job_lng) {
      setJobCoord({ latitude: booking.job_lat, longitude: booking.job_lng });
    }
  }, [booking]);

  const handleCall = () => {
    const phone = isWorker ? booking?.employer_phone : booking?.worker_phone;
    if (phone) import('expo-linking').then(m => m.openURL(`tel:${phone}`));
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: jobCoord?.latitude || 25.3176,
          longitude: jobCoord?.longitude || 82.9739,
          latitudeDelta: 0.05, longitudeDelta: 0.05
        }}
        showsUserLocation={isWorker}
        showsMyLocationButton
      >
        {/* Job Location */}
        {jobCoord && (
          <Marker coordinate={jobCoord} title="Job Location">
            <View style={styles.jobMarker}>
              <Ionicons name="location" size={20} color="white" />
            </View>
          </Marker>
        )}

        {/* Worker Location */}
        {workerCoord && !isWorker && (
          <Marker coordinate={workerCoord} title="Worker">
            <View style={styles.workerMarker}>
              <Ionicons name="person" size={16} color="white" />
            </View>
          </Marker>
        )}

        {/* Route polyline */}
        {routeCoords.length > 1 && (
          <Polyline coordinates={routeCoords} strokeColor="#F4600C" strokeWidth={3} />
        )}
      </MapView>

      {/* Back button */}
      <SafeAreaView style={styles.headerOverlay}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#2C2417" />
        </TouchableOpacity>
        <View style={styles.statusPill}>
          <View style={[styles.dot, { backgroundColor: booking?.status === 'in_progress' ? '#1A7A4C' : '#D97706' }]} />
          <Text style={styles.statusText}>
            {booking?.status === 'in_progress' ? 'Work in progress' : 'On the way'}
          </Text>
        </View>
      </SafeAreaView>

      {/* Bottom Panel */}
      <View style={styles.bottomPanel}>
        {booking && (
          <>
            <View style={styles.workerInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(isWorker ? booking.employer_name : booking.worker_name)?.[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.workerName}>
                  {isWorker ? booking.employer_name : booking.worker_name}
                </Text>
                <Text style={styles.jobTitle}>{booking.job_title}</Text>
              </View>
              {eta && !isWorker && (
                <View style={styles.etaBadge}>
                  <Text style={styles.etaTime}>{eta}</Text>
                  <Text style={styles.etaLabel}>ETA</Text>
                </View>
              )}
            </View>

            {workerCoord && !isWorker && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Worker location updating live</Text>
              </View>
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
                <Ionicons name="call" size={20} color="#1A7A4C" />
                <Text style={styles.actionBtnText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}
                onPress={() => navigation.navigate('Chat', { bookingId })}>
                <Ionicons name="chatbubble" size={20} color="#1D4ED8" />
                <Text style={styles.actionBtnText}>Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { borderColor: '#FEE2E2' }]}
                onPress={() => Alert.alert('Help', 'Contact support at support@worknear.in')}>
                <Ionicons name="help-circle" size={20} color="#DC2626" />
                <Text style={styles.actionBtnText}>Help</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F2' },
  map: { flex: 1 },
  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  backBtn: { backgroundColor: 'white', borderRadius: 99, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  statusPill: { backgroundColor: 'white', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  dot: { width: 8, height: 8, borderRadius: 99 },
  statusText: { fontSize: 13, fontWeight: '600', color: '#2C2417' },
  jobMarker: { backgroundColor: '#F4600C', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'white', elevation: 6 },
  workerMarker: { backgroundColor: '#1D4ED8', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white', elevation: 6 },
  bottomPanel: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 12 },
  workerInfo: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0EAE0' },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(244,96,12,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#F4600C' },
  workerName: { fontSize: 16, fontWeight: '700', color: '#2C2417', marginBottom: 2 },
  jobTitle: { fontSize: 13, color: '#A08060' },
  etaBadge: { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, alignItems: 'center', minWidth: 60 },
  etaTime: { fontSize: 16, fontWeight: '700', color: '#D97706' },
  etaLabel: { fontSize: 11, color: '#A08060' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D1FAE5', borderRadius: 10, padding: 10, marginBottom: 14 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1A7A4C' },
  liveText: { fontSize: 13, fontWeight: '600', color: '#1A7A4C' },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#F0EAE0', backgroundColor: 'white' },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#2C2417' },
});

export default TrackingScreen;