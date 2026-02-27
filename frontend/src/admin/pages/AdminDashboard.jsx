/**
 * AdminDashboard.jsx  –  Stats cards + revenue chart + recent bookings
 * Uses recharts for the chart (already in your deps via the public site, or add: npm i recharts)
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { getDashboardStats, getRevenueChart, getBookingsByRoute, getBookingsAdmin } from '../admin_api';

const fmt = (n) => Number(n || 0).toLocaleString();
const fmtKES = (n) => `KES ${fmt(n)}`;

const STAT_CARDS = (s) => [
  {
    label: 'Total Revenue',
    value: fmtKES(s.total_revenue),
    sub: `This month: ${fmtKES(s.revenue_this_month)}`,
    icon: 'bi-cash-stack',
    color: '#16a34a',
    bg: '#dcfce7',
  },
  {
    label: 'Total Bookings',
    value: fmt(s.total_bookings),
    sub: `Confirmed: ${fmt(s.confirmed_bookings)}`,
    icon: 'bi-ticket-perforated-fill',
    color: '#2563eb',
    bg: '#dbeafe',
  },
  {
    label: "Today's Trips",
    value: fmt(s.trips_today),
    sub: `Total trips: ${fmt(s.total_trips)}`,
    icon: 'bi-calendar3',
    color: '#d97706',
    bg: '#fef3c7',
  },
  {
    label: 'Active Buses',
    value: fmt(s.active_buses),
    sub: `Passengers served: ${fmt(s.total_passengers)}`,
    icon: 'bi-bus-front-fill',
    color: '#cc0000',
    bg: '#fee2e2',
  },
  {
    label: "Today's Revenue",
    value: fmtKES(s.revenue_today),
    sub: `This week: ${fmtKES(s.revenue_this_week)}`,
    icon: 'bi-graph-up-arrow',
    color: '#7c3aed',
    bg: '#ede9fe',
  },
  {
    label: 'Pending Bookings',
    value: fmt(s.pending_bookings),
    sub: `Cancelled: ${fmt(s.cancelled_bookings)}`,
    icon: 'bi-hourglass-split',
    color: '#ca8a04',
    bg: '#fef9c3',
  },
];

const COLORS = ['#CC0000', '#2563EB', '#16a34a', '#D4A017', '#7c3aed', '#d97706'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [chartData, setChartData] = useState([]);
  const [routeData, setRouteData] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [chartDays, setChartDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, chart, routes, bookings] = await Promise.all([
        getDashboardStats(),
        getRevenueChart(chartDays),
        getBookingsByRoute(),
        getBookingsAdmin({ page_size: 8, ordering: '-created_at' }),
      ]);
      setStats(s);
      setChartData(chart.map(d => ({
        date: new Date(d.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
        revenue: Number(d.revenue || 0),
        bookings: d.bookings,
      })));
      setRouteData(routes.slice(0, 6));
      setRecentBookings(bookings.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [chartDays]);

  const statusBadge = (s) => {
    const map = { confirmed: 'badge-confirmed', pending: 'badge-pending', cancelled: 'badge-cancelled' };
    return <span className={`badge ${map[s] || 'badge-pending'}`}>{s}</span>;
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div className="ad-spinner"></div>
    </div>
  );

  const cards = STAT_CARDS(stats);

  return (
    <div>
      {/* Page header */}
      <div className="d-flex align-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <h4 className="fw-800" style={{ marginBottom: 2 }}>Dashboard Overview</h4>
          <p className="text-muted" style={{ fontSize: '.82rem' }}>
            {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button className="btn-ad btn-ad-secondary" onClick={loadAll}>
          <i className="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {cards.map((c, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-icon" style={{ background: c.bg, color: c.color }}>
              <i className={`bi ${c.icon}`}></i>
            </div>
            <div>
              <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
              <div className="stat-label">{c.label}</div>
              <div className="stat-change text-muted" style={{ fontSize: '.7rem', marginTop: 3 }}>{c.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 380px)', gap: '1rem', marginBottom: '1.5rem' }}>

        {/* Revenue chart */}
        <div className="ad-card">
          <div className="ad-card-header">
            <span className="ad-card-title">
              <i className="bi bi-graph-up" style={{ color: 'var(--ad-red)' }}></i> Revenue Trend
            </span>
            <div className="d-flex gap-1">
              {[7, 14, 30, 90].map(d => (
                <button
                  key={d}
                  className={`btn-ad btn-ad-sm ${chartDays === d ? 'btn-ad-primary' : 'btn-ad-secondary'}`}
                  onClick={() => setChartDays(d)}
                >{d}d</button>
              ))}
            </div>
          </div>
          <div className="ad-card-body">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#CC0000" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#CC0000" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  formatter={(v) => [`KES ${v.toLocaleString()}`, 'Revenue']}
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e8eaef' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#CC0000" strokeWidth={2}
                  fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bookings by Route pie */}
        <div className="ad-card">
          <div className="ad-card-header">
            <span className="ad-card-title">
              <i className="bi bi-pie-chart-fill" style={{ color: 'var(--ad-red)' }}></i> Top Routes
            </span>
          </div>
          <div className="ad-card-body">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={routeData}
                  dataKey="count"
                  nameKey="route"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={3}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {routeData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, n, p) => [v, p.payload.route]}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Legend
                  formatter={(value, entry) => entry.payload.route}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bookings bar chart */}
      <div className="ad-card mb-4">
        <div className="ad-card-header">
          <span className="ad-card-title">
            <i className="bi bi-bar-chart-fill" style={{ color: 'var(--ad-red)' }}></i> Daily Bookings
          </span>
        </div>
        <div className="ad-card-body">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData.slice(-14)} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="bookings" fill="#CC0000" radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="ad-card">
        <div className="ad-card-header">
          <span className="ad-card-title">
            <i className="bi bi-clock-history" style={{ color: 'var(--ad-red)' }}></i> Recent Bookings
          </span>
          <button className="btn-ad btn-ad-secondary btn-ad-sm" onClick={() => navigate('/admin-panel/bookings')}>
            View All <i className="bi bi-arrow-right"></i>
          </button>
        </div>
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Passenger</th>
                <th>Route</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted" style={{ padding: '2rem' }}>No bookings yet</td></tr>
              ) : recentBookings.map(b => (
                <tr key={b.reference} style={{ cursor: 'pointer' }}
                  onClick={() => navigate('/admin-panel/bookings')}>
                  <td><span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '.8rem' }}>{b.reference}</span></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{b.passenger_name}</div>
                    <div style={{ fontSize: '.72rem', color: 'var(--ad-text-muted)' }}>{b.passenger_phone}</div>
                  </td>
                  <td style={{ fontSize: '.8rem' }}>{b.route}</td>
                  <td style={{ fontSize: '.8rem' }}>
                    {b.departure_date} <span className="text-muted">{b.departure_time?.slice(0, 5)}</span>
                  </td>
                  <td style={{ fontWeight: 700 }}>KES {Number(b.total_amount).toLocaleString()}</td>
                  <td>{statusBadge(b.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}