from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CityViewSet, BusTypeViewSet, BusViewSet, RouteViewSet,
    BoardingPointViewSet, TripViewSet, BookingViewSet,
    PaymentViewSet, JobPostingViewSet
)

router = DefaultRouter()
router.register(r'cities', CityViewSet, basename='city')
router.register(r'bus-types', BusTypeViewSet, basename='bus-type')
router.register(r'buses', BusViewSet, basename='bus')
router.register(r'routes', RouteViewSet, basename='route')
router.register(r'boarding-points', BoardingPointViewSet, basename='boarding-point')
router.register(r'trips', TripViewSet, basename='trip')
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'jobs', JobPostingViewSet, basename='job')

urlpatterns = [
    path('', include(router.urls)),
]