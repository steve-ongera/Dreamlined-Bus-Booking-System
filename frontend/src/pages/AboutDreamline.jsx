import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';

const STATS = [
  { num: '25+', label: 'Years of Service', icon: 'bi-calendar-check-fill' },
  { num: '60+', label: 'Routes Covered', icon: 'bi-map-fill' },
  { num: '250+', label: 'Buses in Fleet', icon: 'bi-bus-front-fill' },
  { num: '2M+', label: 'Passengers Served', icon: 'bi-people-fill' },
];

const FLEET = [
  {
    name: 'Executive MD (VIP)',
    desc: 'Our flagship luxury coaches with 28 VIP seats. Full recliner seats, individual screens, WiFi, USB, AC, and 4-star cabin service.',
    tag: 'VIP', tagColor: '#D4A017', tagTextColor: '#1a1a1a',
    img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&q=80',
  },
  {
    name: 'Marcopolo G7 (Business)',
    desc: 'Premium 38-seater with wide reclining seats, extra leg room, USB charging, and complimentary refreshments.',
    tag: 'Business', tagColor: '#2563EB', tagTextColor: '#fff',
    img: 'https://images.unsplash.com/photo-1557223562-6c77ef16210f?w=600&auto=format&q=80',
  },
  {
    name: 'ZHONGTONG MEGA',
    desc: 'Spacious double-decker coach with 55 seats. Comfortable economy class travel with AC and in-seat entertainment.',
    tag: 'Economy+', tagColor: '#16a34a', tagTextColor: '#fff',
    img: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=600&auto=format&q=80',
  },
  {
    name: 'Futura 43',
    desc: 'Modern mid-range coach balancing comfort and value. Reclining seats, overhead storage, and onboard WiFi.',
    tag: 'Economy', tagColor: '#16a34a', tagTextColor: '#fff',
    img: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&q=80',
  },
];

const VALUES = [
  { icon: 'bi-shield-fill-check', title: 'Safety First', desc: 'All buses GPS-tracked and undergo rigorous maintenance every 5,000 km. Certified professional drivers only.' },
  { icon: 'bi-star-fill', title: 'Luxury Experience', desc: 'VIP leather recliners to clean economy seats — we make every class feel premium.' },
  { icon: 'bi-clock-fill', title: 'Punctuality', desc: '97% departure accuracy rate. We track every bus in real-time and communicate delays instantly.' },
  { icon: 'bi-heart-fill', title: 'Passenger Care', desc: '24/7 customer support. Every complaint resolved within 24 hours — guaranteed.' },
];

const MILESTONES = [
  { year: '1999', title: 'Founded in Nairobi', desc: 'Started with 3 buses on the Nairobi–Mombasa route.' },
  { year: '2005', title: 'Fleet Expansion', desc: 'Grew to 50 buses covering 15 routes across Kenya.' },
  { year: '2012', title: 'VIP Class Launched', desc: 'Introduced luxury VIP coaches, redefining Kenyan bus travel.' },
  { year: '2018', title: 'Online Booking', desc: 'Launched dreamline.co.ke — first Kenyan bus line with full online booking.' },
  { year: '2021', title: 'M-Pesa Integration', desc: 'Seamless M-Pesa STK Push — pay from anywhere, anytime.' },
  { year: '2024', title: 'Digital Transformation', desc: 'Real-time seat maps, e-tickets, and live bus tracking for all passengers.' },
];

