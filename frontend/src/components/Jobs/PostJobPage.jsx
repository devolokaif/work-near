// ============================================================
// Post Job Page (src/pages/Jobs/PostJobPage.jsx)
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MapPin, IndianRupee, Clock, Users, Zap, ChevronLeft, Check } from 'lucide-react';
import { jobsAPI, categoriesAPI } from '../../services/api';
import { useNotificationStore } from '../../stores/authStore';

const steps = ['Category', 'Details', 'Location', 'Review'];

export default function PostJobPage() {
  const navigate = useNavigate();
  const { addToast } = useNotificationStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    category_id: '', title: '', description: '',
    budget_min: '', budget_max: '', duration_hours: '',
    workers_needed: 1, is_urgent: false, scheduled_at: '',
    lat: null, lng: null, address_text: '', city: '', state: '', pincode: ''
  });
  const [errors, setErrors] = useState({});
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.list().then(r => r.data)
  });

  const mutation = useMutation({
    mutationFn: (data) => jobsAPI.create(data).then(r => r.data),
    onSuccess: (job) => {
      addToast({ type: 'success', title: 'Job Posted!', message: 'Workers will be notified shortly.' });
      navigate(`/jobs/${job.id}`);
    },
    onError: (err) => {
      addToast({ type: 'error', title: 'Failed', message: err.response?.data?.error || 'Could not post job' });
    }
  });

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // Initialize Google Maps when step 2 (Location)
  useEffect(() => {
    if (step !== 2 || !mapRef.current || mapInstance.current) return;
    if (!window.google) return;

    const lat = form.lat || 25.3176;
    const lng = form.lng || 82.9739;

    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center: { lat, lng }, zoom: 14,
      disableDefaultUI: true, zoomControl: true
    });

    markerRef.current = new window.google.maps.Marker({
      position: { lat, lng },
      map: mapInstance.current, draggable: true
    });

    mapInstance.current.addListener('click', (e) => {
      const lat = e.latLng.lat(), lng = e.latLng.lng();
      markerRef.current.setPosition({ lat, lng });
      update('lat', lat); update('lng', lng);
      reverseGeocode(lat, lng);
    });

    markerRef.current.addListener('dragend', (e) => {
      const lat = e.latLng.lat(), lng = e.latLng.lng();
      update('lat', lat); update('lng', lng);
      reverseGeocode(lat, lng);
    });

    // Auto-detect
    navigator.geolocation?.getCurrentPosition(pos => {
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      mapInstance.current.setCenter({ lat, lng });
      markerRef.current.setPosition({ lat, lng });
      update('lat', lat); update('lng', lng);
      reverseGeocode(lat, lng);
    });
  }, [step]);

  const reverseGeocode = async (lat, lng) => {
    if (!window.google) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const r = results[0];
        update('address_text', r.formatted_address);
        const comps = r.address_components;
        const get = (type) => comps.find(c => c.types.includes(type))?.long_name || '';
        update('city', get('locality') || get('administrative_area_level_2'));
        update('state', get('administrative_area_level_1'));
        update('pincode', get('postal_code'));
      }
    });
  };

  const validateStep = () => {
    const e = {};
    if (step === 0 && !form.category_id) e.category_id = 'Select a category';
    if (step === 1) {
      if (!form.title || form.title.length < 5) e.title = 'Title must be at least 5 characters';
      if (form.budget_max && form.budget_min && Number(form.budget_max) < Number(form.budget_min))
        e.budget = 'Max budget must be ≥ min budget';
    }
    if (step === 2 && !form.lat) e.location = 'Select a location on the map';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < steps.length - 1) setStep(s => s + 1);
    else handleSubmit();
  };

  const handleSubmit = () => {
    mutation.mutate({
      ...form,
      budget_min: form.budget_min ? Number(form.budget_min) : undefined,
      budget_max: form.budget_max ? Number(form.budget_max) : undefined,
      duration_hours: form.duration_hours ? Number(form.duration_hours) : undefined,
    });
  };

  const inputStyle = (err) => ({
    width: '100%', padding: '12px 16px', borderRadius: 10,
    border: `1.5px solid ${err ? '#DC2626' : '#F0EAE0'}`,
    fontSize: 15, background: 'white', color: '#2C2417',
    outline: 'none', fontFamily: 'DM Sans, sans-serif'
  });

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5C4A32', padding: 4, display: 'flex' }}>
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 26, color: '#2C2417', margin: 0 }}>Post a Job</h1>
          <p style={{ color: '#A08060', fontSize: 13, margin: 0 }}>Step {step + 1} of {steps.length}: {steps[step]}</p>
        </div>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= step ? '#F4600C' : '#F0EAE0', transition: 'background 0.3s' }} />
        ))}
      </div>

      <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>

        {/* STEP 0 — Category */}
        {step === 0 && (
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 20, color: '#2C2417', marginBottom: 6 }}>What type of work?</h2>
            <p style={{ color: '#A08060', fontSize: 14, marginBottom: 24 }}>Select the skill category for this job</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {(categories || []).map(cat => (
                <button key={cat.id} onClick={() => { update('category_id', cat.id); setErrors({}); }}
                  style={{ padding: '16px 12px', borderRadius: 12, border: `2px solid ${form.category_id === cat.id ? '#F4600C' : '#F0EAE0'}`, background: form.category_id === cat.id ? 'rgba(244,96,12,0.05)' : 'white', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{cat.icon_url || '🔧'}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#2C2417' }}>{cat.name}</div>
                </button>
              ))}
            </div>
            {errors.category_id && <p style={{ color: '#DC2626', fontSize: 13, marginTop: 8 }}>{errors.category_id}</p>}
          </div>
        )}

        {/* STEP 1 — Details */}
        {step === 1 && (
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 20, color: '#2C2417', marginBottom: 24 }}>Job Details</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5C4A32', marginBottom: 8 }}>Job Title *</label>
                <input style={inputStyle(errors.title)} placeholder="e.g. Fix bathroom leakage" value={form.title} onChange={e => update('title', e.target.value)} />
                {errors.title && <p style={{ color: '#DC2626', fontSize: 12, marginTop: 4 }}>{errors.title}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5C4A32', marginBottom: 8 }}>Description</label>
                <textarea style={{ ...inputStyle(false), height: 100, resize: 'vertical' }} placeholder="Describe the work in detail..." value={form.description} onChange={e => update('description', e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5C4A32', marginBottom: 8 }}>Min Budget (₹)</label>
                  <div style={{ position: 'relative' }}>
                    <IndianRupee size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#A08060' }} />
                    <input style={{ ...inputStyle(false), paddingLeft: 32 }} type="number" min="0" placeholder="500" value={form.budget_min} onChange={e => update('budget_min', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5C4A32', marginBottom: 8 }}>Max Budget (₹)</label>
                  <div style={{ position: 'relative' }}>
                    <IndianRupee size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#A08060' }} />
                    <input style={{ ...inputStyle(false), paddingLeft: 32 }} type="number" min="0" placeholder="1500" value={form.budget_max} onChange={e => update('budget_max', e.target.value)} />
                  </div>
                </div>
              </div>
              {errors.budget && <p style={{ color: '#DC2626', fontSize: 12 }}>{errors.budget}</p>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5C4A32', marginBottom: 8 }}>Duration (hours)</label>
                  <input style={inputStyle(false)} type="number" min="0.5" step="0.5" placeholder="4" value={form.duration_hours} onChange={e => update('duration_hours', e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5C4A32', marginBottom: 8 }}>Workers needed</label>
                  <input style={inputStyle(false)} type="number" min="1" max="50" value={form.workers_needed} onChange={e => update('workers_needed', parseInt(e.target.value))} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5C4A32', marginBottom: 8 }}>Scheduled Date & Time (optional)</label>
                <input style={inputStyle(false)} type="datetime-local" value={form.scheduled_at} onChange={e => update('scheduled_at', e.target.value)} />
              </div>

              {/* Urgent toggle */}
              <button onClick={() => update('is_urgent', !form.is_urgent)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, border: `2px solid ${form.is_urgent ? '#DC2626' : '#F0EAE0'}`, background: form.is_urgent ? '#FEF2F2' : 'white', cursor: 'pointer', transition: 'all 0.15s' }}>
                <Zap size={20} color={form.is_urgent ? '#DC2626' : '#A08060'} />
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: form.is_urgent ? '#DC2626' : '#2C2417' }}>Mark as Urgent</div>
                  <div style={{ fontSize: 12, color: '#A08060' }}>Urgent jobs are highlighted and attract more applications</div>
                </div>
                {form.is_urgent && <Check size={18} color="#DC2626" />}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — Location */}
        {step === 2 && (
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 20, color: '#2C2417', marginBottom: 6 }}>Job Location</h2>
            <p style={{ color: '#A08060', fontSize: 14, marginBottom: 16 }}>Click on the map or drag the pin to set location</p>
            <div ref={mapRef} style={{ width: '100%', height: 300, borderRadius: 12, background: '#F0EAE0', marginBottom: 16, border: '1px solid #F0EAE0' }}>
              {!window.google && (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A08060', fontSize: 14 }}>
                  <MapPin size={24} style={{ marginRight: 8 }} /> Map loading... (requires Google Maps API key)
                </div>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5C4A32', marginBottom: 8 }}>Address *</label>
              <input style={inputStyle(errors.location)} placeholder="Full address" value={form.address_text} onChange={e => update('address_text', e.target.value)} />
            </div>
            {errors.location && <p style={{ color: '#DC2626', fontSize: 13, marginTop: 8 }}>{errors.location}</p>}
            {form.lat && (
              <div style={{ marginTop: 12, padding: 12, background: '#D1FAE5', borderRadius: 10, fontSize: 13, color: '#1A7A4C', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={16} /> Location set: {form.lat.toFixed(4)}, {form.lng.toFixed(4)}
              </div>
            )}
          </div>
        )}

        {/* STEP 3 — Review */}
        {step === 3 && (
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 20, color: '#2C2417', marginBottom: 20 }}>Review & Post</h2>
            {[
              { label: 'Category', value: (categories || []).find(c => c.id === form.category_id)?.name },
              { label: 'Title', value: form.title },
              { label: 'Description', value: form.description || '—' },
              { label: 'Budget', value: form.budget_min || form.budget_max ? `₹${form.budget_min || 0} – ₹${form.budget_max || '?'}` : '—' },
              { label: 'Duration', value: form.duration_hours ? `${form.duration_hours} hrs` : '—' },
              { label: 'Workers', value: form.workers_needed },
              { label: 'Urgent', value: form.is_urgent ? 'Yes' : 'No' },
              { label: 'Location', value: form.address_text || '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F0EAE0' }}>
                <span style={{ color: '#A08060', fontSize: 14 }}>{label}</span>
                <span style={{ color: '#2C2417', fontWeight: 600, fontSize: 14, textAlign: 'right', maxWidth: '60%' }}>{String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Next / Submit */}
      <div style={{ marginTop: 32 }}>
        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '14px 24px' }}
          onClick={handleNext} disabled={mutation.isPending}>
          {mutation.isPending ? 'Posting...' : step < steps.length - 1 ? `Continue to ${steps[step + 1]}` : '🚀 Post Job Now'}
        </button>
      </div>
    </div>
  );
}