import { useState } from 'react';
import SEOHead from '../components/SEOHead';

const OFFICES = [
  {
    city: 'Nairobi (Head Office)',
    address: 'Ronald Ngala Street, Nairobi CBD',
    phone: '+254 700 000 000',
    email: 'nairobi@dreamline.co.ke',
    hours: 'Mon–Sun: 4:30 AM – 11:00 PM',
    img: 'https://images.unsplash.com/photo-1611348586804-61bf6c080437?w=500&auto=format&q=80',
  },
  {
    city: 'Mombasa',
    address: 'Jomo Kenyatta Avenue, Mombasa CBD',
    phone: '+254 700 000 100',
    email: 'mombasa@dreamline.co.ke',
    hours: 'Mon–Sun: 5:00 AM – 10:30 PM',
    img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=500&auto=format&q=80',
  },
  {
    city: 'Kisumu',
    address: 'Oginga Odinga Street, Kisumu',
    phone: '+254 700 000 200',
    email: 'kisumu@dreamline.co.ke',
    hours: 'Mon–Sun: 5:30 AM – 9:00 PM',
    img: 'https://images.unsplash.com/photo-1627473808394-d6e7c1fb5b4c?w=500&auto=format&q=80',
  },
];

const FAQS = [
  { q: 'How do I get my ticket?', a: 'After successful M-Pesa payment, your e-ticket is sent instantly to the email address you provided during booking.' },
  { q: 'Can I cancel or change my booking?', a: 'Yes, you can cancel bookings up to 4 hours before departure from the Track Ticket page. Refunds are processed within 24 hours via M-Pesa.' },
  { q: 'How many bags am I allowed?', a: 'Each passenger is allowed one large bag (up to 20kg) in the luggage compartment and one small carry-on bag.' },
  { q: 'Can I book for someone else?', a: 'Yes. Just enter their name, ID number, and email address. The ticket will be sent to that email.' },
  { q: 'What if I miss my bus?', a: 'Contact our customer care immediately. Subject to availability, we may transfer you to the next available bus with a small rebooking fee.' },
];

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 1500);
  };

  return (
    <>
      <SEOHead
        title="Contact Us – Dreamline Bus Services"
        description="Get in touch with Dreamline Bus Services. Call, email or visit our offices in Nairobi, Mombasa and Kisumu. 24/7 customer support."
        image="https://images.unsplash.com/photo-1611348586804-61bf6c080437?w=1200&auto=format"
        url="https://dreamline.co.ke/contact"
        keywords="contact Dreamline bus, Dreamline customer support, Nairobi bus office, Mombasa bus booking"
      />

      {/* Hero */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: '40vh', display: 'flex', alignItems: 'center' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1534536281715-e28d76689b4d?w=1400&auto=format&q=80)',
          backgroundSize: 'cover', backgroundPosition: 'center 40%',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(20,0,0,0.9) 0%,rgba(153,0,0,0.75) 100%)' }} />
        <div className="container text-center" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(212,160,23,0.2)', border: '1px solid rgba(212,160,23,0.5)', borderRadius: 24, padding: '5px 16px', marginBottom: 16, color: '#D4A017', fontSize: '.82rem', fontWeight: 700 }}>
            <i className="bi bi-headset"></i> 24/7 Customer Support
          </div>
          <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(2rem,4vw,3rem)', marginBottom: 12 }}>
            We're Here to Help
          </h1>
          <p style={{ color: 'rgba(255,255,255,.85)', fontSize: '1.05rem', maxWidth: 480, margin: '0 auto' }}>
            Reach us by phone, email, WhatsApp or visit any of our offices across Kenya
          </p>
        </div>
      </section>

      {/* Quick contact cards */}
      <section style={{ background: '#f5f5f7', padding: '3rem 0 0' }}>
        <div className="container">
          <div className="row g-3 justify-content-center" style={{ marginTop: -50, position: 'relative', zIndex: 10 }}>
            {[
              { icon: 'bi-telephone-fill', title: 'Call Us', info: '+254 700 000 000', sub: 'Available 24/7', color: 'var(--dl-red)', href: 'tel:+254700000000' },
              { icon: 'bi-whatsapp', title: 'WhatsApp', info: '+254 700 000 000', sub: 'Instant response', color: '#25D366', href: 'https://wa.me/254700000000' },
              { icon: 'bi-envelope-fill', title: 'Email Us', info: 'info@dreamline.co.ke', sub: 'Reply within 2hrs', color: '#2563eb', href: 'mailto:info@dreamline.co.ke' },
              { icon: 'bi-clock-fill', title: 'Working Hours', info: 'Daily 4:30 AM – 11 PM', sub: 'Including holidays', color: '#D4A017', href: null },
            ].map(c => (
              <div className="col-md-6 col-lg-3" key={c.title}>
                <a href={c.href || '#'} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: '#fff', borderRadius: 14, padding: '1.5rem', textAlign: 'center',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.1)', transition: 'transform .2s, box-shadow .2s',
                    border: '1px solid rgba(0,0,0,0.04)',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.14)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)'; }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '1.3rem', color: '#fff' }}>
                      <i className={`bi ${c.icon}`}></i>
                    </div>
                    <h6 style={{ fontWeight: 800, marginBottom: 4, color: '#1a1a1a' }}>{c.title}</h6>
                    <div style={{ fontWeight: 700, color: c.color, fontSize: '.9rem', marginBottom: 3 }}>{c.info}</div>
                    <div style={{ fontSize: '.78rem', color: '#888' }}>{c.sub}</div>
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form + Offices */}
      <section style={{ background: '#f5f5f7', padding: '4rem 0' }}>
        <div className="container">
          <div className="row g-5">
            {/* Form */}
            <div className="col-lg-7">
              <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 8px 30px rgba(0,0,0,0.07)' }}>
                <div style={{ display: 'inline-block', background: '#fff5f5', color: 'var(--dl-red)', borderRadius: 6, padding: '3px 12px', fontSize: '.78rem', fontWeight: 700, marginBottom: 16, letterSpacing: 1 }}>SEND A MESSAGE</div>
                <h3 style={{ fontWeight: 900, marginBottom: 20 }}>How Can We Help You?</h3>

                {sent ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>✅</div>
                    <h4 style={{ fontWeight: 800, color: '#16a34a', marginBottom: 8 }}>Message Sent!</h4>
                    <p style={{ color: '#666' }}>We'll get back to you at <strong>{form.email}</strong> within 2 hours.</p>
                    <button className="btn-dl-outline mt-3" onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}>Send Another</button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label" style={{ fontWeight: 600, fontSize: '.85rem', color: '#555', textTransform: 'uppercase', letterSpacing: .5 }}>Full Name *</label>
                        <input className="form-control" placeholder="John Kamau" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" style={{ fontWeight: 600, fontSize: '.85rem', color: '#555', textTransform: 'uppercase', letterSpacing: .5 }}>Email Address *</label>
                        <input className="form-control" type="email" placeholder="john@gmail.com" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                      </div>
                      <div className="col-12">
                        <label className="form-label" style={{ fontWeight: 600, fontSize: '.85rem', color: '#555', textTransform: 'uppercase', letterSpacing: .5 }}>Subject *</label>
                        <select className="form-select" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
                          <option value="">Select a subject</option>
                          <option>Booking Issue</option>
                          <option>Payment Problem</option>
                          <option>Ticket Refund</option>
                          <option>Lost & Found</option>
                          <option>Complaint</option>
                          <option>General Enquiry</option>
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label" style={{ fontWeight: 600, fontSize: '.85rem', color: '#555', textTransform: 'uppercase', letterSpacing: .5 }}>Message *</label>
                        <textarea className="form-control" rows={5} placeholder="Please describe your issue or question in detail..." required value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
                      </div>
                      <div className="col-12">
                        <button className="btn-dl-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '.85rem', fontSize: '1rem' }}>
                          {loading ? <><span className="spinner-border spinner-border-sm me-2"></span>Sending...</> : <><i className="bi bi-send-fill me-2"></i>Send Message</>}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Offices */}
            <div className="col-lg-5">
              <div style={{ display: 'inline-block', background: '#fff5f5', color: 'var(--dl-red)', borderRadius: 6, padding: '3px 12px', fontSize: '.78rem', fontWeight: 700, marginBottom: 16, letterSpacing: 1 }}>OUR OFFICES</div>
              <h3 style={{ fontWeight: 900, marginBottom: 20 }}>Find Us Near You</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {OFFICES.map(o => (
                  <div key={o.city} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', display: 'flex' }}>
                    <img src={o.img} alt={o.city} style={{ width: 100, objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ padding: '1rem' }}>
                      <h6 style={{ fontWeight: 800, marginBottom: 5, fontSize: '.95rem' }}>{o.city}</h6>
                      <div style={{ fontSize: '.8rem', color: '#666', lineHeight: 1.6 }}>
                        <div><i className="bi bi-geo-alt me-1" style={{ color: 'var(--dl-red)' }}></i>{o.address}</div>
                        <div><i className="bi bi-telephone me-1" style={{ color: 'var(--dl-red)' }}></i>{o.phone}</div>
                        <div><i className="bi bi-clock me-1" style={{ color: 'var(--dl-red)' }}></i>{o.hours}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: '#fff', padding: '5rem 0' }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="section-header">
                <div style={{ display: 'inline-block', background: '#fff5f5', color: 'var(--dl-red)', borderRadius: 6, padding: '3px 12px', fontSize: '.78rem', fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>FAQ</div>
                <h2>Frequently Asked Questions</h2>
                <div className="section-divider"></div>
              </div>
              <div style={{ marginTop: 32 }}>
                {FAQS.map((faq, i) => (
                  <div key={i} style={{ borderBottom: '1px solid #f0f0f0', marginBottom: 4 }}>
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      style={{
                        width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                        padding: '1.1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        fontWeight: 700, fontSize: '.95rem', color: '#1a1a1a',
                      }}>
                      {faq.q}
                      <i className={`bi bi-chevron-${openFaq === i ? 'up' : 'down'}`} style={{ color: 'var(--dl-red)', flexShrink: 0, marginLeft: 12 }}></i>
                    </button>
                    {openFaq === i && (
                      <p style={{ color: '#666', fontSize: '.9rem', lineHeight: 1.7, paddingBottom: '1rem', marginBottom: 0 }}>{faq.a}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map embed placeholder */}
      <section style={{ height: 340, position: 'relative', overflow: 'hidden' }}>
        <img src="https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=1400&auto=format&q=70"
          alt="Map of Kenya showing Dreamline routes"
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(30%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '1.5rem 2rem', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <i className="bi bi-geo-alt-fill" style={{ fontSize: '2rem', color: 'var(--dl-red)', display: 'block', marginBottom: 8 }}></i>
            <h5 style={{ fontWeight: 800, marginBottom: 4 }}>Ronald Ngala Street</h5>
            <p style={{ color: '#666', marginBottom: 12, fontSize: '.9rem' }}>Nairobi CBD, Kenya</p>
            <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="btn-dl-primary" style={{ fontSize: '.85rem', padding: '.5rem 1.2rem' }}>
              <i className="bi bi-map-fill me-2"></i>Open in Google Maps
            </a>
          </div>
        </div>
      </section>
    </>
  );
}