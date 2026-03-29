// ─── Employer Dashboard ──────────────────────────────────────
export default function EmployerDashboard() {
  const { user } = useAuthStore();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['my-jobs'],
    queryFn: () => import('../../services/api').then(m => m.jobsAPI.list({ mine: true, limit: 10 }).then(r => r.data))
  });

  const stats = [
    { label: 'Active Jobs', value: (jobs?.jobs || []).filter(j => j.status === 'open').length, color: '#1A7A4C', icon: '🟢' },
    { label: 'In Progress', value: (jobs?.jobs || []).filter(j => j.status === 'in_progress').length, color: '#D97706', icon: '🔄' },
    { label: 'Completed', value: (jobs?.jobs || []).filter(j => j.status === 'completed').length, color: '#1D4ED8', icon: '✅' },
    { label: 'Total Spent', value: `₹${Number(user?.total_spent || 0).toLocaleString('en-IN')}`, color: '#F4600C', icon: '💰' },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, color: '#2C2417', margin: 0 }}>Employer Dashboard</h1>
        <Link to="/jobs/post" style={{ background: '#F4600C', color: 'white', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
          + Post Job
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 28 }}>
        {stats.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ fontSize: 28 }}>{s.icon}</div>
              <div>
                <div style={{ color: '#A08060', fontSize: 13 }}>{s.label}</div>
                <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 24, color: s.color }}>{s.value}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontWeight: 700, fontSize: 17, color: '#2C2417', margin: 0 }}>My Jobs</h2>
          <Link to="/jobs?mine=true" style={{ color: '#F4600C', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>See all →</Link>
        </div>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 12 }} />)}
          </div>
        ) : (jobs?.jobs || []).length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: '#A08060', fontSize: 16 }}>No jobs posted yet.</p>
            <Link to="/jobs/post" style={{ color: '#F4600C', fontWeight: 600, fontSize: 14 }}>Post your first job →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(jobs?.jobs || []).slice(0, 5).map((job, i) => (
              <Link key={job.id || i} to={`/jobs/${job.id}`} style={{ textDecoration: 'none' }}>
                <div className="card card-hover" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, color: '#2C2417', marginBottom: 4 }}>{job.title}</div>
                      <div style={{ fontSize: 12, color: '#A08060', display: 'flex', gap: 12 }}>
                        <span><MapPin size={11} style={{ marginRight: 3 }} />{job.city || 'N/A'}</span>
                        <span>{job.application_count || 0} applications</span>
                      </div>
                    </div>
                    <span className={`badge badge-${job.status === 'open' ? 'green' : job.status === 'in_progress' ? 'amber' : 'stone'}`}>
                      {job.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}