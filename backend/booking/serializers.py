from rest_framework import serializers
from .models import (
    City, BusType, Bus, SeatLayout, Route, BoardingPoint,
    Trip, SeatPrice, Booking, BookedSeat, Payment, JobPosting
)


class CitySerializer(serializers.ModelSerializer):
    class Meta:
        model = City
        fields = ['id', 'name', 'slug', 'is_active']
        read_only_fields = ['slug']


class BusTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusType
        fields = ['id', 'name', 'slug', 'description']
        read_only_fields = ['slug']


class SeatLayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeatLayout
        fields = [
            'id', 'seat_number', 'seat_class', 'seat_type',
            'row_number', 'column_number', 'row_span', 'col_span',
            'is_aisle_gap', 'is_driver_seat', 'is_active',
            'bg_color', 'text_color', 'custom_label', 'extra_padding'
        ]


class BusSerializer(serializers.ModelSerializer):
    bus_type = BusTypeSerializer(read_only=True)
    bus_type_slug = serializers.SlugRelatedField(
        slug_field='slug', queryset=BusType.objects.all(),
        source='bus_type', write_only=True, required=False
    )
    seats = SeatLayoutSerializer(many=True, read_only=True)

    class Meta:
        model = Bus
        fields = [
            'id', 'name', 'slug', 'bus_type', 'bus_type_slug',
            'plate_number', 'total_seats', 'is_active',
            'amenities', 'layout_config', 'seats',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['slug', 'created_at', 'updated_at']


class BusListSerializer(serializers.ModelSerializer):
    """Lightweight bus serializer for lists"""
    bus_type_name = serializers.CharField(source='bus_type.name', read_only=True)

    class Meta:
        model = Bus
        fields = ['id', 'name', 'slug', 'bus_type_name', 'plate_number', 'total_seats', 'amenities']


class RouteSerializer(serializers.ModelSerializer):
    origin = CitySerializer(read_only=True)
    destination = CitySerializer(read_only=True)
    origin_slug = serializers.SlugRelatedField(
        slug_field='slug', queryset=City.objects.all(),
        source='origin', write_only=True
    )
    destination_slug = serializers.SlugRelatedField(
        slug_field='slug', queryset=City.objects.all(),
        source='destination', write_only=True
    )

    class Meta:
        model = Route
        fields = [
            'id', 'origin', 'destination', 'origin_slug',
            'destination_slug', 'slug', 'distance_km', 'is_active'
        ]
        read_only_fields = ['slug']


class BoardingPointSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source='city.name', read_only=True)

    class Meta:
        model = BoardingPoint
        fields = ['id', 'city', 'city_name', 'name', 'slug', 'address', 'is_active']
        read_only_fields = ['slug']


class SeatPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeatPrice
        fields = ['id', 'seat_class', 'price', 'season']


class TripListSerializer(serializers.ModelSerializer):
    """For search results listing"""
    origin = serializers.CharField(source='route.origin.name', read_only=True)
    destination = serializers.CharField(source='route.destination.name', read_only=True)
    bus_name = serializers.CharField(source='bus.name', read_only=True)
    bus_type = serializers.CharField(source='bus.bus_type.name', read_only=True)
    amenities = serializers.JSONField(source='bus.amenities', read_only=True)
    seat_prices = SeatPriceSerializer(many=True, read_only=True)
    available_seats = serializers.SerializerMethodField()

    class Meta:
        model = Trip
        fields = [
            'id', 'slug', 'origin', 'destination',
            'departure_date', 'departure_time', 'arrival_time', 'duration_minutes',
            'bus_name', 'bus_type', 'amenities', 'seat_prices',
            'available_seats', 'status'
        ]

    def get_available_seats(self, obj):
        total = obj.bus.seats.filter(is_active=True, is_aisle_gap=False, is_driver_seat=False).count()
        booked = BookedSeat.objects.filter(
            booking__trip=obj,
            booking__status__in=['pending', 'confirmed']
        ).count()
        return total - booked


