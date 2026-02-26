import { useState, useEffect } from 'react';
import SEOHead from '../components/SEOHead';
import { getJobs } from '../services/api';

const BENEFITS = [
  { icon: 'bi-trophy-fill', title: 'Career Growth', desc: 'Clear paths to advancement. We promote from within — many of our managers started as drivers.', color: '#D4A017' },
  { icon: 'bi-heart-pulse-fill', title: 'Health Cover', desc: 'Comprehensive NHIF-plus medical insurance for you and your immediate family members.', color: '#dc2626' },
  { icon: 'bi-mortarboard-fill', title: 'Training & Development', desc: 'Fully funded driving certifications, hospitality training, and tech upskilling programs.', color: '#2563eb' },
  { icon: 'bi-cash-stack', title: 'Competitive Pay', desc: 'Above-market salaries plus performance bonuses, fuel allowances, and meal subsidies.', color: '#16a34a' },
  { icon: 'bi-shield-fill', title: 'Job Security', desc: 'Permanent contracts from day one. We believe stable employment builds great teams.', color: '#7c3aed' },
  { icon: 'bi-people-fill', title: 'Great Culture', desc: 'Family-first environment. Annual retreats, team activities, and an open-door policy.', color: '#0891b2' },
];

const DEPT_COLORS = {
  driving: { bg: '#dbeafe', color: '#2563eb', label: 'Driving' },
  operations: { bg: '#dcfce7', color: '#16a34a', label: 'Operations' },
  customer_service: { bg: '#fef9c3', color: '#ca8a04', label: 'Customer Service' },
  finance: { bg: '#fce7f3', color: '#db2777', label: 'Finance' },
  it: { bg: '#ede9fe', color: '#7c3aed', label: 'IT' },
  management: { bg: '#ffedd5', color: '#ea580c', label: 'Management' },
};

