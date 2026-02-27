/* ═══════════════════════════════════════════════════════════════════════════
   AdminBookings.jsx
═══════════════════════════════════════════════════════════════════════════ */
import { useState, useEffect } from 'react';
import { getBookingsAdmin, confirmBooking, cancelBookingAdmin } from '../admin_api';

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterDate) params['trip__departure_date'] = filterDate;
      const data = await getBookingsAdmin(params);
      setBookings(data.results || data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search, filterStatus, filterDate]);

  const handleConfirm = async (ref) => {
    try {
      await confirmBooking(ref);
      load();
    } catch {
      alert('Failed');
    }
  };

  const handleCancel = async (ref) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await cancelBookingAdmin(ref);
      load();
    } catch {
      alert('Failed');
    }
  };

  return (
    <div>
      <div className="d-flex align-center justify-between flex-wrap gap-2 mb-4">
        <h4 className="fw-800">Bookings</h4>
        <div className="d-flex gap-2 flex-wrap align-center">
          <div className="ad-search-wrap">
            <i className="bi bi-search"></i>
            <input
              className="ad-search-input"
              placeholder="Search ref / name / phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="ad-select"
            style={{ width: 'auto' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {['confirmed', 'pending', 'cancelled', 'refunded'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="ad-input"
            style={{ width: 'auto' }}
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
      </div>

      <div className="ad-card">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="ad-spinner" style={{ margin: '0 auto' }}></div>
          </div>
        ) : (
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
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center text-muted" style={{ padding: '2rem' }}>
                      No bookings found
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.reference}>
                      <td>
                        <code style={{ fontWeight: 700, fontSize: '.78rem' }}>{b.reference}</code>
                      </td>
                      <td>
                        <div className="fw-600" style={{ fontSize: '.82rem' }}>
                          {b.passenger_name}
                        </div>
                        <div style={{ fontSize: '.7rem', color: 'var(--ad-text-muted)' }}>
                          {b.passenger_phone}
                        </div>
                      </td>
                      <td style={{ fontSize: '.8rem' }}>{b.route}</td>
                      <td style={{ fontSize: '.78rem' }}>{b.departure_date}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          {(b.seat_numbers || []).map((n) => (
                            <span
                              key={n}
                              style={{
                                fontSize: '.68rem',
                                padding: '.1rem .35rem',
                                borderRadius: 3,
                                background: '#f3f4f6',
                                fontWeight: 700,
                              }}
                            >
                              {n}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700 }}>KES {Number(b.total_amount).toLocaleString()}</td>
                      <td>
                        <span
                          style={{
                            fontSize: '.72rem',
                            color: b.payment_status === 'completed' ? '#16a34a' : 'var(--ad-text-muted)',
                          }}
                        >
                          {b.payment_status || 'N/A'}
                        </span>
                        {b.payment_receipt && (
                          <div style={{ fontSize: '.65rem', color: 'var(--ad-text-muted)' }}>{b.payment_receipt}</div>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${b.status}`}>{b.status}</span>
                      </td>
                      <td>
                        <div className="actions">
                          {b.status === 'pending' && (
                            <button
                              className="btn-ad btn-ad-success btn-ad-sm"
                              onClick={() => handleConfirm(b.reference)}
                              title="Confirm"
                            >
                              <i className="bi bi-check-lg"></i>
                            </button>
                          )}
                          {b.status !== 'cancelled' && (
                            <button
                              className="btn-ad btn-ad-danger btn-ad-sm"
                              onClick={() => handleCancel(b.reference)}
                              title="Cancel"
                            >
                              <i className="bi bi-x-lg"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}