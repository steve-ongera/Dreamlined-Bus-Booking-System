/*
Home.jsx
*/
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCities } from '../services/api';
import SEOHead from '../components/SEOHead';

const POPULAR_ROUTES = [
  { from: 'nairobi', to: 'mombasa', fromLabel: 'Nairobi', toLabel: 'Mombasa', price: 'KES 1,000', duration: '~9h', img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&auto=format&q=80' },
  { from: 'nairobi', to: 'kisumu', fromLabel: 'Nairobi', toLabel: 'Kisumu', price: 'KES 1,200', duration: '~6h', img: 'https://images.unsplash.com/photo-1627473808394-d6e7c1fb5b4c?w=400&auto=format&q=80' },
  { from: 'nairobi', to: 'nakuru', fromLabel: 'Nairobi', toLabel: 'Nakuru', price: 'KES 500', duration: '~2h', img: 'https://images.unsplash.com/photo-1580619305218-8423a7ef79b4?w=400&auto=format&q=80' },
  { from: 'mombasa', to: 'malindi', fromLabel: 'Mombasa', toLabel: 'Malindi', price: 'KES 600', duration: '~2h', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&auto=format&q=80' },
  { from: 'nairobi', to: 'eldoret', fromLabel: 'Nairobi', toLabel: 'Eldoret', price: 'KES 900', duration: '~5h', img: 'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=400&auto=format&q=80' },
  { from: 'nairobi', to: 'kampala', fromLabel: 'Nairobi', toLabel: 'Kampala', price: 'KES 2,500', duration: '~12h', img: 'https://images.unsplash.com/photo-1622495966027-e3c3e7fcf5cd?w=400&auto=format&q=80' },
];

const FEATURES = [
  { icon: 'bi-star-fill', title: 'Luxury Comfort', desc: 'VIP leather recliners, Business class and Economy — all designed for your best journey.' },
  { icon: 'bi-shield-check-fill', title: 'Safe & Reliable', desc: 'GPS-tracked buses, professional drivers, real-time monitoring 24/7.' },
  { icon: 'bi-wifi', title: 'Free WiFi', desc: 'Stay connected with high-speed WiFi across all our VIP and Business class buses.' },
  { icon: 'bi-phone-fill', title: 'M-Pesa Payment', desc: 'Pay instantly with M-Pesa STK push — no cash, no queues, no stress.' },
  { icon: 'bi-envelope-check-fill', title: 'Instant E-Ticket', desc: 'Book and get your ticket delivered to your email in under 30 seconds.' },
  { icon: 'bi-headset', title: '24/7 Support', desc: 'Our customer care team is always available via call, WhatsApp, or email.' },
];

const TESTIMONIALS = [
  { name: 'Grace Wanjiku', route: 'Nairobi → Mombasa', text: 'The VIP seats on the Executive MD are absolutely incredible. Felt like business class on a plane. Never going back to any other bus company!', stars: 5, avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&auto=format&q=80' },
  { name: 'David Otieno', route: 'Nairobi → Kisumu', text: 'Booked online in 5 minutes, paid via M-Pesa, got my ticket instantly. The bus was on time and the seats were super clean. Highly recommend!', stars: 5, avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&auto=format&q=80' },
  { name: 'Mary Njeri', route: 'Mombasa → Nairobi', text: 'Traveled with my two kids and the staff was so helpful. The bus had USB charging, which kept my children entertained the whole journey. Amazing service!', stars: 5, avatar: 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=80&auto=format&q=80' },
];

export default function Home() {
  const navigate = useNavigate();
  const [cities, setCities] = useState([]);
  const [form, setForm] = useState({ origin: '', destination: '', date: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    getCities().then(data => setCities(data.results || data)).catch(() => {});
    const today = new Date().toISOString().split('T')[0];
    setForm(f => ({ ...f, date: today }));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setError('');
    if (!form.origin || !form.destination || !form.date) { setError('Please fill in all fields to search.'); return; }
    if (form.origin === form.destination) { setError('Origin and destination cannot be the same.'); return; }
    navigate(`/results?origin=${form.origin}&destination=${form.destination}&date=${form.date}`);
  };

  const quickSearch = (route) => {
    const today = new Date().toISOString().split('T')[0];
    navigate(`/results?origin=${route.from}&destination=${route.to}&date=${today}`);
  };

  return (
    <>
      <SEOHead
        title="Dreamline Bus – Book Bus Tickets Online | Kenya"
        description="Book comfortable bus tickets online across Kenya. Nairobi to Mombasa, Kisumu, Nakuru and more. VIP, Business and Economy class. Pay with M-Pesa. Instant e-ticket."
        image="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&auto=format"
        url="https://dreamline.co.ke"
        keywords="bus ticket Kenya, Nairobi Mombasa bus, online bus booking Kenya, Dreamline bus, M-Pesa bus ticket, VIP bus Kenya"
      />

      {/* ── Hero ── */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
        {/* Background */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1600&auto=format&q=85)',
          backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg,rgba(10,0,0,0.92) 0%,rgba(153,0,0,0.75) 55%,rgba(204,0,0,0.35) 100%)' }} />

        <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: '2rem', paddingBottom: '6rem' }}>
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(212,160,23,0.2)', border: '1px solid rgba(212,160,23,0.5)', borderRadius: 24, padding: '5px 16px', marginBottom: 20, color: '#D4A017', fontSize: '.82rem', fontWeight: 700, letterSpacing: 1 }}>
                <i className="bi bi-bus-front-fill"></i> KENYA'S #1 BUS SERVICE
              </div>
              <h1 style={{ fontSize: 'clamp(2.2rem,5vw,3.8rem)', fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 20, textShadow: '0 2px 20px rgba(0,0,0,.3)' }}>
                Travel in Comfort<br />
                Across <span style={{ color: '#D4A017' }}>Kenya</span>
              </h1>
              <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.85)', marginBottom: 32, lineHeight: 1.7, maxWidth: 460 }}>
                Book VIP, Business or Economy seats online — pay with M-Pesa and get your e-ticket in seconds. No queues, no hassle.
              </p>
              <div className="d-flex gap-4 flex-wrap">
                {[['2M+', 'Passengers'], ['250+', 'Buses'], ['60+', 'Routes']].map(([n, l]) => (
                  <div key={l}>
                    <div style={{ fontWeight: 900, fontSize: '1.5rem', color: '#D4A017', lineHeight: 1 }}>{n}</div>
                    <div style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: .5 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Search card floating in hero */}
            <div className="col-lg-6">
              <div style={{
                background: 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(20px)',
                borderRadius: 20,
                padding: '2rem',
                boxShadow: '0 30px 80px rgba(0,0,0,0.3)',
              }}>
                <h4 style={{ fontWeight: 900, marginBottom: 4, color: '#1a1a1a' }}>
                  <i className="bi bi-search me-2" style={{ color: 'var(--dl-red)' }}></i>Find Your Bus
                </h4>
                <p style={{ color: '#888', fontSize: '.87rem', marginBottom: 20 }}>Choose route, date and book in 2 minutes</p>

                {error && <div className="dl-alert dl-alert-error mb-3"><i className="bi bi-exclamation-circle-fill"></i> {error}</div>}

                <form onSubmit={handleSearch}>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {/* From */}
                    <div>
                      <label style={{ fontWeight: 700, fontSize: '.78rem', color: '#888', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 5, display: 'block' }}>
                        <i className="bi bi-geo-alt me-1" style={{ color: 'var(--dl-red)' }}></i>From
                      </label>
                      <select className="form-select" value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} style={{ fontWeight: 600 }}>
                        <option value="">Select departure city</option>
                        {cities.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                      </select>
                    </div>

                    {/* Swap + To */}
                    <div style={{ position: 'relative' }}>
                      <button type="button" onClick={() => setForm({ ...form, origin: form.destination, destination: form.origin })} style={{
                        position: 'absolute', right: 12, top: -18, zIndex: 2,
                        background: 'var(--dl-red)', border: 'none', borderRadius: '50%',
                        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', boxShadow: '0 4px 12px rgba(204,0,0,.3)',
                      }} title="Swap cities">
                        <i className="bi bi-arrow-down-up" style={{ color: '#fff', fontSize: '.8rem' }}></i>
                      </button>
                      <label style={{ fontWeight: 700, fontSize: '.78rem', color: '#888', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 5, display: 'block' }}>
                        <i className="bi bi-geo-alt-fill me-1" style={{ color: 'var(--dl-red)' }}></i>To
                      </label>
                      <select className="form-select" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} style={{ fontWeight: 600 }}>
                        <option value="">Select destination city</option>
                        {cities.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                      </select>
                    </div>

                    {/* Date */}
                    <div>
                      <label style={{ fontWeight: 700, fontSize: '.78rem', color: '#888', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 5, display: 'block' }}>
                        <i className="bi bi-calendar3 me-1" style={{ color: 'var(--dl-red)' }}></i>Travel Date
                      </label>
                      <input type="date" className="form-control" value={form.date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={e => setForm({ ...form, date: e.target.value })}
                        style={{ fontWeight: 600 }} />
                    </div>

                    <button type="submit" className="btn-dl-primary" style={{ padding: '.9rem', fontSize: '1.05rem', marginTop: 4 }}>
                      <i className="bi bi-search me-2"></i>Search Available Buses
                    </button>
                  </div>
                </form>

                <div className="d-flex justify-content-center gap-4 mt-3">
                  {['No account needed', 'Instant ticket', 'M-Pesa payment'].map(t => (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.75rem', color: '#888' }}>
                      <i className="bi bi-check-circle-fill" style={{ color: '#16a34a' }}></i>{t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Popular Routes ── */}
      <section style={{ background: '#fff', padding: '5rem 0' }}>
        <div className="container">
          <div className="section-header">
            <div style={{ display: 'inline-block', background: '#fff5f5', color: 'var(--dl-red)', borderRadius: 6, padding: '3px 12px', fontSize: '.78rem', fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>ROUTES</div>
            <h2>Popular Destinations</h2>
            <div className="section-divider"></div>
            <p className="mt-2">Click any route to see today's available buses</p>
          </div>
          <div className="row g-3">
            {POPULAR_ROUTES.map((r, i) => (
              <div className="col-md-6 col-lg-4" key={i}>
                <div style={{ borderRadius: 14, overflow: 'hidden', cursor: 'pointer', position: 'relative', height: 160, boxShadow: '0 8px 25px rgba(0,0,0,0.12)', transition: 'transform .2s,box-shadow .2s' }}
                  onClick={() => quickSearch(r)}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.12)'; }}>
                  <img src={r.img} alt={`${r.fromLabel} to ${r.toLabel}`} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .4s' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 100%)' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1rem' }}>
                    <div className="d-flex align-items-center justify-content-between">
                      <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>
                        {r.fromLabel} <span style={{ color: '#D4A017', margin: '0 4px' }}>→</span> {r.toLabel}
                      </div>
                      <div style={{ color: '#D4A017', fontWeight: 900, fontSize: '.95rem' }}>{r.price}</div>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,.65)', fontSize: '.78rem', marginTop: 3 }}>
                      <i className="bi bi-clock me-1"></i>{r.duration} · Daily buses
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ── */}
      <section style={{ background: '#f5f5f7', padding: '5rem 0' }}>
        <div className="container">
          <div className="section-header">
            <div style={{ display: 'inline-block', background: '#fff5f5', color: 'var(--dl-red)', borderRadius: 6, padding: '3px 12px', fontSize: '.78rem', fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>WHY DREAMLINE</div>
            <h2>Travel the Dreamline Way</h2>
            <div className="section-divider"></div>
          </div>
          <div className="row g-4">
            {FEATURES.map((f, i) => (
              <div className="col-md-6 col-lg-4" key={i}>
                <div className="feature-card" style={{ textAlign: 'left', display: 'flex', gap: 16, padding: '1.5rem' }}>
                  <div className="feature-icon" style={{ flexShrink: 0, width: 50, height: 50, fontSize: '1.15rem' }}>
                    <i className={`bi ${f.icon}`}></i>
                  </div>
                  <div>
                    <h5 style={{ fontWeight: 800, marginBottom: 6, fontSize: '1rem' }}>{f.title}</h5>
                    <p style={{ color: '#666', fontSize: '.88rem', marginBottom: 0, lineHeight: 1.6 }}>{f.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Seat classes visual ── */}
      <section style={{ background: '#1a1a1a', padding: '5rem 0', overflow: 'hidden' }}>
        <div className="container">
          <div className="section-header">
            <div style={{ display: 'inline-block', background: 'rgba(212,160,23,0.15)', color: '#D4A017', borderRadius: 6, padding: '3px 12px', fontSize: '.78rem', fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>SEAT CLASSES</div>
            <h2 style={{ color: '#fff' }}>Choose Your Level of Comfort</h2>
            <div className="section-divider"></div>
          </div>
          <div className="row g-4 mt-2">
            {[
              {
                class: 'VIP', color: '#D4A017', textColor: '#1a1a1a',
                img: 'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=500&auto=format&q=80',
                features: ['Full recliner seat (160°)', 'Individual USB & power outlet', 'Complimentary blanket & pillow', 'In-seat entertainment', 'Premium meal service'],
                from: 'From KES 2,000',
              },
              {
                class: 'Business', color: '#2563EB', textColor: '#fff',
                img: 'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=500&auto=format&q=80',
                features: ['Wide recliner seat', 'USB charging port', 'Extra leg room', 'AC & WiFi', 'Snack on board'],
                from: 'From KES 1,500',
              },
              {
                class: 'Economy', color: '#16a34a', textColor: '#fff',
                img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&auto=format&q=80',
                features: ['Comfortable padded seat', 'AC throughout journey', 'Luggage allowance 20kg', 'Clean onboard toilets', 'Affordable fares'],
                from: 'From KES 900',
              },
            ].map(s => (
              <div className="col-lg-4" key={s.class}>
                <div style={{ background: '#232323', borderRadius: 16, overflow: 'hidden', border: `2px solid ${s.color}22`, transition: 'transform .2s,border-color .2s,box-shadow .2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.borderColor = s.color; e.currentTarget.style.boxShadow = `0 20px 50px ${s.color}30`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = `${s.color}22`; e.currentTarget.style.boxShadow = ''; }}>
                  <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
                    <img src={s.img} alt={`${s.class} class seat`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
                    <div style={{ position: 'absolute', top: 14, left: 14, background: s.color, color: s.textColor, borderRadius: 20, padding: '4px 14px', fontWeight: 900, fontSize: '.85rem' }}>{s.class}</div>
                  </div>
                  <div style={{ padding: '1.4rem' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {s.features.map(f => (
                        <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.75)', fontSize: '.85rem' }}>
                          <i className="bi bi-check-circle-fill" style={{ color: s.color, flexShrink: 0 }}></i>{f}
                        </li>
                      ))}
                    </ul>
                    <div style={{ fontWeight: 900, color: s.color, fontSize: '1rem' }}>{s.from}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section style={{ background: '#fff', padding: '5rem 0' }}>
        <div className="container">
          <div className="section-header">
            <div style={{ display: 'inline-block', background: '#fff5f5', color: 'var(--dl-red)', borderRadius: 6, padding: '3px 12px', fontSize: '.78rem', fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>HOW IT WORKS</div>
            <h2>Book in 4 Simple Steps</h2>
            <div className="section-divider"></div>
          </div>
          <div className="row g-4 justify-content-center mt-2">
            {[
              { step: '01', icon: 'bi-search', title: 'Search Route', desc: 'Enter your origin, destination and travel date.' },
              { step: '02', icon: 'bi-cursor-fill', title: 'Select Your Seat', desc: 'View the live seat map and pick VIP, Business or Economy.' },
              { step: '03', icon: 'bi-person-fill', title: 'Enter Details', desc: 'Your name, email, phone and ID number — no account needed.' },
              { step: '04', icon: 'bi-phone-fill', title: 'Pay with M-Pesa', desc: 'Enter your PIN on your phone. Ticket sent to your email instantly.' },
            ].map((s, i) => (
              <div className="col-md-6 col-lg-3" key={i}>
                <div style={{ textAlign: 'center', position: 'relative' }}>
                  {i < 3 && (
                    <div style={{ position: 'absolute', top: 24, right: '-15%', width: '30%', height: 2, background: 'linear-gradient(to right,var(--dl-red),#ff9999)', display: 'none' }} className="d-lg-block"></div>
                  )}
                  <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'linear-gradient(135deg,var(--dl-red),#ff4444)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.5rem', boxShadow: '0 10px 30px rgba(204,0,0,.25)' }}>
                    <i className={`bi ${s.icon}`}></i>
                  </div>
                  <div style={{ display: 'inline-block', background: 'var(--dl-red)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: '.7rem', fontWeight: 800, marginBottom: 10, letterSpacing: 1 }}>STEP {s.step}</div>
                  <h5 style={{ fontWeight: 800, marginBottom: 8 }}>{s.title}</h5>
                  <p style={{ color: '#777', fontSize: '.9rem', marginBottom: 0 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section style={{ background: '#f5f5f7', padding: '5rem 0' }}>
        <div className="container">
          <div className="section-header">
            <div style={{ display: 'inline-block', background: '#fff5f5', color: 'var(--dl-red)', borderRadius: 6, padding: '3px 12px', fontSize: '.78rem', fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>TESTIMONIALS</div>
            <h2>What Our Passengers Say</h2>
            <div className="section-divider"></div>
          </div>
          <div className="row g-4 mt-2">
            {TESTIMONIALS.map((t, i) => (
              <div className="col-lg-4" key={i}>
                <div style={{ background: '#fff', borderRadius: 16, padding: '1.75rem', boxShadow: '0 8px 30px rgba(0,0,0,0.07)', height: '100%', position: 'relative' }}>
                  <div style={{ color: '#D4A017', fontSize: '2.5rem', lineHeight: 1, marginBottom: 12, fontFamily: 'Georgia,serif' }}>"</div>
                  <p style={{ color: '#444', lineHeight: 1.7, marginBottom: 20, fontSize: '.92rem' }}>{t.text}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={t.avatar} alt={t.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--dl-red)' }} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '.9rem' }}>{t.name}</div>
                      <div style={{ fontSize: '.75rem', color: '#888' }}>{t.route}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', color: '#D4A017', fontSize: '.85rem' }}>
                      {'★'.repeat(t.stars)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ position: 'relative', minHeight: 280, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(https://images.unsplash.com/photo-1570125909517-53cb21c89ff2?w=1400&auto=format&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(153,0,0,0.93),rgba(20,0,0,0.85))' }} />
        <div className="container text-center" style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.5rem,3vw,2.5rem)', marginBottom: 10 }}>
            Your Next Journey Starts Here
          </h2>
          <p style={{ color: 'rgba(255,255,255,.85)', marginBottom: 28, fontSize: '1rem' }}>
            Book now and get your e-ticket in seconds. No account needed.
          </p>
          <button className="btn-dl-gold" style={{ padding: '.9rem 2.5rem', fontSize: '1.05rem' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <i className="bi bi-ticket-perforated-fill me-2"></i>Book a Ticket Now
          </button>
        </div>
      </section>
    </>
  );
}