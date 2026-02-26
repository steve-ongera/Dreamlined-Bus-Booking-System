import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  searchTrips, getTripDetail, getBoardingPoints,
  createBooking, initiatePayment, getPaymentStatus
} from '../services/api';
import BusSeatMap from '../components/BusSeatMap';

export default function Results() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const origin = searchParams.get('origin') || '';
  const destination = searchParams.get('destination') || '';
  const date = searchParams.get('date') || '';

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedTrip, setSelectedTrip] = useState(null);
  const [tripDetail, setTripDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [selectedSeats, setSelectedSeats] = useState([]);
  const [boardingPoints, setBoardingPoints] = useState([]);
  const [droppingPoints, setDroppingPoints] = useState([]);

  const [form, setForm] = useState({
    name:'', email:'', phone:'', idNumber:'', nationality:'Kenyan',
    boardingPoint:'', droppingPoint:'',
  });
  const [formStep, setFormStep] = useState('seats'); // seats | details | payment

  const [booking, setBooking] = useState(null);
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!origin || !destination || !date) { navigate('/'); return; }
    setLoading(true);
    searchTrips(origin, destination, date)
      .then(data => { setTrips(data.results || []); setError(''); })
      .catch(() => setError('Failed to load trips. Please try again.'))
      .finally(() => setLoading(false));
  }, [origin, destination, date]);

  const handleSelectTrip = async (trip) => {
    setSelectedTrip(trip);
    setSelectedSeats([]);
    setTripDetail(null);
    setFormStep('seats');
    setLoadingDetail(true);
    try {
      const detail = await getTripDetail(trip.slug);
      setTripDetail(detail);
      // Load boarding points for origin city
      const bp = await getBoardingPoints(origin);
      const dp = await getBoardingPoints(destination);
      setBoardingPoints(bp.results || bp);
      setDroppingPoints(dp.results || dp);
    } catch {
      setError('Failed to load seat details.');
    } finally {
      setLoadingDetail(false);
    }
    // Scroll to seat map on mobile
    setTimeout(() => document.getElementById('seat-panel')?.scrollIntoView({behavior:'smooth'}), 100);
  };

  const handleSeatClick = (seat) => {
    setSelectedSeats(prev =>
      prev.includes(seat.seat_number)
        ? prev.filter(n => n !== seat.seat_number)
        : [...prev, seat.seat_number]
    );
  };

  const getSeatPrice = (seatNumber) => {
    if (!tripDetail) return 0;
    const seat = tripDetail.bus_layout?.find(s => s.seat_number === seatNumber);
    if (!seat) return 0;
    const price = tripDetail.seat_prices?.find(p => p.seat_class === seat.seat_class);
    return price ? Number(price.price) : 0;
  };

  const totalAmount = selectedSeats.reduce((sum, n) => sum + getSeatPrice(n), 0);

  const handleBook = async () => {
    const { name, email, phone, idNumber, nationality, boardingPoint, droppingPoint } = form;
    if (!name || !email || !phone || !idNumber) {
      alert('Please fill in all required fields.'); return;
    }
    try {
      const data = await createBooking({
        trip_slug: selectedTrip.slug,
        seat_numbers: selectedSeats,
        boarding_point_slug: boardingPoint || undefined,
        dropping_point_slug: droppingPoint || undefined,
        passenger_name: name,
        passenger_email: email,
        passenger_phone: phone,
        passenger_id_number: idNumber,
        passenger_nationality: nationality,
      });
      setBooking(data);
      setFormStep('payment');
    } catch (err) {
      const msg = err.response?.data;
      alert(typeof msg === 'object' ? JSON.stringify(msg) : 'Booking failed. Try again.');
    }
  };

  const handlePayment = async () => {
    if (!paymentPhone) { setPaymentError('Enter your M-Pesa phone number.'); return; }
    setPaymentLoading(true);
    setPaymentError('');
    try {
      await initiatePayment(booking.reference, paymentPhone);
      setPolling(true);
      // Poll every 5 seconds
      const interval = setInterval(async () => {
        try {
          const st = await getPaymentStatus(booking.reference);
          setPaymentStatus(st);
          if (st.payment_status === 'completed' || st.booking_status === 'confirmed') {
            clearInterval(interval);
            setPolling(false);
          }
          if (st.payment_status === 'failed' || st.payment_status === 'cancelled') {
            clearInterval(interval);
            setPolling(false);
            setPaymentError(st.message || 'Payment failed. Please try again.');
          }
        } catch {}
      }, 5000);
      // Clear after 2 min
      setTimeout(() => { clearInterval(interval); setPolling(false); }, 120000);
    } catch (err) {
      setPaymentError(err.response?.data?.error || 'Payment initiation failed.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-KE', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  };

  return (
    <div style={{background:'#f5f5f7',minHeight:'100vh',paddingBottom:'2rem'}}>
      {/* Header */}
      <div className="page-header">
        <div className="container">
          <div className="d-flex align-items-center justify-content-center gap-3 flex-wrap">
            <span style={{fontSize:'1.1rem',fontWeight:700}}>
              {origin.charAt(0).toUpperCase()+origin.slice(1)}
            </span>
            <i className="bi bi-arrow-right" style={{color:'var(--dl-gold)'}}></i>
            <span style={{fontSize:'1.1rem',fontWeight:700}}>
              {destination.charAt(0).toUpperCase()+destination.slice(1)}
            </span>
            <span style={{opacity:.8,fontSize:'.9rem'}}>| {formatDate(date)}</span>
          </div>
        </div>
      </div>

      <div className="container mt-4">
        {error && <div className="dl-alert dl-alert-error"><i className="bi bi-exclamation-circle-fill"></i>{error}</div>}

        <div className="row g-4">
          {/* Left: Trip list */}
          <div className="col-lg-5">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0 fw-700">
                <i className="bi bi-list-ul me-2" style={{color:'var(--dl-red)'}}></i>
                {loading ? 'Searching...' : `${trips.length} bus${trips.length !== 1 ? 'es' : ''} found`}
              </h6>
            </div>

            {loading ? (
              Array.from({length:4}).map((_,i) => (
                <div key={i} className="trip-card mb-3">
                  <div className="skeleton mb-2" style={{height:16,width:'60%'}}></div>
                  <div className="skeleton mb-2" style={{height:20,width:'80%'}}></div>
                  <div className="skeleton" style={{height:14,width:'40%'}}></div>
                </div>
              ))
            ) : trips.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-bus-front" style={{fontSize:'3rem',color:'var(--dl-border)'}}></i>
                <h5 className="mt-3">No buses found</h5>
                <p style={{color:'var(--dl-gray)'}}>Try a different date or route.</p>
                <button className="btn-dl-outline mt-2" onClick={() => navigate('/')}>
                  <i className="bi bi-arrow-left me-2"></i>Back to Search
                </button>
              </div>
            ) : (
              trips.map(trip => (
                <div
                  key={trip.slug}
                  className={`trip-card ${selectedTrip?.slug === trip.slug ? 'selected' : ''}`}
                  onClick={() => handleSelectTrip(trip)}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <div className="d-flex align-items-center gap-3">
                        <div>
                          <div className="trip-time">{formatTime(trip.departure_time)}</div>
                          <div style={{fontSize:'.8rem',color:'var(--dl-gray)'}}>{trip.origin}</div>
                        </div>
                        <div className="text-center">
                          <div className="trip-duration">{trip.duration_minutes ? `${Math.floor(trip.duration_minutes/60)}h ${trip.duration_minutes%60}m` : '--'}</div>
                          <div style={{height:2,background:'var(--dl-border)',width:60,margin:'4px auto'}}></div>
                        </div>
                        <div>
                          <div className="trip-time">{formatTime(trip.arrival_time)}</div>
                          <div style={{fontSize:'.8rem',color:'var(--dl-gray)'}}>{trip.destination}</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="trip-price">
                        KES {Math.min(...(trip.seat_prices?.map(p => Number(p.price)) || [0])).toLocaleString()}+
                      </div>
                      <div style={{fontSize:'.78rem',color:'var(--dl-gray)'}}>
                        {trip.available_seats} seats left
                      </div>
                    </div>
                  </div>

                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <span className="trip-bus-type">
                      <i className="bi bi-bus-front me-1"></i>{trip.bus_name || trip.bus_type}
                    </span>
                    {trip.amenities?.slice(0,3).map(a => (
                      <span key={a} className="amenity-badge">{a}</span>
                    ))}
                    {trip.seat_prices?.map(p => (
                      <span key={p.seat_class} style={{
                        fontSize:'.72rem',padding:'.15rem .5rem',borderRadius:20,fontWeight:600,
                        background: p.seat_class==='vip' ? '#fef9c3' : p.seat_class==='business' ? '#dbeafe' : '#dcfce7',
                        color: p.seat_class==='vip' ? '#ca8a04' : p.seat_class==='business' ? '#2563eb' : '#16a34a',
                      }}>
                        {p.seat_class.toUpperCase()} KES {Number(p.price).toLocaleString()}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right: Seat map + booking */}
          <div className="col-lg-7" id="seat-panel">
            {!selectedTrip ? (
              <div className="bus-seat-container text-center py-5">
                <i className="bi bi-cursor-fill" style={{fontSize:'3rem',color:'var(--dl-border)'}}></i>
                <h5 className="mt-3">Select a Bus</h5>
                <p style={{color:'var(--dl-gray)'}}>Click on a bus from the list to view seats</p>
              </div>
            ) : (
              <div className="bus-seat-container">
                {/* Trip header */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h6 className="mb-0 fw-700">
                      <i className="bi bi-bus-front me-2" style={{color:'var(--dl-red)'}}></i>
                      {selectedTrip.bus_name}
                    </h6>
                    <small style={{color:'var(--dl-gray)'}}>
                      {formatTime(selectedTrip.departure_time)} → {formatTime(selectedTrip.arrival_time)}
                    </small>
                  </div>
                  <div className="text-end">
                    <div style={{fontSize:'.8rem',color:'var(--dl-gray)'}}>Selected</div>
                    <div style={{fontWeight:800,color:'var(--dl-red)',fontSize:'1.1rem'}}>
                      {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Step tabs */}
                <div className="d-flex gap-2 mb-3">
                  {['seats','details','payment'].map((step, i) => (
                    <div key={step} className="d-flex align-items-center gap-1">
                      <div style={{
                        width:24,height:24,borderRadius:'50%',display:'flex',alignItems:'center',
                        justifyContent:'center',fontSize:'.7rem',fontWeight:700,
                        background: formStep === step ? 'var(--dl-red)' : 
                                    ['details','payment'].indexOf(formStep) > i ? '#16a34a' : 'var(--dl-border)',
                        color: formStep === step || ['details','payment'].indexOf(formStep) > i ? 'white' : 'var(--dl-gray)',
                      }}>
                        {['details','payment'].indexOf(formStep) > i ? '✓' : i+1}
                      </div>
                      <span style={{fontSize:'.78rem',fontWeight:formStep===step?700:400,
                        color:formStep===step?'var(--dl-red)':'var(--dl-gray)',textTransform:'capitalize'}}>
                        {step}
                      </span>
                      {i < 2 && <i className="bi bi-chevron-right" style={{fontSize:'.6rem',color:'var(--dl-border)'}}></i>}
                    </div>
                  ))}
                </div>

                {/* Step: Seat selection */}
                {formStep === 'seats' && (
                  <>
                    {loadingDetail ? (
                      <div className="text-center py-4">
                        <div className="payment-spinner mx-auto mb-2"></div>
                        <small style={{color:'var(--dl-gray)'}}>Loading seats...</small>
                      </div>
                    ) : tripDetail ? (
                      <>
                        <BusSeatMap
                          seats={tripDetail.bus_layout || []}
                          bookedSeats={tripDetail.booked_seat_numbers || []}
                          selectedSeats={selectedSeats}
                          onSeatClick={handleSeatClick}
                        />

                        {selectedSeats.length > 0 && (
                          <div style={{
                            background:'#fff5f5',border:'1px solid #fecaca',
                            borderRadius:8,padding:'1rem',marginTop:'1rem'
                          }}>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="fw-600">Selected Seats:</span>
                              <span style={{fontWeight:800,color:'var(--dl-red)',fontSize:'1.1rem'}}>
                                KES {totalAmount.toLocaleString()}
                              </span>
                            </div>
                            <div className="d-flex flex-wrap gap-2 mb-3">
                              {selectedSeats.map(n => {
                                const seat = tripDetail.bus_layout?.find(s => s.seat_number === n);
                                return (
                                  <span key={n} style={{
                                    padding:'.2rem .6rem',borderRadius:6,fontSize:'.8rem',fontWeight:700,
                                    background: seat?.seat_class==='vip' ? 'var(--seat-vip)' :
                                               seat?.seat_class==='business' ? 'var(--seat-business)' : 'var(--seat-economy)',
                                    color: seat?.seat_class==='vip' ? 'var(--seat-vip-text)' : 'white',
                                  }}>
                                    {n}
                                    <button
                                      onClick={() => setSelectedSeats(prev => prev.filter(s => s !== n))}
                                      style={{background:'none',border:'none',color:'inherit',marginLeft:4,cursor:'pointer',padding:0}}
                                    >×</button>
                                  </span>
                                );
                              })}
                            </div>
                            <button
                              className="btn-dl-primary w-100"
                              onClick={() => setFormStep('details')}
                            >
                              Continue <i className="bi bi-arrow-right ms-1"></i>
                            </button>
                          </div>
                        )}
                      </>
                    ) : null}
                  </>
                )}

                {/* Step: Passenger details */}
                {formStep === 'details' && (
                  <div className="booking-form-card">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0 fw-700">Passenger Details</h6>
                      <button className="btn-dl-outline" style={{padding:'.3rem .8rem',fontSize:'.8rem'}}
                        onClick={() => setFormStep('seats')}>
                        <i className="bi bi-arrow-left me-1"></i>Back
                      </button>
                    </div>

                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label fw-600">Full Name *</label>
                        <input className="form-control" placeholder="John Doe"
                          value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-600">Email *</label>
                        <input className="form-control" type="email" placeholder="john@email.com"
                          value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                        <small style={{color:'var(--dl-gray)'}}>Ticket will be sent here</small>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-600">Phone Number *</label>
                        <input className="form-control" placeholder="07XX XXX XXX"
                          value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-600">ID / Passport Number *</label>
                        <input className="form-control" placeholder="12345678"
                          value={form.idNumber} onChange={e => setForm({...form, idNumber: e.target.value})} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-600">Nationality</label>
                        <select className="form-select" value={form.nationality}
                          onChange={e => setForm({...form, nationality: e.target.value})}>
                          <option>Kenyan</option>
                          <option>Ugandan</option>
                          <option>Tanzanian</option>
                          <option>Other</option>
                        </select>
                      </div>
                      {boardingPoints.length > 0 && (
                        <div className="col-md-6">
                          <label className="form-label fw-600">Boarding Point</label>
                          <select className="form-select" value={form.boardingPoint}
                            onChange={e => setForm({...form, boardingPoint: e.target.value})}>
                            <option value="">Select boarding point</option>
                            {boardingPoints.map(b => (
                              <option key={b.slug} value={b.slug}>{b.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {droppingPoints.length > 0 && (
                        <div className="col-md-6">
                          <label className="form-label fw-600">Dropping Point</label>
                          <select className="form-select" value={form.droppingPoint}
                            onChange={e => setForm({...form, droppingPoint: e.target.value})}>
                            <option value="">Select dropping point</option>
                            {droppingPoints.map(d => (
                              <option key={d.slug} value={d.slug}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Summary */}
                    <div style={{background:'#f8f9fa',borderRadius:8,padding:'1rem',marginTop:'1rem'}}>
                      <div className="d-flex justify-content-between mb-1">
                        <span style={{color:'var(--dl-gray)'}}>Seats:</span>
                        <span className="fw-600">{selectedSeats.join(', ')}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span style={{color:'var(--dl-gray)'}}>Total:</span>
                        <span style={{fontWeight:800,color:'var(--dl-red)',fontSize:'1.1rem'}}>
                          KES {totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <button className="btn-dl-primary w-100 mt-3" onClick={handleBook}>
                      Confirm Booking <i className="bi bi-check-circle ms-1"></i>
                    </button>
                  </div>
                )}

                {/* Step: Payment */}
                {formStep === 'payment' && booking && (
                  <div className="booking-form-card text-center">
                    {paymentStatus?.booking_status === 'confirmed' ? (
                      <div>
                        <div style={{fontSize:'4rem',marginBottom:'1rem'}}>🎉</div>
                        <h4 style={{color:'#16a34a',fontWeight:800}}>Booking Confirmed!</h4>
                        <p style={{color:'var(--dl-gray)'}}>Your ticket has been sent to <strong>{form.email}</strong></p>
                        <div style={{background:'#dcfce7',borderRadius:8,padding:'1rem',margin:'1rem 0'}}>
                          <div style={{fontWeight:700,fontSize:'.9rem',color:'#16a34a'}}>Booking Reference</div>
                          <div style={{fontWeight:900,fontSize:'1.4rem',letterSpacing:2}}>{booking.reference}</div>
                          {paymentStatus.receipt && (
                            <div style={{fontSize:'.85rem',color:'#16a34a',marginTop:4}}>
                              M-Pesa Receipt: {paymentStatus.receipt}
                            </div>
                          )}
                        </div>
                        <button className="btn-dl-primary" onClick={() => navigate(`/track/${booking.reference}`)}>
                          <i className="bi bi-ticket-perforated me-2"></i>View Ticket
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{fontSize:'3rem',marginBottom:'.5rem'}}>📱</div>
                        <h5 className="fw-700 mb-1">Pay with M-Pesa</h5>
                        <p style={{color:'var(--dl-gray)',fontSize:'.9rem',marginBottom:'1.5rem'}}>
                          Ref: <strong>{booking.reference}</strong> | 
                          Total: <strong style={{color:'var(--dl-red)'}}>KES {totalAmount.toLocaleString()}</strong>
                        </p>

                        {paymentError && (
                          <div className="dl-alert dl-alert-error">
                            <i className="bi bi-exclamation-circle-fill"></i>{paymentError}
                          </div>
                        )}

                        {!polling ? (
                          <>
                            <div className="mb-3">
                              <label className="form-label fw-600">M-Pesa Phone Number</label>
                              <input
                                className="form-control"
                                placeholder="e.g. 0712 345 678"
                                value={paymentPhone}
                                onChange={e => setPaymentPhone(e.target.value)}
                                style={{textAlign:'center',fontSize:'1.1rem',fontWeight:600,letterSpacing:1}}
                              />
                              <small style={{color:'var(--dl-gray)'}}>
                                You'll receive an STK push on this number
                              </small>
                            </div>
                            <button
                              className="btn-dl-gold w-100"
                              style={{padding:'.85rem',fontSize:'1rem'}}
                              onClick={handlePayment}
                              disabled={paymentLoading}
                            >
                              {paymentLoading ? (
                                <><div className="payment-spinner" style={{width:20,height:20,margin:'0 auto'}}></div></>
                              ) : (
                                <><i className="bi bi-phone-fill me-2"></i>Pay KES {totalAmount.toLocaleString()}</>
                              )}
                            </button>
                          </>
                        ) : (
                          <div>
                            <div className="payment-spinner mx-auto"></div>
                            <h6 className="mt-3 fw-700">Enter PIN on your phone</h6>
                            <p style={{color:'var(--dl-gray)',fontSize:'.9rem'}}>
                              Waiting for M-Pesa confirmation... Updating every 5 seconds
                            </p>
                            {paymentStatus && (
                              <div style={{fontSize:'.85rem',color:'var(--dl-gray)'}}>
                                Status: {paymentStatus.payment_status}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}