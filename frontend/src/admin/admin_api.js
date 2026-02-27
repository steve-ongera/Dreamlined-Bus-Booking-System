/**
 * admin_api.js  –  Axios client for the Dreamline admin dashboard
 * Admin API base: /api/v1/admin-api/
 */
import axios from 'axios';

const BASE_URL   = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const ADMIN_BASE = `${BASE_URL}/admin-api`;

const adminApi = axios.create({
  baseURL: ADMIN_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ── Token management ─────────────────────────────────────────────────────────
export const getToken    = ()        => localStorage.getItem('dl_admin_access');
export const setTokens   = (a, r)    => { localStorage.setItem('dl_admin_access', a); localStorage.setItem('dl_admin_refresh', r); };
export const clearTokens = ()        => { localStorage.removeItem('dl_admin_access'); localStorage.removeItem('dl_admin_refresh'); };

adminApi.interceptors.request.use(cfg => {
  const token = getToken();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

adminApi.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('dl_admin_refresh');
        const { data } = await axios.post(`${ADMIN_BASE}/auth/refresh/`, { refresh });
        setTokens(data.access, refresh);
        original.headers.Authorization = `Bearer ${data.access}`;
        return adminApi(original);
      } catch {
        clearTokens();
        window.location.href = '/admin-panel/login';
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const adminLogin  = (username, password) => adminApi.post('/auth/login/', { username, password }).then(r => r.data);
export const adminMe     = ()                   => adminApi.get('/auth/me/').then(r => r.data);
export const adminLogout = ()                   => clearTokens();

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboardStats   = ()          => adminApi.get('/dashboard/stats/').then(r => r.data);
export const getRevenueChart     = (days = 30) => adminApi.get('/dashboard/revenue-chart/', { params: { days } }).then(r => r.data);
export const getBookingsByRoute  = ()          => adminApi.get('/dashboard/bookings-by-route/').then(r => r.data);

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsers           = (params = {})       => adminApi.get('/users/', { params }).then(r => r.data);
export const createUser         = (data)              => adminApi.post('/users/', data).then(r => r.data);
export const updateUser         = (id, data)          => adminApi.patch(`/users/${id}/`, data).then(r => r.data);
export const deleteUser         = (id)                => adminApi.delete(`/users/${id}/`).then(r => r.data);
export const toggleUserActive   = (id)                => adminApi.post(`/users/${id}/toggle_active/`).then(r => r.data);
export const resetUserPassword  = (id, password)      => adminApi.post(`/users/${id}/reset_password/`, { password }).then(r => r.data);

// ── Cities ────────────────────────────────────────────────────────────────────
export const getCitiesAdmin = (params = {}) => adminApi.get('/cities/', { params }).then(r => r.data);
export const createCity     = (data)        => adminApi.post('/cities/', data).then(r => r.data);
export const updateCity     = (slug, data)  => adminApi.patch(`/cities/${slug}/`, data).then(r => r.data);
export const deleteCity     = (slug)        => adminApi.delete(`/cities/${slug}/`).then(r => r.data);

// ── Bus Types ─────────────────────────────────────────────────────────────────
export const getBusTypes   = (params = {}) => adminApi.get('/bus-types/', { params }).then(r => r.data);
export const createBusType = (data)        => adminApi.post('/bus-types/', data).then(r => r.data);
export const updateBusType = (slug, data)  => adminApi.patch(`/bus-types/${slug}/`, data).then(r => r.data);
export const deleteBusType = (slug)        => adminApi.delete(`/bus-types/${slug}/`).then(r => r.data);

// ── Buses ─────────────────────────────────────────────────────────────────────
export const getBusesAdmin   = (params = {}) => adminApi.get('/buses/', { params }).then(r => r.data);
export const getBusAdmin     = (slug)        => adminApi.get(`/buses/${slug}/`).then(r => r.data);
export const createBus       = (data)        => adminApi.post('/buses/', data).then(r => r.data);
export const updateBus       = (slug, data)  => adminApi.patch(`/buses/${slug}/`, data).then(r => r.data);
export const deleteBus       = (slug)        => adminApi.delete(`/buses/${slug}/`).then(r => r.data);
export const saveBusLayout   = (slug, seats) => adminApi.post(`/buses/${slug}/save-layout/`, { seats }).then(r => r.data);
export const updateBusSeat   = (slug, seatNumber, updates) =>
  adminApi.patch(`/buses/${slug}/update-seat/`, { seat_number: seatNumber, updates }).then(r => r.data);

// ── Routes ────────────────────────────────────────────────────────────────────
export const getRoutesAdmin = (params = {}) => adminApi.get('/routes/', { params }).then(r => r.data);
export const createRoute    = (data)        => adminApi.post('/routes/', data).then(r => r.data);
export const updateRoute    = (slug, data)  => adminApi.patch(`/routes/${slug}/`, data).then(r => r.data);
export const deleteRoute    = (slug)        => adminApi.delete(`/routes/${slug}/`).then(r => r.data);

// ── Boarding Points ───────────────────────────────────────────────────────────
export const getBoardingPointsAdmin = (params = {}) => adminApi.get('/boarding-points/', { params }).then(r => r.data);
export const createBoardingPoint    = (data)         => adminApi.post('/boarding-points/', data).then(r => r.data);
export const updateBoardingPoint    = (slug, data)   => adminApi.patch(`/boarding-points/${slug}/`, data).then(r => r.data);
export const deleteBoardingPoint    = (slug)         => adminApi.delete(`/boarding-points/${slug}/`).then(r => r.data);

// ── Trips ─────────────────────────────────────────────────────────────────────
export const getTripsAdmin    = (params = {}) => adminApi.get('/trips/', { params }).then(r => r.data);
export const getTripAdmin     = (slug)        => adminApi.get(`/trips/${slug}/`).then(r => r.data);
export const createTrip       = (data)        => adminApi.post('/trips/', data).then(r => r.data);
export const updateTrip       = (slug, data)  => adminApi.patch(`/trips/${slug}/`, data).then(r => r.data);
export const deleteTrip       = (slug)        => adminApi.delete(`/trips/${slug}/`).then(r => r.data);
export const getTripManifest  = (slug)        => adminApi.get(`/trips/${slug}/manifest/`).then(r => r.data);
export const updateTripStatus = (slug, newStatus) =>
  adminApi.patch(`/trips/${slug}/update-status/`, { status: newStatus }).then(r => r.data);
export const setTripPrices    = (slug, seat_prices) =>
  adminApi.post(`/trips/${slug}/set-prices/`, { seat_prices }).then(r => r.data);

// ── Bookings ──────────────────────────────────────────────────────────────────
export const getBookingsAdmin   = (params = {}) => adminApi.get('/bookings/', { params }).then(r => r.data);
export const getBookingAdmin    = (reference)   => adminApi.get(`/bookings/${reference}/`).then(r => r.data);
export const confirmBooking     = (reference)   => adminApi.post(`/bookings/${reference}/confirm/`).then(r => r.data);
export const cancelBookingAdmin = (reference)   => adminApi.post(`/bookings/${reference}/cancel/`).then(r => r.data);

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const getJobsAdmin = (params = {}) => adminApi.get('/jobs/', { params }).then(r => r.data);
export const createJob    = (data)        => adminApi.post('/jobs/', data).then(r => r.data);
export const updateJob    = (slug, data)  => adminApi.patch(`/jobs/${slug}/`, data).then(r => r.data);
export const deleteJob    = (slug)        => adminApi.delete(`/jobs/${slug}/`).then(r => r.data);

export default adminApi;