/**
 * AdminApp.jsx  –  Root of the Dreamline Admin Panel
 * Mount this at /admin-panel in your main App.jsx
 *
 * In your main App.jsx add:
 *   import AdminApp from './admin/AdminApp';
 *   <Route path="/admin-panel/*" element={<AdminApp />} />
 *
 * Also add to main.jsx (or index.jsx):
 *   import './admin/admin_style.css'
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { adminMe, adminLogout, getToken } from './admin_api';
import 'bootstrap-icons/font/bootstrap-icons.css';

// ── Pages (lazy imported inline for single-file simplicity) ──────────────────
import AdminLogin       from './pages/AdminLogin';
import AdminDashboard   from './pages/AdminDashboard';
import AdminBuses       from './pages/AdminBuses';
import AdminBusEditor   from './pages/AdminBusEditor';
import AdminTrips       from './pages/AdminTrips';
import AdminBookings    from './pages/AdminBookings';
import AdminTripManifest from './pages/AdminTripManifest';
import AdminCities      from './pages/AdminCities';
import AdminRoutes      from './pages/AdminRoutes';
import AdminUsers       from './pages/AdminUsers';
import AdminJobs        from './pages/AdminJobs';

// ── Auth Context ──────────────────────────────────────────────────────────────
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (getToken()) {
      adminMe()
        .then(setUser)
        .catch(() => setUser(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    adminLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Protected Route ───────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f7fb' }}>
      <div className="ad-spinner" style={{ width: 48, height: 48 }}></div>
    </div>
  );
  if (!user) return <Navigate to="/admin-panel/login" state={{ from: location }} replace />;
  return children;
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
const NAV = [
  { section: 'Overview' },
  { to: '/admin-panel', label: 'Dashboard', icon: 'bi-grid-1x2-fill', end: true },
  { section: 'Operations' },
  { to: '/admin-panel/trips', label: 'Trips', icon: 'bi-calendar3' },
  { to: '/admin-panel/bookings', label: 'Bookings', icon: 'bi-ticket-perforated-fill' },
  { section: 'Fleet' },
  { to: '/admin-panel/buses', label: 'Buses', icon: 'bi-bus-front-fill' },
  { section: 'Config' },
  { to: '/admin-panel/cities', label: 'Cities', icon: 'bi-geo-alt-fill' },
  { to: '/admin-panel/routes', label: 'Routes', icon: 'bi-arrow-left-right' },
  { section: 'People' },
  { to: '/admin-panel/users', label: 'Users', icon: 'bi-people-fill' },
  { to: '/admin-panel/jobs', label: 'Job Postings', icon: 'bi-briefcase-fill' },
];

function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin-panel/login');
  };

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.username[0].toUpperCase()
    : 'A';

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="admin-sidebar-overlay" onClick={onMobileClose} />
      )}

      <aside className={`admin-sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">DL</div>
          {!collapsed && (
            <div className="sidebar-brand-text">
              <div className="sidebar-brand-title">DREAMLINE</div>
              <div className="sidebar-brand-sub">ADMIN PANEL</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV.map((item, i) => {
            if (item.section) {
              return !collapsed ? (
                <div className="sidebar-section-label" key={i}>{item.section}</div>
              ) : (
                <div style={{ borderTop: '1px solid rgba(255,255,255,.07)', margin: '.4rem 0' }} key={i} />
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
                onClick={onMobileClose}
                title={collapsed ? item.label : ''}
              >
                <i className={`bi ${item.icon}`}></i>
                {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {!collapsed && (
            <div className="sidebar-user">
              <div className="sidebar-avatar">{initials}</div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user?.first_name || user?.username}</div>
                <div className="sidebar-user-role">{user?.is_superuser ? 'Super Admin' : 'Staff'}</div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="sidebar-item w-100 mt-1"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,100,100,.8)' }}
            title="Logout"
          >
            <i className="bi bi-box-arrow-left"></i>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

// ── Admin Layout ──────────────────────────────────────────────────────────────
const PAGE_TITLES = {
  '/admin-panel': 'Dashboard',
  '/admin-panel/trips': 'Trips',
  '/admin-panel/bookings': 'Bookings',
  '/admin-panel/buses': 'Buses',
  '/admin-panel/cities': 'Cities',
  '/admin-panel/routes': 'Routes',
  '/admin-panel/users': 'Users',
  '/admin-panel/jobs': 'Job Postings',
};

function AdminLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const title = Object.entries(PAGE_TITLES).find(([key]) =>
    pathname === key || (key !== '/admin-panel' && pathname.startsWith(key))
  )?.[1] || 'Admin';

  return (
    <div className="admin-layout">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className={`admin-main${collapsed ? ' sidebar-collapsed' : ''}`}>
        <div className="admin-topbar">
          <button className="topbar-toggle" onClick={() => {
            if (window.innerWidth < 992) setMobileOpen(o => !o);
            else setCollapsed(c => !c);
          }}>
            <i className="bi bi-list"></i>
          </button>
          <span className="topbar-title">{title}</span>
          <div className="topbar-actions">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="btn-ad btn-ad-secondary btn-ad-sm"
            >
              <i className="bi bi-box-arrow-up-right"></i>
              <span className="d-none d-md-inline">View Site</span>
            </a>
          </div>
        </div>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function AdminApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<AdminLogin />} />
        <Route path="*" element={
          <ProtectedRoute>
            <AdminLayout>
              <Routes>
                <Route index element={<AdminDashboard />} />
                <Route path="buses" element={<AdminBuses />} />
                <Route path="buses/:slug/layout" element={<AdminBusEditor />} />
                <Route path="trips" element={<AdminTrips />} />
                <Route path="trips/:slug/manifest" element={<AdminTripManifest />} />
                <Route path="bookings" element={<AdminBookings />} />
                <Route path="cities" element={<AdminCities />} />
                <Route path="routes" element={<AdminRoutes />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="jobs" element={<AdminJobs />} />
                <Route path="*" element={<Navigate to="/admin-panel" replace />} />
              </Routes>
            </AdminLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
}