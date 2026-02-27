from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
import requests
import base64
import json
import logging

from .models import (
    City, BusType, Bus, SeatLayout, Route, BoardingPoint,
    Trip, SeatPrice, Booking, BookedSeat, Payment, JobPosting
)
from .serializers import (
    CitySerializer, BusTypeSerializer, BusSerializer, BusListSerializer,
    SeatLayoutSerializer, RouteSerializer, BoardingPointSerializer,
    TripListSerializer, TripDetailSerializer, SeatPriceSerializer,
    BookingCreateSerializer, BookingDetailSerializer,
    PaymentInitSerializer, PaymentStatusSerializer, JobPostingSerializer
)

logger = logging.getLogger(__name__)


class CityViewSet(viewsets.ModelViewSet):
    queryset = City.objects.filter(is_active=True)
    serializer_class = CitySerializer
    lookup_field = 'slug'
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAdminUser()]


class BusTypeViewSet(viewsets.ModelViewSet):
    queryset = BusType.objects.all()
    serializer_class = BusTypeSerializer
    lookup_field = 'slug'

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAdminUser()]


class BusViewSet(viewsets.ModelViewSet):
    queryset = Bus.objects.filter(is_active=True).select_related('bus_type').prefetch_related('seats')
    lookup_field = 'slug'
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'plate_number']

    def get_serializer_class(self):
        if self.action == 'list':
            return BusListSerializer
        return BusSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAdminUser()]

    @action(detail=True, methods=['patch'], url_path='update-seat', permission_classes=[IsAdminUser])
    def update_seat(self, request, slug=None):
        """Admin: Update individual seat properties via keyword commands"""
        bus = self.get_object()
        seat_number = request.data.get('seat_number')
        updates = request.data.get('updates', {})

        # Keyword commands: e.g. {"color": "#FFD700", "class": "vip", "label": "VIP1", "padding": 8}
        ALLOWED_UPDATES = {
            'color': 'bg_color',
            'text_color': 'text_color',
            'class': 'seat_class',
            'label': 'custom_label',
            'padding': 'extra_padding',
            'active': 'is_active',
            'row_span': 'row_span',
            'col_span': 'col_span',
        }

        try:
            seat = bus.seats.get(seat_number=seat_number)
        except SeatLayout.DoesNotExist:
            return Response({'error': 'Seat not found'}, status=404)

        for key, value in updates.items():
            if key in ALLOWED_UPDATES:
                setattr(seat, ALLOWED_UPDATES[key], value)
        seat.save()

        return Response(SeatLayoutSerializer(seat).data)

    @action(detail=True, methods=['post'], url_path='bulk-update-seats', permission_classes=[IsAdminUser])
    def bulk_update_seats(self, request, slug=None):
        """Admin: Bulk update multiple seats"""
        bus = self.get_object()
        seat_updates = request.data.get('seats', [])  # [{"seat_number": "1A", "seat_class": "vip", ...}]

        updated = []
        for update in seat_updates:
            seat_number = update.pop('seat_number', None)
            if seat_number:
                try:
                    seat = bus.seats.get(seat_number=seat_number)
                    for field, value in update.items():
                        if hasattr(seat, field):
                            setattr(seat, field, value)
                    seat.save()
                    updated.append(seat_number)
                except SeatLayout.DoesNotExist:
                    pass

        return Response({'updated': updated})


class RouteViewSet(viewsets.ModelViewSet):
    queryset = Route.objects.filter(is_active=True).select_related('origin', 'destination')
    serializer_class = RouteSerializer
    lookup_field = 'slug'

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAdminUser()]


class BoardingPointViewSet(viewsets.ModelViewSet):
    queryset = BoardingPoint.objects.filter(is_active=True).select_related('city')
    serializer_class = BoardingPointSerializer
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['city__slug']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAdminUser()]


