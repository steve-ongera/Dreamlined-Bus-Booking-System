/* ═══════════════════════════════════════════════════════════════════════════
   AdminJobs.jsx
═══════════════════════════════════════════════════════════════════════════ */
import { useState, useEffect } from 'react';
import { getJobsAdmin, createJob, updateJob, deleteJob } from '../admin_api';

const DEPTS = ['operations', 'driving', 'customer_service', 'finance', 'it', 'management'];

export default function AdminJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    department: '',
    location: '',
    description: '',
    requirements: '',
    deadline: '',
    is_active: true
  });

  const load = async () => {
    setLoading(true);
    try { 
      const d = await getJobsAdmin(); 
      setJobs(d.results || d); 
    } finally { 
      setLoading(false); 
    }
  };
  
  useEffect(() => { load(); }, []);

  const openAdd = () => { 
    setEditing(null); 
    setForm({ title: '', department: '', location: '', description: '', requirements: '', deadline: '', is_active: true }); 
    setError(''); 
    setShowModal(true); 
  };
  
  const openEdit = j => { 
    setEditing(j); 
    setForm({ 
      title: j.title, 
      department: j.department, 
      location: j.location, 
      description: j.description, 
      requirements: j.requirements, 
      deadline: j.deadline || '', 
      is_active: j.is_active 
    }); 
    setError(''); 
    setShowModal(true); 
  };

  const handleSave = async () => {
    setSaving(true); 
    setError('');
    try {
      if (editing) await updateJob(editing.slug, form); 
      else await createJob(form);
      setShowModal(false); 
      load();
    } catch { 
      setError('Save failed.'); 
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <div>
      <div className="d-flex align-center justify-between flex-wrap gap-2 mb-4">
        <h4 className="fw-800">Job Postings</h4>
        <button className="btn-ad btn-ad-primary" onClick={openAdd}><i className="bi bi-plus-lg"></i> Add Job</button>
      </div>

      <div className="ad-card">
        {loading
          ? <div style={{ padding: '2rem', textAlign: 'center' }}><div className="ad-spinner" style={{ margin: '0 auto' }}></div></div>
          : jobs.length === 0
            ? <div className="ad-empty"><i className="bi bi-briefcase"></i><h5>No jobs posted</h5></div>
            : (
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Department</th>
                      <th>Location</th>
                      <th>Deadline</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map(j => (
                      <tr key={j.slug}>
                        <td className="fw-600">{j.title}</td>
                        <td>
                          <span className="badge badge-scheduled" style={{ textTransform: 'capitalize' }}>
                            {j.department.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ fontSize: '.82rem' }}>{j.location}</td>
                        <td style={{ fontSize: '.8rem' }}>{j.deadline || 'Open'}</td>
                        <td>
                          <span className={`badge ${j.is_active ? 'badge-active' : 'badge-inactive'}`}>
                            {j.is_active ? 'Active' : 'Closed'}
                          </span>
                        </td>
                        <td>
                          <div className="actions">
                            <button className="btn-ad btn-ad-secondary btn-ad-sm" onClick={() => openEdit(j)}><i className="bi bi-pencil"></i></button>
                            <button className="btn-ad btn-ad-danger btn-ad-sm" onClick={async () => {
                              if (confirm('Delete job?')) {
                                try { await deleteJob(j.slug); load(); } catch { alert('Failed'); }
                              }
                            }}><i className="bi bi-trash"></i></button>
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