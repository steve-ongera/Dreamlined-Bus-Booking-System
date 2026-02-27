/**
 * BusSeatMap - renders a bus seat layout from the trip's bus seat data.
 * Seats are placed on an exact CSS grid using row_number & column_number,
 * matching the admin editor's visual output precisely.
 *
 * Props:
 *  seats          – array of SeatLayout objects from bus_layout
 *  bookedSeats    – array of seat_number strings (booked + locked by others)
 *  selectedSeats  – array of seat_number strings (this session's picks)
 *  lockedByOthers – array of seat_number strings (locked, not booked)
 *  onSeatClick    – (seat) => void
 *  seatPrices     – array of { seat_class, price } from trip.seat_prices  ← NEW
 */

const SEAT_STYLES = `
  .bsm-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    padding: .5rem 0;
  }

  /* ── Price + Legend bar ── */
  .bsm-price-legend {
    display: flex;
    flex-wrap: wrap;
    gap: .45rem .75rem;
    justify-content: center;
    margin-bottom: .9rem;
    width: 100%;
  }
  .bsm-price-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: .72rem;
    font-weight: 500;
    color: #444;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: .28rem .6rem;
    white-space: nowrap;
  }
  .bsm-price-dot {
    width: 11px;
    height: 11px;
    border-radius: 3px;
    flex-shrink: 0;
  }
  .bsm-price-label {
    font-weight: 700;
    color: #222;
  }
  .bsm-price-amount {
    font-weight: 800;
    color: var(--dl-red, #cc0000);
    margin-left: 2px;
  }
  .bsm-price-item.no-price .bsm-price-amount {
    color: #999;
    font-weight: 500;
  }

  /* ── Status legend row ── */
  .bsm-status-legend {
    display: flex;
    flex-wrap: wrap;
    gap: .3rem .7rem;
    justify-content: center;
    margin-bottom: .85rem;
  }
  .bsm-legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: .68rem;
    color: #777;
    font-weight: 400;
  }
  .bsm-legend-dot {
    width: 11px;
    height: 11px;
    border-radius: 3px;
    flex-shrink: 0;
    border: 1px solid rgba(0,0,0,.08);
  }

  /* ── Bus shell ── */
  .bsm-bus-shell {
    position: relative;
    background: #f0f0f2;
    border: 2.5px solid #bbb;
    border-radius: 18px 18px 10px 10px;
    padding: 0 12px 12px 12px;
    box-shadow:
      0 4px 18px rgba(0,0,0,.12),
      inset 0 1px 0 rgba(255,255,255,.7),
      inset 0 -1px 0 rgba(0,0,0,.05);
    width: fit-content;
    max-width: 100%;
    overflow-x: auto;
    overflow-y: auto;
    max-height: 70vh;
  }

  /* Windshield strip at top */
  .bsm-front {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-radius: 14px 14px 0 0;
    padding: .5rem .85rem;
    margin: 0 -12px 12px -12px;
    position: sticky;
    top: 0;
    z-index: 2;
    border-bottom: 2px solid rgba(255,255,255,.06);
  }
  .bsm-front-label {
    font-size: .63rem;
    font-weight: 800;
    color: #e2e8f0;
    letter-spacing: .07em;
    text-transform: uppercase;
  }
  .bsm-driver-badge {
    display: flex;
    align-items: center;
    gap: 5px;
    background: rgba(255,255,255,.08);
    border: 1px solid rgba(255,255,255,.15);
    border-radius: 20px;
    padding: .2rem .6rem;
    font-size: .63rem;
    color: #94a3b8;
    font-weight: 600;
  }

  /* Rear bumper */
  .bsm-rear {
    background: #d1d5db;
    border-radius: 0 0 8px 8px;
    text-align: center;
    padding: .32rem;
    font-size: .65rem;
    font-weight: 700;
    color: #6b7280;
    letter-spacing: .05em;
    margin: 10px -12px 0 -12px;
  }

  /* ── Grid ── */
  .bsm-grid {
    display: grid;
    gap: 7px;
    width: fit-content;
    margin: 0 auto;
  }

  /* ── Seat base ── */
  .bsm-seat {
    width: 40px;
    height: 40px;
    border-radius: 7px 7px 4px 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform .12s ease, box-shadow .12s ease;
    position: relative;
    border: none;
    box-sizing: border-box;
    user-select: none;
    box-shadow: 0 4px 0 rgba(0,0,0,.22), 0 1px 4px rgba(0,0,0,.10);
  }
  .bsm-seat::before {
    content: '';
    position: absolute;
    top: 0; left: 12%; right: 12%;
    height: 5px;
    background: rgba(255,255,255,.22);
    border-radius: 0 0 4px 4px;
  }

  .bsm-seat:hover:not(.booked):not(.aisle):not(.driver) {
    transform: translateY(-2px);
    box-shadow: 0 6px 0 rgba(0,0,0,.22), 0 4px 10px rgba(0,0,0,.15);
  }
  .bsm-seat:active:not(.booked):not(.aisle):not(.driver) {
    transform: translateY(2px);
    box-shadow: 0 1px 0 rgba(0,0,0,.22);
  }

  .bsm-seat .seat-cls {
    font-size: .47rem;
    font-weight: 700;
    opacity: .78;
    text-transform: uppercase;
    letter-spacing: .04em;
    line-height: 1;
  }
  .bsm-seat .seat-num {
    font-size: .72rem;
    font-weight: 900;
    line-height: 1.15;
  }

  /* ── Seat classes ── */
  .bsm-seat.economy {
    background: linear-gradient(160deg, #22c55e 0%, #15803d 100%);
    color: #fff;
  }
  .bsm-seat.business {
    background: linear-gradient(160deg, #60a5fa 0%, #1d4ed8 100%);
    color: #fff;
  }
  .bsm-seat.vip {
    background: linear-gradient(160deg, #fcd34d 0%, #b45309 100%);
    color: #2d1500;
    box-shadow: 0 4px 0 rgba(0,0,0,.25), 0 1px 4px rgba(0,0,0,.10), 0 0 0 1px rgba(255,200,0,.3);
  }

  /* ── States ── */
  .bsm-seat.booked {
    background: linear-gradient(160deg, #9ca3af, #6b7280) !important;
    color: rgba(255,255,255,.7) !important;
    cursor: not-allowed;
    opacity: .7;
    box-shadow: 0 2px 0 rgba(0,0,0,.15) !important;
  }
  .bsm-seat.booked .seat-num { text-decoration: line-through; opacity: .5; }

  .bsm-seat.selected {
    background: linear-gradient(160deg, #f87171 0%, #b91c1c 100%) !important;
    color: #fff !important;
    box-shadow:
      0 4px 0 rgba(0,0,0,.22),
      0 0 0 2.5px #fca5a5,
      0 4px 14px rgba(239,68,68,.45) !important;
  }

  /* ── Aisle gap ── */
  .bsm-seat.aisle {
    background: transparent !important;
    box-shadow: none !important;
    cursor: default;
    border: 2px dashed #d1d5db;
    opacity: .35;
  }
  .bsm-seat.aisle::before { display: none; }

  /* ── Driver seat ── */
  .bsm-seat.driver {
    background: linear-gradient(160deg, #374151, #111827) !important;
    color: #9ca3af !important;
    cursor: default;
  }
  .bsm-seat.driver::before { display: none; }

  /* ── Scrollbar ── */
  .bsm-bus-shell::-webkit-scrollbar { width: 5px; height: 5px; }
  .bsm-bus-shell::-webkit-scrollbar-track { background: transparent; }
  .bsm-bus-shell::-webkit-scrollbar-thumb { background: #bbb; border-radius: 10px; }

  /* ── Responsive ── */
  @media (max-width: 480px) {
    .bsm-seat { width: 33px; height: 33px; border-radius: 5px 5px 3px 3px; }
    .bsm-seat .seat-num { font-size: .6rem; }
    .bsm-seat .seat-cls { font-size: .42rem; }
    .bsm-grid { gap: 5px; }
    .bsm-bus-shell { max-height: 58vh; padding: 0 8px 8px 8px; }
    .bsm-front { margin: 0 -8px 10px -8px; padding: .4rem .65rem; }
    .bsm-rear { margin: 8px -8px 0 -8px; }
    .bsm-price-item { font-size: .67rem; padding: .22rem .5rem; }
  }
`;

/* ── SVG icons — no emoji ─────────────────────────────────────────────────── */

// Minimalist side-view bus silhouette
const BusIcon = () => (
  <svg width="26" height="18" viewBox="0 0 26 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Body */}
    <rect x="1" y="3" width="23" height="11" rx="2.5" fill="#60a5fa" stroke="#93c5fd" strokeWidth=".6"/>
    {/* Roof curve */}
    <path d="M3 3 Q13 0 23 3" stroke="#93c5fd" strokeWidth=".7" fill="none"/>
    {/* Windows */}
    <rect x="3"  y="5" width="4" height="4" rx="1" fill="#1e3a5f" opacity=".85"/>
    <rect x="9"  y="5" width="4" height="4" rx="1" fill="#1e3a5f" opacity=".85"/>
    <rect x="15" y="5" width="4" height="4" rx="1" fill="#1e3a5f" opacity=".85"/>
    {/* Front windshield */}
    <rect x="20.5" y="4.5" width="2.5" height="4" rx=".8" fill="#7dd3fc" opacity=".7"/>
    {/* Door line */}
    <line x1="7.5" y1="9.5" x2="7.5" y2="14" stroke="#93c5fd" strokeWidth=".5"/>
    {/* Wheels */}
    <circle cx="6"  cy="15.5" r="2.2" fill="#374151" stroke="#6b7280" strokeWidth=".5"/>
    <circle cx="20" cy="15.5" r="2.2" fill="#374151" stroke="#6b7280" strokeWidth=".5"/>
    <circle cx="6"  cy="15.5" r=".9" fill="#9ca3af"/>
    <circle cx="20" cy="15.5" r=".9" fill="#9ca3af"/>
    {/* Undercarriage */}
    <rect x="2" y="13.8" width="22" height="1.2" rx=".5" fill="#4b5563"/>
    {/* Headlight */}
    <rect x="23" y="7" width="1.8" height="2" rx=".5" fill="#fde68a"/>
    {/* Tail light */}
    <rect x="1.2" y="7" width="1.5" height="2" rx=".5" fill="#fca5a5"/>
  </svg>
);