class TripDetailSerializer(TripListSerializer):
    """Full trip detail with bus layout and booked seats"""
    bus_layout = serializers.SerializerMethodField()
    booked_seat_numbers = serializers.SerializerMethodField()
    boarding_points = BoardingPointSerializer(many=True, read_only=True)

    class Meta(TripListSerializer.Meta):
        fields = TripListSerializer.Meta.fields + [
            'bus_layout', 'booked_seat_numbers', 'boarding_points'
        ]

    def get_bus_layout(self, obj):
        seats = obj.bus.seats.all()
        return SeatLayoutSerializer(seats, many=True).data

    def get_booked_seat_numbers(self, obj):
        return list(BookedSeat.objects.filter(
            booking__trip=obj,
            booking__status__in=['pending', 'confirmed']
        ).values_list('seat__seat_number', flat=True))


class BookedSeatSerializer(serializers.ModelSerializer):
    seat_number = serializers.CharField(source='seat.seat_number', read_only=True)
    seat_class = serializers.CharField(source='seat.seat_class', read_only=True)

    class Meta:
        model = BookedSeat
        fields = ['id', 'seat_number', 'seat_class', 'price']


class BookingCreateSerializer(serializers.ModelSerializer):
    seat_numbers = serializers.ListField(
        child=serializers.CharField(), write_only=True
    )
    trip_slug = serializers.SlugRelatedField(
        slug_field='slug', queryset=Trip.objects.all(),
        source='trip', write_only=True
    )
    boarding_point_slug = serializers.SlugRelatedField(
        slug_field='slug', queryset=BoardingPoint.objects.all(),
        source='boarding_point', write_only=True, required=False, allow_null=True
    )
    dropping_point_slug = serializers.SlugRelatedField(
        slug_field='slug', queryset=BoardingPoint.objects.all(),
        source='dropping_point', write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = Booking
        fields = [
            'trip_slug', 'seat_numbers', 'boarding_point_slug', 'dropping_point_slug',
            'passenger_name', 'passenger_email', 'passenger_phone',
            'passenger_id_number', 'passenger_nationality'
        ]

    def validate(self, attrs):
        trip = attrs.get('trip')
        seat_numbers = attrs.get('seat_numbers', [])

        if not seat_numbers:
            raise serializers.ValidationError("At least one seat must be selected.")

        # Validate seats exist on this bus
        seats = SeatLayout.objects.filter(
            bus=trip.bus, seat_number__in=seat_numbers, is_active=True
        )
        if seats.count() != len(seat_numbers):
            raise serializers.ValidationError("One or more seats are invalid.")

        # Check seats not already booked
        already_booked = BookedSeat.objects.filter(
            seat__in=seats,
            booking__trip=trip,
            booking__status__in=['pending', 'confirmed']
        )
        if already_booked.exists():
            booked_nums = already_booked.values_list('seat__seat_number', flat=True)
            raise serializers.ValidationError(
                f"Seats already taken: {', '.join(booked_nums)}"
            )

        attrs['seats'] = seats
        return attrs

    def create(self, validated_data):
        seat_numbers = validated_data.pop('seat_numbers')
        seats = validated_data.pop('seats')
        trip = validated_data['trip']

        # Calculate total amount
        total = 0
        seat_prices = {}
        for price_obj in trip.seat_prices.all():
            seat_prices[price_obj.seat_class] = price_obj.price

        for seat in seats:
            total += seat_prices.get(seat.seat_class, 0)

        validated_data['total_amount'] = total
        booking = Booking.objects.create(**validated_data)

        for seat in seats:
            BookedSeat.objects.create(
                booking=booking,
                seat=seat,
                price=seat_prices.get(seat.seat_class, 0)
            )

        return booking


class BookingDetailSerializer(serializers.ModelSerializer):
    booked_seats = BookedSeatSerializer(many=True, read_only=True)
    trip_info = TripListSerializer(source='trip', read_only=True)
    boarding_point = BoardingPointSerializer(read_only=True)
    dropping_point = BoardingPointSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'reference', 'slug', 'trip_info', 'booked_seats',
            'boarding_point', 'dropping_point',
            'passenger_name', 'passenger_email', 'passenger_phone',
            'passenger_id_number', 'passenger_nationality',
            'total_amount', 'status', 'ticket_sent', 'created_at'
        ]


class PaymentInitSerializer(serializers.Serializer):
    booking_reference = serializers.CharField()
    phone_number = serializers.CharField()


class PaymentStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['status', 'mpesa_receipt_number', 'result_desc', 'updated_at']


class JobPostingSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobPosting
        fields = [
            'id', 'title', 'slug', 'department', 'location',
            'description', 'requirements', 'deadline', 'is_active', 'created_at'
        ]
        read_only_fields = ['slug', 'created_at']
        
        
