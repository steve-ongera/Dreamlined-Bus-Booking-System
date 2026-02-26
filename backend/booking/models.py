from django.db import models
from django.utils.text import slugify
from django.utils import timezone
import uuid


class City(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Cities"
        ordering = ["name"]


class BusType(models.Model):
    """Bus model/type e.g. Marcopolo G7, ZHONGTONG, Executive MD, Futura 43"""
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    description = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Bus(models.Model):
    """Individual bus with its unique seat layout"""
    SEAT_CLASS_CHOICES = [
        ('vip', 'VIP'),
        ('business', 'Business'),
        ('economy', 'Economy'),
    ]

    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    bus_type = models.ForeignKey(BusType, on_delete=models.SET_NULL, null=True, blank=True, related_name='buses')
    plate_number = models.CharField(max_length=20, unique=True)
    total_seats = models.PositiveIntegerField(default=48)
    is_active = models.BooleanField(default=True)
    amenities = models.JSONField(default=list, blank=True)  # e.g. ["WiFi","AC","USB","Recliner"]

    # Layout config stored as JSON - flexible per bus
    # Example: {"columns": 4, "rows": 12, "door_position": "front_left",
    #            "seat_map": [{"id":"1","row":1,"col":1,"class":"vip",...}]}
    layout_config = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(f"{self.name}-{self.plate_number}")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.plate_number})"


class SeatLayout(models.Model):
    """Individual seat definition per bus"""
    SEAT_CLASS_CHOICES = [
        ('vip', 'VIP'),
        ('business', 'Business'),
        ('economy', 'Economy'),
    ]
    SEAT_TYPE_CHOICES = [
        ('window', 'Window'),
        ('aisle', 'Aisle'),
        ('middle', 'Middle'),
    ]

    bus = models.ForeignKey(Bus, on_delete=models.CASCADE, related_name='seats')
    seat_number = models.CharField(max_length=10)  # e.g. "1A", "2B", "VIP1"
    seat_class = models.CharField(max_length=20, choices=SEAT_CLASS_CHOICES, default='economy')
    seat_type = models.CharField(max_length=20, choices=SEAT_TYPE_CHOICES, default='window')

    # Grid position
    row_number = models.PositiveIntegerField()
    column_number = models.PositiveIntegerField()

    # Visual/spacing customization
    row_span = models.PositiveIntegerField(default=1)   # for wider VIP seats
    col_span = models.PositiveIntegerField(default=1)
    is_aisle_gap = models.BooleanField(default=False)    # gap/passageway
    is_driver_seat = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    # Styling overrides (set via admin dashboard)
    bg_color = models.CharField(max_length=20, blank=True, default='')   # hex e.g. #FFD700
    text_color = models.CharField(max_length=20, blank=True, default='')
    custom_label = models.CharField(max_length=20, blank=True, default='')
    extra_padding = models.PositiveIntegerField(default=0)  # px

    class Meta:
        unique_together = ('bus', 'seat_number')
        ordering = ['row_number', 'column_number']

    def __str__(self):
        return f"{self.bus.name} - Seat {self.seat_number} ({self.seat_class})"


class Route(models.Model):
    origin = models.ForeignKey(City, on_delete=models.CASCADE, related_name='departing_routes')
    destination = models.ForeignKey(City, on_delete=models.CASCADE, related_name='arriving_routes')
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    distance_km = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(f"{self.origin.name}-to-{self.destination.name}")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.origin} → {self.destination}"

    class Meta:
        unique_together = ('origin', 'destination')


class BoardingPoint(models.Model):
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='boarding_points')
    name = models.CharField(max_length=200)  # e.g. "Nairobi CBD - Ambassador Hotel"
    slug = models.SlugField(max_length=250, unique=True, blank=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(f"{self.city.name}-{self.name}")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.city.name} - {self.name}"


