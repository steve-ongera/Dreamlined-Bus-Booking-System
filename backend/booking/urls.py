# booking/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    # Public viewsets
    CityViewSet, BusTypeViewSet, BusViewSet, RouteViewSet,
    BoardingPointViewSet, TripViewSet, BookingViewSet, JobPostingViewSet,
    # Payment APIViews
    PaymentInitiateView, PaymentCallbackView, PaymentStatusView,
    # Seat locking
    SeatLockView, SeatStatusView,
    # Admin
    AdminLoginView, AdminMeView, AdminUserViewSet,
    DashboardView, RevenueChartView, BookingsByRouteView,
    AdminCityViewSet, AdminBusTypeViewSet, AdminBusViewSet,
    AdminRouteViewSet, AdminBoardingPointViewSet,
    AdminTripViewSet, AdminBookingViewSet, AdminJobPostingViewSet,
)

# ── Public router ─────────────────────────────────────────────────────────────
public_router = DefaultRouter()
public_router.register(r'cities',          CityViewSet,          basename='city')
public_router.register(r'bus-types',       BusTypeViewSet,       basename='bus-type')
public_router.register(r'buses',           BusViewSet,           basename='bus')
public_router.register(r'routes',          RouteViewSet,         basename='route')
public_router.register(r'boarding-points', BoardingPointViewSet, basename='boarding-point')
public_router.register(r'trips',           TripViewSet,          basename='trip')
public_router.register(r'bookings',        BookingViewSet,       basename='booking')
public_router.register(r'jobs',            JobPostingViewSet,    basename='job')

# ── Admin router ──────────────────────────────────────────────────────────────
admin_router = DefaultRouter()
admin_router.register(r'users',           AdminUserViewSet,          basename='admin-users')
admin_router.register(r'cities',          AdminCityViewSet,          basename='admin-cities')
admin_router.register(r'bus-types',       AdminBusTypeViewSet,       basename='admin-bus-types')
admin_router.register(r'buses',           AdminBusViewSet,           basename='admin-buses')
admin_router.register(r'routes',          AdminRouteViewSet,         basename='admin-routes')
admin_router.register(r'boarding-points', AdminBoardingPointViewSet, basename='admin-boarding-points')
admin_router.register(r'trips',           AdminTripViewSet,          basename='admin-trips')
admin_router.register(r'bookings',        AdminBookingViewSet,       basename='admin-bookings')
admin_router.register(r'jobs',            AdminJobPostingViewSet,    basename='admin-jobs')

# ── Admin URL patterns ────────────────────────────────────────────────────────
admin_urlpatterns = [
    path('auth/login/',                  AdminLoginView.as_view(),          name='admin-login'),
    path('auth/refresh/',                TokenRefreshView.as_view(),        name='admin-token-refresh'),
    path('auth/me/',                     AdminMeView.as_view(),             name='admin-me'),
    path('dashboard/stats/',             DashboardView.as_view(),           name='admin-dashboard-stats'),
    path('dashboard/revenue-chart/',     RevenueChartView.as_view(),        name='admin-revenue-chart'),
    path('dashboard/bookings-by-route/', BookingsByRouteView.as_view(),     name='admin-bookings-by-route'),
    path('', include(admin_router.urls)),
]

# ── Root urlpatterns ──────────────────────────────────────────────────────────
urlpatterns = [
    # Admin API  →  /api/v1/admin-api/...
    path('admin-api/', include(admin_urlpatterns)),

    # Payments
    path('payments/initiate/',                  PaymentInitiateView.as_view(),  name='payment-initiate'),
    path('payments/callback/',                  PaymentCallbackView.as_view(),  name='payment-callback'),
    path('payments/status/<str:booking_ref>/',  PaymentStatusView.as_view(),    name='payment-status'),

    # Real-time seat locking
    path('trips/<slug:trip_slug>/lock-seats/',  SeatLockView.as_view(),         name='seat-lock'),
    path('trips/<slug:trip_slug>/seat-status/', SeatStatusView.as_view(),       name='seat-status'),

    # Public router  →  /api/v1/...
    path('', include(public_router.urls)),
]