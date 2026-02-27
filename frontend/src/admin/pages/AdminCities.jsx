/* ═══════════════════════════════════════════════════════════════════════════
   AdminCities.jsx  –  Reusable CRUD pattern
═══════════════════════════════════════════════════════════════════════════ */
import { useState, useEffect } from 'react';
import { getCitiesAdmin, createCity, updateCity, deleteCity } from '../admin_api';

export default function AdminCities() {
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
    try {
      const d = await getCitiesAdmin({ search });
      setItems(d.results || d);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search]);

  const openAdd = () => { setEditing(null); setForm({ name: '', is_active: true }); setError(''); setShowModal(true); };
  const openEdit = (it) => { setEditing(it); setForm({ name: it.name, is_active: it.is_active }); setError(''); setShowModal(true); };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      if (editing) await updateCity(editing.slug, form);
      else await createCity(form);
      setShowModal(false);
      load();
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
          <div className="ad-search-wrap">
            <i className="bi bi-search"></i>
            <input className="ad-search-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn-ad btn-ad-primary" onClick={openAdd}><i className="bi bi-plus-lg"></i> Add City</button>
        </div>
      </div>

      <div className="ad-card">
        {loading
          ? <div style={{ padding: '2rem', textAlign: 'center' }}><div className="ad-spinner" style={{ margin: '0 auto' }}></div></div>
          : items.length === 0
            ? <div className="ad-empty"><i className="bi bi-geo-alt"></i><h5>No cities</h5></div>
            : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr><th>Name</th><th>Slug</th><th>Routes</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {items.map(it => (
                    <tr key={it.slug}>
                      <td className="fw-600">{it.name}</td>
                      <td><code style={{ fontSize: '.75rem' }}>{it.slug}</code></td>
                      <td>{it.route_count ?? '—'}</td>
                      <td><span className={`badge ${it.is_active ? 'badge-active' : 'badge-inactive'}`}>{it.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <div className="actions">
                          <button className="btn-ad btn-ad-secondary btn-ad-sm" onClick={() => openEdit(it)}><i className="bi bi-pencil"></i></button>
                          <button className="btn-ad btn-ad-danger btn-ad-sm" onClick={() => handleDelete(it)}><i className="bi bi-trash"></i></button>
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