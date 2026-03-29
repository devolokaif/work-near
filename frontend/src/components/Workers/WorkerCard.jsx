
// ─── WorkerCard (src/components/Workers/WorkerCard.jsx) ─────
export function WorkerCard({ worker }) {
  if (!worker) return null;
  return (
    <Link to={`/workers/${worker.user_id || worker.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div className="card card-hover" style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #F4600C22, #F4600C44)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#F4600C', flexShrink: 0 }}>
            {worker.full_name?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <h3 style={{ fontWeight: 700, fontSize: 15, color: '#2C2417', margin: 0 }}>{worker.full_name}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#F59E0B', fontWeight: 600, fontSize: 13 }}>
                ★ {Number(worker.rating || 0).toFixed(1)}
              </div>
            </div>

            {worker.skills && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                {worker.skills.slice(0, 3).map((s, i) => (
                  <span key={i} style={{ background: 'rgba(244,96,12,0.08)', color: '#F4600C', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{s}</span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {worker.distance_km !== undefined && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#A08060', fontSize: 12 }}>
                  <MapPin size={11} /> {Number(worker.distance_km).toFixed(1)} km away
                </span>
              )}
              {worker.hourly_rate && (
                <span style={{ color: '#1A7A4C', fontWeight: 600, fontSize: 13 }}>
                  ₹{worker.hourly_rate}/hr
                </span>
              )}
              {worker.is_available !== undefined && (
                <span style={{ fontSize: 12, color: worker.is_available ? '#1A7A4C' : '#A08060', fontWeight: 600 }}>
                  {worker.is_available ? '● Available' : '○ Busy'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}