export default function AboutDreamline() {
  const statsRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('[data-animate]').forEach((el, i) => {
            setTimeout(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }, i * 120);
          });
        }
      });
    }, { threshold: 0.2 });
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <SEOHead
        title="About Dreamline – Kenya's Premier Bus Service Since 1999"
        description="Dreamline Bus: 25+ years connecting Kenya with luxury VIP, Business and Economy coaches. Discover our story, fleet, values and milestones."
        image="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&auto=format"
        url="https://dreamline.co.ke/about-dreamline"
        keywords="about Dreamline bus Kenya, Kenya bus company, Nairobi bus service, luxury bus Kenya"
      />

      {/* Hero */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: '75vh', display: 'flex', alignItems: 'center' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1400&auto=format&q=80)',
          backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg,rgba(20,0,0,0.88) 0%,rgba(153,0,0,0.65) 100%)' }} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="col-lg-7">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(212,160,23,0.2)', border: '1px solid rgba(212,160,23,0.5)', borderRadius: 24, padding: '5px 16px', marginBottom: 20, color: '#D4A017', fontSize: '.82rem', fontWeight: 700, letterSpacing: 1 }}>
              <i className="bi bi-bus-front-fill"></i> EST. 1999 · NAIROBI, KENYA
            </div>
            <h1 style={{ fontSize: 'clamp(2.2rem,5vw,3.8rem)', fontWeight: 900, color: '#fff', lineHeight: 1.12, marginBottom: 20 }}>
              Moving Kenya <span style={{ color: '#D4A017' }}>Forward,</span><br />One Journey at a Time
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.85)', maxWidth: 520, marginBottom: 32, lineHeight: 1.7 }}>
              For over 25 years, Dreamline has been the trusted choice for millions of Kenyans seeking safe, comfortable and affordable road travel.
            </p>
            <div className="d-flex gap-3 flex-wrap">
              <Link to="/" className="btn-dl-gold" style={{ padding: '.8rem 2rem' }}>
                <i className="bi bi-ticket-perforated-fill me-2"></i>Book a Ticket
              </Link>
              <a href="#our-story" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,.8)', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 8, padding: '.8rem 2rem', fontWeight: 600, textDecoration: 'none' }}>
                Our Story <i className="bi bi-arrow-down"></i>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section ref={statsRef} style={{ background: '#1a1a1a', padding: '2.5rem 0' }}>
        <div className="container">
          <div className="row g-0">
            {STATS.map((s, i) => (
              <div className="col-6 col-lg-3" key={s.label}>
                <div data-animate style={{
                  textAlign: 'center', padding: '1rem',
                  borderRight: i < 3 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  opacity: 0, transform: 'translateY(20px)', transition: 'all .5s ease',
                }}>
                  <i className={`bi ${s.icon}`} style={{ fontSize: '1.5rem', color: '#D4A017', marginBottom: 6, display: 'block' }}></i>
                  <div style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{s.num}</div>
                  <div style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.5)', marginTop: 5, textTransform: 'uppercase', letterSpacing: .5 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section id="our-story" style={{ background: '#fff', padding: '5rem 0' }}>
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <div style={{ position: 'relative' }}>
                <img src="https://images.unsplash.com/photo-1570125909517-53cb21c89ff2?w=700&auto=format&q=80"
                  alt="Dreamline bus on Kenyan highway" style={{ width: '100%', borderRadius: 16, boxShadow: '0 30px 80px rgba(0,0,0,0.15)', display: 'block' }} />
                <div style={{ position: 'absolute', bottom: -20, right: -20, background: 'var(--dl-red)', color: '#fff', borderRadius: 12, padding: '1.2rem 1.5rem', boxShadow: '0 15px 40px rgba(204,0,0,0.3)' }}>
                  <div style={{ fontWeight: 900, fontSize: '2rem', lineHeight: 1 }}>25+</div>
                  <div style={{ fontSize: '.8rem', opacity: .9 }}>Years on<br />Kenyan Roads</div>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div style={{ display: 'inline-block', background: '#fff5f5', color: 'var(--dl-red)', borderRadius: 6, padding: '3px 12px', fontSize: '.78rem', fontWeight: 700, marginBottom: 16, letterSpacing: 1 }}>OUR STORY</div>
              <h2 style={{ fontSize: 'clamp(1.7rem,3vw,2.4rem)', fontWeight: 900, marginBottom: 20 }}>Born on the Nairobi–Mombasa Road</h2>
              <p style={{ color: '#555', lineHeight: 1.8, marginBottom: 14 }}>
                In 1999, our founder Joseph Kamau loaded three buses and a dream onto the Nairobi–Mombasa highway. Road travel then meant discomfort, uncertainty, and long waits. Dreamline changed that.
              </p>
              <p style={{ color: '#555', lineHeight: 1.8, marginBottom: 14 }}>
                We introduced reclining seats, onboard AC, and a culture of punctuality Kenya had never seen. Word spread fast. Within five years, we were operating 50+ routes.
              </p>
              <p style={{ color: '#555', lineHeight: 1.8, marginBottom: 28 }}>
                Today, Dreamline is Kenya's most trusted bus network — our mission unchanged: give every Kenyan a journey they're proud to take.
              </p>
              <div className="d-flex gap-2 flex-wrap">
                {['Best Bus Company Kenya 2023', 'NTSA Certified Operator'].map(b => (
                  <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8f9fa', borderRadius: 8, padding: '7px 12px' }}>
                    <i className="bi bi-patch-check-fill" style={{ color: '#D4A017' }}></i>
                    <span style={{ fontSize: '.82rem', fontWeight: 600 }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fleet */}
      <section style={{ background: '#f5f5f7', padding: '5rem 0' }}>
        <div className="container">
          <div className="section-header">
            <div style={{ display: 'inline-block', background: '#fff5f5', color: 'var(--dl-red)', borderRadius: 6, padding: '3px 12px', fontSize: '.78rem', fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>OUR FLEET</div>
            <h2>World-Class Coaches</h2>
            <div className="section-divider"></div>
            <p className="mt-2">Every bus under 5 years old — maintained to international standards</p>
          </div>
          <div className="row g-4">
            {FLEET.map(bus => (
              <div className="col-lg-6" key={bus.name}>
                <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', transition: 'transform .2s,box-shadow .2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 20px 50px rgba(0,0,0,0.14)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)'; }}>
                  <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
                    <img src={bus.img} alt={bus.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .4s' }}
                      onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
                      onMouseLeave={e => e.target.style.transform = ''} />
                    <div style={{ position: 'absolute', top: 14, left: 14, background: bus.tagColor, color: bus.tagTextColor, borderRadius: 20, padding: '3px 12px', fontSize: '.78rem', fontWeight: 800 }}>{bus.tag}</div>
                  </div>
                  <div style={{ padding: '1.4rem' }}>
                    <h5 style={{ fontWeight: 800, marginBottom: 8 }}>{bus.name}</h5>
                    <p style={{ color: '#666', fontSize: '.9rem', marginBottom: 0, lineHeight: 1.6 }}>{bus.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section style={{ background: '#fff', padding: '5rem 0' }}>
        <div className="container">
          <div className="section-header">
            <div style={{ display: 'inline-block', background: '#fff5f5', color: 'var(--dl-red)', borderRadius: 6, padding: '3px 12px', fontSize: '.78rem', fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>OUR VALUES</div>
            <h2>What We Stand For</h2>
            <div className="section-divider"></div>
          </div>
          <div className="row g-4">
            {VALUES.map(v => (
              <div className="col-md-6" key={v.title}>
                <div style={{ display: 'flex', gap: 18, padding: '1.5rem', background: '#f8f9fa', borderRadius: 12, height: '100%', border: '1px solid transparent', transition: 'border-color .2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--dl-red)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
                  <div style={{ width: 50, height: 50, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(135deg,var(--dl-red),#ff4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem' }}>
                    <i className={`bi ${v.icon}`}></i>
                  </div>
                  <div>
                    <h6 style={{ fontWeight: 800, marginBottom: 5 }}>{v.title}</h6>
                    <p style={{ color: '#666', fontSize: '.88rem', marginBottom: 0, lineHeight: 1.6 }}>{v.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section style={{ background: '#1a1a1a', padding: '5rem 0' }}>
        <div className="container">
          <div className="section-header">
            <div style={{ display: 'inline-block', background: 'rgba(212,160,23,0.15)', color: '#D4A017', borderRadius: 6, padding: '3px 12px', fontSize: '.78rem', fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>MILESTONES</div>
            <h2 style={{ color: '#fff' }}>Our Journey Through the Years</h2>
            <div className="section-divider"></div>
          </div>
          <div className="row justify-content-center">
            <div className="col-lg-7">
              {MILESTONES.map((m, i) => (
                <div key={m.year} style={{ display: 'flex', gap: 20, marginBottom: 28, alignItems: 'flex-start' }}>
                  <div style={{ flexShrink: 0, textAlign: 'center' }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: i % 2 === 0 ? 'var(--dl-red)' : 'var(--dl-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '.82rem', color: i % 2 === 0 ? '#fff' : '#1a1a1a' }}>{m.year}</div>
                    {i < MILESTONES.length - 1 && <div style={{ width: 2, height: 28, background: 'rgba(255,255,255,0.1)', margin: '4px auto' }}></div>}
                  </div>
                  <div style={{ paddingTop: 10 }}>
                    <h6 style={{ color: '#fff', fontWeight: 800, marginBottom: 4 }}>{m.title}</h6>
                    <p style={{ color: 'rgba(255,255,255,.5)', marginBottom: 0, fontSize: '.88rem' }}>{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', minHeight: 300, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&auto=format&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(153,0,0,0.85)' }} />
        <div className="container text-center" style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.5rem,3vw,2.5rem)', marginBottom: 10 }}>Ready to Experience Dreamline?</h2>
          <p style={{ color: 'rgba(255,255,255,.85)', marginBottom: 28 }}>Join 2 million+ Kenyans who travel with us</p>
          <Link to="/" className="btn-dl-gold" style={{ padding: '.9rem 2.5rem', fontSize: '1.05rem' }}>
            <i className="bi bi-ticket-perforated-fill me-2"></i>Book Now
          </Link>
        </div>
      </section>
    </>
  );
}