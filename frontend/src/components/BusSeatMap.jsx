/**
 * BusSeatMap - renders a bus seat layout from the trip's bus seat data.
 * Each bus has its own layout_config & seat positions from the backend.
 */
export default function BusSeatMap({ seats = [], bookedSeats = [], selectedSeats = [], onSeatClick }) {
  // Group seats by row
  const rows = {};
  const maxCol = { count: 0 };

  seats.forEach(seat => {
    if (!seat.is_aisle_gap && !seat.is_driver_seat) {
      if (seat.column_number > maxCol.count) maxCol.count = seat.column_number;
    }
    if (!rows[seat.row_number]) rows[seat.row_number] = [];
    rows[seat.row_number].push(seat);
  });

  const sortedRows = Object.keys(rows).sort((a,b) => Number(a) - Number(b));

  const isBooked = (num) => bookedSeats.includes(num);
  const isSelected = (num) => selectedSeats.includes(num);

  const getSeatStyle = (seat) => {
    const custom = {};
    if (seat.bg_color) custom.background = seat.bg_color;
    if (seat.text_color) custom.color = seat.text_color;
    if (seat.extra_padding) {
      custom.width = 36 + seat.extra_padding + 'px';
      custom.height = 36 + seat.extra_padding + 'px';
    }
    return custom;
  };

  const getSeatClass = (seat) => {
    if (seat.is_aisle_gap) return 'seat aisle-gap';
    if (seat.is_driver_seat) return 'seat driver';
    let cls = `seat ${seat.seat_class}`;
    if (isBooked(seat.seat_number)) cls += ' booked';
    else if (isSelected(seat.seat_number)) cls += ' selected';
    return cls;
  };

  const handleClick = (seat) => {
    if (seat.is_aisle_gap || seat.is_driver_seat) return;
    if (isBooked(seat.seat_number)) return;
    if (onSeatClick) onSeatClick(seat);
  };

  const classLabel = (cls) => {
    if (cls === 'vip') return 'VIP';
    if (cls === 'business') return 'BIZ';
    return cls.substring(0,3).toUpperCase();
  };

  return (
    <div>
      {/* Legend */}
      <div className="seat-legend">
        {[
          { cls:'vip', label:'VIP', bg:'var(--seat-vip)', color:'var(--seat-vip-text)' },
          { cls:'business', label:'Business', bg:'var(--seat-business)', color:'#fff' },
          { cls:'economy', label:'Economy', bg:'var(--seat-economy)', color:'#fff' },
          { cls:'booked', label:'Booked', bg:'var(--seat-booked)', color:'#fff' },
          { cls:'selected', label:'Selected', bg:'var(--seat-selected)', color:'#fff' },
        ].map(l => (
          <div className="legend-item" key={l.cls}>
            <div className="legend-dot" style={{background:l.bg,border:l.cls==='economy'?'none':'none'}}></div>
            <span>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Seat map */}
      <div className="seat-map-wrapper">
        {/* Bus front / driver */}
        <div className="bus-front">
          <span className="bus-steering">🚌</span>
          <span style={{fontWeight:700,color:'var(--dl-red)'}}>FRONT</span>
          <div className="seat driver" style={{width:34,height:34}}>
            <i className="bi bi-person-fill" style={{fontSize:'.8rem'}}></i>
          </div>
        </div>

        {sortedRows.map(rowNum => {
          const rowSeats = rows[rowNum].sort((a,b) => a.column_number - b.column_number);
          return (
            <div className="seat-row" key={rowNum}>
              {rowSeats.map(seat => (
                <div
                  key={seat.id}
                  className={getSeatClass(seat)}
                  style={{
                    ...getSeatStyle(seat),
                    gridColumn: seat.col_span > 1 ? `span ${seat.col_span}` : undefined,
                  }}
                  onClick={() => handleClick(seat)}
                  title={
                    seat.is_aisle_gap ? '' :
                    isBooked(seat.seat_number) ? `Seat ${seat.seat_number} - Booked` :
                    `Seat ${seat.seat_number} - ${seat.seat_class.toUpperCase()}`
                  }
                >
                  {!seat.is_aisle_gap && !seat.is_driver_seat && (
                    <>
                      <span style={{fontSize:'.58rem',opacity:.7}}>
                        {seat.custom_label || classLabel(seat.seat_class)}
                      </span>
                      <span style={{fontWeight:800,fontSize:'.72rem'}}>
                        {seat.seat_number}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          );
        })}

        {/* Bus back */}
        <div style={{
          background:'#e9ecef',borderRadius:'0 0 8px 8px',
          textAlign:'center',padding:'.4rem',
          fontSize:'.75rem',fontWeight:600,color:'var(--dl-gray)',
          marginTop:4
        }}>
          ← REAR →
        </div>
      </div>
    </div>
  );
}