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