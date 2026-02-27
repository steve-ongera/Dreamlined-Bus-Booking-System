/*
Results.jsx  –  with real-time seat locking (5-min hold + live poll)
*/
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  searchTrips, getTripDetail, getBoardingPoints,
  createBooking, initiatePayment, getPaymentStatus
} from '../services/api';
import BusSeatMap from '../components/BusSeatMap';

// ── Seat lock API helpers (add these to services/api.js too) ─────────────────
const BASE = import.meta.env.VITE_API_BASE || '';

async function lockSeats(tripSlug, seatNumbers, action = 'lock') {
  const res = await fetch(`${BASE}/api/v1/trips/${tripSlug}/lock-seats/`, {
    method: 'POST',
    credentials: 'include',          // needed for session cookie
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seat_numbers: seatNumbers, action }),
  });
  return res.json();
}

async function getSeatStatus(tripSlug) {
  const res = await fetch(`${BASE}/api/v1/trips/${tripSlug}/seat-status/`, {
    credentials: 'include',
  });
  return res.json();
}

// ── Countdown display ────────────────────────────────────────────────────────
function LockCountdown({ seconds, onExpire }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) { onExpire(); return; }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct  = Math.min(100, (remaining / 300) * 100);
  const urgent = remaining <= 60;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: urgent ? '#fff5f5' : '#f0fdf4',
      border: `1px solid ${urgent ? '#fecaca' : '#bbf7d0'}`,
      borderRadius: 8, padding: '.45rem .75rem',
      fontSize: '.78rem', fontWeight: 600,
    }}>
      <i className={`bi ${urgent ? 'bi-exclamation-triangle-fill' : 'bi-lock-fill'}`}
        style={{ color: urgent ? '#dc2626' : '#16a34a', fontSize: '.8rem' }}></i>
      <span style={{ color: urgent ? '#dc2626' : '#15803d' }}>
        Seats held for{' '}
        <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
          {mins}:{String(secs).padStart(2, '0')}
        </strong>
      </span>
      {/* Progress bar */}
      <div style={{
        flex: 1, height: 4, background: urgent ? '#fecaca' : '#d1fae5',
        borderRadius: 2, overflow: 'hidden', minWidth: 40,
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: urgent ? '#dc2626' : '#16a34a',
          transition: 'width 1s linear',
        }} />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Results() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const origin      = searchParams.get('origin') || '';
  const destination = searchParams.get('destination') || '';
  const date        = searchParams.get('date') || '';

  const [trips, setTrips]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  const [selectedTrip, setSelectedTrip]     = useState(null);
  const [tripDetail, setTripDetail]         = useState(null);
  const [loadingDetail, setLoadingDetail]   = useState(false);

  const [selectedSeats, setSelectedSeats]   = useState([]);

  // Real-time seat status
  const [bookedSeats, setBookedSeats]           = useState([]);
  const [lockedByOthers, setLockedByOthers]     = useState([]);
  const [myLocks, setMyLocks]                   = useState({});   // { "1A": secondsRemaining }
  const [lockError, setLockError]               = useState('');
  const pollRef = useRef(null);

  const [boardingPoints, setBoardingPoints] = useState([]);
  const [droppingPoints, setDroppingPoints] = useState([]);

  const [form, setForm] = useState({
    name: '', email: '', phone: '', idNumber: '', nationality: 'Kenyan',
    boardingPoint: '', droppingPoint: '',
  });
  const [formStep, setFormStep] = useState('seats');

  const [booking, setBooking]             = useState(null);
  const [paymentPhone, setPaymentPhone]   = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError]   = useState('');
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [polling, setPolling]             = useState(false);

  // ── Load trips ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!origin || !destination || !date) { navigate('/'); return; }
    setLoading(true);
    searchTrips(origin, destination, date)
      .then(data => { setTrips(data.results || []); setError(''); })
      .catch(() => setError('Failed to load trips. Please try again.'))
      .finally(() => setLoading(false));
  }, [origin, destination, date]);

  // ── Live seat status polling ────────────────────────────────────────────────
  const fetchSeatStatus = useCallback(async (tripSlug) => {
    try {
      const st = await getSeatStatus(tripSlug);
      setBookedSeats(st.booked || []);
      setLockedByOthers(st.locked_by_others || []);
      setMyLocks(st.my_locks || {});

      // If any of MY selected seats were taken while I was viewing, deselect them
      setSelectedSeats(prev => {
        const nowUnavailable = [
          ...(st.booked || []),
          ...(st.locked_by_others || []),
        ];
        const safe = prev.filter(n => !nowUnavailable.includes(n));
        if (safe.length !== prev.length) {
          setLockError('One or more of your selected seats was taken by another passenger.');
        }
        return safe;
      });
    } catch {}
  }, []);

  const startPolling = useCallback((tripSlug) => {
    stopPolling();
    fetchSeatStatus(tripSlug);
    pollRef.current = setInterval(() => fetchSeatStatus(tripSlug), 3000);
  }, [fetchSeatStatus]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── Select a trip ───────────────────────────────────────────────────────────
  const handleSelectTrip = async (trip) => {
    stopPolling();
    // Release any previous locks
    if (selectedTrip && selectedSeats.length > 0) {
      await lockSeats(selectedTrip.slug, selectedSeats, 'release').catch(() => {});
    }

    setSelectedTrip(trip);
    setSelectedSeats([]);
    setMyLocks({});
    setLockedByOthers([]);
    setBookedSeats([]);
    setLockError('');
    setTripDetail(null);
    setFormStep('seats');
    setLoadingDetail(true);

    try {
      const detail = await getTripDetail(trip.slug);
      setTripDetail(detail);
      setBookedSeats(detail.booked_seat_numbers || []);

      const bp = await getBoardingPoints(origin);
      const dp = await getBoardingPoints(destination);
      setBoardingPoints(bp.results || bp);
      setDroppingPoints(dp.results || dp);

      startPolling(trip.slug);
    } catch {
      setError('Failed to load seat details.');
    } finally {
      setLoadingDetail(false);
    }

    setTimeout(() => document.getElementById('seat-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  // ── Seat click → lock immediately ──────────────────────────────────────────
  const handleSeatClick = async (seat) => {
    if (!selectedTrip) return;
    const num = seat.seat_number;
    setLockError('');

    const isCurrentlySelected = selectedSeats.includes(num);

    if (isCurrentlySelected) {
      // DESELECT — release lock
      const next = selectedSeats.filter(n => n !== num);
      setSelectedSeats(next);
      await lockSeats(selectedTrip.slug, [num], 'release').catch(() => {});
    } else {
      // SELECT — try to lock
      const res = await lockSeats(selectedTrip.slug, [num], 'lock');
      if (res.locked) {
        setSelectedSeats(prev => [...prev, num]);
        // Update my lock countdown from response
        setMyLocks(prev => ({
          ...prev,
          [num]: res.expires_in_seconds,
        }));
      } else {
        setLockError(
          res.locked?.length === 0
            ? `Seat ${num} was just taken by another passenger.`
            : res.error || `Could not lock seat ${num}. Try another.`
        );
        // Refresh status immediately
        fetchSeatStatus(selectedTrip.slug);
      }
    }
  };

  // ── Lock expires for one of my seats ───────────────────────────────────────
  const handleLockExpired = async (seatNumber) => {
    setSelectedSeats(prev => prev.filter(n => n !== seatNumber));
    setMyLocks(prev => { const next = { ...prev }; delete next[seatNumber]; return next; });
    setLockError(`Your hold on seat ${seatNumber} expired. Please select it again.`);
    await lockSeats(selectedTrip.slug, [seatNumber], 'release').catch(() => {});
    fetchSeatStatus(selectedTrip.slug);
  };

  // ── Pricing ─────────────────────────────────────────────────────────────────
  const getSeatPrice = (seatNumber) => {
    if (!tripDetail) return 0;
    const seat = tripDetail.bus_layout?.find(s => s.seat_number === seatNumber);
    if (!seat) return 0;
    const price = tripDetail.seat_prices?.find(p => p.seat_class === seat.seat_class);
    return price ? Number(price.price) : 0;
  };
  const totalAmount = selectedSeats.reduce((sum, n) => sum + getSeatPrice(n), 0);

  // ── Book ────────────────────────────────────────────────────────────────────
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
      stopPolling();
      // Locks are now converted to a real pending booking — release them
      await lockSeats(selectedTrip.slug, selectedSeats, 'release').catch(() => {});
    } catch (err) {
      const msg = err.response?.data;
      alert(typeof msg === 'object' ? JSON.stringify(msg) : 'Booking failed. Try again.');
    }
  };

  // ── Payment ─────────────────────────────────────────────────────────────────
  const handlePayment = async () => {
    if (!paymentPhone) { setPaymentError('Enter your M-Pesa phone number.'); return; }
    setPaymentLoading(true);
    setPaymentError('');
    try {
      await initiatePayment(booking.reference, paymentPhone);
      setPolling(true);
      const interval = setInterval(async () => {
        try {
          const st = await getPaymentStatus(booking.reference);
          setPaymentStatus(st);
          if (st.payment_status === 'completed' || st.booking_status === 'confirmed') {
            clearInterval(interval); setPolling(false);
          }
          if (st.payment_status === 'failed' || st.payment_status === 'cancelled') {
            clearInterval(interval); setPolling(false);
            setPaymentError(st.message || 'Payment failed. Please try again.');
          }
        } catch {}
      }, 5000);
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
    return new Date(d).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Minimum lock remaining across all my selected seats
  const minLockRemaining = selectedSeats.length > 0
    ? Math.min(...selectedSeats.map(n => myLocks[n] ?? 300))
    : null;

  // The seat that will expire first (for the countdown display)
  const soonestExpiringSeat = selectedSeats.reduce((min, n) => {
    const t = myLocks[n] ?? 300;
    return (!min || t < (myLocks[min] ?? 300)) ? n : min;
  }, null);

  return (
    <div style={{ background: '#f5f5f7', minHeight: '100vh', paddingBottom: '2rem' }}>

      {/* Page header */}
      <div className="page-header">
        <div className="container">
          <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap">
            <span style={{ fontSize: '.95rem', fontWeight: 700 }}>
              {origin.charAt(0).toUpperCase() + origin.slice(1)}
            </span>
            <i className="bi bi-arrow-right" style={{ color: 'var(--dl-gold)', fontSize: '.85rem' }}></i>
            <span style={{ fontSize: '.95rem', fontWeight: 700 }}>
              {destination.charAt(0).toUpperCase() + destination.slice(1)}
            </span>
            <span style={{ opacity: .8, fontSize: '.8rem' }}>| {formatDate(date)}</span>
          </div>
        </div>
      </div>

      <div className="container mt-3">
        {error && <div className="dl-alert dl-alert-error"><i className="bi bi-exclamation-circle-fill"></i> {error}</div>}

        <div className="row g-3">

          {/* ── Trip list ── */}
          <div className="col-12 col-lg-5">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0 fw-700" style={{ fontSize: '.88rem' }}>
                <i className="bi bi-list-ul me-1" style={{ color: 'var(--dl-red)' }}></i>
                {loading ? 'Searching...' : `${trips.length} bus${trips.length !== 1 ? 'es' : ''} found`}
              </h6>
              <button className="btn-dl-outline" style={{ padding: '.3rem .7rem', fontSize: '.75rem' }} onClick={() => navigate('/')}>
                <i className="bi bi-arrow-left me-1"></i>Back
              </button>
            </div>

            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="trip-card mb-2">
                  <div className="skeleton mb-2" style={{ height: 14, width: '60%' }}></div>
                  <div className="skeleton mb-2" style={{ height: 18, width: '80%' }}></div>
                  <div className="skeleton" style={{ height: 12, width: '40%' }}></div>
                </div>
              ))
            ) : trips.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-bus-front" style={{ fontSize: '2.5rem', color: 'var(--dl-border)' }}></i>
                <h5 className="mt-3" style={{ fontSize: '1rem' }}>No buses found</h5>
                <p style={{ color: 'var(--dl-gray)', fontSize: '.85rem' }}>Try a different date or route.</p>
                <button className="btn-dl-outline mt-2" onClick={() => navigate('/')}>
                  <i className="bi bi-arrow-left me-1"></i>Back to Search
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
                      <div className="d-flex align-items-center gap-2">
                        <div>
                          <div className="trip-time">{formatTime(trip.departure_time)}</div>
                          <div style={{ fontSize: '.72rem', color: 'var(--dl-gray)' }}>{trip.origin}</div>
                        </div>
                        <div className="text-center" style={{ minWidth: 50 }}>
                          <div className="trip-duration">{trip.duration_minutes ? `${Math.floor(trip.duration_minutes / 60)}h ${trip.duration_minutes % 60}m` : '--'}</div>
                          <div style={{ height: 1, background: 'var(--dl-border)', margin: '3px 0' }}></div>
                        </div>
                        <div>
                          <div className="trip-time">{formatTime(trip.arrival_time)}</div>
                          <div style={{ fontSize: '.72rem', color: 'var(--dl-gray)' }}>{trip.destination}</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-end" style={{ flexShrink: 0, marginLeft: 8 }}>
                      <div className="trip-price">
                        KES {Math.min(...(trip.seat_prices?.map(p => Number(p.price)) || [0])).toLocaleString()}+
                      </div>
                      <div style={{ fontSize: '.7rem', color: 'var(--dl-gray)' }}>
                        {trip.available_seats} seats left
                      </div>
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-1 align-items-center">
                    <span className="trip-bus-type">
                      <i className="bi bi-bus-front me-1"></i>{trip.bus_name || trip.bus_type}
                    </span>
                    {trip.amenities?.slice(0, 3).map(a => (
                      <span key={a} className="amenity-badge">{a}</span>
                    ))}
                    {trip.seat_prices?.map(p => (
                      <span key={p.seat_class} style={{
                        fontSize: '.68rem', padding: '.1rem .4rem', borderRadius: 20, fontWeight: 600,
                        background: p.seat_class === 'vip' ? '#fef9c3' : p.seat_class === 'business' ? '#dbeafe' : '#dcfce7',
                        color: p.seat_class === 'vip' ? '#ca8a04' : p.seat_class === 'business' ? '#2563eb' : '#16a34a',
                      }}>
                        {p.seat_class.toUpperCase()} {Number(p.price).toLocaleString()}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── Seat map + booking ── */}
          <div className="col-12 col-lg-7" id="seat-panel">
            {!selectedTrip ? (
              <div className="bus-seat-container text-center py-5">
                <i className="bi bi-cursor-fill" style={{ fontSize: '2.5rem', color: 'var(--dl-border)' }}></i>
                <h5 className="mt-3" style={{ fontSize: '1rem' }}>Select a Bus</h5>
                <p style={{ color: 'var(--dl-gray)', fontSize: '.85rem' }}>Tap a bus from the list to view seats</p>
              </div>
            ) : (
              <div className="bus-seat-container">

                {/* Trip header */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div>
                    <h6 className="mb-0 fw-700" style={{ fontSize: '.88rem' }}>
                      <i className="bi bi-bus-front me-1" style={{ color: 'var(--dl-red)' }}></i>
                      {selectedTrip.bus_name}
                    </h6>
                    <small style={{ color: 'var(--dl-gray)', fontSize: '.75rem' }}>
                      {formatTime(selectedTrip.departure_time)} → {formatTime(selectedTrip.arrival_time)}
                    </small>
                  </div>
                  <div className="text-end">
                    <div style={{ fontSize: '.72rem', color: 'var(--dl-gray)' }}>Selected</div>
                    <div style={{ fontWeight: 800, color: 'var(--dl-red)', fontSize: '1rem' }}>
                      {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Step tabs */}
                <div className="d-flex gap-1 mb-3">
                  {['seats', 'details', 'payment'].map((step, i) => (
                    <div key={step} className="d-flex align-items-center gap-1">
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '.62rem', fontWeight: 700,
                        background: formStep === step ? 'var(--dl-red)' :
                          ['details', 'payment'].indexOf(formStep) > i ? '#16a34a' : 'var(--dl-border)',
                        color: formStep === step || ['details', 'payment'].indexOf(formStep) > i ? 'white' : 'var(--dl-gray)',
                      }}>
                        {['details', 'payment'].indexOf(formStep) > i ? '✓' : i + 1}
                      </div>
                      <span style={{
                        fontSize: '.72rem', fontWeight: formStep === step ? 700 : 400,
                        color: formStep === step ? 'var(--dl-red)' : 'var(--dl-gray)', textTransform: 'capitalize',
                      }}>{step}</span>
                      {i < 2 && <i className="bi bi-chevron-right" style={{ fontSize: '.55rem', color: 'var(--dl-border)' }}></i>}
                    </div>
                  ))}
                </div>

                {/* ── Step: Seat selection ── */}
                {formStep === 'seats' && (
                  <>
                    {loadingDetail ? (
                      <div className="text-center py-4">
                        <div className="payment-spinner mx-auto mb-2"></div>
                        <small style={{ color: 'var(--dl-gray)', fontSize: '.8rem' }}>Loading seats...</small>
                      </div>
                    ) : tripDetail ? (
                      <>
                        {/* Live indicator */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: '.7rem', color: '#16a34a', marginBottom: 8, fontWeight: 600,
                        }}>
                          <span style={{
                            width: 7, height: 7, borderRadius: '50%', background: '#16a34a',
                            display: 'inline-block',
                            boxShadow: '0 0 0 0 rgba(22,163,74,.4)',
                            animation: 'bsm-pulse 1.5s infinite',
                          }}></span>
                          Live seat availability
                          <style>{`@keyframes bsm-pulse{0%{box-shadow:0 0 0 0 rgba(22,163,74,.4)}70%{box-shadow:0 0 0 6px rgba(22,163,74,0)}100%{box-shadow:0 0 0 0 rgba(22,163,74,0)}}`}</style>
                        </div>

                        {/* Lock error banner */}
                        {lockError && (
                          <div className="dl-alert dl-alert-error" style={{ marginBottom: 8, fontSize: '.8rem' }}>
                            <i className="bi bi-exclamation-triangle-fill me-1"></i>
                            {lockError}
                            <button
                              onClick={() => setLockError('')}
                              style={{ background: 'none', border: 'none', marginLeft: 'auto', cursor: 'pointer', color: 'inherit', padding: 0, float: 'right' }}
                            >×</button>
                          </div>
                        )}

                        <BusSeatMap
                          seats={tripDetail.bus_layout || []}
                          bookedSeats={[...bookedSeats, ...lockedByOthers]}
                          selectedSeats={selectedSeats}
                          lockedByOthers={lockedByOthers}
                          onSeatClick={handleSeatClick}
                        />

                        {selectedSeats.length > 0 && (
                          <div style={{
                            background: '#fff5f5', border: '1px solid #fecaca',
                            borderRadius: 8, padding: '.85rem', marginTop: '.85rem',
                          }}>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span style={{ fontWeight: 600, fontSize: '.85rem' }}>Selected Seats:</span>
                              <span style={{ fontWeight: 800, color: 'var(--dl-red)', fontSize: '1rem' }}>
                                KES {totalAmount.toLocaleString()}
                              </span>
                            </div>

                            {/* Countdown timer */}
                            {minLockRemaining !== null && soonestExpiringSeat && (
                              <div style={{ marginBottom: 10 }}>
                                <LockCountdown
                                  key={soonestExpiringSeat}
                                  seconds={minLockRemaining}
                                  onExpire={() => handleLockExpired(soonestExpiringSeat)}
                                />
                              </div>
                            )}

                            <div className="d-flex flex-wrap gap-1 mb-3">
                              {selectedSeats.map(n => {
                                const seat = tripDetail.bus_layout?.find(s => s.seat_number === n);
                                const remaining = myLocks[n];
                                return (
                                  <span key={n} style={{
                                    padding: '.15rem .5rem', borderRadius: 5, fontSize: '.75rem', fontWeight: 700,
                                    background: seat?.seat_class === 'vip' ? 'var(--seat-vip)' :
                                      seat?.seat_class === 'business' ? 'var(--seat-business)' : 'var(--seat-economy)',
                                    color: seat?.seat_class === 'vip' ? 'var(--seat-vip-text)' : 'white',
                                    position: 'relative',
                                  }}>
                                    <i className="bi bi-lock-fill" style={{ fontSize: '.6rem', marginRight: 3, opacity: .7 }}></i>
                                    {n}
                                    <button
                                      onClick={() => handleSeatClick(seat || { seat_number: n })}
                                      style={{ background: 'none', border: 'none', color: 'inherit', marginLeft: 3, cursor: 'pointer', padding: 0, fontSize: '.8rem' }}
                                    >×</button>
                                  </span>
                                );
                              })}
                            </div>
                            <button className="btn-dl-primary w-100" onClick={() => setFormStep('details')}>
                              Continue <i className="bi bi-arrow-right ms-1"></i>
                            </button>
                          </div>
                        )}
                      </>
                    ) : null}
                  </>
                )}

                {/* ── Step: Passenger details ── */}
                {formStep === 'details' && (
                  <div className="booking-form-card">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="mb-0 fw-700" style={{ fontSize: '.88rem' }}>Passenger Details</h6>
                      <button className="btn-dl-outline" onClick={() => setFormStep('seats')}>
                        <i className="bi bi-arrow-left me-1"></i>Back
                      </button>
                    </div>

                    {/* Countdown still visible on details step */}
                    {minLockRemaining !== null && soonestExpiringSeat && (
                      <div style={{ marginBottom: 12 }}>
                        <LockCountdown
                          key={`details-${soonestExpiringSeat}`}
                          seconds={minLockRemaining}
                          onExpire={() => { handleLockExpired(soonestExpiringSeat); setFormStep('seats'); }}
                        />
                      </div>
                    )}

                    <div className="row g-2">
                      <div className="col-12">
                        <label className="form-label fw-600">Full Name *</label>
                        <input className="form-control" placeholder="John Doe"
                          value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                      </div>
                      <div className="col-12 col-sm-6">
                        <label className="form-label fw-600">Email *</label>
                        <input className="form-control" type="email" placeholder="john@email.com"
                          value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                        <small style={{ color: 'var(--dl-gray)', fontSize: '.72rem' }}>Ticket sent here</small>
                      </div>
                      <div className="col-12 col-sm-6">
                        <label className="form-label fw-600">Phone Number *</label>
                        <input className="form-control" placeholder="07XX XXX XXX" type="tel"
                          value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                      </div>
                      <div className="col-12 col-sm-6">
                        <label className="form-label fw-600">ID / Passport *</label>
                        <input className="form-control" placeholder="12345678"
                          value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })} />
                      </div>
                      <div className="col-12 col-sm-6">
                        <label className="form-label fw-600">Nationality</label>
                        <select className="form-select" value={form.nationality}
                          onChange={e => setForm({ ...form, nationality: e.target.value })}>
                          <option>Kenyan</option>
                          <option>Ugandan</option>
                          <option>Tanzanian</option>
                          <option>Other</option>
                        </select>
                      </div>
                      {boardingPoints.length > 0 && (
                        <div className="col-12 col-sm-6">
                          <label className="form-label fw-600">Boarding Point</label>
                          <select className="form-select" value={form.boardingPoint}
                            onChange={e => setForm({ ...form, boardingPoint: e.target.value })}>
                            <option value="">Select boarding point</option>
                            {boardingPoints.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
                          </select>
                        </div>
                      )}
                      {droppingPoints.length > 0 && (
                        <div className="col-12 col-sm-6">
                          <label className="form-label fw-600">Dropping Point</label>
                          <select className="form-select" value={form.droppingPoint}
                            onChange={e => setForm({ ...form, droppingPoint: e.target.value })}>
                            <option value="">Select dropping point</option>
                            {droppingPoints.map(d => <option key={d.slug} value={d.slug}>{d.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>

                    <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '.85rem', marginTop: '.85rem' }}>
                      <div className="d-flex justify-content-between mb-1" style={{ fontSize: '.82rem' }}>
                        <span style={{ color: 'var(--dl-gray)' }}>Seats:</span>
                        <span className="fw-600">{selectedSeats.join(', ')}</span>
                      </div>
                      <div className="d-flex justify-content-between" style={{ fontSize: '.82rem' }}>
                        <span style={{ color: 'var(--dl-gray)' }}>Total:</span>
                        <span style={{ fontWeight: 800, color: 'var(--dl-red)', fontSize: '1rem' }}>
                          KES {totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <button className="btn-dl-primary w-100 mt-3" onClick={handleBook}>
                      Confirm Booking <i className="bi bi-check-circle ms-1"></i>
                    </button>
                  </div>
                )}

                {/* ── Step: Payment ── */}
                {formStep === 'payment' && booking && (
                  <div className="booking-form-card text-center">
                    {paymentStatus?.booking_status === 'confirmed' ? (
                      <div>
                        <div style={{ fontSize: '3rem', marginBottom: '.75rem' }}>🎉</div>
                        <h4 style={{ color: '#16a34a', fontWeight: 800, fontSize: '1.1rem' }}>Booking Confirmed!</h4>
                        <p style={{ color: 'var(--dl-gray)', fontSize: '.85rem' }}>Your ticket has been sent to <strong>{form.email}</strong></p>
                        <div style={{ background: '#dcfce7', borderRadius: 8, padding: '.85rem', margin: '.85rem 0' }}>
                          <div style={{ fontWeight: 700, fontSize: '.82rem', color: '#16a34a' }}>Booking Reference</div>
                          <div style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: 2 }}>{booking.reference}</div>
                          {paymentStatus.receipt && (
                            <div style={{ fontSize: '.8rem', color: '#16a34a', marginTop: 3 }}>
                              M-Pesa: {paymentStatus.receipt}
                            </div>
                          )}
                        </div>
                        <button className="btn-dl-primary" onClick={() => navigate(`/track/${booking.reference}`)}>
                          <i className="bi bi-ticket-perforated me-2"></i>View Ticket
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>📱</div>
                        <h5 className="fw-700 mb-1" style={{ fontSize: '.95rem' }}>Pay with M-Pesa</h5>
                        <p style={{ color: 'var(--dl-gray)', fontSize: '.82rem', marginBottom: '1.25rem' }}>
                          Ref: <strong>{booking.reference}</strong> | Total: <strong style={{ color: 'var(--dl-red)' }}>KES {totalAmount.toLocaleString()}</strong>
                        </p>

                        {paymentError && (
                          <div className="dl-alert dl-alert-error">
                            <i className="bi bi-exclamation-circle-fill"></i>{paymentError}
                          </div>
                        )}

                        {!polling ? (
                          <>
                            <div className="mb-3">
                              <label className="form-label fw-600" style={{ fontSize: '.82rem' }}>M-Pesa Phone Number</label>
                              <input
                                className="form-control"
                                placeholder="e.g. 0712 345 678"
                                value={paymentPhone}
                                onChange={e => setPaymentPhone(e.target.value)}
                                type="tel"
                                style={{ textAlign: 'center', fontSize: '1rem', fontWeight: 600, letterSpacing: 1 }}
                              />
                              <small style={{ color: 'var(--dl-gray)', fontSize: '.72rem' }}>
                                You'll receive an STK push on this number
                              </small>
                            </div>
                            <button
                              className="btn-dl-gold w-100"
                              onClick={handlePayment}
                              disabled={paymentLoading}
                            >
                              {paymentLoading ? (
                                <div className="payment-spinner" style={{ width: 18, height: 18, margin: '0 auto', borderWidth: 2 }}></div>
                              ) : (
                                <><i className="bi bi-phone-fill me-2"></i>Pay KES {totalAmount.toLocaleString()}</>
                              )}
                            </button>
                          </>
                        ) : (
                          <div>
                            <div className="payment-spinner mx-auto"></div>
                            <h6 className="mt-2 fw-700" style={{ fontSize: '.88rem' }}>Enter PIN on your phone</h6>
                            <p style={{ color: 'var(--dl-gray)', fontSize: '.8rem' }}>
                              Waiting for M-Pesa confirmation...
                            </p>
                            {paymentStatus && (
                              <div style={{ fontSize: '.78rem', color: 'var(--dl-gray)' }}>
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