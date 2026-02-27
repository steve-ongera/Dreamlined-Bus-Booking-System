/*
  Results.jsx  –  with real-time seat locking (5-min hold + live poll)
  + automatic expired-lock cleanup via POST /api/v1/seat-locks/cleanup/
*/
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  searchTrips, getTripDetail, getBoardingPoints,
  createBooking, initiatePayment, getPaymentStatus
} from '../services/api';
import BusSeatMap from '../components/BusSeatMap';

// ── API helpers ───────────────────────────────────────────────────────────────
const BASE = import.meta.env.VITE_API_BASE || '';

async function lockSeats(tripSlug, seatNumbers, action = 'lock') {
  const res = await fetch(`${BASE}/api/v1/trips/${tripSlug}/lock-seats/`, {
    method: 'POST',
    credentials: 'include',
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

async function triggerLockCleanup() {
  try {
    await fetch(`${BASE}/api/v1/seat-locks/cleanup/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    // fire-and-forget
  }
}

// ── Countdown display ─────────────────────────────────────────────────────────
function LockCountdown({ seconds, onExpire }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => { setRemaining(seconds); }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) { onExpire(); return; }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  const mins   = Math.floor(remaining / 60);
  const secs   = remaining % 60;
  const pct    = Math.min(100, (remaining / 300) * 100);
  const urgent = remaining <= 60;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: urgent ? '#fff5f5' : '#f0fdf4',
      border: `1px solid ${urgent ? '#fecaca' : '#bbf7d0'}`,
      borderRadius: 8, padding: '.45rem .75rem',
      fontSize: '.78rem', fontWeight: 600,
    }}>
      <i
        className={`bi ${urgent ? 'bi-exclamation-triangle-fill' : 'bi-lock-fill'}`}
        style={{ color: urgent ? '#dc2626' : '#16a34a', fontSize: '.8rem' }}
      />
      <span style={{ color: urgent ? '#dc2626' : '#15803d' }}>
        Seats held for{' '}
        <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
          {mins}:{String(secs).padStart(2, '0')}
        </strong>
      </span>
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
  const navigate       = useNavigate();

  const origin      = searchParams.get('origin')      || '';
  const destination = searchParams.get('destination') || '';
  const date        = searchParams.get('date')        || '';

  const [trips, setTrips]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [selectedTrip, setSelectedTrip]   = useState(null);
  const [tripDetail, setTripDetail]       = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [selectedSeats, setSelectedSeats] = useState([]);

  const [bookedSeats, setBookedSeats]       = useState([]);
  const [lockedByOthers, setLockedByOthers] = useState([]);
  const [myLocks, setMyLocks]               = useState({});
  const [lockError, setLockError]           = useState('');
  const pollRef    = useRef(null);
  const cleanupRef = useRef(null);

  const [boardingPoints, setBoardingPoints] = useState([]);
  const [droppingPoints, setDroppingPoints] = useState([]);

  const [form, setForm] = useState({
    name: '', email: '', phone: '', idNumber: '', nationality: 'Kenyan',
    boardingPoint: '', droppingPoint: '',
  });
  const [formStep, setFormStep] = useState('seats');

  const [booking, setBooking]               = useState(null);
  const [paymentPhone, setPaymentPhone]     = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError]     = useState('');
  const [paymentStatus, setPaymentStatus]   = useState(null);
  const [polling, setPolling]               = useState(false);

  // ── Stop helpers ──────────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollRef.current)    { clearInterval(pollRef.current);    pollRef.current    = null; }
  }, []);

  const stopCleanupInterval = useCallback(() => {
    if (cleanupRef.current) { clearInterval(cleanupRef.current); cleanupRef.current = null; }
  }, []);

  useEffect(() => () => { stopPolling(); stopCleanupInterval(); }, [stopPolling, stopCleanupInterval]);

  // ── Load trips ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!origin || !destination || !date) { navigate('/'); return; }
    triggerLockCleanup();
    setLoading(true);
    searchTrips(origin, destination, date)
      .then(data => { setTrips(data.results || []); setError(''); })
      .catch(() => setError('Failed to load trips. Please try again.'))
      .finally(() => setLoading(false));
  }, [origin, destination, date]);

  // ── Live seat-status polling ──────────────────────────────────────────────
  const fetchSeatStatus = useCallback(async (tripSlug) => {
    try {
      const st = await getSeatStatus(tripSlug);
      setBookedSeats(st.booked              || []);
      setLockedByOthers(st.locked_by_others || []);
      setMyLocks(st.my_locks                || {});
      setSelectedSeats(prev => {
        const nowUnavailable = [...(st.booked || []), ...(st.locked_by_others || [])];
        const safe = prev.filter(n => !nowUnavailable.includes(n));
        if (safe.length !== prev.length)
          setLockError('One or more of your selected seats was taken by another passenger.');
        return safe;
      });
    } catch {}
  }, []);

  const startCleanupInterval = useCallback(() => {
    stopCleanupInterval();
    triggerLockCleanup();
    cleanupRef.current = setInterval(triggerLockCleanup, 60_000);
  }, [stopCleanupInterval]);

  const startPolling = useCallback((tripSlug) => {
    stopPolling();
    fetchSeatStatus(tripSlug);
    pollRef.current = setInterval(() => fetchSeatStatus(tripSlug), 3000);
  }, [fetchSeatStatus, stopPolling]);

  // ── Select a trip ─────────────────────────────────────────────────────────
  const handleSelectTrip = async (trip) => {
    stopPolling();
    stopCleanupInterval();
    if (selectedTrip && selectedSeats.length > 0)
      await lockSeats(selectedTrip.slug, selectedSeats, 'release').catch(() => {});

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
      startCleanupInterval();
    } catch {
      setError('Failed to load seat details.');
    } finally {
      setLoadingDetail(false);
    }
    setTimeout(() => document.getElementById('seat-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  // ── Seat click ────────────────────────────────────────────────────────────
  const handleSeatClick = async (seat) => {
    if (!selectedTrip) return;
    const num = seat.seat_number;
    setLockError('');
    if (selectedSeats.includes(num)) {
      setSelectedSeats(prev => prev.filter(n => n !== num));
      await lockSeats(selectedTrip.slug, [num], 'release').catch(() => {});
    } else {
      const res = await lockSeats(selectedTrip.slug, [num], 'lock');
      if (res.locked) {
        setSelectedSeats(prev => [...prev, num]);
        setMyLocks(prev => ({ ...prev, [num]: res.expires_in_seconds }));
      } else {
        setLockError(res.error || `Could not lock seat ${num}. Try another.`);
        fetchSeatStatus(selectedTrip.slug);
      }
    }
  };

  // ── Lock expires ──────────────────────────────────────────────────────────
  const handleLockExpired = async (seatNumber) => {
    setSelectedSeats(prev => prev.filter(n => n !== seatNumber));
    setMyLocks(prev => { const next = { ...prev }; delete next[seatNumber]; return next; });
    setLockError(`Your hold on seat ${seatNumber} expired. Please select it again.`);
    await lockSeats(selectedTrip.slug, [seatNumber], 'release').catch(() => {});
    fetchSeatStatus(selectedTrip.slug);
  };

  // ── Pricing ───────────────────────────────────────────────────────────────
  const getSeatPrice = (seatNumber) => {
    if (!tripDetail) return 0;
    const seat  = tripDetail.bus_layout?.find(s => s.seat_number === seatNumber);
    if (!seat) return 0;
    const price = tripDetail.seat_prices?.find(p => p.seat_class === seat.seat_class);
    return price ? Number(price.price) : 0;
  };
  const totalAmount = selectedSeats.reduce((sum, n) => sum + getSeatPrice(n), 0);

  // ── Book ──────────────────────────────────────────────────────────────────
  const handleBook = async () => {
    const { name, email, phone, idNumber, nationality, boardingPoint, droppingPoint } = form;
    if (!name || !email || !phone || !idNumber) { alert('Please fill in all required fields.'); return; }
    try {
      const data = await createBooking({
        trip_slug: selectedTrip.slug, seat_numbers: selectedSeats,
        boarding_point_slug: boardingPoint || undefined,
        dropping_point_slug: droppingPoint || undefined,
        passenger_name: name, passenger_email: email,
        passenger_phone: phone, passenger_id_number: idNumber,
        passenger_nationality: nationality,
      });
      setBooking(data);
      setFormStep('payment');
      stopPolling();
      stopCleanupInterval();
      await lockSeats(selectedTrip.slug, selectedSeats, 'release').catch(() => {});
    } catch (err) {
      const msg = err.response?.data;
      alert(typeof msg === 'object' ? JSON.stringify(msg) : 'Booking failed. Try again.');
    }
  };

  // ── Payment ───────────────────────────────────────────────────────────────
  const handlePayment = async () => {
    if (!paymentPhone) { setPaymentError('Enter your M-Pesa phone number.'); return; }
    setPaymentLoading(true); setPaymentError('');
    try {
      await initiatePayment(booking.reference, paymentPhone);
      setPolling(true);
      const interval = setInterval(async () => {
        try {
          const st = await getPaymentStatus(booking.reference);
          setPaymentStatus(st);
          if (st.payment_status === 'completed' || st.booking_status === 'confirmed') { clearInterval(interval); setPolling(false); }
          if (st.payment_status === 'failed'    || st.payment_status === 'cancelled') { clearInterval(interval); setPolling(false); setPaymentError(st.message || 'Payment failed.'); }
        } catch {}
      }, 5000);
      setTimeout(() => { clearInterval(interval); setPolling(false); }, 120000);
    } catch (err) {
      setPaymentError(err.response?.data?.error || 'Payment initiation failed.');
    } finally { setPaymentLoading(false); }
  };

  // ── Formatters ────────────────────────────────────────────────────────────
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
  const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

  const minLockRemaining = selectedSeats.length > 0
    ? Math.min(...selectedSeats.map(n => myLocks[n] ?? 300)) : null;
  const soonestExpiringSeat = selectedSeats.reduce((min, n) => {
    const t = myLocks[n] ?? 300;
    return (!min || t < (myLocks[min] ?? 300)) ? n : min;
  }, null);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#f5f5f7', minHeight: '100vh', paddingBottom: '2rem' }}>

      {/* Page header */}
      <div className="page-header">
        <div className="container">
          <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap">
            <span style={{ fontSize: '.95rem', fontWeight: 800 }}>{cap(origin)}</span>
            <i className="bi bi-arrow-right" style={{ color: 'var(--dl-gold)', fontSize: '.85rem' }} />
            <span style={{ fontSize: '.95rem', fontWeight: 800 }}>{cap(destination)}</span>
            <span style={{ opacity: .65, fontSize: '.78rem', fontWeight: 400 }}>· {formatDate(date)}</span>
          </div>
        </div>
      </div>

      <div className="container mt-3">
        {error && (
          <div className="dl-alert dl-alert-error">
            <i className="bi bi-exclamation-circle-fill" /> {error}
          </div>
        )}

        <div className="row g-3">

          {/* ── Trip list ── */}
          <div className="col-12 col-lg-5">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span style={{ fontSize: '.78rem', color: '#999', fontWeight: 500 }}>
                {loading ? 'Searching...' : `${trips.length} result${trips.length !== 1 ? 's' : ''}`}
              </span>
              <button
                className="btn-dl-outline"
                style={{ padding: '.25rem .6rem', fontSize: '.73rem' }}
                onClick={() => navigate('/')}
              >
                <i className="bi bi-arrow-left me-1" />Back
              </button>
            </div>

            {/* Skeletons */}
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ background: '#fff', border: '1.5px solid #e8e8ec', borderRadius: 10, padding: '.6rem .85rem', marginBottom: '.5rem' }}>
                  <div className="skeleton mb-2" style={{ height: 12, width: '55%' }} />
                  <div className="skeleton mb-2" style={{ height: 14, width: '75%' }} />
                  <div className="skeleton"      style={{ height: 10, width: '35%' }} />
                </div>
              ))
            ) : trips.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-bus-front" style={{ fontSize: '2.5rem', color: 'var(--dl-border)' }} />
                <h5 className="mt-3" style={{ fontSize: '1rem' }}>No buses found</h5>
                <p style={{ color: 'var(--dl-gray)', fontSize: '.85rem' }}>Try a different date or route.</p>
                <button className="btn-dl-outline mt-2" onClick={() => navigate('/')}>
                  <i className="bi bi-arrow-left me-1" />Back to Search
                </button>
              </div>
            ) : (
              trips.map(trip => {
                const isSelected = selectedTrip?.slug === trip.slug;
                const minPrice   = Math.min(...(trip.seat_prices?.map(p => Number(p.price)) || [0]));
                return (
                  <div
                    key={trip.slug}
                    onClick={() => handleSelectTrip(trip)}
                    style={{
                      background: '#fff',
                      border: `1.5px solid ${isSelected ? 'var(--dl-red)' : '#e8e8ec'}`,
                      borderRadius: 10,
                      padding: '.58rem .85rem',
                      marginBottom: '.45rem',
                      cursor: 'pointer',
                      transition: 'border-color .15s, box-shadow .15s',
                      boxShadow: isSelected ? '0 2px 10px rgba(204,0,0,.07)' : 'none',
                    }}
                  >
                    {/* ── Row 1: Origin → Destination + price ── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                      {/* Left: cities + times */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

                        {/* Origin */}
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '.88rem', color: '#111', lineHeight: 1.15 }}>
                            {cap(trip.origin)}
                          </div>
                          <div style={{ fontSize: '.68rem', color: '#999', fontWeight: 400, marginTop: 1 }}>
                            {formatTime(trip.departure_time)}
                          </div>
                        </div>

                        {/* Arrow + duration */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 40 }}>
                          <div style={{ fontSize: '.58rem', color: '#bbb', fontWeight: 500, marginBottom: 1 }}>
                            {trip.duration_minutes
                              ? `${Math.floor(trip.duration_minutes / 60)}h ${trip.duration_minutes % 60}m`
                              : '--'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <div style={{ flex: 1, height: 1, background: '#ddd' }} />
                            <i className="bi bi-caret-right-fill" style={{ fontSize: '.42rem', color: '#ccc' }} />
                          </div>
                        </div>

                        {/* Destination */}
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '.88rem', color: '#111', lineHeight: 1.15 }}>
                            {cap(trip.destination)}
                          </div>
                          <div style={{ fontSize: '.68rem', color: '#999', fontWeight: 400, marginTop: 1 }}>
                            {formatTime(trip.arrival_time)}
                          </div>
                        </div>
                      </div>

                      {/* Right: price */}
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                        <div style={{
                          fontWeight: 800, fontSize: '.88rem',
                          color: isSelected ? 'var(--dl-red)' : '#222',
                        }}>
                          KES {minPrice.toLocaleString()}+
                        </div>
                        <div style={{ fontSize: '.63rem', color: '#aaa', marginTop: 1 }}>
                          {trip.available_seats} left
                        </div>
                      </div>
                    </div>

                    {/* ── Row 2: bus + amenities + class badges ── */}
                    <div style={{ marginTop: '.38rem', display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                      {/* Bus name */}
                      <span style={{
                        fontSize: '.65rem', fontWeight: 600, color: '#666',
                        background: '#f4f4f6', borderRadius: 4, padding: '.08rem .38rem',
                      }}>
                        <i className="bi bi-bus-front" style={{ fontSize: '.58rem', marginRight: 3 }} />
                        {trip.bus_name || trip.bus_type}
                      </span>

                      {/* Amenities */}
                      {trip.amenities?.slice(0, 3).map(a => (
                        <span key={a} style={{
                          fontSize: '.62rem', color: '#888', background: '#f4f4f6',
                          borderRadius: 4, padding: '.08rem .32rem', fontWeight: 400,
                        }}>{a}</span>
                      ))}

                      {/* Seat class badges — subtle, no heavy colour fill */}
                      {trip.seat_prices?.map(p => (
                        <span key={p.seat_class} style={{
                          fontSize: '.61rem', padding: '.08rem .35rem', borderRadius: 4, fontWeight: 600,
                          border: `1px solid ${p.seat_class === 'vip' ? '#fde68a' : p.seat_class === 'business' ? '#bfdbfe' : '#bbf7d0'}`,
                          color:  p.seat_class === 'vip' ? '#92400e' : p.seat_class === 'business' ? '#1e40af' : '#166534',
                          background: 'transparent',
                        }}>
                          {p.seat_class.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Seat map + booking ── */}
          <div className="col-12 col-lg-7" id="seat-panel">
            {!selectedTrip ? (
              <div className="bus-seat-container text-center py-5">
                <i className="bi bi-cursor-fill" style={{ fontSize: '2.5rem', color: 'var(--dl-border)' }} />
                <h5 className="mt-3" style={{ fontSize: '1rem' }}>Select a Bus</h5>
                <p style={{ color: 'var(--dl-gray)', fontSize: '.85rem' }}>Tap a bus from the list to view seats</p>
              </div>
            ) : (
              <div className="bus-seat-container">

                {/* Trip header */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontWeight: 800, fontSize: '.92rem', color: '#111' }}>{cap(selectedTrip.origin || origin)}</span>
                      <i className="bi bi-arrow-right" style={{ color: 'var(--dl-gold)', fontSize: '.72rem' }} />
                      <span style={{ fontWeight: 800, fontSize: '.92rem', color: '#111' }}>{cap(selectedTrip.destination || destination)}</span>
                    </div>
                    <small style={{ color: '#aaa', fontSize: '.7rem' }}>
                      {formatTime(selectedTrip.departure_time)} → {formatTime(selectedTrip.arrival_time)}
                      &ensp;·&ensp;{selectedTrip.bus_name}
                    </small>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '.65rem', color: '#aaa' }}>Selected</div>
                    <div style={{ fontWeight: 800, color: 'var(--dl-red)', fontSize: '.92rem' }}>
                      {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Step tabs */}
                <div className="d-flex gap-1 mb-3">
                  {['seats', 'details', 'payment'].map((step, i) => (
                    <div key={step} className="d-flex align-items-center gap-1">
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '.62rem', fontWeight: 700,
                        background: formStep === step ? 'var(--dl-red)'
                          : ['details', 'payment'].indexOf(formStep) > i ? '#16a34a' : 'var(--dl-border)',
                        color: formStep === step || ['details', 'payment'].indexOf(formStep) > i ? 'white' : 'var(--dl-gray)',
                      }}>
                        {['details', 'payment'].indexOf(formStep) > i ? '✓' : i + 1}
                      </div>
                      <span style={{
                        fontSize: '.72rem', fontWeight: formStep === step ? 700 : 400,
                        color: formStep === step ? 'var(--dl-red)' : 'var(--dl-gray)',
                        textTransform: 'capitalize',
                      }}>{step}</span>
                      {i < 2 && <i className="bi bi-chevron-right" style={{ fontSize: '.55rem', color: 'var(--dl-border)' }} />}
                    </div>
                  ))}
                </div>

                {/* ── Step: Seat selection ── */}
                {formStep === 'seats' && (
                  <>
                    {loadingDetail ? (
                      <div className="text-center py-4">
                        <div className="payment-spinner mx-auto mb-2" />
                        <small style={{ color: 'var(--dl-gray)', fontSize: '.8rem' }}>Loading seats...</small>
                      </div>
                    ) : tripDetail ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '.67rem', color: '#16a34a', marginBottom: 8, fontWeight: 600 }}>
                          <span style={{
                            width: 6, height: 6, borderRadius: '50%', background: '#16a34a',
                            display: 'inline-block', animation: 'bsm-pulse 1.5s infinite',
                          }} />
                          Live seat availability
                          <style>{`@keyframes bsm-pulse{0%{box-shadow:0 0 0 0 rgba(22,163,74,.4)}70%{box-shadow:0 0 0 6px rgba(22,163,74,0)}100%{box-shadow:0 0 0 0 rgba(22,163,74,0)}}`}</style>
                        </div>

                        {lockError && (
                          <div className="dl-alert dl-alert-error" style={{ marginBottom: 8, fontSize: '.78rem' }}>
                            <i className="bi bi-exclamation-triangle-fill me-1" />
                            {lockError}
                            <button onClick={() => setLockError('')} style={{ background: 'none', border: 'none', marginLeft: 'auto', cursor: 'pointer', color: 'inherit', padding: 0, float: 'right' }}>×</button>
                          </div>
                        )}

                        <BusSeatMap
                          seats={tripDetail.bus_layout || []}
                          bookedSeats={[...bookedSeats, ...lockedByOthers]}
                          selectedSeats={selectedSeats}
                          lockedByOthers={lockedByOthers}
                          onSeatClick={handleSeatClick}
                          seatPrices={tripDetail.seat_prices || []}
                        />

                        {selectedSeats.length > 0 && (
                          <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, padding: '.85rem', marginTop: '.85rem' }}>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span style={{ fontWeight: 600, fontSize: '.83rem' }}>Selected Seats:</span>
                              <span style={{ fontWeight: 800, color: 'var(--dl-red)', fontSize: '.95rem' }}>
                                KES {totalAmount.toLocaleString()}
                              </span>
                            </div>

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
                                return (
                                  <span key={n} style={{
                                    padding: '.15rem .5rem', borderRadius: 5, fontSize: '.75rem', fontWeight: 700,
                                    background: seat?.seat_class === 'vip' ? 'var(--seat-vip)'
                                      : seat?.seat_class === 'business' ? 'var(--seat-business)' : 'var(--seat-economy)',
                                    color: seat?.seat_class === 'vip' ? 'var(--seat-vip-text)' : 'white',
                                  }}>
                                    <i className="bi bi-lock-fill" style={{ fontSize: '.6rem', marginRight: 3, opacity: .7 }} />
                                    {n}
                                    <button onClick={() => handleSeatClick(seat || { seat_number: n })} style={{ background: 'none', border: 'none', color: 'inherit', marginLeft: 3, cursor: 'pointer', padding: 0, fontSize: '.8rem' }}>×</button>
                                  </span>
                                );
                              })}
                            </div>
                            <button className="btn-dl-primary w-100" onClick={() => setFormStep('details')}>
                              Continue <i className="bi bi-arrow-right ms-1" />
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
                        <i className="bi bi-arrow-left me-1" />Back
                      </button>
                    </div>

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
                        <input className="form-control" placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                      </div>
                      <div className="col-12 col-sm-6">
                        <label className="form-label fw-600">Email *</label>
                        <input className="form-control" type="email" placeholder="john@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                        <small style={{ color: 'var(--dl-gray)', fontSize: '.72rem' }}>Ticket sent here</small>
                      </div>
                      <div className="col-12 col-sm-6">
                        <label className="form-label fw-600">Phone Number *</label>
                        <input className="form-control" placeholder="07XX XXX XXX" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                      </div>
                      <div className="col-12 col-sm-6">
                        <label className="form-label fw-600">ID / Passport *</label>
                        <input className="form-control" placeholder="12345678" value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })} />
                      </div>
                      <div className="col-12 col-sm-6">
                        <label className="form-label fw-600">Nationality</label>
                        <select className="form-select" value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })}>
                          <option>Kenyan</option><option>Ugandan</option><option>Tanzanian</option><option>Other</option>
                        </select>
                      </div>
                      {boardingPoints.length > 0 && (
                        <div className="col-12 col-sm-6">
                          <label className="form-label fw-600">Boarding Point</label>
                          <select className="form-select" value={form.boardingPoint} onChange={e => setForm({ ...form, boardingPoint: e.target.value })}>
                            <option value="">Select boarding point</option>
                            {boardingPoints.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
                          </select>
                        </div>
                      )}
                      {droppingPoints.length > 0 && (
                        <div className="col-12 col-sm-6">
                          <label className="form-label fw-600">Dropping Point</label>
                          <select className="form-select" value={form.droppingPoint} onChange={e => setForm({ ...form, droppingPoint: e.target.value })}>
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
                        <span style={{ fontWeight: 800, color: 'var(--dl-red)', fontSize: '1rem' }}>KES {totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                    <button className="btn-dl-primary w-100 mt-3" onClick={handleBook}>
                      Confirm Booking <i className="bi bi-check-circle ms-1" />
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
                          {paymentStatus.receipt && <div style={{ fontSize: '.8rem', color: '#16a34a', marginTop: 3 }}>M-Pesa: {paymentStatus.receipt}</div>}
                        </div>
                        <button className="btn-dl-primary" onClick={() => navigate(`/track/${booking.reference}`)}>
                          <i className="bi bi-ticket-perforated me-2" />View Ticket
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>📱</div>
                        <h5 className="fw-700 mb-1" style={{ fontSize: '.95rem' }}>Pay with M-Pesa</h5>
                        <p style={{ color: 'var(--dl-gray)', fontSize: '.82rem', marginBottom: '1.25rem' }}>
                          Ref: <strong>{booking.reference}</strong> | Total: <strong style={{ color: 'var(--dl-red)' }}>KES {totalAmount.toLocaleString()}</strong>
                        </p>
                        {paymentError && <div className="dl-alert dl-alert-error"><i className="bi bi-exclamation-circle-fill" />{paymentError}</div>}
                        {!polling ? (
                          <>
                            <div className="mb-3">
                              <label className="form-label fw-600" style={{ fontSize: '.82rem' }}>M-Pesa Phone Number</label>
                              <input className="form-control" placeholder="e.g. 0712 345 678" value={paymentPhone} onChange={e => setPaymentPhone(e.target.value)} type="tel" style={{ textAlign: 'center', fontSize: '1rem', fontWeight: 600, letterSpacing: 1 }} />
                              <small style={{ color: 'var(--dl-gray)', fontSize: '.72rem' }}>You'll receive an STK push on this number</small>
                            </div>
                            <button className="btn-dl-gold w-100" onClick={handlePayment} disabled={paymentLoading}>
                              {paymentLoading
                                ? <div className="payment-spinner" style={{ width: 18, height: 18, margin: '0 auto', borderWidth: 2 }} />
                                : <><i className="bi bi-phone-fill me-2" />Pay KES {totalAmount.toLocaleString()}</>}
                            </button>
                          </>
                        ) : (
                          <div>
                            <div className="payment-spinner mx-auto" />
                            <h6 className="mt-2 fw-700" style={{ fontSize: '.88rem' }}>Enter PIN on your phone</h6>
                            <p style={{ color: 'var(--dl-gray)', fontSize: '.8rem' }}>Waiting for M-Pesa confirmation...</p>
                            {paymentStatus && <div style={{ fontSize: '.78rem', color: 'var(--dl-gray)' }}>Status: {paymentStatus.payment_status}</div>}
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