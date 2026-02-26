import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-4 col-md-6">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div style={{
                background:'var(--dl-red)',color:'white',
                width:40,height:40,borderRadius:8,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontWeight:900,fontSize:'1rem'
              }}>DL</div>
              <div>
                <div style={{fontWeight:800,color:'white',lineHeight:1}}>DREAMLINE</div>
                <div style={{fontSize:'.65rem',color:'rgba(255,255,255,.6)',letterSpacing:1}}>BUS SERVICES</div>
              </div>
            </div>
            <p style={{fontSize:'.9rem',color:'rgba(255,255,255,.6)',lineHeight:1.7}}>
              Kenya's premier bus company connecting cities across the nation with comfort, 
              safety, and luxury. Your journey, our passion.
            </p>
            <div className="d-flex gap-3 mt-3">
              {['bi-facebook','bi-twitter-x','bi-instagram','bi-youtube'].map(icon => (
                <a href="#" key={icon} className="d-flex align-items-center justify-content-center"
                  style={{
                    width:36,height:36,background:'rgba(255,255,255,.1)',
                    borderRadius:'50%',color:'white',transition:'background .2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--dl-red)'}
                  onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,.1)'}
                >
                  <i className={`bi ${icon}`}></i>
                </a>
              ))}
            </div>
          </div>

          <div className="col-lg-2 col-md-6 col-6">
            <h5>Quick Links</h5>
            <ul className="list-unstyled d-flex flex-column gap-2">
              {[
                {to:'/', label:'Book Ticket'},
                {to:'/track', label:'Track Ticket'},
                {to:'/about-dreamline', label:'About Us'},
                {to:'/careers', label:'Careers'},
                {to:'/contact', label:'Contact'},
              ].map(l => (
                <li key={l.to}>
                  <Link to={l.to} style={{color:'rgba(255,255,255,.7)',fontSize:'.9rem'}}>
                    <i className="bi bi-chevron-right me-1" style={{fontSize:'.7rem'}}></i>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-lg-3 col-md-6 col-6">
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
                  <a href="/" style={{color:'rgba(255,255,255,.7)',fontSize:'.9rem'}}>
                    <i className="bi bi-arrow-right me-1" style={{fontSize:'.7rem',color:'var(--dl-red)'}}></i>
                    {r}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-lg-3 col-md-6">
            <h5>Contact Us</h5>
            <ul className="list-unstyled d-flex flex-column gap-2" style={{fontSize:'.9rem'}}>
              <li className="d-flex gap-2">
                <i className="bi bi-geo-alt-fill" style={{color:'var(--dl-red)',marginTop:2,flexShrink:0}}></i>
                <span style={{color:'rgba(255,255,255,.7)'}}>Ronald Ngala Street, Nairobi CBD</span>
              </li>
              <li className="d-flex gap-2">
                <i className="bi bi-telephone-fill" style={{color:'var(--dl-red)',flexShrink:0}}></i>
                <a href="tel:+254700000000" style={{color:'rgba(255,255,255,.7)'}}>+254 700 000 000</a>
              </li>
              <li className="d-flex gap-2">
                <i className="bi bi-envelope-fill" style={{color:'var(--dl-red)',flexShrink:0}}></i>
                <a href="mailto:info@dreamline.co.ke" style={{color:'rgba(255,255,255,.7)'}}>info@dreamline.co.ke</a>
              </li>
              <li className="d-flex gap-2">
                <i className="bi bi-clock-fill" style={{color:'var(--dl-red)',flexShrink:0}}></i>
                <span style={{color:'rgba(255,255,255,.7)'}}>24/7 Customer Support</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Dreamline Bus Services. All rights reserved.</p>
          <div className="d-flex justify-content-center gap-3 mt-2" style={{fontSize:'.8rem'}}>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Refund Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}