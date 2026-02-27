
/* ═══════════════════════════════════════════════════════════════════════════
   AdminRoutes.jsx
═══════════════════════════════════════════════════════════════════════════ */
import { useState, useEffect } from 'react';
import { getRoutesAdmin, getCitiesAdmin as _getCities, createRoute, updateRoute, deleteRoute } from '../admin_api';

export default function AdminRoutes() {
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

