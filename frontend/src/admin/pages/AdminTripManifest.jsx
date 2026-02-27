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

