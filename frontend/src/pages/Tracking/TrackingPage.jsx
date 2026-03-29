// ============================================================
// Real-Time Tracking Page (src/pages/Tracking/TrackingPage.jsx)
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Navigation, Phone, MessageCircle, MapPin, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useSocketStore } from '../../stores/socketStore';
import { useAuthStore } from '../../stores/authStore';
import { bookingsAPI } from '../../services/api';

export default function TrackingPage() {
  const { bookingId } = useParams();
  const { user } = useAuthStore();
  const { emit, socket } = useSocketStore();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const workerMarker = useRef(null);
  const jobMarker = useRef(null);
  const [workerLocation, setWorkerLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [trackingStatus, setTrackingStatus] = useState('waiting'); // waiting, active, arrived

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingsAPI.get(bookingId).then(r => r.data),
    refetchInterval: 30000
  });

  const isWorker = user?.role === 'worker';

  // Worker: start sending location
  useEffect(() => {
    if (!isWorker || !bookingId || booking?.status !== 'in_progress') return;

    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude: lat, longitude: lng, accuracy, speed, heading } = pos.coords;
          emit('location:update', { lat, lng, accuracy, speed, heading, booking_id: bookingId });
        },
        (err) => console.error('Geolocation error:', err),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }

    return () => { if (watchId !== undefined) navigator.geolocation.clearWatch(watchId); };
  }, [isWorker, bookingId, booking?.status]);

  // Employer: receive worker location
  useEffect(() => {
    if (isWorker) return;

    const handler = (e) => {
      const data = e.detail;
      if (data.booking_id !== bookingId) return;
      setWorkerLocation(data);
      setTrackingStatus('active');
      if (mapInstance.current && workerMarker.current) {
        const pos = { lat: data.lat, lng: data.lng };
        workerMarker.current.setPosition(pos);
        mapInstance.current.panTo(pos);
        calculateETA(pos);
      }
    };

    window.addEventListener('worker-location-update', handler);
    return () => window.removeEventListener('worker-location-update', handler);
  }, [bookingId, isWorker]);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current || !window.google || !booking) return;

    const jobLat = booking.job_lat || 25.3176;
    const jobLng = booking.job_lng || 82.9739;

    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: jobLat, lng: jobLng },
      zoom: 14,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'simplified' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] }
      ],
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy'
    });

    // Job location marker (destination)
    jobMarker.current = new window.google.maps.Marker({
      position: { lat: jobLat, lng: jobLng },
      map: mapInstance.current,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 12, fillColor: '#F4600C', fillOpacity: 1,
        strokeColor: 'white', strokeWeight: 3
      },
      title: 'Job Location'
    });

    // Worker marker
    workerMarker.current = new window.google.maps.Marker({
      position: { lat: jobLat + 0.01, lng: jobLng + 0.01 },
      map: mapInstance.current,
      icon: {
        url: 'https://maps.google.com/mapfiles/kml/shapes/man.png',
        scaledSize: new window.google.maps.Size(32, 32)
      },
      title: 'Worker Location'
    });
  }, [booking]);

  const calculateETA = (workerPos) => {
    if (!booking || !window.google) return;
    const service = new window.google.maps.DistanceMatrixService();
    service.getDistanceMatrix({
      origins: [workerPos],
      destinations: [{ lat: booking.job_lat || 25.3176, lng: booking.job_lng || 82.9739 }],
      travelMode: 'DRIVING'
    }, (response, status) => {
      if (status === 'OK') {
        const element = response.rows[0].elements[0];
        if (element.status === 'OK') {
          setEta(element.duration.text);
        }
      }
    });
  };

  const statusConfig = {
    pending: { color: '#A08060', icon: <Clock size={20} />, label: 'Pending acceptance' },
    accepted: { color: '#1D4ED8', icon: <Navigation size={20} />, label: 'Worker on the way' },
    in_progress: { color: '#D97706', icon: <AlertCircle size={20} />, label: 'Work in progress' },
    completed: { color: '#1A7A4C', icon: <CheckCircle size={20} />, label: 'Job completed' },
  };

  const currentStatus = statusConfig[booking?.status] || statusConfig.pending;

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#A08060' }}>
      Loading tracking...
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#FAF7F2' }}>
      {/* Header */}
      <div style={{ background: 'white', padding: '16px 20px', borderBottom: '1px solid #F0EAE0', display: 'flex', alignItems: 'center', gap: 12, zIndex: 10 }}>
        <Link to={`/bookings/${bookingId}`} style={{ color: '#5C4A32', display: 'flex' }}>
          ←
        </Link>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontWeight: 700, fontSize: 16, color: '#2C2417', margin: 0 }}>Live Tracking</h2>
          <p style={{ fontSize: 12, color: '#A08060', margin: 0 }}>Booking #{bookingId?.slice(0, 8)}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: currentStatus.color, fontWeight: 600, fontSize: 13 }}>
          {currentStatus.icon}
          {currentStatus.label}
        </div>
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ flex: 1, background: '#E8E0D4' }}>
        {!window.google && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#A08060' }}>
            <MapPin size={48} color="#F4600C" />
            <p style={{ fontSize: 16, fontWeight: 600, color: '#2C2417', margin: 0 }}>Live Tracking</p>
            <p style={{ fontSize: 14, margin: 0 }}>Google Maps API key required for live tracking</p>
            <p style={{ fontSize: 12, margin: 0 }}>Worker location updates via WebSocket are active</p>
          </div>
        )}
      </div>

      {/* Bottom Panel */}
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }}
        style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 20, boxShadow: '0 -4px 24px rgba(44,36,23,0.1)', minHeight: 220 }}>

        {/* Worker info */}
        {booking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #F0EAE0' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #F4600C22, #F4600C44)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#F4600C' }}>
              {(isWorker ? booking.employer_name : booking.worker_name)?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16, color: '#2C2417', margin: '0 0 2px' }}>
                {isWorker ? booking.employer_name : booking.worker_name}
              </h3>
              <p style={{ fontSize: 13, color: '#A08060', margin: 0 }}>{booking.job_title}</p>
            </div>

            {/* ETA badge */}
            {eta && !isWorker && (
              <div style={{ background: '#FEF3C7', color: '#D97706', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{eta}</div>
                <div style={{ fontSize: 11, color: '#A08060' }}>ETA</div>
              </div>
            )}
          </div>
        )}

        {/* Live location status */}
        {workerLocation && !isWorker && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 14px', background: '#D1FAE5', borderRadius: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1A7A4C', animation: 'pulse 1s infinite' }} />
            <span style={{ color: '#1A7A4C', fontWeight: 600, fontSize: 13 }}>Worker location updating live</span>
            <span style={{ color: '#A08060', fontSize: 12, marginLeft: 'auto' }}>{new Date(workerLocation.updated_at).toLocaleTimeString()}</span>
          </div>
        )}

        {/* OTP Start (for worker) */}
        {isWorker && booking?.status === 'accepted' && (
          <div style={{ marginBottom: 16, padding: 16, background: '#FEF3C7', borderRadius: 12 }}>
            <p style={{ fontWeight: 600, color: '#D97706', fontSize: 14, margin: '0 0 8px' }}>Ask employer for OTP to start work</p>
            <p style={{ fontSize: 12, color: '#A08060', margin: 0 }}>Employer received OTP when they confirmed the booking</p>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', borderRadius: 10, border: '1.5px solid #F0EAE0', background: 'white', color: '#2C2417', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            <Phone size={16} color="#1A7A4C" /> Call
          </button>
          <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', borderRadius: 10, border: '1.5px solid #F0EAE0', background: 'white', color: '#2C2417', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            <MessageCircle size={16} color="#1D4ED8" /> Chat
          </button>
        </div>
      </motion.div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}