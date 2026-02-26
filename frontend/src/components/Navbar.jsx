/*
Navbar.jsx
*/
import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const navItems = [
    { to: '/',                  label: 'Home',            icon: 'bi-house-fill' },
    { to: '/about-dreamline',   label: 'About Dreamline', icon: 'bi-bus-front-fill' },
    { to: '/track',             label: 'Track Ticket',    icon: 'bi-ticket-perforated-fill' },
    { to: '/careers',           label: 'Careers',         icon: 'bi-briefcase-fill' },
    { to: '/contact',           label: 'Contact',         icon: 'bi-envelope-fill' },
  ];

  return (
    <>
      {/* ── Navbar bar ── */}
      <nav className="navbar navbar-expand-lg">
        <div className="container">

          {/* Brand */}
          <Link to="/" className="navbar-brand d-flex align-items-center gap-2" onClick={() => setOpen(false)}>
            <div style={{
              background: 'var(--dl-red)',
              color: 'white',
              width: 36, height: 36,
              borderRadius: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '.95rem', letterSpacing: '-1px',
              flexShrink: 0,
            }}>DL</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '.9rem', lineHeight: 1, color: 'var(--dl-dark)' }}>DREAMLINE</div>
              <div style={{ fontSize: '.6rem', color: 'var(--dl-gray)', letterSpacing: 1 }}>BUS SERVICES</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="collapse navbar-collapse">
            <ul className="navbar-nav ms-auto gap-1 align-items-center">
              {navItems.map(item => (
                <li className="nav-item" key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) => `nav-link d-flex align-items-center gap-1 ${isActive ? 'active' : ''}`}
                    end={item.to === '/'}
                  >
                    <i className={`bi ${item.icon}`} style={{ fontSize: '.8rem' }}></i>
                    <span style={{ fontSize: '.88rem' }}>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="navbar-toggler d-lg-none"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            style={{ marginLeft: 'auto' }}
          >
            <i className="bi bi-list" style={{ fontSize: '1.6rem', color: 'var(--dl-dark)' }}></i>
          </button>
        </div>
      </nav>

      {/* ── Mobile drawer overlay ── */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 2000,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'all' : 'none',
          transition: 'opacity .25s ease',
        }}
      />

      {/* ── Mobile drawer panel ── */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: 'min(78vw, 280px)',
        background: 'var(--dl-white)',
        zIndex: 2100,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
        overflowY: 'auto',
      }}>

        {/* Drawer header */}
        <div style={{
          background: 'var(--dl-red)',
          padding: '1.1rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <Link to="/" onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              width: 34, height: 34,
              borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '.9rem',
            }}>DL</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '.88rem', color: '#fff', lineHeight: 1 }}>DREAMLINE</div>
              <div style={{ fontSize: '.58rem', color: 'rgba(255,255,255,.75)', letterSpacing: 1 }}>BUS SERVICES</div>
            </div>
          </Link>

          <button
            onClick={() => setOpen(false)}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: 6,
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
            }}
            aria-label="Close menu"
          >
            <i className="bi bi-x-lg" style={{ fontSize: '1rem' }}></i>
          </button>
        </div>

        {/* Nav links */}
        <nav style={{ padding: '.6rem .5rem', flex: 1 }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) => isActive ? 'drawer-link drawer-link-active' : 'drawer-link'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '.7rem .9rem',
                borderRadius: 8,
                marginBottom: 3,
                textDecoration: 'none',
                fontWeight: isActive ? 700 : 500,
                fontSize: '.88rem',
                color: isActive ? 'var(--dl-red)' : 'var(--dl-dark)',
                background: isActive ? '#fff0f0' : 'transparent',
                transition: 'background .15s, color .15s',
              })}
            >
              {({ isActive }) => (
                <>
                  <span style={{
                    width: 32, height: 32,
                    borderRadius: 7,
                    background: isActive ? 'var(--dl-red)' : '#f0f0f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'background .15s',
                  }}>
                    <i className={`bi ${item.icon}`} style={{ fontSize: '.85rem', color: isActive ? '#fff' : 'var(--dl-gray)' }}></i>
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Drawer footer */}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid var(--dl-border)',
          flexShrink: 0,
        }}>
          <a href="tel:+254700000000" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#f5f5f7', borderRadius: 8,
            padding: '.65rem .9rem',
            textDecoration: 'none',
            color: 'var(--dl-dark)',
          }}>
            <i className="bi bi-telephone-fill" style={{ color: 'var(--dl-red)', fontSize: '.9rem' }}></i>
            <div>
              <div style={{ fontSize: '.7rem', color: 'var(--dl-gray)', lineHeight: 1 }}>Call us 24/7</div>
              <div style={{ fontWeight: 700, fontSize: '.85rem', lineHeight: 1.4 }}>+254 700 000 000</div>
            </div>
          </a>
        </div>
      </div>
    </>
  );
}