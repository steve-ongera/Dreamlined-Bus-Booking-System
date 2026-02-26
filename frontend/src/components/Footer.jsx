/*
Footer.jsx
*/
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="row g-3">

          {/* Brand + social */}
          <div className="col-12 col-md-5 col-lg-4">
            <div className="d-flex align-items-center gap-2 mb-2">
              <div style={{
                background: 'var(--dl-red)', color: 'white',
                width: 36, height: 36, borderRadius: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: '.9rem', flexShrink: 0,
              }}>DL</div>
              <div>
                <div style={{ fontWeight: 800, color: 'white', lineHeight: 1, fontSize: '.9rem' }}>DREAMLINE</div>
                <div style={{ fontSize: '.58rem', color: 'rgba(255,255,255,.6)', letterSpacing: 1 }}>BUS SERVICES</div>
              </div>
            </div>
            <p style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.6)', lineHeight: 1.65, marginBottom: '1rem' }}>
              Kenya's premier bus company connecting cities across the nation with comfort,
              safety, and luxury. Your journey, our passion.
            </p>
            <div className="d-flex gap-2">
              {['bi-facebook', 'bi-twitter-x', 'bi-instagram', 'bi-youtube'].map(icon => (
                <a href="#" key={icon}
                  className="d-flex align-items-center justify-content-center"
                  style={{
                    width: 32, height: 32, background: 'rgba(255,255,255,.1)',
                    borderRadius: '50%', color: 'white', transition: 'background .2s', flexShrink: 0,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--dl-red)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.1)'}
                >
                  <i className={`bi ${icon}`} style={{ fontSize: '.8rem' }}></i>
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="col-6 col-md-3 col-lg-2">
            <h5>Quick Links</h5>
            <ul className="list-unstyled d-flex flex-column gap-2">
              {[
                { to: '/', label: 'Book Ticket' },
                { to: '/track', label: 'Track Ticket' },
                { to: '/about-dreamline', label: 'About Us' },
                { to: '/careers', label: 'Careers' },
                { to: '/contact', label: 'Contact' },
              ].map(l => (
                <li key={l.to}>
                  <Link to={l.to} style={{ color: 'rgba(255,255,255,.65)', fontSize: '.82rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <i className="bi bi-chevron-right" style={{ fontSize: '.62rem' }}></i>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular routes */}
          <div className="col-6 col-md-4 col-lg-3">
            <h5>Popular Routes</h5>
            <ul className="list-unstyled d-flex flex-column gap-2">
              {[
                'Nairobi → Mombasa',
                'Nairobi → Kisumu',
                'Nairobi → Nakuru',
                'Mombasa → Malindi',
                'Nairobi → Eldoret',
              ].map(r => (
                <li key={r}>
                  <a href="/" style={{ color: 'rgba(255,255,255,.65)', fontSize: '.82rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <i className="bi bi-arrow-right" style={{ fontSize: '.62rem', color: 'var(--dl-red)' }}></i>
                    {r}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="col-12 col-md-12 col-lg-3">
            <h5>Contact Us</h5>
            <ul className="list-unstyled d-flex flex-column gap-2" style={{ fontSize: '.82rem' }}>
              <li className="d-flex gap-2">
                <i className="bi bi-geo-alt-fill" style={{ color: 'var(--dl-red)', marginTop: 2, flexShrink: 0, fontSize: '.85rem' }}></i>
                <span style={{ color: 'rgba(255,255,255,.65)' }}>Ronald Ngala Street, Nairobi CBD</span>
              </li>
              <li className="d-flex gap-2">
                <i className="bi bi-telephone-fill" style={{ color: 'var(--dl-red)', flexShrink: 0, fontSize: '.85rem' }}></i>
                <a href="tel:+254700000000" style={{ color: 'rgba(255,255,255,.65)' }}>+254 700 000 000</a>
              </li>
              <li className="d-flex gap-2">
                <i className="bi bi-envelope-fill" style={{ color: 'var(--dl-red)', flexShrink: 0, fontSize: '.85rem' }}></i>
                <a href="mailto:info@dreamline.co.ke" style={{ color: 'rgba(255,255,255,.65)', wordBreak: 'break-all' }}>info@dreamline.co.ke</a>
              </li>
              <li className="d-flex gap-2">
                <i className="bi bi-clock-fill" style={{ color: 'var(--dl-red)', flexShrink: 0, fontSize: '.85rem' }}></i>
                <span style={{ color: 'rgba(255,255,255,.65)' }}>24/7 Customer Support</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Dreamline Bus Services. All rights reserved.</p>
          <div className="d-flex justify-content-center gap-3 mt-1 flex-wrap" style={{ fontSize: '.75rem' }}>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Refund Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}