const TEAM_PHOTOS = [
  { src: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&auto=format&q=80', alt: 'Dreamline team meeting' },
  { src: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&auto=format&q=80', alt: 'Bus drivers team' },
  { src: 'https://images.unsplash.com/photo-1560472355-536de3962603?w=400&auto=format&q=80', alt: 'Customer service team' },
  { src: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&auto=format&q=80', alt: 'Operations team' },
];

// Demo jobs shown when API has no data
const DEMO_JOBS = [
  { slug: 'coach-driver-nairobi', title: 'Professional Coach Driver', department: 'driving', location: 'Nairobi', deadline: '2026-03-31', description: 'We are looking for experienced, safety-conscious coach drivers to operate our luxury VIP and business class buses on long-distance routes.' },
  { slug: 'customer-service-rep', title: 'Customer Service Representative', department: 'customer_service', location: 'Nairobi / Mombasa', deadline: '2026-03-20', description: 'Handle passenger enquiries, bookings, and complaints via phone, WhatsApp and in-office. Must be fluent in English and Swahili.' },
  { slug: 'bus-operations-coordinator', title: 'Bus Operations Coordinator', department: 'operations', location: 'Nairobi', deadline: '2026-03-28', description: 'Coordinate daily bus operations, track schedules in real-time, and ensure on-time departures across all routes.' },
  { slug: 'fullstack-developer', title: 'Full Stack Developer', department: 'it', location: 'Nairobi (Hybrid)', deadline: '2026-04-15', description: 'Join our tech team to build and maintain our booking platform, mobile apps, and internal tools. React + Django experience preferred.' },
];

export default function Careers() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [applying, setApplying] = useState(null);
  const [appForm, setAppForm] = useState({ name: '', email: '', phone: '', cover: '' });
  const [appSent, setAppSent] = useState(false);

  useEffect(() => {
    getJobs()
      .then(data => { const list = data.results || data; setJobs(list.length ? list : DEMO_JOBS); })
      .catch(() => setJobs(DEMO_JOBS))
      .finally(() => setLoading(false));
  }, []);

  const depts = ['all', ...new Set(jobs.map(j => j.department))];
  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.department === filter);

  const handleApply = (e) => {
    e.preventDefault();
    setTimeout(() => { setAppSent(true); }, 1200);
  };

  return (
    <>
      <SEOHead
        title="Careers at Dreamline – Join Kenya's Premier Bus Company"
        description="Build your career at Dreamline Bus Services. We're hiring drivers, customer service reps, operations staff and IT professionals across Kenya."
        image="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&auto=format"
        url="https://dreamline.co.ke/careers"
        keywords="Dreamline jobs Kenya, bus driver jobs Nairobi, Kenya transport careers, Dreamline vacancies"
      />

      {/* Hero */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: '55vh', display: 'flex', alignItems: 'center' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1400&auto=format&q=80)',
          backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg,rgba(0,0,20,0.92) 0%,rgba(153,0,0,0.7) 100%)' }} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="col-lg-7">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(212,160,23,0.2)', border: '1px solid rgba(212,160,23,0.5)', borderRadius: 24, padding: '5px 16px', marginBottom: 20, color: '#D4A017', fontSize: '.82rem', fontWeight: 700 }}>
              <i className="bi bi-briefcase-fill"></i> {jobs.length || DEMO_JOBS.length} OPEN POSITIONS
            </div>
            <h1 style={{ fontSize: 'clamp(2.2rem,5vw,3.5rem)', fontWeight: 900, color: '#fff', lineHeight: 1.12, marginBottom: 20 }}>
              Drive Your Career<br /><span style={{ color: '#D4A017' }}>Forward With Us</span>
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.85)', maxWidth: 500, marginBottom: 32, lineHeight: 1.7 }}>
              Join a team of 2,000+ professionals passionate about moving Kenya forward. We offer competitive salaries, health benefits, and real career growth.
            </p>
            <a href="#open-positions" className="btn-dl-gold" style={{ padding: '.85rem 2rem', fontSize: '1rem', textDecoration: 'none' }}>
              <i className="bi bi-search me-2"></i>View Open Positions
            </a>
          </div>
        </div>
      </section>

      {/* Team culture photos */}
      <section style={{ background: '#1a1a1a', padding: '3rem 0' }}>
        <div className="container">
          <div className="row g-2">
            {TEAM_PHOTOS.map((p, i) => (
              <div className="col-6 col-lg-3" key={i}>
                <div style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: '4/3' }}>
                  <img src={p.src} alt={p.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .4s', display: 'block' }}
                    onMouseEnter={e => e.target.style.transform = 'scale(1.06)'}
                    onMouseLeave={e => e.target.style.transform = ''} />
                </div>
              </div>
            ))}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.45)', textAlign: 'center', fontSize: '.85rem', marginTop: 16, marginBottom: 0 }}>
            Our teams in Nairobi, Mombasa, Kisumu and beyond
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section style={{ background: '#fff', padding: '5rem 0' }}>
        <div className="container">
          <div className="section-header">
            <div style={{ display: 'inline-block', background: '#fff5f5', color: 'var(--dl-red)', borderRadius: 6, padding: '3px 12px', fontSize: '.78rem', fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>WHY JOIN US</div>
            <h2>Benefits & Perks</h2>
            <div className="section-divider"></div>
            <p className="mt-2">We invest in our people the way we invest in our buses — with commitment and care</p>
          </div>
          <div className="row g-4">
            {BENEFITS.map(b => (
              <div className="col-md-6 col-lg-4" key={b.title}>
                <div style={{ background: '#f8f9fa', borderRadius: 14, padding: '1.6rem', height: '100%', border: '2px solid transparent', transition: 'border-color .2s,transform .2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = b.color; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = ''; }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.3rem', marginBottom: 14 }}>
                    <i className={`bi ${b.icon}`}></i>
                  </div>
                  <h5 style={{ fontWeight: 800, marginBottom: 8, fontSize: '1rem' }}>{b.title}</h5>
                  <p style={{ color: '#666', fontSize: '.88rem', marginBottom: 0, lineHeight: 1.6 }}>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section id="open-positions" style={{ background: '#f5f5f7', padding: '5rem 0' }}>
        <div className="container">
          <div className="section-header">
            <div style={{ display: 'inline-block', background: '#fff5f5', color: 'var(--dl-red)', borderRadius: 6, padding: '3px 12px', fontSize: '.78rem', fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>VACANCIES</div>
            <h2>Open Positions</h2>
            <div className="section-divider"></div>
          </div>

          {/* Dept filter */}
          <div className="d-flex flex-wrap gap-2 justify-content-center mb-4">
            {depts.map(d => (
              <button key={d} onClick={() => setFilter(d)} style={{
                padding: '.4rem 1.1rem', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem',
                background: filter === d ? 'var(--dl-red)' : '#fff',
                color: filter === d ? '#fff' : '#555',
                boxShadow: '0 2px 10px rgba(0,0,0,.06)',
                transition: 'all .2s',
              }}>
                {d === 'all' ? 'All Departments' : (DEPT_COLORS[d]?.label || d.replace('_', ' '))}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-5"><div className="payment-spinner mx-auto"></div></div>
          ) : (
            <div className="row g-4">
              {filtered.map(job => {
                const dept = DEPT_COLORS[job.department] || { bg: '#f0f0f0', color: '#555', label: job.department };
                return (
                  <div className="col-lg-6" key={job.slug}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', transition: 'transform .2s,box-shadow .2s', height: '100%', display: 'flex', flexDirection: 'column' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 14px 40px rgba(0,0,0,0.12)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.07)'; }}>
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <h5 style={{ fontWeight: 800, marginBottom: 0, lineHeight: 1.3, paddingRight: 8 }}>{job.title}</h5>
                        <span style={{ background: dept.bg, color: dept.color, padding: '3px 10px', borderRadius: 20, fontSize: '.72rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {dept.label}
                        </span>
                      </div>
                      <div className="d-flex gap-3 mb-3" style={{ fontSize: '.82rem', color: '#888' }}>
                        <span><i className="bi bi-geo-alt me-1" style={{ color: 'var(--dl-red)' }}></i>{job.location}</span>
                        {job.deadline && <span><i className="bi bi-calendar3 me-1" style={{ color: 'var(--dl-red)' }}></i>Apply by {job.deadline}</span>}
                      </div>
                      <p style={{ color: '#666', fontSize: '.9rem', lineHeight: 1.6, marginBottom: 'auto', flexGrow: 1 }}>
                        {job.description?.substring(0, 160)}...
                      </p>
                      <button className="btn-dl-primary mt-4" style={{ width: '100%' }} onClick={() => { setApplying(job); setAppSent(false); setAppForm({ name: '', email: '', phone: '', cover: '' }); }}>
                        <i className="bi bi-send-fill me-2"></i>Apply Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-5">
              <i className="bi bi-briefcase" style={{ fontSize: '3rem', color: '#ddd' }}></i>
              <h5 className="mt-3" style={{ color: '#666' }}>No openings in this department right now</h5>
              <p style={{ color: '#999', fontSize: '.9rem' }}>Send your CV to <a href="mailto:careers@dreamline.co.ke">careers@dreamline.co.ke</a></p>
            </div>
          )}
        </div>
      </section>

      {/* Speculative apply banner */}
      <section style={{ background: '#1a1a1a', padding: '3rem 0' }}>
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-lg-8">
              <h4 style={{ color: '#fff', fontWeight: 900, marginBottom: 8 }}>Don't See Your Role?</h4>
              <p style={{ color: 'rgba(255,255,255,.6)', marginBottom: 0 }}>Send us your CV and we'll reach out when a suitable position opens. We're always looking for great people.</p>
            </div>
            <div className="col-lg-4 text-lg-end">
              <a href="mailto:careers@dreamline.co.ke?subject=Speculative Application" className="btn-dl-gold" style={{ padding: '.85rem 1.8rem' }}>
                <i className="bi bi-envelope-fill me-2"></i>Send Your CV
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Application Modal */}
      {applying && (
        <div className="payment-overlay" onClick={e => { if (e.target === e.currentTarget) setApplying(null); }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            {appSent ? (
              <div className="text-center py-4">
                <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🎉</div>
                <h4 style={{ fontWeight: 800, color: '#16a34a', marginBottom: 8 }}>Application Submitted!</h4>
                <p style={{ color: '#666', marginBottom: 20 }}>We'll review your application for <strong>{applying.title}</strong> and be in touch within 3 business days.</p>
                <button className="btn-dl-primary" onClick={() => setApplying(null)}>Close</button>
              </div>
            ) : (
              <>
                <div className="d-flex justify-content-between align-items-start mb-4">
                  <div>
                    <h5 style={{ fontWeight: 800, marginBottom: 4 }}>Apply: {applying.title}</h5>
                    <span style={{ fontSize: '.8rem', color: '#888' }}>{applying.location}</span>
                  </div>
                  <button onClick={() => setApplying(null)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#888' }}>✕</button>
                </div>
                <form onSubmit={handleApply}>
                  <div className="row g-3">
                    <div className="col-12"><label className="form-label fw-600">Full Name *</label><input className="form-control" placeholder="Jane Mwangi" required value={appForm.name} onChange={e => setAppForm({ ...appForm, name: e.target.value })} /></div>
                    <div className="col-md-6"><label className="form-label fw-600">Email *</label><input className="form-control" type="email" required value={appForm.email} onChange={e => setAppForm({ ...appForm, email: e.target.value })} /></div>
                    <div className="col-md-6"><label className="form-label fw-600">Phone *</label><input className="form-control" placeholder="07XX XXX XXX" required value={appForm.phone} onChange={e => setAppForm({ ...appForm, phone: e.target.value })} /></div>
                    <div className="col-12"><label className="form-label fw-600">Why do you want this role?</label><textarea className="form-control" rows={4} placeholder="Tell us a bit about yourself and why you're a great fit..." value={appForm.cover} onChange={e => setAppForm({ ...appForm, cover: e.target.value })} /></div>
                    <div className="col-12">
                      <button className="btn-dl-primary w-100" type="submit" style={{ padding: '.8rem' }}>
                        <i className="bi bi-send-fill me-2"></i>Submit Application
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}