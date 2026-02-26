import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCities } from '../services/api';

const POPULAR_ROUTES = [
  { from:'Nairobi', to:'Mombasa', price:'from KES 1,000', duration:'~9h' },
  { from:'Nairobi', to:'Kisumu', price:'from KES 1,200', duration:'~6h' },
  { from:'Nairobi', to:'Nakuru', price:'from KES 500', duration:'~2h' },
  { from:'Mombasa', to:'Malindi', price:'from KES 600', duration:'~2h' },
  { from:'Nairobi', to:'Eldoret', price:'from KES 900', duration:'~5h' },
  { from:'Nairobi', to:'Kampala', price:'from KES 2,500', duration:'~12h' },
];

const FEATURES = [
  { icon:'bi-star-fill', title:'Luxury Comfort', desc:'VIP and Business class seats with reclining, leg room, and USB charging.' },
  { icon:'bi-shield-check-fill', title:'Safe & Reliable', desc:'GPS-tracked buses, professional drivers, and 24/7 monitoring.' },
  { icon:'bi-wifi', title:'Free WiFi', desc:'Stay connected throughout your journey with high-speed internet.' },
  { icon:'bi-credit-card-2-front-fill', title:'Easy M-Pesa Payment', desc:'Pay instantly with M-Pesa STK push. No cash needed.' },
  { icon:'bi-ticket-perforated-fill', title:'Instant E-Tickets', desc:'Book online and get your ticket delivered to your email instantly.' },
  { icon:'bi-headset', title:'24/7 Support', desc:'Our customer care team is always available to assist you.' },
];

