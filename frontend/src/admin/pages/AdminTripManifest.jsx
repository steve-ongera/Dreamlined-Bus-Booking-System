/**
 * AdminTripManifest.jsx  –  Passenger list for a trip (printable + Excel/PDF export)
 *
 * Extra deps:
 *   npm install xlsx jspdf jspdf-autotable
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTripManifest, confirmBooking, cancelBookingAdmin } from '../admin_api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = n => Number(n || 0).toLocaleString('en-KE');
const pad = v => String(v ?? '—');

/** Flatten a passenger row into a plain object for export */
function flattenPassenger(p, idx) {
  return {
    '#':            idx + 1,
    'Reference':    p.reference,
    'Name':         p.passenger_name,
    'Email':        p.passenger_email,
    'Phone':        p.passenger_phone,
    'ID Number':    p.passenger_id_number,
    'Nationality':  p.passenger_nationality,
    'Seats':        (p.seat_numbers || []).join(', '),
    'Seat Classes': (p.seat_classes || []).join(', '),
    'Boarding':     p.boarding_point_name || '—',
    'Dropping':     p.dropping_point_name || '—',
    'Amount (KES)': Number(p.total_amount || 0),
    'Receipt':      p.payment_receipt || '—',
    'Status':       p.status,
  };
}

/** Build trip metadata rows for the top of the export */
function tripMeta(trip, data) {
  return [
    ['Route',       `${trip.origin} → ${trip.destination}`],
    ['Date',        trip.departure_date],
    ['Departure',   trip.departure_time?.slice(0, 5)],
    ['Arrival',     trip.arrival_time?.slice(0, 5)],
    ['Bus',         trip.bus_name],
    ['Plate',       trip.plate_number || '—'],
    ['Bus Type',    trip.bus_type || '—'],
    ['Amenities',   (trip.amenities || []).join(', ') || '—'],
    ['Total Seats', trip.total_seats || '—'],
    ['Passengers',  data.total_passengers],
    ['Confirmed',   (data.passengers || []).filter(p => p.status === 'confirmed').length],
    ['Pending',     (data.passengers || []).filter(p => p.status === 'pending').length],
    ['Status',      trip.status],
  ];
}

// ─── Excel export ────────────────────────────────────────────────────────────

function exportExcel(trip, data, passengers) {
  const wb = XLSX.utils.book_new();

  /* Sheet 1 – Trip & Bus details */
  const metaRows = tripMeta(trip, data);
  const wsMeta   = XLSX.utils.aoa_to_sheet([
    ['TRIP & BUS DETAILS'],
    [],
    ...metaRows,
  ]);
  wsMeta['!cols'] = [{ wch: 18 }, { wch: 38 }];
  // Style the header cell (xlsx CE doesn't support rich styles without a plugin,
  // but we can at least make it bold-ish by naming it clearly)
  XLSX.utils.book_append_sheet(wb, wsMeta, 'Trip Details');

  /* Sheet 2 – Passenger Manifest */
  const rows     = passengers.map(flattenPassenger);
  const wsPass   = XLSX.utils.json_to_sheet(rows);
  wsPass['!cols'] = [
    { wch: 4 },  // #
    { wch: 14 }, // ref
    { wch: 22 }, // name
    { wch: 26 }, // email
    { wch: 14 }, // phone
    { wch: 14 }, // id
    { wch: 12 }, // nationality
    { wch: 10 }, // seats
    { wch: 16 }, // classes
    { wch: 26 }, // boarding
    { wch: 26 }, // dropping
    { wch: 14 }, // amount
    { wch: 16 }, // receipt
    { wch: 10 }, // status
  ];
  XLSX.utils.book_append_sheet(wb, wsPass, 'Passenger Manifest');

  const filename = `manifest_${trip.origin}_${trip.destination}_${trip.departure_date}.xlsx`
    .replace(/\s+/g, '_');
  XLSX.writeFile(wb, filename);
}

// ─── PDF export ──────────────────────────────────────────────────────────────