// Steering wheel icon
const SteeringIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer ring */}
    <circle cx="8" cy="8" r="6.8" stroke="#94a3b8" strokeWidth="1.4" fill="none"/>
    {/* Centre hub */}
    <circle cx="8" cy="8" r="1.8" fill="#64748b"/>
    {/* Spokes */}
    <line x1="8" y1="6.2" x2="8" y2="1.2"   stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="8" y1="9.8" x2="4.5" y2="14"   stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="8" y1="9.8" x2="11.5" y2="14"  stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

/* ── Price + class config ─────────────────────────────────────────────────── */
const CLASS_META = {
  vip:      { label: 'VIP',      shortLabel: 'VIP', bg: 'linear-gradient(160deg,#fcd34d,#b45309)', dot: '#f59e0b' },
  business: { label: 'Business', shortLabel: 'BIZ', bg: 'linear-gradient(160deg,#60a5fa,#1d4ed8)', dot: '#3b82f6' },
  economy:  { label: 'Economy',  shortLabel: 'ECO', bg: 'linear-gradient(160deg,#22c55e,#15803d)', dot: '#22c55e' },
};

const STATUS_LEGEND = [
  { label: 'Available', bg: 'linear-gradient(160deg,#22c55e,#15803d)' },
  { label: 'Booked',    bg: 'linear-gradient(160deg,#9ca3af,#6b7280)' },
  { label: 'Selected',  bg: 'linear-gradient(160deg,#f87171,#b91c1c)' },
];

