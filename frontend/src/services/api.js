import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ── Cities ──────────────────────────────────────────────
export const getCities = () => api.get('/cities/').then(r => r.data);

// ── Trip Search ──────────────────────────────────────────
export const searchTrips = (origin, destination, date) =>
  api.get('/trips/search/', { params: { origin, destination, date } }).then(r => r.data);

export const getTripDetail = (slug) =>
  api.get(`/trips/${slug}/`).then(r => r.data);

// ── Boarding Points ──────────────────────────────────────
export const getBoardingPoints = (citySlug) =>
  api.get('/boarding-points/', { params: { city__slug: citySlug } }).then(r => r.data);

// ── Booking ──────────────────────────────────────────────
export const createBooking = (data) =>
  api.post('/bookings/', data).then(r => r.data);

export const trackBooking = (reference) =>
  api.get(`/bookings/track/${reference}/`).then(r => r.data);

export const cancelBooking = (slug) =>
  api.post(`/bookings/${slug}/cancel/`).then(r => r.data);

// ── Payment ──────────────────────────────────────────────
export const initiatePayment = (bookingReference, phoneNumber) =>
  api.post('/payments/initiate/', { booking_reference: bookingReference, phone_number: phoneNumber })
    .then(r => r.data);

export const getPaymentStatus = (bookingRef) =>
  api.get(`/payments/status/${bookingRef}/`).then(r => r.data);

// ── Jobs ──────────────────────────────────────────────────
export const getJobs = () => api.get('/jobs/').then(r => r.data);

export default api;