"""
admin_serializers.py  –  Serializers for the Dreamline admin dashboard
"""
from rest_framework import serializers
from django.contrib.auth.models import User
from django.db.models import Count, Sum, Q
from django.utils import timezone
from datetime import timedelta

from .models import (
    City, BusType, Bus, SeatLayout, Route, BoardingPoint,
    Trip, SeatPrice, Booking, BookedSeat, Payment, JobPosting
)


# ── Auth ────────────────────────────────────────────────────────────────────

class AdminLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'is_staff', 'is_superuser', 'is_active', 'date_joined', 'last_login']
        read_only_fields = ['date_joined', 'last_login']


class AdminUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name',
                  'is_staff', 'is_superuser', 'password', 'confirm_password']

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


# ── Dashboard Stats ──────────────────────────────────────────────────────────

class DashboardStatsSerializer(serializers.Serializer):
    """Summary stats for the dashboard cards"""
    total_bookings = serializers.IntegerField()
    confirmed_bookings = serializers.IntegerField()
    pending_bookings = serializers.IntegerField()
    cancelled_bookings = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    revenue_today = serializers.DecimalField(max_digits=12, decimal_places=2)
    revenue_this_week = serializers.DecimalField(max_digits=12, decimal_places=2)
    revenue_this_month = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_trips = serializers.IntegerField()
    trips_today = serializers.IntegerField()
    active_buses = serializers.IntegerField()
    total_passengers = serializers.IntegerField()


class RevenueChartSerializer(serializers.Serializer):
    """Daily revenue for the last N days"""
    date = serializers.DateField()
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    bookings = serializers.IntegerField()


class BookingsByRouteSerializer(serializers.Serializer):
    route = serializers.CharField()
    count = serializers.IntegerField()
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2)


class RecentBookingSerializer(serializers.ModelSerializer):
    route = serializers.CharField(source='trip.route', read_only=True)
    departure_date = serializers.DateField(source='trip.departure_date', read_only=True)
    departure_time = serializers.TimeField(source='trip.departure_time', read_only=True)
    seat_numbers = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = ['reference', 'passenger_name', 'passenger_email', 'passenger_phone',
                  'route', 'departure_date', 'departure_time',
                  'total_amount', 'status', 'created_at', 'seat_numbers']

    def get_seat_numbers(self, obj):
        return list(obj.booked_seats.values_list('seat__seat_number', flat=True))


# ── City ─────────────────────────────────────────────────────────────────────

class AdminCitySerializer(serializers.ModelSerializer):
    route_count = serializers.SerializerMethodField()

    class Meta:
        model = City
        fields = ['id', 'name', 'slug', 'is_active', 'route_count']
        read_only_fields = ['slug']

    def get_route_count(self, obj):
        return obj.departing_routes.count() + obj.arriving_routes.count()


# ── Bus Type ──────────────────────────────────────────────────────────────────

class AdminBusTypeSerializer(serializers.ModelSerializer):
    bus_count = serializers.SerializerMethodField()

    class Meta:
        model = BusType
        fields = ['id', 'name', 'slug', 'description', 'bus_count']
        read_only_fields = ['slug']

    def get_bus_count(self, obj):
        return obj.buses.count()


# ── Seat Layout ───────────────────────────────────────────────────────────────

class AdminSeatLayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeatLayout
        fields = [
            'id', 'seat_number', 'seat_class', 'seat_type',
            'row_number', 'column_number', 'row_span', 'col_span',
            'is_aisle_gap', 'is_driver_seat', 'is_active',
            'bg_color', 'text_color', 'custom_label', 'extra_padding'
        ]


class SeatLayoutBulkUpdateSerializer(serializers.Serializer):
    """Accepts the full seat map array from the drag-and-drop editor"""
    seats = serializers.ListField(child=serializers.DictField())


# ── Bus ───────────────────────────────────────────────────────────────────────