export default function Home() {
  const navigate = useNavigate();
  const [cities, setCities] = useState([]);
  const [form, setForm] = useState({ origin:'', destination:'', date:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCities().then(data => setCities(data.results || data)).catch(() => {});
    // Default date to today
    const today = new Date().toISOString().split('T')[0];
    setForm(f => ({...f, date: today}));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setError('');
    if (!form.origin || !form.destination || !form.date) {
      setError('Please fill in all fields.');
      return;
    }
    if (form.origin === form.destination) {
      setError('Origin and destination cannot be the same.');
      return;
    }
    navigate(`/results?origin=${form.origin}&destination=${form.destination}&date=${form.date}`);
  };

  const handleQuickSearch = (route) => {
    const originSlug = route.from.toLowerCase();
    const destSlug = route.to.toLowerCase();
    const today = new Date().toISOString().split('T')[0];
    navigate(`/results?origin=${originSlug}&destination=${destSlug}&date=${today}`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8 text-center hero-content">
              <div className="mb-3 d-inline-flex align-items-center gap-2 px-3 py-1"
                style={{background:'rgba(255,255,255,.15)',borderRadius:20,color:'white',fontSize:'.85rem'}}>
                <i className="bi bi-bus-front-fill"></i>
                Kenya's Premier Bus Service
              </div>
              <h1 className="mb-3">Travel in Comfort<br/>Across Kenya</h1>
              <p className="mb-0">Book your bus ticket online — VIP, Business & Economy class available</p>
            </div>
          </div>
        </div>
      </section>

      {/* Search Card */}
      <section style={{background:'#f5f5f7',paddingBottom:'2rem'}}>
        <div className="container">
          <div className="search-card" style={{marginTop:'-3rem'}}>
            <h5 className="mb-3 fw-700" style={{color:'var(--dl-dark)'}}>
              <i className="bi bi-search me-2" style={{color:'var(--dl-red)'}}></i>
              Find Your Bus
            </h5>
            {error && (
              <div className="dl-alert dl-alert-error">
                <i className="bi bi-exclamation-circle-fill"></i>
                {error}
              </div>
            )}
            <form onSubmit={handleSearch}>
              <div className="row g-3 align-items-end">
                <div className="col-lg-3 col-md-6">
                  <label><i className="bi bi-geo-alt me-1"></i>From</label>
                  <select
                    className="form-select"
                    value={form.origin}
                    onChange={e => setForm({...form, origin: e.target.value})}
                  >
                    <option value="">Select origin</option>
                    {cities.map(c => (
                      <option key={c.slug} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Swap button */}
                <div className="col-auto d-none d-lg-flex align-items-end pb-1">
                  <button
                    type="button"
                    onClick={() => setForm({...form, origin: form.destination, destination: form.origin})}
                    style={{
                      background:'var(--dl-light)',border:'2px solid var(--dl-border)',
                      borderRadius:'50%',width:38,height:38,cursor:'pointer',
                      display:'flex',alignItems:'center',justifyContent:'center'
                    }}
                    title="Swap cities"
                  >
                    <i className="bi bi-arrow-left-right" style={{color:'var(--dl-red)'}}></i>
                  </button>
                </div>

                <div className="col-lg-3 col-md-6">
                  <label><i className="bi bi-geo-alt-fill me-1"></i>To</label>
                  <select
                    className="form-select"
                    value={form.destination}
                    onChange={e => setForm({...form, destination: e.target.value})}
                  >
                    <option value="">Select destination</option>
                    {cities.map(c => (
                      <option key={c.slug} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-lg-2 col-md-6">
                  <label><i className="bi bi-calendar3 me-1"></i>Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setForm({...form, date: e.target.value})}
                  />
                </div>

                <div className="col-lg-2 col-md-6">
                  <button type="submit" className="btn-dl-primary w-100" style={{padding:'.76rem'}}>
                    <i className="bi bi-search"></i> Search
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Popular Routes */}
      <section className="section-pad" style={{background:'var(--dl-white)'}}>
        <div className="container">
          <div className="section-header">
            <h2>Popular Routes</h2>
            <div className="section-divider"></div>
            <p className="mt-2">Discover our most-traveled destinations</p>
          </div>
          <div className="row g-3">
            {POPULAR_ROUTES.map((r, i) => (
              <div className="col-lg-4 col-md-6" key={i}>
                <div className="route-card" onClick={() => handleQuickSearch(r)}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span style={{fontWeight:700,fontSize:'1.05rem'}}>{r.from}</span>
                    <i className="bi bi-arrow-right" style={{color:'var(--dl-red)'}}></i>
                    <span style={{fontWeight:700,fontSize:'1.05rem'}}>{r.to}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span style={{fontSize:'.85rem',opacity:.7}}>
                      <i className="bi bi-clock me-1"></i>{r.duration}
                    </span>
                    <span className="price">{r.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section-pad" style={{background:'#f5f5f7'}}>
        <div className="container">
          <div className="section-header">
            <h2>Why Choose Dreamline?</h2>
            <div className="section-divider"></div>
          </div>
          <div className="row g-4">
            {FEATURES.map((f, i) => (
              <div className="col-lg-4 col-md-6" key={i}>
                <div className="feature-card">
                  <div className="feature-icon">
                    <i className={`bi ${f.icon}`}></i>
                  </div>
                  <h5 className="mb-2">{f.title}</h5>
                  <p style={{color:'var(--dl-gray)',fontSize:'.92rem',marginBottom:0}}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section-pad" style={{background:'var(--dl-white)'}}>
        <div className="container">
          <div className="section-header">
            <h2>How It Works</h2>
            <div className="section-divider"></div>
          </div>
          <div className="row g-4 justify-content-center">
            {[
              { step:'1', icon:'bi-search', title:'Search', desc:'Enter your route, date and find available buses.' },
              { step:'2', icon:'bi-cursor-fill', title:'Select Seat', desc:'Pick your preferred seat — VIP, Business or Economy.' },
              { step:'3', icon:'bi-person-fill', title:'Enter Details', desc:'Provide your name, email, phone and ID number.' },
              { step:'4', icon:'bi-phone-fill', title:'Pay via M-Pesa', desc:'Complete payment with M-Pesa STK push on your phone.' },
            ].map((s, i) => (
              <div className="col-lg-3 col-md-6" key={i}>
                <div className="text-center">
                  <div style={{
                    width:70,height:70,borderRadius:'50%',
                    background:'var(--dl-red)',color:'white',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    margin:'0 auto 1rem',fontSize:'1.5rem',
                    boxShadow:'0 8px 25px rgba(204,0,0,.3)'
                  }}>
                    <i className={`bi ${s.icon}`}></i>
                  </div>
                  <div className="mb-1" style={{
                    background:'var(--dl-red)',color:'white',
                    borderRadius:20,padding:'.1rem .6rem',
                    fontSize:'.75rem',fontWeight:700,display:'inline-block'
                  }}>Step {s.step}</div>
                  <h5 className="mt-2 mb-1">{s.title}</h5>
                  <p style={{color:'var(--dl-gray)',fontSize:'.9rem',marginBottom:0}}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        background:'linear-gradient(135deg, var(--dl-red-dark), var(--dl-red))',
        padding:'3rem 0',textAlign:'center',color:'white'
      }}>
        <div className="container">
          <h2 className="mb-2">Ready for Your Next Journey?</h2>
          <p style={{opacity:.9,marginBottom:'1.5rem'}}>Book your ticket now and travel in style</p>
          <button
            className="btn-dl-gold"
            style={{padding:'.85rem 2.5rem',fontSize:'1.05rem'}}
            onClick={() => window.scrollTo({top:0,behavior:'smooth'})}
          >
            <i className="bi bi-ticket-perforated-fill me-2"></i>Book Now
          </button>
        </div>
      </section>
    </div>
  );
}