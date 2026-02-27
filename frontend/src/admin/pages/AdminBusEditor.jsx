/**
 * AdminBusEditor.jsx  –  Drag-and-drop seat layout editor
 *
 * Features:
 * - Visual bus grid (rows × columns)
 * - Drag seats to rearrange
 * - Click to select a seat and edit its properties
 * - Tools: add seat, add aisle gap, add driver seat, delete
 * - Resize seats (change class changes visual size)
 * - Save layout to backend
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBusAdmin, saveBusLayout } from '../admin_api';

const CLASS_OPTIONS = ['economy', 'business', 'vip'];
const CLASS_COLORS = { vip: '#D4A017', business: '#2563EB', economy: '#16a34a', aisle: 'transparent', driver: '#374151' };
const CLASS_TEXT   = { vip: '#1a1a1a', business: '#fff', economy: '#fff', aisle: '#9ca3af', driver: '#fff' };

const newSeat = (row, col, cls = 'economy', overrides = {}) => ({
  id: `${Date.now()}-${Math.random()}`,
  seat_number: '',
  seat_class: cls,
  seat_type: 'window',
  row_number: row,
  column_number: col,
  row_span: 1,
  col_span: 1,
  is_aisle_gap: false,
  is_driver_seat: false,
  is_active: true,
  bg_color: '',
  text_color: '',
  custom_label: '',
  extra_padding: 0,
  ...overrides,
});

// Auto-number seats by class
function autoNumber(seats) {
  const counters = { vip: 1, business: 1, economy: 1 };
  return seats.map(s => {
    if (s.is_aisle_gap || s.is_driver_seat) return { ...s, seat_number: s.seat_number || '' };
    const prefix = s.seat_class === 'vip' ? 'V' : s.seat_class === 'business' ? 'B' : '';
    const num = counters[s.seat_class]++;
    return { ...s, seat_number: s.seat_number || `${prefix}${num}` };
  });
}

export default function AdminBusEditor() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [bus, setBus] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState(null); // seat id
  const [tool, setTool] = useState('select'); // select | economy | business | vip | aisle | driver | delete
  const [rows, setRows] = useState(12);
  const [cols, setCols] = useState(5);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const dragSeat = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBusAdmin(slug);
      setBus(data);
      if (data.seats && data.seats.length > 0) {
        setSeats(data.seats.map((s, i) => ({ ...s, id: s.id || `existing-${i}` })));
        const maxRow = Math.max(...data.seats.map(s => s.row_number), 12);
        const maxCol = Math.max(...data.seats.map(s => s.column_number), 5);
        setRows(maxRow);
        setCols(maxCol);
      }
    } finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const getCell = (row, col) => seats.find(s => s.row_number === row && s.column_number === col);
  const selectedSeat = seats.find(s => s.id === selected);

  const handleCellClick = (row, col) => {
    const existing = getCell(row, col);

    if (tool === 'select') {
      setSelected(existing?.id || null);
      return;
    }
    if (tool === 'delete') {
      if (existing) setSeats(prev => prev.filter(s => s.id !== existing.id));
      return;
    }
    if (tool === 'aisle') {
      if (existing) {
        setSeats(prev => prev.map(s => s.id === existing.id
          ? { ...s, is_aisle_gap: true, is_driver_seat: false, seat_class: 'economy', seat_number: '' }
          : s));
      } else {
        setSeats(prev => [...prev, newSeat(row, col, 'economy', { is_aisle_gap: true, seat_number: '' })]);
      }
      return;
    }
    if (tool === 'driver') {
      if (existing) {
        setSeats(prev => prev.map(s => s.id === existing.id
          ? { ...s, is_driver_seat: true, is_aisle_gap: false, seat_number: 'DRV' }
          : s));
      } else {
        setSeats(prev => [...prev, newSeat(row, col, 'economy', { is_driver_seat: true, seat_number: 'DRV' })]);
      }
      return;
    }
    // Seat class tool
    if (existing) {
      setSeats(prev => prev.map(s => s.id === existing.id
        ? { ...s, seat_class: tool, is_aisle_gap: false, is_driver_seat: false }
        : s));
    } else {
      const seat = newSeat(row, col, tool);
      setSeats(prev => [...prev, seat]);
    }
  };

  const updateSelected = (field, value) => {
    setSeats(prev => prev.map(s => s.id === selected ? { ...s, [field]: value } : s));
  };

  const handleDragStart = (seat) => { dragSeat.current = seat; };
  const handleDrop = (row, col) => {
    if (!dragSeat.current) return;
    const targetOccupant = getCell(row, col);
    setSeats(prev => prev.map(s => {
      if (s.id === dragSeat.current.id) return { ...s, row_number: row, column_number: col };
      if (targetOccupant && s.id === targetOccupant.id)
        return { ...s, row_number: dragSeat.current.row_number, column_number: dragSeat.current.column_number };
      return s;
    }));
    dragSeat.current = null;
  };

  const autoNumberSeats = () => setSeats(prev => autoNumber(prev));

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveBusLayout(slug, seats);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      alert('Failed to save layout.');
    } finally { setSaving(false); }
  };

  const clearAll = () => { if (confirm('Clear all seats?')) { setSeats([]); setSelected(null); } };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div className="ad-spinner"></div>
    </div>
  );

  const TOOLS = [
    { key: 'select', icon: 'bi-cursor', label: 'Select' },
    { key: 'economy', icon: 'bi-square-fill', label: 'Economy', color: CLASS_COLORS.economy },
    { key: 'business', icon: 'bi-square-fill', label: 'Business', color: CLASS_COLORS.business },
    { key: 'vip', icon: 'bi-square-fill', label: 'VIP', color: CLASS_COLORS.vip },
    { key: 'aisle', icon: 'bi-grip-horizontal', label: 'Aisle Gap' },
    { key: 'driver', icon: 'bi-person-fill', label: 'Driver Seat', color: CLASS_COLORS.driver },
    { key: 'delete', icon: 'bi-eraser-fill', label: 'Erase', color: '#dc2626' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="d-flex align-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <button className="btn-ad btn-ad-ghost btn-ad-sm mb-1" onClick={() => navigate('/admin-panel/buses')}>
            <i className="bi bi-arrow-left"></i> Back
          </button>
          <h4 className="fw-800">{bus?.name} — Seat Layout</h4>
          <p className="text-muted" style={{ fontSize: '.8rem' }}>{bus?.plate_number} · {seats.filter(s => !s.is_aisle_gap && !s.is_driver_seat).length} seats</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn-ad btn-ad-secondary" onClick={autoNumberSeats}>
            <i className="bi bi-123"></i> Auto-Number
          </button>
          <button className="btn-ad btn-ad-secondary" onClick={clearAll}>
            <i className="bi bi-trash"></i> Clear
          </button>
          <button className="btn-ad btn-ad-primary" onClick={handleSave} disabled={saving}>
            {saving
              ? <><div className="ad-spinner ad-spinner-sm"></div> Saving...</>
              : saved
              ? <><i className="bi bi-check-lg"></i> Saved!</>
              : <><i className="bi bi-floppy"></i> Save Layout</>
            }
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '1rem', alignItems: 'start' }}>

        {/* Canvas side */}
        <div>
          {/* Toolbar */}
          <div className="seat-toolbar">
            {TOOLS.map(t => (
              <button key={t.key} className={`seat-tool-btn${tool === t.key ? ' active' : ''}`}
                onClick={() => setTool(t.key)}>
                <i className={`bi ${t.icon}`} style={{ color: t.color }}></i>
                {t.label}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '.5rem', alignItems: 'center' }}>
              <label style={{ fontSize: '.75rem', color: 'var(--ad-text-muted)' }}>Rows</label>
              <input type="number" className="ad-input" min={1} max={30} value={rows}
                onChange={e => setRows(Number(e.target.value))}
                style={{ width: 60, padding: '.3rem .5rem', fontSize: '.8rem' }} />
              <label style={{ fontSize: '.75rem', color: 'var(--ad-text-muted)' }}>Cols</label>
              <input type="number" className="ad-input" min={1} max={10} value={cols}
                onChange={e => setCols(Number(e.target.value))}
                style={{ width: 60, padding: '.3rem .5rem', fontSize: '.8rem' }} />
            </div>
          </div>

          {/* Bus canvas */}
          <div className="seat-editor-canvas">
            {/* Bus front indicator */}
            <div style={{
              background: '#e9ecef', borderRadius: '40px 40px 0 0',
              padding: '.4rem 1rem', marginBottom: 8,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: '.72rem', fontWeight: 600, color: '#6b7280',
            }}>
              <span>🚌</span>
              <span style={{ color: 'var(--ad-red)', fontWeight: 700 }}>FRONT / ENGINE</span>
              <span style={{ opacity: .5 }}>← drag to rearrange →</span>
            </div>

            {/* Grid */}
            {Array.from({ length: rows }, (_, ri) => ri + 1).map(row => (
              <div className="seat-editor-row" key={row}>
                <span style={{ width: 22, fontSize: '.65rem', color: '#aaa', textAlign: 'right', flexShrink: 0 }}>{row}</span>
                {Array.from({ length: cols }, (_, ci) => ci + 1).map(col => {
                  const seat = getCell(row, col);
                  const isSelected = seat?.id === selected;

                  if (!seat) {
                    return (
                      <div
                        key={col}
                        style={{
                          width: 44, height: 44, borderRadius: 6, flexShrink: 0,
                          background: '#e5e7eb', opacity: .3,
                          border: '2px dashed #d1d5db',
                          cursor: tool === 'select' ? 'default' : 'crosshair',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        onClick={() => handleCellClick(row, col)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => handleDrop(row, col)}
                      />
                    );
                  }

                  const bg = seat.bg_color || (
                    seat.is_driver_seat ? CLASS_COLORS.driver :
                    seat.is_aisle_gap ? 'transparent' :
                    CLASS_COLORS[seat.seat_class]
                  );
                  const color = seat.text_color || (
                    seat.is_driver_seat ? '#fff' :
                    seat.is_aisle_gap ? '#9ca3af' :
                    CLASS_TEXT[seat.seat_class]
                  );

                  return (
                    <div
                      key={col}
                      className={`seat-editor-cell${isSelected ? ' selected-cell' : ''}${seat.is_aisle_gap ? ' aisle' : ''}`}
                      style={{
                        background: bg,
                        color,
                        border: seat.is_aisle_gap ? '2px dashed #d1d5db' : isSelected ? '2px solid #fff' : 'none',
                        boxShadow: isSelected ? '0 0 0 3px var(--ad-red)' : 'none',
                        cursor: seat.is_aisle_gap ? 'crosshair' : 'grab',
                        width: 44 + (seat.extra_padding || 0),
                        height: 44 + (seat.extra_padding || 0),
                      }}
                      draggable={!seat.is_aisle_gap}
                      onDragStart={() => handleDragStart(seat)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => handleDrop(row, col)}
                      onClick={() => handleCellClick(row, col)}
                      title={seat.seat_number || (seat.is_driver_seat ? 'Driver' : seat.is_aisle_gap ? 'Aisle' : '')}
                    >
                      {seat.is_driver_seat ? <i className="bi bi-person-fill" style={{ fontSize: '.85rem' }}></i> :
                       seat.is_aisle_gap ? <i className="bi bi-grip-horizontal" style={{ fontSize: '.7rem', opacity: .5 }}></i> : (
                        <>
                          <span style={{ fontSize: '.52rem', opacity: .75 }}>
                            {seat.custom_label || seat.seat_class?.slice(0, 3).toUpperCase()}
                          </span>
                          <span style={{ fontWeight: 800, fontSize: '.68rem' }}>{seat.seat_number}</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Bus rear */}
            <div style={{
              background: '#e9ecef', borderRadius: '0 0 8px 8px',
              textAlign: 'center', padding: '.35rem',
              fontSize: '.7rem', fontWeight: 600, color: '#6b7280', marginTop: 6,
            }}>← REAR →</div>
          </div>

          {/* Legend */}
          <div className="d-flex gap-3 flex-wrap mt-2" style={{ fontSize: '.75rem', color: 'var(--ad-text-muted)' }}>
            {Object.entries(CLASS_COLORS).filter(([k]) => k !== 'aisle').map(([cls, color]) => (
              <span key={cls} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: color, display: 'inline-block' }}></span>
                {cls.charAt(0).toUpperCase() + cls.slice(1)}
              </span>
            ))}
          </div>
        </div>

        {/* Properties panel */}
        <div>
          <div className="seat-props-panel">
            <div style={{ fontWeight: 700, marginBottom: '.75rem', fontSize: '.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="bi bi-sliders" style={{ color: 'var(--ad-red)' }}></i>
              {selectedSeat ? `Seat Properties` : 'Properties'}
            </div>

            {!selectedSeat ? (
              <div style={{ color: 'var(--ad-text-muted)', fontSize: '.8rem', textAlign: 'center', padding: '1rem 0' }}>
                <i className="bi bi-cursor" style={{ fontSize: '1.5rem', display: 'block', marginBottom: 6 }}></i>
                Select a seat to edit its properties
              </div>
            ) : (
              <>
                <div className="ad-form-group">
                  <label className="ad-label">Seat Number</label>
                  <input className="ad-input" value={selectedSeat.seat_number}
                    onChange={e => updateSelected('seat_number', e.target.value)} />
                </div>
                {!selectedSeat.is_aisle_gap && !selectedSeat.is_driver_seat && (
                  <>
                    <div className="ad-form-group">
                      <label className="ad-label">Class</label>
                      <select className="ad-select" value={selectedSeat.seat_class}
                        onChange={e => updateSelected('seat_class', e.target.value)}>
                        {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                      </select>
                    </div>
                    <div className="ad-form-group">
                      <label className="ad-label">Custom Label (override class abbr)</label>
                      <input className="ad-input" value={selectedSeat.custom_label}
                        onChange={e => updateSelected('custom_label', e.target.value)}
                        placeholder="e.g. VIP+" />
                    </div>
                    <div className="ad-form-group">
                      <label className="ad-label">Extra Size (px padding)</label>
                      <input className="ad-input" type="number" min={0} max={20} value={selectedSeat.extra_padding}
                        onChange={e => updateSelected('extra_padding', Number(e.target.value))} />
                    </div>
                    <div className="ad-form-group">
                      <label className="ad-label">Override BG Color</label>
                      <div className="d-flex gap-2">
                        <input className="ad-input" value={selectedSeat.bg_color} placeholder="#RRGGBB"
                          onChange={e => updateSelected('bg_color', e.target.value)} />
                        <input type="color" value={selectedSeat.bg_color || '#ffffff'}
                          onChange={e => updateSelected('bg_color', e.target.value)}
                          style={{ width: 36, height: 36, border: '1px solid var(--ad-border)', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                      </div>
                    </div>
                    <div className="ad-form-group">
                      <label className="ad-label">Override Text Color</label>
                      <div className="d-flex gap-2">
                        <input className="ad-input" value={selectedSeat.text_color} placeholder="#RRGGBB"
                          onChange={e => updateSelected('text_color', e.target.value)} />
                        <input type="color" value={selectedSeat.text_color || '#000000'}
                          onChange={e => updateSelected('text_color', e.target.value)}
                          style={{ width: 36, height: 36, border: '1px solid var(--ad-border)', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                      </div>
                    </div>
                    <div className="ad-form-group">
                      <label className="ad-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" className="ad-checkbox" checked={selectedSeat.is_active}
                          onChange={e => updateSelected('is_active', e.target.checked)} />
                        Seat Active
                      </label>
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', gap: '.5rem' }}>
                  <button className="btn-ad btn-ad-ghost btn-ad-sm" onClick={() => setSelected(null)} style={{ flex: 1, justifyContent: 'center' }}>
                    Deselect
                  </button>
                  <button className="btn-ad btn-ad-danger btn-ad-sm" style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => { setSeats(prev => prev.filter(s => s.id !== selected)); setSelected(null); }}>
                    <i className="bi bi-trash"></i> Remove
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Summary */}
          <div className="seat-props-panel mt-3">
            <div style={{ fontWeight: 700, marginBottom: '.6rem', fontSize: '.85rem' }}>
              <i className="bi bi-bar-chart-fill" style={{ color: 'var(--ad-red)', marginRight: 6 }}></i>Layout Summary
            </div>
            {[
              ['VIP', seats.filter(s => s.seat_class === 'vip' && !s.is_aisle_gap && !s.is_driver_seat).length, CLASS_COLORS.vip],
              ['Business', seats.filter(s => s.seat_class === 'business' && !s.is_aisle_gap && !s.is_driver_seat).length, CLASS_COLORS.business],
              ['Economy', seats.filter(s => s.seat_class === 'economy' && !s.is_aisle_gap && !s.is_driver_seat).length, CLASS_COLORS.economy],
              ['Aisle Gaps', seats.filter(s => s.is_aisle_gap).length, '#9ca3af'],
              ['Total Seats', seats.filter(s => !s.is_aisle_gap && !s.is_driver_seat).length, 'var(--ad-text)'],
            ].map(([label, count, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.3rem 0', fontSize: '.8rem', borderBottom: '1px solid var(--ad-border)' }}>
                <span style={{ color: 'var(--ad-text-muted)' }}>{label}</span>
                <span style={{ fontWeight: 700, color }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}