class AdminBusSerializer(serializers.ModelSerializer):
    bus_type_name = serializers.CharField(source='bus_type.name', read_only=True)
    bus_type_id = serializers.PrimaryKeyRelatedField(
        queryset=BusType.objects.all(), source='bus_type', write_only=True, required=False
    )
    seats = AdminSeatLayoutSerializer(many=True, read_only=True)
    trip_count = serializers.SerializerMethodField()
    seat_count = serializers.SerializerMethodField()

    class Meta:
        model = Bus
        fields = [
            'id', 'name', 'slug', 'bus_type', 'bus_type_name', 'bus_type_id',
            'plate_number', 'total_seats', 'is_active',
            'amenities', 'layout_config', 'seats',
            'trip_count', 'seat_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['slug', 'bus_type', 'created_at', 'updated_at']

    def get_trip_count(self, obj):
        return obj.trips.count()

    def get_seat_count(self, obj):
        return obj.seats.filter(is_aisle_gap=False, is_driver_seat=False).count()


class AdminBusListSerializer(serializers.ModelSerializer):
    bus_type_name = serializers.CharField(source='bus_type.name', read_only=True)
    seat_count = serializers.SerializerMethodField()
    trip_count = serializers.SerializerMethodField()

    class Meta:
        model = Bus
        fields = ['id', 'name', 'slug', 'bus_type_name', 'plate_number',
                  'total_seats', 'seat_count', 'trip_count', 'is_active', 'amenities']

    def get_seat_count(self, obj):
        return obj.seats.filter(is_aisle_gap=False, is_driver_seat=False).count()

    def get_trip_count(self, obj):
        return obj.trips.count()


# ── Route ─────────────────────────────────────────────────────────────────────

class AdminRouteSerializer(serializers.ModelSerializer):
    origin_name = serializers.CharField(source='origin.name', read_only=True)
    destination_name = serializers.CharField(source='destination.name', read_only=True)
    origin_id = serializers.PrimaryKeyRelatedField(
        queryset=City.objects.all(), source='origin', write_only=True
    )
    destination_id = serializers.PrimaryKeyRelatedField(
        queryset=City.objects.all(), source='destination', write_only=True
    )
    trip_count = serializers.SerializerMethodField()

    class Meta:
        model = Route
        fields = ['id', 'slug', 'origin', 'origin_name', 'origin_id',
                  'destination', 'destination_name', 'destination_id',
                  'distance_km', 'is_active', 'trip_count']
        read_only_fields = ['slug', 'origin', 'destination']

    def get_trip_count(self, obj):
        return obj.trips.count()


# ── Boarding Point ────────────────────────────────────────────────────────────

class AdminBoardingPointSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source='city.name', read_only=True)
    city_id = serializers.PrimaryKeyRelatedField(
        queryset=City.objects.all(), source='city', write_only=True
    )

    class Meta:
        model = BoardingPoint
        fields = ['id', 'slug', 'city', 'city_name', 'city_id',
                  'name', 'address', 'is_active']
        read_only_fields = ['slug', 'city']


# ── Seat Price ────────────────────────────────────────────────────────────────

class AdminSeatPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeatPrice
        fields = ['id', 'seat_class', 'price', 'season']


# ── Trip ──────────────────────────────────────────────────────────────────────