function exportPDF(trip, data, passengers) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const RED   = [194, 17, 17];
  const DARK  = [20, 20, 30];
  const GRAY  = [120, 120, 130];
  const WHITE = [255, 255, 255];

  const pageW = doc.internal.pageSize.getWidth();

  /* ── Header band ── */
  doc.setFillColor(...RED);
  doc.rect(0, 0, pageW, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...WHITE);
  doc.text('DREAMLINER  ·  TRIP MANIFEST', 12, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Printed: ${new Date().toLocaleString('en-KE')}`,
    pageW - 12, 14, { align: 'right' }
  );

  /* ── Trip info block ── */
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`${trip.origin}  →  ${trip.destination}`, 12, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  const metaLine1 = [
    trip.departure_date,
    trip.departure_time?.slice(0, 5),
    trip.bus_name,
    trip.plate_number ? `· ${trip.plate_number}` : '',
  ].filter(Boolean).join('  ·  ');
  doc.text(metaLine1, 12, 38);

  const metaLine2 = [
    trip.bus_type ? `Type: ${trip.bus_type}` : '',
    trip.total_seats ? `Seats: ${trip.total_seats}` : '',
    (trip.amenities || []).length ? `Amenities: ${trip.amenities.join(', ')}` : '',
  ].filter(Boolean).join('   |   ');
  if (metaLine2) doc.text(metaLine2, 12, 43);

  /* ── Summary pills ── */
  const pills = [
    { label: 'Total Passengers', value: data.total_passengers, color: [37, 99, 235] },
    { label: 'Confirmed',        value: (data.passengers || []).filter(p => p.status === 'confirmed').length, color: [22, 163, 74] },
    { label: 'Pending',          value: (data.passengers || []).filter(p => p.status === 'pending').length, color: [202, 138, 4] },
    { label: 'Status',           value: trip.status?.toUpperCase(), color: RED },
  ];
  let px = 12;
  pills.forEach(pill => {
    doc.setFillColor(...pill.color.map(c => Math.min(255, c + 180)));
    doc.roundedRect(px, 47, 44, 10, 2, 2, 'F');
    doc.setTextColor(...pill.color);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(pill.label, px + 3, 51.5);
    doc.setFontSize(9);
    doc.text(String(pill.value), px + 3, 55.5);
    px += 47;
  });

  /* ── Passenger table ── */
  const head = [['#', 'Reference', 'Passenger', 'Phone', 'ID Number', 'Nationality', 'Seats', 'Boarding', 'Amount (KES)', 'Receipt', 'Status']];
  const body = passengers.map((p, i) => [
    i + 1,
    p.reference,
    `${p.passenger_name}\n${p.passenger_email || ''}`,
    p.passenger_phone,
    p.passenger_id_number,
    p.passenger_nationality,
    (p.seat_numbers || []).join(', '),
    p.boarding_point_name || '—',
    `KES ${fmt(p.total_amount)}`,
    p.payment_receipt || '—',
    (p.status || '').toUpperCase(),
  ]);

  autoTable(doc, {
    startY:   62,
    head,
    body,
    styles:       { fontSize: 7.2, cellPadding: 2.2, overflow: 'linebreak' },
    headStyles:   { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: {
      0:  { cellWidth: 7,  halign: 'center' },
      1:  { cellWidth: 22, fontStyle: 'bold' },
      2:  { cellWidth: 36 },
      3:  { cellWidth: 22 },
      4:  { cellWidth: 22 },
      5:  { cellWidth: 18 },
      6:  { cellWidth: 16 },
      7:  { cellWidth: 34 },
      8:  { cellWidth: 22, halign: 'right' },
      9:  { cellWidth: 24 },
      10: { cellWidth: 18, halign: 'center' },
    },
    didDrawCell: params => {
      // Colour-code status column
      if (params.section === 'body' && params.column.index === 10) {
        const val = String(params.cell.raw || '').toLowerCase();
        const colors = {
          confirmed: [22, 163, 74],
          pending:   [202, 138, 4],
          cancelled: [220, 38, 38],
          refunded:  [99, 102, 241],
        };
        const c = colors[val];
        if (c) {
          doc.setTextColor(...c);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.text(
            params.cell.raw,
            params.cell.x + params.cell.width / 2,
            params.cell.y + params.cell.height / 2 + 0.8,
            { align: 'center' }
          );
        }
      }
    },
    // Footer on every page
    didDrawPage: ({ pageNumber, pageCount }) => {
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFillColor(...RED);
      doc.rect(0, pageH - 8, pageW, 8, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...WHITE);
      doc.text(
        `${trip.origin} → ${trip.destination}  ·  ${trip.departure_date}  ·  ${trip.bus_name}`,
        12, pageH - 2.5
      );
      doc.text(`Page ${pageNumber} of ${pageCount}`, pageW - 12, pageH - 2.5, { align: 'right' });
    },
  });

  const filename = `manifest_${trip.origin}_${trip.destination}_${trip.departure_date}.pdf`
    .replace(/\s+/g, '_');
  doc.save(filename);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AdminTripManifest() {
  const { slug }     = useParams();
  const navigate     = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [exporting, setExporting] = useState(null); // 'excel' | 'pdf' | null

  const load = async () => {
    setLoading(true);
    try { setData(await getTripManifest(slug)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [slug]);

  /* Filtered passenger list */
  const passengers = (data?.passengers || []).filter(p =>
    !search ||
    p.passenger_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.reference?.toLowerCase().includes(search.toLowerCase()) ||
    p.passenger_phone?.includes(search)
  );

  /* ── Export handlers ── */
  const handleExcel = async () => {
    setExporting('excel');
    try { exportExcel(data.trip, data, data.passengers || []); }
    finally { setExporting(null); }
  };

  const handlePDF = async () => {
    setExporting('pdf');
    try { exportPDF(data.trip, data, data.passengers || []); }
    finally { setExporting(null); }
  };

  // ── Render ──
  if (loading) return (
    <div style={{ textAlign: 'center', padding: '3rem' }}>
      <div className="ad-spinner" style={{ margin: '0 auto' }}></div>
    </div>
  );
  if (!data) return <div className="ad-alert ad-alert-error">Trip not found</div>;

  const trip = data.trip;

  return (
    <div>
      {/* ── Top bar ── */}
      <div className="d-flex align-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <button
            className="btn-ad btn-ad-ghost btn-ad-sm mb-1"
            onClick={() => navigate('/admin-panel/trips')}
          >
            <i className="bi bi-arrow-left"></i> Back
          </button>
          <h4 className="fw-800">{trip.origin} → {trip.destination}</h4>
          <p className="text-muted" style={{ fontSize: '.82rem' }}>
            {trip.departure_date} · {trip.departure_time?.slice(0, 5)} · {trip.bus_name}
            {trip.plate_number ? ` · ${trip.plate_number}` : ''}
            {' · '}{data.total_passengers} passengers
          </p>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          {/* Excel export */}
          <button
            className="btn-ad btn-ad-secondary"
            onClick={handleExcel}
            disabled={!!exporting}
            title="Export full manifest to Excel"
          >
            {exporting === 'excel'
              ? <><i className="bi bi-hourglass-split"></i> Exporting…</>
              : <><i className="bi bi-file-earmark-excel-fill" style={{ color: '#16a34a' }}></i> Export Excel</>
            }
          </button>

          {/* PDF export */}
          <button
            className="btn-ad btn-ad-secondary"
            onClick={handlePDF}
            disabled={!!exporting}
            title="Export printable PDF manifest"
          >
            {exporting === 'pdf'
              ? <><i className="bi bi-hourglass-split"></i> Exporting…</>
              : <><i className="bi bi-file-earmark-pdf-fill" style={{ color: '#dc2626' }}></i> Export PDF</>
            }
          </button>

          <button className="btn-ad btn-ad-secondary" onClick={() => window.print()}>
            <i className="bi bi-printer-fill"></i> Print
          </button>

          <button className="btn-ad btn-ad-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise"></i> Refresh
          </button>
        </div>
      </div>

      {/* ── Bus / Trip details card ── */}
      <div className="ad-card mb-3">
        <div className="ad-card-header">
          <span className="ad-card-title">
            <i className="bi bi-bus-front-fill" style={{ color: 'var(--ad-red)' }}></i> Bus &amp; Trip Details
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '.75rem 1.5rem', padding: '1rem' }}>
          {[
            { label: 'Bus Name',    value: trip.bus_name },
            { label: 'Plate',       value: trip.plate_number },
            { label: 'Bus Type',    value: trip.bus_type },
            { label: 'Total Seats', value: trip.total_seats },
            { label: 'Departure',   value: trip.departure_time?.slice(0, 5) },
            { label: 'Arrival',     value: trip.arrival_time?.slice(0, 5) },
            { label: 'Duration',    value: trip.duration_minutes ? `${trip.duration_minutes} min` : '—' },
            { label: 'Status',      value: trip.status },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: '.7rem', color: 'var(--ad-text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}>{label}</div>
              <div style={{ fontWeight: 700, fontSize: '.88rem', marginTop: 2 }}>{value || '—'}</div>
            </div>
          ))}
          {(trip.amenities || []).length > 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--ad-text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600, marginBottom: 4 }}>Amenities</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {trip.amenities.map(a => (
                  <span key={a} style={{ fontSize: '.72rem', padding: '.15rem .55rem', borderRadius: 20, background: '#dbeafe', color: '#1d4ed8', fontWeight: 600 }}>{a}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Summary pills ── */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {[
          { label: 'Total',     value: data.total_passengers,                                                                  color: '#2563eb', bg: '#dbeafe' },
          { label: 'Confirmed', value: (data.passengers || []).filter(p => p.status === 'confirmed').length,                   color: '#16a34a', bg: '#dcfce7' },
          { label: 'Pending',   value: (data.passengers || []).filter(p => p.status === 'pending').length,                     color: '#ca8a04', bg: '#fef9c3' },
          { label: 'Cancelled', value: (data.passengers || []).filter(p => p.status === 'cancelled').length,                   color: '#dc2626', bg: '#fee2e2' },
          { label: 'Revenue',   value: `KES ${fmt((data.passengers || []).filter(p => p.status === 'confirmed').reduce((s, p) => s + Number(p.total_amount || 0), 0))}`, color: '#7c3aed', bg: '#ede9fe' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, color: s.color, borderRadius: 8, padding: '.5rem 1rem', fontWeight: 700, fontSize: '.85rem' }}>
            {s.label}: {s.value}
          </div>
        ))}
      </div>

      {/* ── Passenger manifest table ── */}
      <div className="ad-card">
        <div className="ad-card-header">
          <span className="ad-card-title">
            <i className="bi bi-people-fill" style={{ color: 'var(--ad-red)' }}></i> Passenger Manifest
          </span>
          <div className="ad-search-wrap">
            <i className="bi bi-search"></i>
            <input
              className="ad-search-input"
              placeholder="Search name, reference, phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
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
                <th>Dropping</th>
                <th>Amount</th>
                <th>Receipt</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {passengers.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center text-muted" style={{ padding: '2rem' }}>
                    No passengers found
                  </td>
                </tr>
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
                          background: p.seat_classes?.[si] === 'vip'      ? '#fef9c3'
                                    : p.seat_classes?.[si] === 'business' ? '#dbeafe' : '#dcfce7',
                          color:      p.seat_classes?.[si] === 'vip'      ? '#ca8a04'
                                    : p.seat_classes?.[si] === 'business' ? '#2563eb' : '#16a34a',
                        }}>{n}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontSize: '.78rem' }}>{p.boarding_point_name || '—'}</td>
                  <td style={{ fontSize: '.78rem' }}>{p.dropping_point_name || '—'}</td>
                  <td style={{ fontWeight: 700, fontSize: '.82rem' }}>KES {fmt(p.total_amount)}</td>
                  <td style={{ fontSize: '.72rem' }}>{p.payment_receipt || '—'}</td>
                  <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>

            {/* Totals footer */}
            {passengers.length > 0 && (
              <tfoot>
                <tr style={{ background: 'var(--ad-bg-subtle, #f8f8fc)', fontWeight: 700 }}>
                  <td colSpan={9} style={{ textAlign: 'right', fontSize: '.8rem', paddingRight: '1rem' }}>
                    Showing {passengers.length} of {data.total_passengers} passengers
                  </td>
                  <td style={{ fontSize: '.82rem' }}>
                    KES {fmt(passengers.reduce((s, p) => s + Number(p.total_amount || 0), 0))}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminTripManifest;