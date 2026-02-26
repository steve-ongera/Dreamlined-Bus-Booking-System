import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { trackBooking } from '../services/api';

export default function TrackTicket() {
  const { reference: urlRef } = useParams();
  const [reference, setReference] = useState(urlRef || '');
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (urlRef) handleSearch(null, urlRef);
  }, [urlRef]);

  const handleSearch = async (e, ref = reference) => {
    if (e) e.preventDefault();
    if (!ref.trim()) { setError('Enter a booking reference.'); return; }
    setLoading(true); setError(''); setBooking(null);
    try {
      const data = await trackBooking(ref.trim().toUpperCase());
      setBooking(data);
    } catch {
      setError('Booking not found. Please check your reference number.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };

  const statusColor = {
    confirmed: 'status-confirmed', pending: 'status-pending', cancelled: 'status-cancelled'
  };

  return (
    <div style={{background:'#f5f5f7',minHeight:'100vh',paddingBottom:'3rem'}}>
      <div className="page-header">
        <h1><i className="bi bi-ticket-perforated me-3"></i>Track Your Ticket</h1>
        <p>Enter your booking reference to view ticket details</p>
      </div>

      <div className="container mt-4">
        <div className="track-card mb-4">
          <form onSubmit={handleSearch}>
            <label className="form-label fw-600">Booking Reference Number</label>
            <div className="d-flex gap-2">
              <input
                className="form-control"
                placeholder="e.g. DLA1B2C3D4"
                value={reference}
                onChange={e => setReference(e.target.value.toUpperCase())}
                style={{fontFamily:'monospace',fontWeight:700,letterSpacing:2,fontSize:'1.05rem'}}
              />
              <button className="btn-dl-primary" type="submit" disabled={loading} style={{whiteSpace:'nowrap'}}>
                {loading ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-search me-1"></i>Track</>}
              </button>
            </div>
            {error && <div className="dl-alert dl-alert-error mt-2"><i className="bi bi-exclamation-circle-fill"></i>{error}</div>}
          </form>
        </div>

        {booking && (
          <div className="track-card">
            {/* Status header */}
            <div className="d-flex justify-content-between align-items-start mb-4">
              <div>
                <h5 className="fw-800 mb-1">Booking #{booking.reference}</h5>
                <span className={`status-badge ${statusColor[booking.status] || 'status-pending'}`}>
                  {booking.status?.toUpperCase()}
                </span>
              </div>
              {booking.status === 'confirmed' && (
                <div style={{fontSize:'2.5rem'}}>✅</div>
              )}
            </div>

            {/* Ticket visual */}
            <div style={{
              background:'linear-gradient(135deg, var(--dl-red-dark), var(--dl-red))',
              borderRadius:12,color:'white',padding:'1.5rem',marginBottom:'1.5rem'
            }}>
              <div className="row">
                <div className="col-5">
                  <div style={{opacity:.8,fontSize:'.75rem',textTransform:'uppercase',letterSpacing:1}}>From</div>
                  <div style={{fontWeight:800,fontSize:'1.3rem'}}>{booking.trip_info?.origin}</div>
                  <div style={{opacity:.9,fontSize:'1.05rem',fontWeight:600}}>{formatTime(booking.trip_info?.departure_time)}</div>
                </div>
                <div className="col-2 d-flex flex-column align-items-center justify-content-center">
                  <i className="bi bi-arrow-right" style={{fontSize:'1.5rem',opacity:.7}}></i>
                </div>
                <div className="col-5 text-end">
                  <div style={{opacity:.8,fontSize:'.75rem',textTransform:'uppercase',letterSpacing:1}}>To</div>
                  <div style={{fontWeight:800,fontSize:'1.3rem'}}>{booking.trip_info?.destination}</div>
                  <div style={{opacity:.9,fontSize:'1.05rem',fontWeight:600}}>{formatTime(booking.trip_info?.arrival_time)}</div>
                </div>
              </div>
              <div className="divider" style={{background:'rgba(255,255,255,.2)',margin:'1rem 0'}}></div>
              <div className="d-flex justify-content-between">
                <div>
                  <div style={{opacity:.7,fontSize:'.75rem'}}>DATE</div>
                  <div style={{fontWeight:700}}>{booking.trip_info?.departure_date}</div>
                </div>
                <div>
                  <div style={{opacity:.7,fontSize:'.75rem'}}>BUS</div>
                  <div style={{fontWeight:700}}>{booking.trip_info?.bus_name || booking.trip_info?.bus_type}</div>
                </div>
                <div className="text-end">
                  <div style={{opacity:.7,fontSize:'.75rem'}}>SEATS</div>
                  <div style={{fontWeight:700}}>{booking.booked_seats?.map(s => s.seat_number).join(', ')}</div>
                </div>
              </div>
            </div>

            {/* Details */}
            <h6 className="fw-700 mb-3">Passenger Details</h6>
            {[
              { label:'Passenger Name', value: booking.passenger_name },
              { label:'Email', value: booking.passenger_email },
              { label:'Phone', value: booking.passenger_phone },
              { label:'ID/Passport', value: booking.passenger_id_number },
              { label:'Nationality', value: booking.passenger_nationality },
              { label:'Boarding Point', value: booking.boarding_point?.name || '—' },
              { label:'Dropping Point', value: booking.dropping_point?.name || '—' },
            ].map(r => (
              <div className="ticket-detail-row" key={r.label}>
                <span>{r.label}</span>
                <span>{r.value}</span>
              </div>
            ))}

            <div style={{borderTop:'2px dashed var(--dl-border)',margin:'1rem 0'}}></div>

            <div className="d-flex justify-content-between align-items-center">
              <h6 className="fw-800 mb-0">Total Paid</h6>
              <span style={{fontWeight:800,color:'var(--dl-red)',fontSize:'1.3rem'}}>
                KES {Number(booking.total_amount).toLocaleString()}
              </span>
            </div>

            <div className="mt-3 p-3" style={{background:'#f8f9fa',borderRadius:8,textAlign:'center'}}>
              <p style={{fontSize:'.85rem',color:'var(--dl-gray)',marginBottom:0}}>
                <i className="bi bi-envelope me-2"></i>
                Ticket sent to {booking.passenger_email}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}