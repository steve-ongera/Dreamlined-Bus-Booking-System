import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="navbar navbar-expand-lg">
      <div className="container">
        <Link to="/" className="navbar-brand d-flex align-items-center gap-2">
          <div style={{
            background:'var(--dl-red)',
            color:'white',
            width:42,height:42,
            borderRadius:8,
            display:'flex',alignItems:'center',justifyContent:'center',
            fontWeight:900,fontSize:'1.1rem',letterSpacing:'-1px'
          }}>DL</div>
          <div>
            <div style={{fontWeight:800,fontSize:'1rem',lineHeight:1,color:'var(--dl-dark)'}}>DREAMLINE</div>
            <div style={{fontSize:'.65rem',color:'var(--dl-gray)',letterSpacing:1}}>BUS SERVICES</div>
          </div>
        </Link>

        <button
          className="navbar-toggler"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          <i className={`bi ${open ? 'bi-x-lg' : 'bi-list'}`} style={{fontSize:'1.5rem'}}></i>
        </button>

        <div className={`navbar-collapse ${open ? 'show' : 'collapse'}`}>
          <ul className="navbar-nav ms-auto gap-1 align-items-lg-center">
            {[
              { to:'/', label:'Home', icon:'bi-house' },
              { to:'/about-dreamline', label:'About Dreamline', icon:'bi-bus-front' },
              { to:'/track', label:'Track Ticket', icon:'bi-ticket-perforated' },
              { to:'/careers', label:'Careers', icon:'bi-briefcase' },
              { to:'/contact', label:'Contact', icon:'bi-envelope' },
            ].map(item => (
              <li className="nav-item" key={item.to}>
                <NavLink
                  to={item.to}
                  className={({isActive}) => `nav-link d-flex align-items-center gap-1 ${isActive ? 'active' : ''}`}
                  onClick={() => setOpen(false)}
                  end={item.to === '/'}
                >
                  <i className={`bi ${item.icon}`}></i>
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}