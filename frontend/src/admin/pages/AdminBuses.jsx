/**
 * AdminBuses.jsx  –  Bus list with add/edit/delete
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBusesAdmin, getBusTypes, createBus, updateBus, deleteBus } from '../admin_api';

export default function AdminBuses() {
  const navigate = useNavigate();
  const [buses, setBuses] = useState([]);
  const [busTypes, setBusTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', plate_number: '', bus_type_id: '', amenities: '', total_seats: 48, is_active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [b, bt] = await Promise.all([getBusesAdmin({ search }), getBusTypes()]);
      setBuses(b.results || b);
      setBusTypes(bt.results || bt);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', plate_number: '', bus_type_id: '', amenities: '', total_seats: 48, is_active: true });
    setError('');
    setShowModal(true);
  };

  const openEdit = (bus) => {
    setEditing(bus);
    setForm({
      name: bus.name,
      plate_number: bus.plate_number,
      bus_type_id: bus.bus_type_name ? busTypes.find(t => t.name === bus.bus_type_name)?.id || '' : '',
      amenities: (bus.amenities || []).join(', '),
      total_seats: bus.total_seats,
      is_active: bus.is_active,
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        plate_number: form.plate_number,
        bus_type_id: form.bus_type_id || undefined,
        amenities: form.amenities ? form.amenities.split(',').map(s => s.trim()).filter(Boolean) : [],
        total_seats: Number(form.total_seats),
        is_active: form.is_active,
      };
      if (editing) {
        await updateBus(editing.slug, payload);
      } else {
        await createBus(payload);
      }
      setShowModal(false);
      load();
    } catch (e) {
      const d = e.response?.data;
      setError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'Save failed.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (bus) => {
    if (!confirm(`Delete bus "${bus.name}"? This cannot be undone.`)) return;
    try { await deleteBus(bus.slug); load(); }
    catch { alert('Delete failed — bus may have trips assigned.'); }
  };

  return (
    <div>
      <div className="d-flex align-center justify-between flex-wrap gap-2 mb-4">
        <h4 className="fw-800">Buses</h4>
        <div className="d-flex gap-2 flex-wrap">
          <div className="ad-search-wrap">
            <i className="bi bi-search"></i>
            <input className="ad-search-input" placeholder="Search buses..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn-ad btn-ad-primary" onClick={openAdd}>
            <i className="bi bi-plus-lg"></i> Add Bus
          </button>
        </div>
      </div>

      <div className="ad-card">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><div className="ad-spinner" style={{ margin: '0 auto' }}></div></div>
        ) : buses.length === 0 ? (
          <div className="ad-empty">
            <i className="bi bi-bus-front"></i>
            <h5>No buses found</h5>
            <p>Add your first bus to get started</p>
          </div>
        ) : (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Plate</th>
                  <th>Type</th>
                  <th>Seats</th>
                  <th>Amenities</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {buses.map(bus => (
                  <tr key={bus.slug}>
                    <td><span className="fw-700">{bus.name}</span></td>
                    <td><code style={{ fontSize: '.78rem' }}>{bus.plate_number}</code></td>
                    <td style={{ fontSize: '.8rem' }}>{bus.bus_type_name || '—'}</td>
                    <td>{bus.seat_count || bus.total_seats}</td>
                    <td>
                      <div className="d-flex gap-1 flex-wrap">
                        {(bus.amenities || []).slice(0, 3).map(a => (
                          <span key={a} className="badge badge-scheduled" style={{ fontSize: '.65rem' }}>{a}</span>
                        ))}
                        {(bus.amenities || []).length > 3 && (
                          <span className="badge" style={{ background: '#f3f4f6', color: '#6b7280', fontSize: '.65rem' }}>
                            +{bus.amenities.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${bus.is_active ? 'badge-active' : 'badge-inactive'}`}>
                        {bus.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn-ad btn-ad-secondary btn-ad-sm" onClick={() => openEdit(bus)} title="Edit">
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn-ad btn-ad-secondary btn-ad-sm"
                          onClick={() => navigate(`/admin-panel/buses/${bus.slug}/layout`)} title="Seat Layout">
                          <i className="bi bi-grid-3x3"></i>
                        </button>
                        <button className="btn-ad btn-ad-danger btn-ad-sm" onClick={() => handleDelete(bus)} title="Delete">
                          <i className="bi bi-trash"></i>
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="ad-modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="ad-modal ad-modal-md">
            <div className="ad-modal-header">
              <span className="ad-modal-title">{editing ? 'Edit Bus' : 'Add New Bus'}</span>
              <button className="ad-modal-close" onClick={() => setShowModal(false)}><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="ad-modal-body">
              {error && <div className="ad-alert ad-alert-error"><i className="bi bi-exclamation-circle-fill"></i>{error}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="ad-form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="ad-label">Bus Name *</label>
                  <input className="ad-input" placeholder="e.g. Executive MD" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="ad-form-group">
                  <label className="ad-label">Plate Number *</label>
                  <input className="ad-input" placeholder="KAA 000A" value={form.plate_number}
                    onChange={e => setForm({ ...form, plate_number: e.target.value })} />
                </div>
                <div className="ad-form-group">
                  <label className="ad-label">Bus Type</label>
                  <select className="ad-select" value={form.bus_type_id}
                    onChange={e => setForm({ ...form, bus_type_id: e.target.value })}>
                    <option value="">Select type</option>
                    {busTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="ad-form-group">
                  <label className="ad-label">Total Seats</label>
                  <input className="ad-input" type="number" value={form.total_seats}
                    onChange={e => setForm({ ...form, total_seats: e.target.value })} />
                </div>
                <div className="ad-form-group">
                  <label className="ad-label">Status</label>
                  <select className="ad-select" value={form.is_active ? 'true' : 'false'}
                    onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <div className="ad-form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="ad-label">Amenities (comma-separated)</label>
                  <input className="ad-input" placeholder="WiFi, AC, USB, Recliner" value={form.amenities}
                    onChange={e => setForm({ ...form, amenities: e.target.value })} />
                </div>
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