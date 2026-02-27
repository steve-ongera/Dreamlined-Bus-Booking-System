
/* ═══════════════════════════════════════════════════════════════════════════
   AdminUsers.jsx
═══════════════════════════════════════════════════════════════════════════ */
import { getUsers, createUser, updateUser, deleteUser, toggleUserActive, resetUserPassword } from '../admin_api';

export default function AdminUsers() {
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