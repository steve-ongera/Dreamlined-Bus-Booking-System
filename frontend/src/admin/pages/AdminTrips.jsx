/**
 * AdminTrips.jsx
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTripsAdmin, getBusesAdmin, getRoutesAdmin, getBoardingPointsAdmin, createTrip, updateTrip, deleteTrip, updateTripStatus, setTripPrices } from '../admin_api';

const STATUS_OPTS = ['scheduled', 'boarding', 'departed', 'arrived', 'cancelled'];
const badgeCls = s => `badge badge-${s}`;

export default function AdminTrips() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [boardingPoints, setBoardingPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    route_id: '', bus_id: '', departure_date: '', departure_time: '',
    arrival_time: '', duration_minutes: '', status: 'scheduled', is_active: true,
    boarding_point_ids: [],
    seat_prices: [
      { seat_class: 'economy', price: '', season: 'regular' },
      { seat_class: 'business', price: '', season: 'regular' },
      { seat_class: 'vip', price: '', season: 'regular' },
    ],
  });

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterDate) params.departure_date = filterDate;
      const [t, b, r, bp] = await Promise.all([
        getTripsAdmin(params), getBusesAdmin(), getRoutesAdmin(), getBoardingPointsAdmin(),
      ]);
      setTrips(t.results || t);
      setBuses(b.results || b);
      setRoutes(r.results || r);
      setBoardingPoints(bp.results || bp);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, filterStatus, filterDate]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      route_id: '', bus_id: '', departure_date: '', departure_time: '',
      arrival_time: '', duration_minutes: '', status: 'scheduled', is_active: true,
      boarding_point_ids: [],
      seat_prices: [
        { seat_class: 'economy', price: '', season: 'regular' },
        { seat_class: 'business', price: '', season: 'regular' },
        { seat_class: 'vip', price: '', season: 'regular' },
      ],
    });
    setError('');
    setShowModal(true);
  };

  const openEdit = (trip) => {
    setEditing(trip);
    setForm({
      route_id: trip.route || '',
      bus_id: trip.bus || '',
      departure_date: trip.departure_date,
      departure_time: trip.departure_time,
      arrival_time: trip.arrival_time,
      duration_minutes: trip.duration_minutes || '',
      status: trip.status,
      is_active: trip.is_active,
      boarding_point_ids: [],
      seat_prices: trip.seat_prices?.length
        ? trip.seat_prices.map(p => ({ seat_class: p.seat_class, price: p.price, season: p.season }))
        : [
            { seat_class: 'economy', price: '', season: 'regular' },
            { seat_class: 'business', price: '', season: 'regular' },
            { seat_class: 'vip', price: '', season: 'regular' },
          ],
    });
    setError('');
    setShowModal(true);
  };

  const updatePrice = (idx, field, val) => {
    setForm(f => ({
      ...f,
      seat_prices: f.seat_prices.map((p, i) => i === idx ? { ...p, [field]: val } : p),
    }));
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const payload = {
        route_id: Number(form.route_id),
        bus_id: Number(form.bus_id),
        departure_date: form.departure_date,
        departure_time: form.departure_time,
        arrival_time: form.arrival_time,
        duration_minutes: form.duration_minutes || null,
        status: form.status,
        is_active: form.is_active,
        boarding_point_ids: form.boarding_point_ids,
        seat_prices: form.seat_prices.filter(p => p.price),
      };
      if (editing) await updateTrip(editing.slug, payload);
      else await createTrip(payload);
      setShowModal(false);
      load();
    } catch (e) {
      const d = e.response?.data;
      setError(typeof d === 'object' ? JSON.stringify(d) : 'Save failed.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (trip) => {
    if (!confirm(`Delete trip on ${trip.departure_date}?`)) return;
    try { await deleteTrip(trip.slug); load(); }
    catch { alert('Delete failed.'); }
  };

  const handleStatusChange = async (trip, newStatus) => {
    try { await updateTripStatus(trip.slug, newStatus); load(); }
    catch { alert('Status update failed.'); }
  };

  return (
    <div>
      <div className="d-flex align-center justify-between flex-wrap gap-2 mb-4">
        <h4 className="fw-800">Trips</h4>
        <div className="d-flex gap-2 flex-wrap align-center">
          <div className="ad-search-wrap">
            <i className="bi bi-search"></i>
            <input className="ad-search-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="ad-select" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="date" className="ad-input" style={{ width: 'auto' }} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          <button className="btn-ad btn-ad-primary" onClick={openAdd}><i className="bi bi-plus-lg"></i> Add Trip</button>
        </div>
      </div>

      <div className="ad-card">
        {loading
          ? <div style={{ padding: '3rem', textAlign: 'center' }}><div className="ad-spinner" style={{ margin: '0 auto' }}></div></div>
          : trips.length === 0
          ? <div className="ad-empty"><i className="bi bi-calendar3"></i><h5>No trips found</h5></div>
          : (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Bus</th>
                  <th>Date</th>
                  <th>Departure</th>
                  <th>Bookings</th>
                  <th>Available</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trips.map(trip => (
                  <tr key={trip.slug}>
                    <td>
                      <span className="fw-600" style={{ fontSize: '.82rem' }}>
                        {trip.origin} → {trip.destination}
                      </span>
                    </td>
                    <td style={{ fontSize: '.8rem' }}>{trip.bus_name}</td>
                    <td style={{ fontSize: '.8rem' }}>{trip.departure_date}</td>
                    <td style={{ fontSize: '.8rem' }}>{trip.departure_time?.slice(0, 5)}</td>
                    <td><span className="fw-700">{trip.booking_count ?? '—'}</span></td>
                    <td>{trip.available_seats ?? '—'}</td>
                    <td>
                      <select
                        className="ad-select"
                        style={{ width: 'auto', padding: '.15rem .5rem', fontSize: '.72rem' }}
                        value={trip.status}
                        onChange={e => handleStatusChange(trip, e.target.value)}
                      >
                        {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn-ad btn-ad-secondary btn-ad-sm" onClick={() => openEdit(trip)} title="Edit"><i className="bi bi-pencil"></i></button>
                        <button className="btn-ad btn-ad-secondary btn-ad-sm"
                          onClick={() => navigate(`/admin-panel/trips/${trip.slug}/manifest`)} title="Manifest">
                          <i className="bi bi-people-fill"></i>
                        </button>
                        <button className="btn-ad btn-ad-danger btn-ad-sm" onClick={() => handleDelete(trip)} title="Delete"><i className="bi bi-trash"></i></button>
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
          <div className="ad-modal ad-modal-lg">
            <div className="ad-modal-header">
              <span className="ad-modal-title">{editing ? 'Edit Trip' : 'Add New Trip'}</span>
              <button className="ad-modal-close" onClick={() => setShowModal(false)}><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="ad-modal-body">
              {error && <div className="ad-alert ad-alert-error"><i className="bi bi-exclamation-circle-fill"></i> {error}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="ad-form-group">
                  <label className="ad-label">Route *</label>
                  <select className="ad-select" value={form.route_id} onChange={e => setForm({ ...form, route_id: e.target.value })}>
                    <option value="">Select route</option>
                    {routes.map(r => <option key={r.id} value={r.id}>{r.origin_name} → {r.destination_name}</option>)}
                  </select>
                </div>
                <div className="ad-form-group">
                  <label className="ad-label">Bus *</label>
                  <select className="ad-select" value={form.bus_id} onChange={e => setForm({ ...form, bus_id: e.target.value })}>
                    <option value="">Select bus</option>
                    {buses.map(b => <option key={b.id} value={b.id}>{b.name} ({b.plate_number})</option>)}
                  </select>
                </div>
                <div className="ad-form-group">
                  <label className="ad-label">Departure Date *</label>
                  <input type="date" className="ad-input" value={form.departure_date} onChange={e => setForm({ ...form, departure_date: e.target.value })} />
                </div>
                <div className="ad-form-group">
                  <label className="ad-label">Departure Time *</label>
                  <input type="time" className="ad-input" value={form.departure_time} onChange={e => setForm({ ...form, departure_time: e.target.value })} />
                </div>
                <div className="ad-form-group">
                  <label className="ad-label">Arrival Time *</label>
                  <input type="time" className="ad-input" value={form.arrival_time} onChange={e => setForm({ ...form, arrival_time: e.target.value })} />
                </div>
                <div className="ad-form-group">
                  <label className="ad-label">Duration (minutes)</label>
                  <input type="number" className="ad-input" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} />
                </div>
                <div className="ad-form-group">
                  <label className="ad-label">Status</label>
                  <select className="ad-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="ad-form-group">
                  <label className="ad-label">Active</label>
                  <select className="ad-select" value={form.is_active ? 'true' : 'false'} onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })}>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>

              {/* Seat Prices */}
              <div style={{ marginTop: '.5rem' }}>
                <div style={{ fontWeight: 700, marginBottom: '.5rem', fontSize: '.85rem' }}>
                  <i className="bi bi-tag-fill" style={{ color: 'var(--ad-red)', marginRight: 6 }}></i>Seat Prices
                </div>
                {form.seat_prices.map((p, i) => (
                  <div key={p.seat_class} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.5rem', marginBottom: '.5rem' }}>
                    <div>
                      <label className="ad-label">{p.seat_class.toUpperCase()} Price (KES)</label>
                      <input type="number" className="ad-input" placeholder="0" value={p.price}
                        onChange={e => updatePrice(i, 'price', e.target.value)} />
                    </div>
                    <div>
                      <label className="ad-label">Season</label>
                      <select className="ad-select" value={p.season} onChange={e => updatePrice(i, 'season', e.target.value)}>
                        {['regular', 'peak', 'holiday', 'off_peak'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="ad-modal-footer">
              <button className="btn-ad btn-ad-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-ad btn-ad-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><div className="ad-spinner ad-spinner-sm"></div> Saving...</> : <><i className="bi bi-check-lg"></i> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}