class AdminTripSerializer(serializers.ModelSerializer):
    route_display = serializers.CharField(source='route.__str__', read_only=True)
    bus_name = serializers.CharField(source='bus.name', read_only=True)
    bus_plate = serializers.CharField(source='bus.plate_number', read_only=True)
    origin = serializers.CharField(source='route.origin.name', read_only=True)
    destination = serializers.CharField(source='route.destination.name', read_only=True)
    seat_prices = AdminSeatPriceSerializer(many=True, read_only=True)
    booking_count = serializers.SerializerMethodField()
    available_seats = serializers.SerializerMethodField()
    revenue = serializers.SerializerMethodField()
    route_id = serializers.PrimaryKeyRelatedField(
        queryset=Route.objects.all(), source='route', write_only=True
    )
    bus_id = serializers.PrimaryKeyRelatedField(
        queryset=Bus.objects.all(), source='bus', write_only=True
    )
    boarding_point_ids = serializers.PrimaryKeyRelatedField(
        queryset=BoardingPoint.objects.all(), source='boarding_points',
        many=True, write_only=True, required=False
    )

    class Meta:
        model = Trip
        fields = [
            'id', 'slug', 'route', 'route_id', 'route_display',
            'bus', 'bus_id', 'bus_name', 'bus_plate',
            'origin', 'destination',
            'departure_date', 'departure_time', 'arrival_time', 'duration_minutes',
            'status', 'is_active', 'seat_prices',
            'booking_count', 'available_seats', 'revenue',
            'boarding_point_ids', 'created_at', 'updated_at'
        ]
        read_only_fields = ['slug', 'route', 'bus', 'created_at', 'updated_at']

    def get_booking_count(self, obj):
        return obj.bookings.filter(status__in=['pending', 'confirmed']).count()

    def get_available_seats(self, obj):
        total = obj.bus.seats.filter(is_active=True, is_aisle_gap=False, is_driver_seat=False).count()
        booked = BookedSeat.objects.filter(
            booking__trip=obj, booking__status__in=['pending', 'confirmed']
        ).count()
        return total - booked

    def get_revenue(self, obj):
        result = obj.bookings.filter(status='confirmed').aggregate(
            total=Sum('total_amount')
        )
        return result['total'] or 0

    def create(self, validated_data):
        boarding_points = validated_data.pop('boarding_points', [])
        seat_prices_data = self.initial_data.get('seat_prices', [])
        trip = Trip.objects.create(**validated_data)
        if boarding_points:
            trip.boarding_points.set(boarding_points)
        for sp in seat_prices_data:
            SeatPrice.objects.create(trip=trip, **sp)
        return trip

    def update(self, instance, validated_data):
        boarding_points = validated_data.pop('boarding_points', None)
        seat_prices_data = self.initial_data.get('seat_prices', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if boarding_points is not None:
            instance.boarding_points.set(boarding_points)
        if seat_prices_data is not None:
            instance.seat_prices.all().delete()
            for sp in seat_prices_data:
                SeatPrice.objects.create(trip=instance, **sp)
        return instance


# ── Trip Manifest (booking list for a trip) ───────────────────────────────────

class TripManifestSerializer(serializers.ModelSerializer):
    seat_numbers = serializers.SerializerMethodField()
    seat_classes = serializers.SerializerMethodField()
    payment_receipt = serializers.SerializerMethodField()
    boarding_point_name = serializers.CharField(source='boarding_point.name', read_only=True)
    dropping_point_name = serializers.CharField(source='dropping_point.name', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'reference', 'passenger_name', 'passenger_email',
            'passenger_phone', 'passenger_id_number', 'passenger_nationality',
            'seat_numbers', 'seat_classes', 'total_amount', 'status',
            'boarding_point_name', 'dropping_point_name',
            'payment_receipt', 'ticket_sent', 'created_at'
        ]

    def get_seat_numbers(self, obj):
        return list(obj.booked_seats.values_list('seat__seat_number', flat=True))

    def get_seat_classes(self, obj):
        return list(obj.booked_seats.values_list('seat__seat_class', flat=True))

    def get_payment_receipt(self, obj):
        try:
            return obj.payment.mpesa_receipt_number
        except Payment.DoesNotExist:
            return None


# ── Booking Admin ─────────────────────────────────────────────────────────────

class AdminBookingSerializer(serializers.ModelSerializer):
    route = serializers.CharField(source='trip.route', read_only=True)
    bus_name = serializers.CharField(source='trip.bus.name', read_only=True)
    departure_date = serializers.DateField(source='trip.departure_date', read_only=True)
    departure_time = serializers.TimeField(source='trip.departure_time', read_only=True)
    seat_numbers = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    payment_receipt = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'reference', 'slug',
            'passenger_name', 'passenger_email', 'passenger_phone',
            'passenger_id_number', 'passenger_nationality',
            'route', 'bus_name', 'departure_date', 'departure_time',
            'seat_numbers', 'total_amount', 'status',
            'payment_status', 'payment_receipt', 'ticket_sent', 'created_at'
        ]

    def get_seat_numbers(self, obj):
        return list(obj.booked_seats.values_list('seat__seat_number', flat=True))

    def get_payment_status(self, obj):
        try:
            return obj.payment.status
        except Payment.DoesNotExist:
            return 'not_initiated'

    def get_payment_receipt(self, obj):
        try:
            return obj.payment.mpesa_receipt_number
        except Payment.DoesNotExist:
            return None


# ── Job Posting ───────────────────────────────────────────────────────────────

class AdminJobPostingSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobPosting
        fields = [
            'id', 'title', 'slug', 'department', 'location',
            'description', 'requirements', 'deadline', 'is_active', 'created_at'
        ]
        read_only_fields = ['slug', 'created_at']