class TripViewSet(viewsets.ModelViewSet):
    queryset = Trip.objects.filter(is_active=True).select_related(
        'route__origin', 'route__destination', 'bus__bus_type'
    ).prefetch_related('seat_prices', 'boarding_points')
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status']
    ordering_fields = ['departure_time', 'departure_date']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TripDetailSerializer
        return TripListSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'search']:
            return [AllowAny()]
        return [IsAdminUser()]

    @action(detail=False, methods=['get'], url_path='search', permission_classes=[AllowAny])
    def search(self, request):
        """Search trips: ?origin=nairobi&destination=mombasa&date=2026-02-27"""
        origin_slug = request.query_params.get('origin')
        destination_slug = request.query_params.get('destination')
        date = request.query_params.get('date')

        if not all([origin_slug, destination_slug, date]):
            return Response(
                {'error': 'origin, destination, and date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        trips = self.queryset.filter(
            route__origin__slug__iexact=origin_slug,
            route__destination__slug__iexact=destination_slug,
            departure_date=date,
            status__in=['scheduled', 'boarding']
        ).order_by('departure_time')

        serializer = TripListSerializer(trips, many=True)
        return Response({'count': trips.count(), 'results': serializer.data})


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    lookup_field = 'slug'
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'create':
            return BookingCreateSerializer
        return BookingDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = BookingCreateSerializer(data=request.data)
        if serializer.is_valid():
            booking = serializer.save()
            detail = BookingDetailSerializer(booking)
            return Response(detail.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='track/(?P<reference>[^/.]+)')
    def track(self, request, reference=None):
        """Track booking by reference number"""
        try:
            booking = Booking.objects.get(reference__iexact=reference)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found'}, status=404)
        serializer = BookingDetailSerializer(booking)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, slug=None):
        booking = self.get_object()
        if booking.status in ['confirmed']:
            booking.status = 'cancelled'
            booking.save()
            return Response({'message': 'Booking cancelled successfully.'})
        return Response({'error': 'Cannot cancel this booking.'}, status=400)


class PaymentViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'], url_path='initiate')
    def initiate(self, request):
        """Initiate M-Pesa STK Push"""
        serializer = PaymentInitSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        booking_ref = serializer.validated_data['booking_reference']
        phone = serializer.validated_data['phone_number']

        try:
            booking = Booking.objects.get(reference__iexact=booking_ref)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found'}, status=404)

        if booking.status == 'confirmed':
            return Response({'error': 'Booking already paid'}, status=400)

        # Format phone: ensure 254 prefix
        phone = phone.strip().replace('+', '').replace(' ', '')
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        elif not phone.startswith('254'):
            phone = '254' + phone

        try:
            access_token = self._get_mpesa_token()
            response = self._stk_push(booking, phone, access_token)

            if response.get('ResponseCode') == '0':
                Payment.objects.update_or_create(
                    booking=booking,
                    defaults={
                        'amount': booking.total_amount,
                        'phone_number': phone,
                        'checkout_request_id': response.get('CheckoutRequestID', ''),
                        'merchant_request_id': response.get('MerchantRequestID', ''),
                        'status': 'pending',
                    }
                )
                return Response({
                    'success': True,
                    'message': 'STK Push sent. Enter M-Pesa PIN on your phone.',
                    'checkout_request_id': response.get('CheckoutRequestID'),
                    'booking_reference': booking_ref,
                })
            else:
                return Response({'error': response.get('errorMessage', 'M-Pesa error')}, status=400)

        except Exception as e:
            logger.error(f"M-Pesa STK error: {e}")
            return Response({'error': 'Payment initiation failed. Try again.'}, status=500)

    @action(detail=False, methods=['post'], url_path='callback')
    def callback(self, request):
        """M-Pesa callback URL"""
        try:
            data = request.data
            stk_callback = data.get('Body', {}).get('stkCallback', {})
            result_code = stk_callback.get('ResultCode')
            checkout_request_id = stk_callback.get('CheckoutRequestID')

            payment = Payment.objects.get(checkout_request_id=checkout_request_id)

            if result_code == 0:
                # Success
                items = {
                    item['Name']: item.get('Value')
                    for item in stk_callback.get('CallbackMetadata', {}).get('Item', [])
                }
                payment.mpesa_receipt_number = str(items.get('MpesaReceiptNumber', ''))
                payment.transaction_date = timezone.now()
                payment.status = 'completed'
                payment.result_code = str(result_code)
                payment.result_desc = stk_callback.get('ResultDesc', '')
                payment.save()

                # Confirm booking
                booking = payment.booking
                booking.status = 'confirmed'
                booking.save()

                # Send ticket email
                self._send_ticket_email(booking)
            else:
                payment.status = 'failed'
                payment.result_code = str(result_code)
                payment.result_desc = stk_callback.get('ResultDesc', '')
                payment.save()

        except Exception as e:
            logger.error(f"M-Pesa callback error: {e}")

        return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})

    @action(detail=False, methods=['get'], url_path='status/(?P<booking_ref>[^/.]+)')
    def payment_status(self, request, booking_ref=None):
        """Poll payment status every 5 seconds from frontend"""
        try:
            booking = Booking.objects.get(reference__iexact=booking_ref)
            payment = booking.payment
            return Response({
                'booking_status': booking.status,
                'payment_status': payment.status,
                'receipt': payment.mpesa_receipt_number,
                'message': payment.result_desc,
            })
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found'}, status=404)
        except Payment.DoesNotExist:
            return Response({'booking_status': booking.status, 'payment_status': 'not_initiated'})

    def _get_mpesa_token(self):
        consumer_key = settings.MPESA_CONSUMER_KEY
        consumer_secret = settings.MPESA_CONSUMER_SECRET
        credentials = base64.b64encode(f"{consumer_key}:{consumer_secret}".encode()).decode()
        response = requests.get(
            'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
            headers={'Authorization': f'Basic {credentials}'}
        )
        return response.json().get('access_token')

    def _stk_push(self, booking, phone, access_token):
        timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
        shortcode = settings.MPESA_SHORTCODE
        passkey = settings.MPESA_PASSKEY
        password = base64.b64encode(
            f"{shortcode}{passkey}{timestamp}".encode()
        ).decode()

        payload = {
            "BusinessShortCode": shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(booking.total_amount),
            "PartyA": phone,
            "PartyB": shortcode,
            "PhoneNumber": phone,
            "CallBackURL": settings.MPESA_CALLBACK_URL,
            "AccountReference": booking.reference,
            "TransactionDesc": f"Dreamline Bus Ticket {booking.reference}",
        }
        response = requests.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            json=payload,
            headers={'Authorization': f'Bearer {access_token}'}
        )
        return response.json()

    def _send_ticket_email(self, booking):
        try:
            seats = booking.booked_seats.select_related('seat').all()
            seat_list = ', '.join([bs.seat.seat_number for bs in seats])
            html = f"""
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
              <div style="background:#CC0000;color:white;padding:20px;text-align:center;">
                <h1>Dreamline Bus Ticket</h1>
              </div>
              <div style="padding:20px;">
                <h2>Booking Confirmed!</h2>
                <p><strong>Reference:</strong> {booking.reference}</p>
                <p><strong>Passenger:</strong> {booking.passenger_name}</p>
                <p><strong>Route:</strong> {booking.trip.route}</p>
                <p><strong>Date:</strong> {booking.trip.departure_date}</p>
                <p><strong>Departure:</strong> {booking.trip.departure_time}</p>
                <p><strong>Seats:</strong> {seat_list}</p>
                <p><strong>Total Paid:</strong> KES {booking.total_amount}</p>
                <p style="background:#f0f0f0;padding:10px;text-align:center;">
                  Track your ticket at: <a href="https://dreamline.co.ke/track/{booking.reference}">
                  dreamline.co.ke/track/{booking.reference}</a>
                </p>
              </div>
            </div>
            """
            send_mail(
                subject=f"Dreamline Ticket - {booking.reference}",
                message=f"Your ticket: {booking.reference}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[booking.passenger_email],
                html_message=html,
                fail_silently=False
            )
            booking.ticket_sent = True
            booking.save(update_fields=['ticket_sent'])
        except Exception as e:
            logger.error(f"Email send failed for {booking.reference}: {e}")