class Trip(models.Model):
    """A scheduled bus trip"""
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('boarding', 'Boarding'),
        ('departed', 'Departed'),
        ('arrived', 'Arrived'),
        ('cancelled', 'Cancelled'),
    ]

    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='trips')
    bus = models.ForeignKey(Bus, on_delete=models.CASCADE, related_name='trips')
    slug = models.SlugField(max_length=250, unique=True, blank=True)

    departure_date = models.DateField()
    departure_time = models.TimeField()
    arrival_time = models.TimeField()
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    boarding_points = models.ManyToManyField(BoardingPoint, related_name='trips', blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            unique_id = uuid.uuid4().hex[:8]
            self.slug = slugify(
                f"{self.route.origin.name}-{self.route.destination.name}-"
                f"{self.departure_date}-{unique_id}"
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.route} on {self.departure_date} at {self.departure_time}"

    class Meta:
        ordering = ['departure_date', 'departure_time']


class SeatPrice(models.Model):
    """Dynamic pricing per seat class per trip, varies by season"""
    SEASON_CHOICES = [
        ('regular', 'Regular'),
        ('peak', 'Peak Season'),
        ('holiday', 'Holiday'),
        ('off_peak', 'Off Peak'),
    ]

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='seat_prices')
    seat_class = models.CharField(max_length=20, choices=[
        ('vip', 'VIP'), ('business', 'Business'), ('economy', 'Economy')
    ])
    price = models.DecimalField(max_digits=10, decimal_places=2)
    season = models.CharField(max_length=20, choices=SEASON_CHOICES, default='regular')

    class Meta:
        unique_together = ('trip', 'seat_class')

    def __str__(self):
        return f"{self.trip} - {self.seat_class}: KES {self.price}"


class Booking(models.Model):
    """A passenger booking - no account needed"""
    STATUS_CHOICES = [
        ('pending', 'Pending Payment'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]

    # Unique booking reference
    reference = models.CharField(max_length=20, unique=True, editable=False)
    slug = models.SlugField(max_length=50, unique=True, blank=True, editable=False)

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='bookings')
    boarding_point = models.ForeignKey(BoardingPoint, on_delete=models.SET_NULL, null=True, related_name='bookings')
    dropping_point = models.ForeignKey(BoardingPoint, on_delete=models.SET_NULL, null=True, related_name='dropping_bookings')

    # Passenger details (no account needed)
    passenger_name = models.CharField(max_length=200)
    passenger_email = models.EmailField()
    passenger_phone = models.CharField(max_length=20)
    passenger_id_number = models.CharField(max_length=50)
    passenger_nationality = models.CharField(max_length=100, default='Kenyan')

    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    ticket_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = f"DL{uuid.uuid4().hex[:8].upper()}"
        if not self.slug:
            self.slug = self.reference.lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Booking {self.reference} - {self.passenger_name}"

    class Meta:
        ordering = ['-created_at']


class BookedSeat(models.Model):
    """Individual seats within a booking"""
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='booked_seats')
    seat = models.ForeignKey(SeatLayout, on_delete=models.CASCADE, related_name='bookings')
    price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ('booking', 'seat')

    def __str__(self):
        return f"{self.booking.reference} - Seat {self.seat.seat_number}"


class Payment(models.Model):
    """M-Pesa payment tracking"""
    STATUS_CHOICES = [
        ('initiated', 'Initiated'),
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('timeout', 'Timeout'),
    ]

    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='payment')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    phone_number = models.CharField(max_length=20)  # M-Pesa number

    # M-Pesa specific fields
    checkout_request_id = models.CharField(max_length=200, blank=True)
    merchant_request_id = models.CharField(max_length=200, blank=True)
    mpesa_receipt_number = models.CharField(max_length=100, blank=True)
    transaction_date = models.DateTimeField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='initiated')
    result_code = models.CharField(max_length=10, blank=True)
    result_desc = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment for {self.booking.reference} - {self.status}"


class JobPosting(models.Model):
    """Careers page job listings"""
    DEPARTMENT_CHOICES = [
        ('operations', 'Operations'),
        ('driving', 'Driving'),
        ('customer_service', 'Customer Service'),
        ('finance', 'Finance'),
        ('it', 'Information Technology'),
        ('management', 'Management'),
    ]

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=250, unique=True, blank=True)
    department = models.CharField(max_length=50, choices=DEPARTMENT_CHOICES)
    location = models.CharField(max_length=100)
    description = models.TextField()
    requirements = models.TextField()
    deadline = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(f"{self.title}-{self.department}")
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-created_at']