/* ── Component ────────────────────────────────────────────────────────────── */
export default function BusSeatMap({
  seats = [],
  bookedSeats = [],
  selectedSeats = [],
  lockedByOthers = [],
  onSeatClick,
  seatPrices = [],   // [{ seat_class: 'vip', price: '1800' }, ...]
}) {

  const maxRow = seats.length ? Math.max(...seats.map(s => s.row_number)) : 1;
  const maxCol = seats.length ? Math.max(...seats.map(s => s.column_number)) : 1;

  const isBooked   = (num) => bookedSeats.includes(num);
  const isSelected = (num) => selectedSeats.includes(num);

  // Detect which classes are actually present in this bus layout
  const presentClasses = [...new Set(
    seats
      .filter(s => !s.is_aisle_gap && !s.is_driver_seat)
      .map(s => s.seat_class)
  )];

  // Build price map from seatPrices prop
  const priceMap = {};
  seatPrices.forEach(p => { priceMap[p.seat_class] = Number(p.price); });

  const getSeatStyle = (seat) => {
    const style = {
      gridRow:    seat.row_number,
      gridColumn: seat.col_span > 1
        ? `${seat.column_number} / span ${seat.col_span}`
        : seat.column_number,
    };
    if (seat.bg_color && !isBooked(seat.seat_number) && !isSelected(seat.seat_number)) {
      style.background = seat.bg_color;
    }
    if (seat.text_color && !isBooked(seat.seat_number) && !isSelected(seat.seat_number)) {
      style.color = seat.text_color;
    }
    if (seat.extra_padding) {
      style.width  = 40 + seat.extra_padding + 'px';
      style.height = 40 + seat.extra_padding + 'px';
    }
    return style;
  };

  const getSeatClass = (seat) => {
    if (seat.is_aisle_gap)   return 'bsm-seat aisle';
    if (seat.is_driver_seat) return 'bsm-seat driver';
    let cls = `bsm-seat ${seat.seat_class}`;
    if (isBooked(seat.seat_number))        cls += ' booked';
    else if (isSelected(seat.seat_number)) cls += ' selected';
    return cls;
  };

  const handleClick = (seat) => {
    if (seat.is_aisle_gap || seat.is_driver_seat) return;
    if (isBooked(seat.seat_number)) return;
    if (onSeatClick) onSeatClick(seat);
  };

  const classLabel = (cls) => CLASS_META[cls]?.shortLabel || cls.toUpperCase();

  const formatPrice = (price) =>
    price ? `KES ${Number(price).toLocaleString()}` : 'N/A';

  return (
    <div className="bsm-wrapper">
      <style>{SEAT_STYLES}</style>

      {/* ── Price legend (per seat class) ── */}
      <div className="bsm-price-legend">
        {presentClasses.map(cls => {
          const meta  = CLASS_META[cls] || {};
          const price = priceMap[cls];
          return (
            <div key={cls} className={`bsm-price-item${!price ? ' no-price' : ''}`}>
              <div className="bsm-price-dot" style={{ background: meta.bg || '#ccc' }} />
              <span className="bsm-price-label">{meta.label || cls}</span>
              <span className="bsm-price-amount">{formatPrice(price)}</span>
            </div>
          );
        })}
      </div>

      {/* ── Status legend ── */}
      <div className="bsm-status-legend">
        {STATUS_LEGEND.map(l => (
          <div className="bsm-legend-item" key={l.label}>
            <div className="bsm-legend-dot" style={{ background: l.bg }} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>

      {/* ── Bus shell ── */}
      <div className="bsm-bus-shell">

        {/* Windshield / front header */}
        <div className="bsm-front">
          <BusIcon />
          <span className="bsm-front-label">Front · Engine</span>
          <div className="bsm-driver-badge">
            <SteeringIcon />
            Driver
          </div>
        </div>

        {/* Seat grid */}
        <div
          className="bsm-grid"
          style={{
            gridTemplateColumns: `repeat(${maxCol}, 40px)`,
            gridTemplateRows:    `repeat(${maxRow}, 40px)`,
          }}
        >
          {seats.map(seat => (
            <div
              key={seat.id}
              className={getSeatClass(seat)}
              style={getSeatStyle(seat)}
              onClick={() => handleClick(seat)}
              title={
                seat.is_aisle_gap ? '' :
                isBooked(seat.seat_number)
                  ? `Seat ${seat.seat_number} — Booked`
                  : `Seat ${seat.seat_number} — ${(seat.seat_class || '').toUpperCase()}${priceMap[seat.seat_class] ? ' · KES ' + Number(priceMap[seat.seat_class]).toLocaleString() : ''}`
              }
            >
              {!seat.is_aisle_gap && !seat.is_driver_seat && (
                <>
                  <span className="seat-cls">
                    {seat.custom_label || classLabel(seat.seat_class)}
                  </span>
                  <span className="seat-num">{seat.seat_number}</span>
                </>
              )}
              {seat.is_driver_seat && <SteeringIcon />}
            </div>
          ))}
        </div>

        {/* Rear bumper */}
        <div className="bsm-rear">← REAR →</div>
      </div>
    </div>
  );
}