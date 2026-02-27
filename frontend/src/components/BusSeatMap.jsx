/**
 * BusSeatMap - renders a bus seat layout from the trip's bus seat data.
 * Seats are placed on an exact CSS grid using row_number & column_number,
 * matching the admin editor's visual output precisely.
 */
export default function BusSeatMap({ seats = [], bookedSeats = [], selectedSeats = [], onSeatClick }) {

  // Compute grid dimensions from seat data
  const maxRow = seats.length ? Math.max(...seats.map(s => s.row_number)) : 1;
  const maxCol = seats.length ? Math.max(...seats.map(s => s.column_number)) : 1;

  const isBooked   = (num) => bookedSeats.includes(num);
  const isSelected = (num) => selectedSeats.includes(num);

  const getSeatStyle = (seat) => {
    const style = {
      // Place the seat on the exact grid cell
      gridRow:    seat.row_number,
      gridColumn: seat.col_span > 1
        ? `${seat.column_number} / span ${seat.col_span}`
        : seat.column_number,
    };

    if (seat.bg_color)       style.background = seat.bg_color;
    if (seat.text_color)     style.color       = seat.text_color;
    if (seat.extra_padding) {
      style.width  = 32 + seat.extra_padding + 'px';
      style.height = 32 + seat.extra_padding + 'px';
    }
    return style;
  };

  const getSeatClass = (seat) => {
    if (seat.is_aisle_gap)   return 'seat aisle-gap';
    if (seat.is_driver_seat) return 'seat driver';
    let cls = `seat ${seat.seat_class}`;
    if (isBooked(seat.seat_number))    cls += ' booked';
    else if (isSelected(seat.seat_number)) cls += ' selected';
    return cls;
  };

  const handleClick = (seat) => {
    if (seat.is_aisle_gap || seat.is_driver_seat) return;
    if (isBooked(seat.seat_number)) return;
    if (onSeatClick) onSeatClick(seat);
  };

  const classLabel = (cls) => {
    if (cls === 'vip')      return 'VIP';
    if (cls === 'business') return 'BIZ';
    return cls.substring(0, 3).toUpperCase();
  };

  return (
    <div>
      {/* Legend */}
      <div className="seat-legend">
        {[
          { cls: 'vip',      label: 'VIP',      bg: 'var(--seat-vip)',      color: 'var(--seat-vip-text)' },
          { cls: 'business', label: 'Business',  bg: 'var(--seat-business)', color: '#fff' },
          { cls: 'economy',  label: 'Economy',   bg: 'var(--seat-economy)',  color: '#fff' },
          { cls: 'booked',   label: 'Booked',    bg: 'var(--seat-booked)',   color: '#fff' },
          { cls: 'selected', label: 'Selected',  bg: 'var(--seat-selected)', color: '#fff' },
        ].map(l => (
          <div className="legend-item" key={l.cls}>
            <div className="legend-dot" style={{ background: l.bg }}></div>
            <span>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Seat map */}
      <div className="seat-map-wrapper">

        {/* Bus front */}
        <div className="bus-front">
          <span className="bus-steering">🚌</span>
          <span style={{ fontWeight: 700, color: 'var(--dl-red)', fontSize: '.72rem' }}>FRONT</span>
          <div className="seat driver" style={{ width: 30, height: 30 }}>
            <i className="bi bi-person-fill" style={{ fontSize: '.72rem' }}></i>
          </div>
        </div>

        {/*
          CSS grid with exact columns matching the admin editor.
          Each seat is placed via gridRow / gridColumn so positions are 1-to-1.
        */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${maxCol}, 36px)`,
            gridTemplateRows:    `repeat(${maxRow}, 36px)`,
            gap: '4px',
            width: 'fit-content',
            margin: '0 auto',
          }}
        >
          {seats.map(seat => (
            <div
              key={seat.id}
              className={getSeatClass(seat)}
              style={getSeatStyle(seat)}
              onClick={() => handleClick(seat)}
              title={
                seat.is_aisle_gap   ? '' :
                isBooked(seat.seat_number)
                  ? `Seat ${seat.seat_number} - Booked`
                  : `Seat ${seat.seat_number} - ${seat.seat_class.toUpperCase()}`
              }
            >
              {!seat.is_aisle_gap && !seat.is_driver_seat && (
                <>
                  <span style={{ fontSize: '.52rem', opacity: .75 }}>
                    {seat.custom_label || classLabel(seat.seat_class)}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '.65rem' }}>
                    {seat.seat_number}
                  </span>
                </>
              )}
              {seat.is_driver_seat && (
                <i className="bi bi-person-fill" style={{ fontSize: '.72rem' }}></i>
              )}
            </div>
          ))}
        </div>

        {/* Bus back */}
        <div style={{
          background: '#e9ecef', borderRadius: '0 0 8px 8px',
          textAlign: 'center', padding: '.35rem',
          fontSize: '.7rem', fontWeight: 600, color: 'var(--dl-gray)',
          marginTop: 3,
        }}>
          ← REAR →
        </div>
      </div>
    </div>
  );
}