class JobPostingViewSet(viewsets.ModelViewSet):
    queryset = JobPosting.objects.filter(is_active=True)
    serializer_class = JobPostingSerializer
    lookup_field = 'slug'

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAdminUser()]
    
    
    
    
    
    
"""
admin_views.py  –  ViewSets & views for the Dreamline admin dashboard
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser, AllowAny
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Count, Sum, Q, F
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta, date

from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    City, BusType, Bus, SeatLayout, Route, BoardingPoint,
    Trip, SeatPrice, Booking, BookedSeat, Payment, JobPosting
)
from .serializers import (
    AdminLoginSerializer, AdminUserSerializer, AdminUserCreateSerializer,
    DashboardStatsSerializer, RevenueChartSerializer,
    BookingsByRouteSerializer, RecentBookingSerializer,
    AdminCitySerializer, AdminBusTypeSerializer,
    AdminSeatLayoutSerializer, SeatLayoutBulkUpdateSerializer,
    AdminBusSerializer, AdminBusListSerializer,
    AdminRouteSerializer, AdminBoardingPointSerializer,
    AdminSeatPriceSerializer, AdminTripSerializer,
    TripManifestSerializer, AdminBookingSerializer,
    AdminJobPostingSerializer,
)


# ── Mixins ────────────────────────────────────────────────────────────────────

class AdminAuthMixin:
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAdminUser]


# ── Auth ──────────────────────────────────────────────────────────────────────

class AdminLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AdminLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        user = authenticate(
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password']
        )
        if not user:
            return Response({'error': 'Invalid credentials'}, status=401)
        if not user.is_staff:
            return Response({'error': 'Admin access required'}, status=403)

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': AdminUserSerializer(user).data
        })


class AdminMeView(AdminAuthMixin, APIView):
    def get(self, request):
        return Response(AdminUserSerializer(request.user).data)

    def patch(self, request):
        serializer = AdminUserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class AdminUserViewSet(AdminAuthMixin, viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    filter_backends = [filters.SearchFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']

    def get_serializer_class(self):
        if self.action == 'create':
            return AdminUserCreateSerializer
        return AdminUserSerializer

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        return Response({'is_active': user.is_active})

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = request.data.get('password')
        if not new_password or len(new_password) < 8:
            return Response({'error': 'Password must be at least 8 characters'}, status=400)
        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password updated successfully'})


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardView(AdminAuthMixin, APIView):

    def get(self, request):
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        bookings = Booking.objects.all()
        confirmed = bookings.filter(status='confirmed')

        stats = {
            'total_bookings': bookings.count(),
            'confirmed_bookings': confirmed.count(),
            'pending_bookings': bookings.filter(status='pending').count(),
            'cancelled_bookings': bookings.filter(status='cancelled').count(),
            'total_revenue': confirmed.aggregate(t=Sum('total_amount'))['t'] or 0,
            'revenue_today': confirmed.filter(
                trip__departure_date=today).aggregate(t=Sum('total_amount'))['t'] or 0,
            'revenue_this_week': confirmed.filter(
                created_at__date__gte=week_ago).aggregate(t=Sum('total_amount'))['t'] or 0,
            'revenue_this_month': confirmed.filter(
                created_at__date__gte=month_ago).aggregate(t=Sum('total_amount'))['t'] or 0,
            'total_trips': Trip.objects.count(),
            'trips_today': Trip.objects.filter(departure_date=today).count(),
            'active_buses': Bus.objects.filter(is_active=True).count(),
            'total_passengers': BookedSeat.objects.filter(
                booking__status='confirmed').count(),
        }
        return Response(stats)


class RevenueChartView(AdminAuthMixin, APIView):
    def get(self, request):
        days = int(request.query_params.get('days', 30))
        since = timezone.now().date() - timedelta(days=days)

        data = (
            Booking.objects
            .filter(status='confirmed', created_at__date__gte=since)
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(revenue=Sum('total_amount'), bookings=Count('id'))
            .order_by('date')
        )
        return Response(list(data))


class BookingsByRouteView(AdminAuthMixin, APIView):
    def get(self, request):
        data = (
            Booking.objects
            .filter(status='confirmed')
            .values(route=F('trip__route__origin__name'))
            .annotate(
                count=Count('id'),
                revenue=Sum('total_amount'),
                destination=F('trip__route__destination__name')
            )
            .order_by('-count')[:10]
        )
        results = []
        for item in data:
            results.append({
                'route': f"{item['route']} → {item['destination']}",
                'count': item['count'],
                'revenue': item['revenue'] or 0,
            })
        return Response(results)


# ── City ──────────────────────────────────────────────────────────────────────

class AdminCityViewSet(AdminAuthMixin, viewsets.ModelViewSet):
    queryset = City.objects.all().order_by('name')
    serializer_class = AdminCitySerializer
    lookup_field = 'slug'
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']


# ── Bus Type ──────────────────────────────────────────────────────────────────

class AdminBusTypeViewSet(AdminAuthMixin, viewsets.ModelViewSet):
    queryset = BusType.objects.all().order_by('name')
    serializer_class = AdminBusTypeSerializer
    lookup_field = 'slug'


# ── Bus ───────────────────────────────────────────────────────────────────────

from django.db import transaction  # ADD THIS to your imports at the top of admin_views.py

class AdminBusViewSet(AdminAuthMixin, viewsets.ModelViewSet):
    queryset = Bus.objects.all().select_related('bus_type').prefetch_related('seats').order_by('name')
    lookup_field = 'slug'
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['name', 'plate_number']
    filterset_fields = ['is_active']

    def get_serializer_class(self):
        if self.action == 'list':
            return AdminBusListSerializer
        return AdminBusSerializer

    @action(detail=True, methods=['post'], url_path='save-layout')
    def save_layout(self, request, slug=None):
        """
        Save the drag-and-drop seat layout.
        Accepts: { seats: [ {seat_number, seat_class, row_number, column_number,
                              is_aisle_gap, is_driver_seat, bg_color, text_color,
                              custom_label, extra_padding, col_span, row_span} ] }
        Replaces the bus's entire seat layout atomically.
        """
        bus = self.get_object()
        seats_data = request.data.get('seats', [])

        with transaction.atomic():
            bus.seats.all().delete()
            created = []
            seen_numbers = {}

            for s in seats_data:
                seat_number = s.get('seat_number', '').strip()

                # Generate unique fallback for empty or duplicate seat numbers
                if not seat_number or seat_number in seen_numbers:
                    row = s.get('row_number', 0)
                    col = s.get('column_number', 0)
                    if s.get('is_driver_seat'):
                        seat_number = f"DRV-{row}-{col}"
                    elif s.get('is_aisle_gap'):
                        seat_number = f"AISLE-{row}-{col}"
                    else:
                        seat_number = f"SEAT-{row}-{col}"

                seen_numbers[seat_number] = True

                seat = SeatLayout.objects.create(
                    bus=bus,
                    seat_number=seat_number,
                    seat_class=s.get('seat_class', 'economy'),
                    seat_type=s.get('seat_type', 'window'),
                    row_number=s.get('row_number', 1),
                    column_number=s.get('column_number', 1),
                    row_span=s.get('row_span', 1),
                    col_span=s.get('col_span', 1),
                    is_aisle_gap=s.get('is_aisle_gap', False),
                    is_driver_seat=s.get('is_driver_seat', False),
                    bg_color=s.get('bg_color', ''),
                    text_color=s.get('text_color', ''),
                    custom_label=s.get('custom_label', ''),
                    extra_padding=s.get('extra_padding', 0),
                    is_active=s.get('is_active', True),
                )
                created.append(seat.seat_number)

            bus.total_seats = len([
                s for s in seats_data
                if not s.get('is_aisle_gap') and not s.get('is_driver_seat')
            ])
            bus.save(update_fields=['total_seats'])

        return Response({'saved': len(created), 'seats': created})

    @action(detail=True, methods=['patch'], url_path='update-seat')
    def update_seat(self, request, slug=None):
        bus = self.get_object()
        seat_number = request.data.get('seat_number')
        updates = request.data.get('updates', {})
        ALLOWED = {
            'color': 'bg_color', 'text_color': 'text_color',
            'class': 'seat_class', 'label': 'custom_label',
            'padding': 'extra_padding', 'active': 'is_active',
            'row_span': 'row_span', 'col_span': 'col_span',
            'seat_class': 'seat_class', 'bg_color': 'bg_color',
            'custom_label': 'custom_label', 'extra_padding': 'extra_padding',
        }
        try:
            seat = bus.seats.get(seat_number=seat_number)
        except SeatLayout.DoesNotExist:
            return Response({'error': 'Seat not found'}, status=404)

        for key, value in updates.items():
            field = ALLOWED.get(key, key)
            if hasattr(seat, field):
                setattr(seat, field, value)
        seat.save()
        return Response(AdminSeatLayoutSerializer(seat).data)

# ── Route ─────────────────────────────────────────────────────────────────────

class AdminRouteViewSet(AdminAuthMixin, viewsets.ModelViewSet):
    queryset = Route.objects.all().select_related('origin', 'destination').order_by('origin__name')
    serializer_class = AdminRouteSerializer
    lookup_field = 'slug'
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['origin__name', 'destination__name']
    filterset_fields = ['is_active']


# ── Boarding Point ────────────────────────────────────────────────────────────

class AdminBoardingPointViewSet(AdminAuthMixin, viewsets.ModelViewSet):
    queryset = BoardingPoint.objects.all().select_related('city').order_by('city__name', 'name')
    serializer_class = AdminBoardingPointSerializer
    lookup_field = 'slug'
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['name', 'city__name']
    filterset_fields = ['city__slug', 'is_active']


# ── Trip ──────────────────────────────────────────────────────────────────────

class AdminTripViewSet(AdminAuthMixin, viewsets.ModelViewSet):
    queryset = (
        Trip.objects.all()
        .select_related('route__origin', 'route__destination', 'bus__bus_type')
        .prefetch_related('seat_prices', 'boarding_points')
        .order_by('-departure_date', 'departure_time')
    )
    serializer_class = AdminTripSerializer
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['status', 'is_active', 'departure_date']
    search_fields = ['route__origin__name', 'route__destination__name', 'bus__name']
    ordering_fields = ['departure_date', 'departure_time', 'status']

    @action(detail=True, methods=['get'], url_path='manifest')
    def manifest(self, request, slug=None):
        """Full passenger list for a trip — used for printing"""
        trip = self.get_object()
        bookings = trip.bookings.filter(
            status__in=['confirmed', 'pending']
        ).select_related('boarding_point', 'dropping_point').prefetch_related(
            'booked_seats__seat', 'payment'
        ).order_by('created_at')
        serializer = TripManifestSerializer(bookings, many=True)
        trip_data = AdminTripSerializer(trip).data
        return Response({
            'trip': trip_data,
            'passengers': serializer.data,
            'total_passengers': bookings.count(),
        })

    @action(detail=True, methods=['patch'], url_path='update-status')
    def update_status(self, request, slug=None):
        trip = self.get_object()
        new_status = request.data.get('status')
        valid = [c[0] for c in Trip.STATUS_CHOICES]
        if new_status not in valid:
            return Response({'error': f'Invalid status. Choose from: {valid}'}, status=400)
        trip.status = new_status
        trip.save(update_fields=['status'])
        return Response({'status': trip.status})

    @action(detail=True, methods=['post'], url_path='set-prices')
    def set_prices(self, request, slug=None):
        trip = self.get_object()
        prices = request.data.get('seat_prices', [])
        trip.seat_prices.all().delete()
        for p in prices:
            SeatPrice.objects.create(trip=trip, **p)
        return Response(AdminSeatPriceSerializer(trip.seat_prices.all(), many=True).data)


# ── Booking ───────────────────────────────────────────────────────────────────

class AdminBookingViewSet(AdminAuthMixin, viewsets.ModelViewSet):
    queryset = (
        Booking.objects.all()
        .select_related('trip__route__origin', 'trip__route__destination', 'trip__bus')
        .prefetch_related('booked_seats__seat')
        .order_by('-created_at')
    )
    serializer_class = AdminBookingSerializer
    lookup_field = 'reference'
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'trip__departure_date']
    search_fields = ['reference', 'passenger_name', 'passenger_email', 'passenger_phone']
    ordering_fields = ['created_at', 'total_amount']

    @action(detail=True, methods=['post'])
    def confirm(self, request, reference=None):
        booking = self.get_object()
        booking.status = 'confirmed'
        booking.save()
        return Response({'status': 'confirmed'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, reference=None):
        booking = self.get_object()
        booking.status = 'cancelled'
        booking.save()
        return Response({'status': 'cancelled'})


# ── Job Posting ───────────────────────────────────────────────────────────────

class AdminJobPostingViewSet(AdminAuthMixin, viewsets.ModelViewSet):
    queryset = JobPosting.objects.all().order_by('-created_at')
    serializer_class = AdminJobPostingSerializer
    lookup_field = 'slug'
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['title', 'department', 'location']
    filterset_fields = ['is_active', 'department']