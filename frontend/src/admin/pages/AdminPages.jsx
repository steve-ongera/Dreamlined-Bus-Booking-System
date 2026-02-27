




/**
 * AdminTripManifest.jsx  –  Passenger list for a trip (printable)
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTripManifest, confirmBooking, cancelBookingAdmin } from '../admin_api';

export function AdminTripManifest() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try { setData(await getTripManifest(slug)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [slug]);

  const badgeCls = s => `badge badge-${s}`;

  const handlePrint = () => window.print();

  const passengers = (data?.passengers || []).filter(p =>
    !search ||
    p.passenger_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.reference?.toLowerCase().includes(search.toLowerCase()) ||
    p.passenger_phone?.includes(search)
  );

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}><div className="ad-spinner" style={{ margin: '0 auto' }}></div></div>;
  if (!data) return <div className="ad-alert ad-alert-error">Trip not found</div>;

  const trip = data.trip;

  return (
    <div>
      <div className="d-flex align-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <button className="btn-ad btn-ad-ghost btn-ad-sm mb-1" onClick={() => navigate('/admin-panel/trips')}>
            <i className="bi bi-arrow-left"></i> Back
          </button>
          <h4 className="fw-800">{trip.origin} → {trip.destination}</h4>
          <p className="text-muted" style={{ fontSize: '.82rem' }}>
            {trip.departure_date} · {trip.departure_time?.slice(0, 5)} · {trip.bus_name} · {data.total_passengers} passengers
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn-ad btn-ad-secondary" onClick={handlePrint}>
            <i className="bi bi-printer-fill"></i> Print Manifest
          </button>
          <button className="btn-ad btn-ad-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise"></i> Refresh
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {[
          { label: 'Total', value: data.total_passengers, color: '#2563eb', bg: '#dbeafe' },
          { label: 'Confirmed', value: (data.passengers || []).filter(p => p.status === 'confirmed').length, color: '#16a34a', bg: '#dcfce7' },
          { label: 'Pending', value: (data.passengers || []).filter(p => p.status === 'pending').length, color: '#ca8a04', bg: '#fef9c3' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, color: s.color, borderRadius: 8, padding: '.5rem 1rem', fontWeight: 700, fontSize: '.85rem' }}>
            {s.label}: {s.value}
          </div>
        ))}
      </div>

      <div className="ad-card">
        <div className="ad-card-header">
          <span className="ad-card-title"><i className="bi bi-people-fill" style={{ color: 'var(--ad-red)' }}></i> Passenger Manifest</span>
          <div className="ad-search-wrap">
            <i className="bi bi-search"></i>
            <input className="ad-search-input" placeholder="Search passenger..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Reference</th>
                <th>Passenger</th>
                <th>Phone</th>
                <th>ID</th>
                <th>Nationality</th>
                <th>Seats</th>
                <th>Boarding</th>
                <th>Amount</th>
                <th>Receipt</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {passengers.length === 0 ? (
                <tr><td colSpan={11} className="text-center text-muted" style={{ padding: '2rem' }}>No passengers found</td></tr>
              ) : passengers.map((p, i) => (
                <tr key={p.reference}>
                  <td style={{ fontWeight: 600, color: 'var(--ad-text-muted)', fontSize: '.78rem' }}>{i + 1}</td>
                  <td><code style={{ fontSize: '.75rem', fontWeight: 700 }}>{p.reference}</code></td>
                  <td>
                    <div className="fw-600">{p.passenger_name}</div>
                    <div style={{ fontSize: '.7rem', color: 'var(--ad-text-muted)' }}>{p.passenger_email}</div>
                  </td>
                  <td style={{ fontSize: '.8rem' }}>{p.passenger_phone}</td>
                  <td style={{ fontSize: '.78rem' }}>{p.passenger_id_number}</td>
                  <td style={{ fontSize: '.78rem' }}>{p.passenger_nationality}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {(p.seat_numbers || []).map((n, si) => (
                        <span key={n} style={{
                          fontSize: '.7rem', padding: '.1rem .4rem', borderRadius: 4, fontWeight: 700,
                          background: p.seat_classes?.[si] === 'vip' ? '#fef9c3' : p.seat_classes?.[si] === 'business' ? '#dbeafe' : '#dcfce7',
                          color: p.seat_classes?.[si] === 'vip' ? '#ca8a04' : p.seat_classes?.[si] === 'business' ? '#2563eb' : '#16a34a',
                        }}>{n}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontSize: '.78rem' }}>{p.boarding_point_name || '—'}</td>
                  <td style={{ fontWeight: 700, fontSize: '.82rem' }}>KES {Number(p.total_amount).toLocaleString()}</td>
                  <td style={{ fontSize: '.72rem' }}>{p.payment_receipt || '—'}</td>
                  <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminTripManifest;


/* ═══════════════════════════════════════════════════════════════════════════
   AdminBookings.jsx
═══════════════════════════════════════════════════════════════════════════ */
export function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selected, setSelected] = useState(null);

  const { getBookingsAdmin, confirmBooking, cancelBookingAdmin } = require('../admin_api');

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterDate) params['trip__departure_date'] = filterDate;
      const data = await getBookingsAdmin(params);
      setBookings(data.results || data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, filterStatus, filterDate]);

  const handleConfirm = async (ref) => {
    try { await confirmBooking(ref); load(); } catch { alert('Failed'); }
  };
  const handleCancel = async (ref) => {
    if (!confirm('Cancel this booking?')) return;
    try { await cancelBookingAdmin(ref); load(); } catch { alert('Failed'); }
  };

  return (
    <div>
      <div className="d-flex align-center justify-between flex-wrap gap-2 mb-4">
        <h4 className="fw-800">Bookings</h4>
        <div className="d-flex gap-2 flex-wrap align-center">
          <div className="ad-search-wrap">
            <i className="bi bi-search"></i>
            <input className="ad-search-input" placeholder="Search ref / name / phone..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="ad-select" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            {['confirmed', 'pending', 'cancelled', 'refunded'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="date" className="ad-input" style={{ width: 'auto' }} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
        </div>
      </div>

      <div className="ad-card">
        {loading
          ? <div style={{ padding: '3rem', textAlign: 'center' }}><div className="ad-spinner" style={{ margin: '0 auto' }}></div></div>
          : (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Passenger</th>
                  <th>Route</th>
                  <th>Date</th>
                  <th>Seats</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0
                  ? <tr><td colSpan={9} className="text-center text-muted" style={{ padding: '2rem' }}>No bookings found</td></tr>
                  : bookings.map(b => (
                  <tr key={b.reference}>
                    <td><code style={{ fontWeight: 700, fontSize: '.78rem' }}>{b.reference}</code></td>
                    <td>
                      <div className="fw-600" style={{ fontSize: '.82rem' }}>{b.passenger_name}</div>
                      <div style={{ fontSize: '.7rem', color: 'var(--ad-text-muted)' }}>{b.passenger_phone}</div>
                    </td>
                    <td style={{ fontSize: '.8rem' }}>{b.route}</td>
                    <td style={{ fontSize: '.78rem' }}>{b.departure_date}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {(b.seat_numbers || []).map(n => (
                          <span key={n} style={{ fontSize: '.68rem', padding: '.1rem .35rem', borderRadius: 3, background: '#f3f4f6', fontWeight: 700 }}>{n}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>KES {Number(b.total_amount).toLocaleString()}</td>
                    <td>
                      <span style={{ fontSize: '.72rem', color: b.payment_status === 'completed' ? '#16a34a' : 'var(--ad-text-muted)' }}>
                        {b.payment_status || 'N/A'}
                      </span>
                      {b.payment_receipt && <div style={{ fontSize: '.65rem', color: 'var(--ad-text-muted)' }}>{b.payment_receipt}</div>}
                    </td>
                    <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                    <td>
                      <div className="actions">
                        {b.status === 'pending' && (
                          <button className="btn-ad btn-ad-success btn-ad-sm" onClick={() => handleConfirm(b.reference)} title="Confirm">
                            <i className="bi bi-check-lg"></i>
                          </button>
                        )}
                        {b.status !== 'cancelled' && (
                          <button className="btn-ad btn-ad-danger btn-ad-sm" onClick={() => handleCancel(b.reference)} title="Cancel">
                            <i className="bi bi-x-lg"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   AdminCities.jsx  –  Reusable CRUD pattern
═══════════════════════════════════════════════════════════════════════════ */
import { useState, useEffect } from 'react';
import { getCitiesAdmin, createCity, updateCity, deleteCity } from '../admin_api';

export function AdminCities() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try { const d = await getCitiesAdmin({ search }); setItems(d.results || d); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search]);

  const openAdd = () => { setEditing(null); setForm({ name: '', is_active: true }); setError(''); setShowModal(true); };
  const openEdit = (it) => { setEditing(it); setForm({ name: it.name, is_active: it.is_active }); setError(''); setShowModal(true); };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      if (editing) await updateCity(editing.slug, form);
      else await createCity(form);
      setShowModal(false); load();
    } catch (e) { setError('Save failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (it) => {
    if (!confirm(`Delete "${it.name}"?`)) return;
    try { await deleteCity(it.slug); load(); }
    catch { alert('Delete failed.'); }
  };

  return (
    <div>
      <div className="d-flex align-center justify-between flex-wrap gap-2 mb-4">
        <h4 className="fw-800">Cities</h4>
        <div className="d-flex gap-2">
          <div className="ad-search-wrap"><i className="bi bi-search"></i>
            <input className="ad-search-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn-ad btn-ad-primary" onClick={openAdd}><i className="bi bi-plus-lg"></i> Add City</button>
        </div>
      </div>
      <div className="ad-card">
        {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}><div className="ad-spinner" style={{ margin: '0 auto' }}></div></div>
          : items.length === 0 ? <div className="ad-empty"><i className="bi bi-geo-alt"></i><h5>No cities</h5></div>
          : (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>Name</th><th>Slug</th><th>Routes</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.slug}>
                    <td className="fw-600">{it.name}</td>
                    <td><code style={{ fontSize: '.75rem' }}>{it.slug}</code></td>
                    <td>{it.route_count ?? '—'}</td>
                    <td><span className={`badge ${it.is_active ? 'badge-active' : 'badge-inactive'}`}>{it.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td><div className="actions">
                      <button className="btn-ad btn-ad-secondary btn-ad-sm" onClick={() => openEdit(it)}><i className="bi bi-pencil"></i></button>
                      <button className="btn-ad btn-ad-danger btn-ad-sm" onClick={() => handleDelete(it)}><i className="bi bi-trash"></i></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showModal && (
        <div className="ad-modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="ad-modal ad-modal-sm">
            <div className="ad-modal-header">
              <span className="ad-modal-title">{editing ? 'Edit City' : 'Add City'}</span>
              <button className="ad-modal-close" onClick={() => setShowModal(false)}><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="ad-modal-body">
              {error && <div className="ad-alert ad-alert-error">{error}</div>}
              <div className="ad-form-group">
                <label className="ad-label">City Name *</label>
                <input className="ad-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Nairobi" />
              </div>
              <div className="ad-form-group">
                <label className="ad-label">Status</label>
                <select className="ad-select" value={form.is_active ? 'true' : 'false'} onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div className="ad-modal-footer">
              <button className="btn-ad btn-ad-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-ad btn-ad-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   AdminRoutes.jsx
═══════════════════════════════════════════════════════════════════════════ */
import { getRoutesAdmin, getCitiesAdmin as _getCities, createRoute, updateRoute, deleteRoute } from '../admin_api';

export function AdminRoutes() {
  const [items, setItems] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ origin_id: '', destination_id: '', distance_km: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [d, c] = await Promise.all([getRoutesAdmin(), _getCities()]);
      setItems(d.results || d);
      setCities(c.results || c);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ origin_id: '', destination_id: '', distance_km: '', is_active: true }); setError(''); setShowModal(true); };
  const openEdit = it => { setEditing(it); setForm({ origin_id: it.origin?.id || '', destination_id: it.destination?.id || '', distance_km: it.distance_km || '', is_active: it.is_active }); setError(''); setShowModal(true); };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const p = { origin_id: Number(form.origin_id), destination_id: Number(form.destination_id), distance_km: form.distance_km || null, is_active: form.is_active };
      if (editing) await updateRoute(editing.slug, p); else await createRoute(p);
      setShowModal(false); load();
    } catch (e) { setError('Save failed. Routes must be unique.'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="d-flex align-center justify-between flex-wrap gap-2 mb-4">
        <h4 className="fw-800">Routes</h4>
        <button className="btn-ad btn-ad-primary" onClick={openAdd}><i className="bi bi-plus-lg"></i> Add Route</button>
      </div>
      <div className="ad-card">
        {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}><div className="ad-spinner" style={{ margin: '0 auto' }}></div></div>
          : (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>Origin</th><th>Destination</th><th>Distance</th><th>Trips</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.slug}>
                    <td className="fw-600">{it.origin_name}</td>
                    <td className="fw-600">{it.destination_name}</td>
                    <td>{it.distance_km ? `${it.distance_km} km` : '—'}</td>
                    <td>{it.trip_count}</td>
                    <td><span className={`badge ${it.is_active ? 'badge-active' : 'badge-inactive'}`}>{it.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td><div className="actions">
                      <button className="btn-ad btn-ad-secondary btn-ad-sm" onClick={() => openEdit(it)}><i className="bi bi-pencil"></i></button>
                      <button className="btn-ad btn-ad-danger btn-ad-sm" onClick={async () => { if (confirm('Delete route?')) { try { await deleteRoute(it.slug); load(); } catch { alert('Delete failed.'); } } }}><i className="bi bi-trash"></i></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showModal && (
        <div className="ad-modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="ad-modal ad-modal-sm">
            <div className="ad-modal-header">
              <span className="ad-modal-title">{editing ? 'Edit Route' : 'Add Route'}</span>
              <button className="ad-modal-close" onClick={() => setShowModal(false)}><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="ad-modal-body">
              {error && <div className="ad-alert ad-alert-error">{error}</div>}
              <div className="ad-form-group">
                <label className="ad-label">Origin *</label>
                <select className="ad-select" value={form.origin_id} onChange={e => setForm({ ...form, origin_id: e.target.value })}>
                  <option value="">Select city</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="ad-form-group">
                <label className="ad-label">Destination *</label>
                <select className="ad-select" value={form.destination_id} onChange={e => setForm({ ...form, destination_id: e.target.value })}>
                  <option value="">Select city</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="ad-form-group">
                <label className="ad-label">Distance (km)</label>
                <input type="number" className="ad-input" value={form.distance_km} onChange={e => setForm({ ...form, distance_km: e.target.value })} />
              </div>
            </div>
            <div className="ad-modal-footer">
              <button className="btn-ad btn-ad-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-ad btn-ad-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   AdminUsers.jsx
═══════════════════════════════════════════════════════════════════════════ */
import { getUsers, createUser, updateUser, deleteUser, toggleUserActive, resetUserPassword } from '../admin_api';

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ username: '', email: '', first_name: '', last_name: '', is_staff: true, is_superuser: false, password: '', confirm_password: '' });
  const [pwForm, setPwForm] = useState({ password: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try { const d = await getUsers({ search }); setUsers(d.results || d); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search]);

  const openAdd = () => {
    setEditing(null);
    setForm({ username: '', email: '', first_name: '', last_name: '', is_staff: true, is_superuser: false, password: '', confirm_password: '' });
    setError(''); setShowModal(true);
  };
  const openEdit = u => {
    setEditing(u);
    setForm({ username: u.username, email: u.email, first_name: u.first_name, last_name: u.last_name, is_staff: u.is_staff, is_superuser: u.is_superuser, password: '', confirm_password: '' });
    setError(''); setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const payload = { username: form.username, email: form.email, first_name: form.first_name, last_name: form.last_name, is_staff: form.is_staff, is_superuser: form.is_superuser };
      if (!editing) { payload.password = form.password; payload.confirm_password = form.confirm_password; }
      if (editing) await updateUser(editing.id, payload); else await createUser(payload);
      setShowModal(false); load();
    } catch (e) {
      const d = e.response?.data;
      setError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'Save failed.');
    } finally { setSaving(false); }
  };

  const handleResetPw = async () => {
    if (pwForm.password !== pwForm.confirm) { setError('Passwords do not match'); return; }
    setSaving(true); setError('');
    try { await resetUserPassword(editing.id, pwForm.password); setShowPwModal(false); }
    catch { setError('Failed to reset password.'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="d-flex align-center justify-between flex-wrap gap-2 mb-4">
        <h4 className="fw-800">Admin Users</h4>
        <div className="d-flex gap-2">
          <div className="ad-search-wrap"><i className="bi bi-search"></i>
            <input className="ad-search-input" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn-ad btn-ad-primary" onClick={openAdd}><i className="bi bi-person-plus-fill"></i> Add User</button>
        </div>
      </div>
      <div className="ad-card">
        {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}><div className="ad-spinner" style={{ margin: '0 auto' }}></div></div>
          : (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="fw-600">{u.first_name} {u.last_name}</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--ad-text-muted)' }}>@{u.username}</div>
                    </td>
                    <td style={{ fontSize: '.8rem' }}>{u.email}</td>
                    <td>
                      {u.is_superuser && <span className="badge badge-superuser">Super Admin</span>}
                      {!u.is_superuser && u.is_staff && <span className="badge badge-staff">Staff</span>}
                    </td>
                    <td style={{ fontSize: '.78rem' }}>{new Date(u.date_joined).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-active' : 'badge-inactive'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn-ad btn-ad-secondary btn-ad-sm" onClick={() => openEdit(u)}><i className="bi bi-pencil"></i></button>
                        <button className="btn-ad btn-ad-secondary btn-ad-sm" title="Reset password"
                          onClick={() => { setEditing(u); setPwForm({ password: '', confirm: '' }); setError(''); setShowPwModal(true); }}>
                          <i className="bi bi-key-fill"></i>
                        </button>
                        <button className="btn-ad btn-ad-secondary btn-ad-sm" title="Toggle active"
                          onClick={async () => { try { await toggleUserActive(u.id); load(); } catch { alert('Failed'); } }}>
                          <i className={`bi bi-toggle-${u.is_active ? 'on' : 'off'}`}></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="ad-modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="ad-modal ad-modal-md">
            <div className="ad-modal-header">
              <span className="ad-modal-title">{editing ? 'Edit User' : 'Add Admin User'}</span>
              <button className="ad-modal-close" onClick={() => setShowModal(false)}><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="ad-modal-body">
              {error && <div className="ad-alert ad-alert-error">{error}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="ad-form-group">
                  <label className="ad-label">First Name</label>
                  <input className="ad-input" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
                </div>
                <div className="ad-form-group">
                  <label className="ad-label">Last Name</label>
                  <input className="ad-input" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
                </div>
                <div className="ad-form-group">
                  <label className="ad-label">Username *</label>
                  <input className="ad-input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                </div>
                <div className="ad-form-group">
                  <label className="ad-label">Email</label>
                  <input type="email" className="ad-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="ad-form-group">
                  <label className="ad-label">Role</label>
                  <select className="ad-select" value={form.is_superuser ? 'super' : 'staff'} onChange={e => setForm({ ...form, is_superuser: e.target.value === 'super', is_staff: true })}>
                    <option value="staff">Staff</option>
                    <option value="super">Super Admin</option>
                  </select>
                </div>
                {!editing && (
                  <>
                    <div className="ad-form-group">
                      <label className="ad-label">Password *</label>
                      <input type="password" className="ad-input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                    </div>
                    <div className="ad-form-group" style={{ gridColumn: '1/-1' }}>
                      <label className="ad-label">Confirm Password *</label>
                      <input type="password" className="ad-input" value={form.confirm_password} onChange={e => setForm({ ...form, confirm_password: e.target.value })} />
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="ad-modal-footer">
              <button className="btn-ad btn-ad-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-ad btn-ad-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {showPwModal && (
        <div className="ad-modal-overlay" onClick={e => e.target === e.currentTarget && setShowPwModal(false)}>
          <div className="ad-modal ad-modal-sm">
            <div className="ad-modal-header">
              <span className="ad-modal-title">Reset Password — @{editing?.username}</span>
              <button className="ad-modal-close" onClick={() => setShowPwModal(false)}><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="ad-modal-body">
              {error && <div className="ad-alert ad-alert-error">{error}</div>}
              <div className="ad-form-group">
                <label className="ad-label">New Password</label>
                <input type="password" className="ad-input" value={pwForm.password} onChange={e => setPwForm({ ...pwForm, password: e.target.value })} />
              </div>
              <div className="ad-form-group">
                <label className="ad-label">Confirm Password</label>
                <input type="password" className="ad-input" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} />
              </div>
            </div>
            <div className="ad-modal-footer">
              <button className="btn-ad btn-ad-secondary" onClick={() => setShowPwModal(false)}>Cancel</button>
              <button className="btn-ad btn-ad-primary" onClick={handleResetPw} disabled={saving}>{saving ? 'Saving...' : 'Reset Password'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   AdminJobs.jsx
═══════════════════════════════════════════════════════════════════════════ */
import { getJobsAdmin, createJob, updateJob, deleteJob } from '../admin_api';

const DEPTS = ['operations', 'driving', 'customer_service', 'finance', 'it', 'management'];

export function AdminJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', department: '', location: '', description: '', requirements: '', deadline: '', is_active: true });

  const load = async () => {
    setLoading(true);
    try { const d = await getJobsAdmin(); setJobs(d.results || d); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ title: '', department: '', location: '', description: '', requirements: '', deadline: '', is_active: true }); setError(''); setShowModal(true); };
  const openEdit = j => { setEditing(j); setForm({ title: j.title, department: j.department, location: j.location, description: j.description, requirements: j.requirements, deadline: j.deadline || '', is_active: j.is_active }); setError(''); setShowModal(true); };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      if (editing) await updateJob(editing.slug, form); else await createJob(form);
      setShowModal(false); load();
    } catch { setError('Save failed.'); } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="d-flex align-center justify-between flex-wrap gap-2 mb-4">
        <h4 className="fw-800">Job Postings</h4>
        <button className="btn-ad btn-ad-primary" onClick={openAdd}><i className="bi bi-plus-lg"></i> Add Job</button>
      </div>
      <div className="ad-card">
        {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}><div className="ad-spinner" style={{ margin: '0 auto' }}></div></div>
          : jobs.length === 0 ? <div className="ad-empty"><i className="bi bi-briefcase"></i><h5>No jobs posted</h5></div>
          : (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>Title</th><th>Department</th><th>Location</th><th>Deadline</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.slug}>
                    <td className="fw-600">{j.title}</td>
                    <td><span className="badge badge-scheduled" style={{ textTransform: 'capitalize' }}>{j.department.replace('_', ' ')}</span></td>
                    <td style={{ fontSize: '.82rem' }}>{j.location}</td>
                    <td style={{ fontSize: '.8rem' }}>{j.deadline || 'Open'}</td>
                    <td><span className={`badge ${j.is_active ? 'badge-active' : 'badge-inactive'}`}>{j.is_active ? 'Active' : 'Closed'}</span></td>
                    <td><div className="actions">
                      <button className="btn-ad btn-ad-secondary btn-ad-sm" onClick={() => openEdit(j)}><i className="bi bi-pencil"></i></button>
                      <button className="btn-ad btn-ad-danger btn-ad-sm" onClick={async () => { if (confirm('Delete job?')) { try { await deleteJob(j.slug); load(); } catch { alert('Failed'); } } }}><i className="bi bi-trash"></i></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showModal && (
        <div className="ad-modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="ad-modal ad-modal-lg">
            <div className="ad-modal-header">
              <span className="ad-modal-title">{editing ? 'Edit Job' : 'Add Job Posting'}</span>
              <button className="ad-modal-close" onClick={() => setShowModal(false)}><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="ad-modal-body">
              {error && <div className="ad-alert ad-alert-error">{error}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="ad-form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="ad-label">Job Title *</label>
                  <input className="ad-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Bus Driver" />
                </div>
                <div className="ad-form-group">
                  <label className="ad-label">Department *</label>
                  <select className="ad-select" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                    <option value="">Select department</option>
                    {DEPTS.map(d => <option key={d} value={d}>{d.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                  </select>
                </div>
                <div className="ad-form-group">
                  <label className="ad-label">Location *</label>
                  <input className="ad-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Nairobi" />
                </div>
                <div className="ad-form-group">
                  <label className="ad-label">Application Deadline</label>
                  <input type="date" className="ad-input" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
                </div>
                <div className="ad-form-group">
                  <label className="ad-label">Status</label>
                  <select className="ad-select" value={form.is_active ? 'true' : 'false'} onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })}>
                    <option value="true">Active</option>
                    <option value="false">Closed</option>
                  </select>
                </div>
                <div className="ad-form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="ad-label">Job Description *</label>
                  <textarea className="ad-textarea" rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the role..." />
                </div>
                <div className="ad-form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="ad-label">Requirements</label>
                  <textarea className="ad-textarea" rows={4} value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} placeholder="List requirements..." />
                </div>
              </div>
            </div>
            <div className="ad-modal-footer">
              <button className="btn-ad btn-ad-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-ad btn-ad-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}