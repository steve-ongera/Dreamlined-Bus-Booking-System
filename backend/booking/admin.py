from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.db.models import Count, Sum
from django.urls import reverse
from django.utils import timezone
from .models import (
    City, BusType, Bus, SeatLayout, Route, BoardingPoint,
    Trip, SeatPrice, Booking, BookedSeat, Payment, JobPosting
)


# ─── Admin site branding ───────────────────────────────────────────────────────
admin.site.site_header = "🚌 Dreamline Bus Admin"
admin.site.site_title  = "Dreamline Admin"
admin.site.index_title = "Operations Dashboard"


# ─── Helpers ──────────────────────────────────────────────────────────────────
def colored_badge(text, color):
    return format_html(
        '<span style="background:{};color:#fff;padding:2px 10px;border-radius:12px;'
        'font-size:11px;font-weight:700;white-space:nowrap">{}</span>',
        color, text
    )


# ─── City ─────────────────────────────────────────────────────────────────────
@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display  = ('name', 'slug', 'route_count', 'boarding_point_count', 'is_active')
    list_editable = ('is_active',)
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}
    ordering = ('name',)

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _route_count=Count('departing_routes', distinct=True),
            _bp_count=Count('boarding_points', distinct=True),
        )

    @admin.display(description='Routes', ordering='_route_count')
    def route_count(self, obj):
        return obj._route_count

    @admin.display(description='Boarding Pts', ordering='_bp_count')
    def boarding_point_count(self, obj):
        return obj._bp_count


# ─── BusType ──────────────────────────────────────────────────────────────────
@admin.register(BusType)
class BusTypeAdmin(admin.ModelAdmin):
    list_display      = ('name', 'slug', 'bus_count', 'description_short')
    search_fields     = ('name',)
    prepopulated_fields = {'slug': ('name',)}

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_bus_count=Count('buses'))

    @admin.display(description='Buses', ordering='_bus_count')
    def bus_count(self, obj):
        return obj._bus_count

    @admin.display(description='Description')
    def description_short(self, obj):
        return (obj.description[:80] + '…') if len(obj.description) > 80 else obj.description


# ─── SeatLayout inline ────────────────────────────────────────────────────────
class SeatLayoutInline(admin.TabularInline):
    model  = SeatLayout
    extra  = 0
    fields = (
        'seat_number', 'seat_class', 'seat_type',
        'row_number', 'column_number', 'row_span', 'col_span',
        'is_aisle_gap', 'is_driver_seat', 'is_active',
        'bg_color', 'text_color', 'custom_label', 'extra_padding',
    )
    ordering  = ('row_number', 'column_number')
    classes   = ('collapse',)
    show_change_link = True

    def get_extra(self, request, obj=None, **kwargs):
        return 0 if obj and obj.seats.exists() else 5


# ─── Bus ──────────────────────────────────────────────────────────────────────
@admin.register(Bus)
class BusAdmin(admin.ModelAdmin):
    list_display  = (
        'name', 'plate_number', 'bus_type', 'total_seats',
        'seat_class_summary', 'amenities_display', 'is_active',
    )
    list_filter   = ('is_active', 'bus_type')
    search_fields = ('name', 'plate_number')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields     = ('slug', 'seat_visual', 'created_at', 'updated_at')
    inlines    = [SeatLayoutInline]
    ordering   = ('name',)
    fieldsets  = (
        ('Bus Details', {
            'fields': ('name', 'slug', 'bus_type', 'plate_number', 'total_seats', 'is_active'),
        }),
        ('Amenities & Layout', {
            'fields': ('amenities', 'layout_config'),
        }),
        ('Seat Preview', {
            'fields': ('seat_visual',),
            'classes': ('collapse',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Seat Classes')
    def seat_class_summary(self, obj):
        from django.db.models import Count
        counts = obj.seats.filter(
            is_aisle_gap=False, is_driver_seat=False
        ).values('seat_class').annotate(n=Count('id'))
        parts = []
        color_map = {'vip': '#D4A017', 'business': '#2563EB', 'economy': '#16a34a'}
        for c in counts:
            color = color_map.get(c['seat_class'], '#888')
            parts.append(
                f'<span style="background:{color};color:{"#1a1a1a" if c["seat_class"]=="vip" else "#fff"};'
                f'padding:1px 7px;border-radius:10px;font-size:11px;font-weight:700;margin-right:3px">'
                f'{c["seat_class"].upper()} {c["n"]}</span>'
            )
        return mark_safe(''.join(parts)) if parts else '—'

    @admin.display(description='Amenities')
    def amenities_display(self, obj):
        if not obj.amenities:
            return '—'
        return mark_safe(
            ''.join(
                f'<span style="background:#f0f4ff;color:#2563eb;padding:1px 7px;'
                f'border-radius:10px;font-size:11px;margin-right:3px">{a}</span>'
                for a in obj.amenities[:4]
            ) + (f' <span style="color:#888;font-size:11px">+{len(obj.amenities)-4} more</span>' if len(obj.amenities) > 4 else '')
        )

    @admin.display(description='Seat Map Preview')
    def seat_visual(self, obj):
        """Renders a visual grid of the bus seats in the admin detail page."""
        seats = obj.seats.all().order_by('row_number', 'column_number')
        if not seats.exists():
            return format_html('<em style="color:#999">No seats configured yet</em>')

        rows = {}
        for seat in seats:
            rows.setdefault(seat.row_number, []).append(seat)

        color_map = {
            'vip': ('#D4A017', '#1a1a1a'),
            'business': ('#2563EB', '#fff'),
            'economy': ('#16a34a', '#fff'),
        }

        html = '<div style="font-family:monospace;background:#f8f9fa;padding:16px;border-radius:8px;display:inline-block">'
        html += '<div style="text-align:center;font-weight:700;color:#CC0000;margin-bottom:8px">🚌 FRONT (Driver)</div>'

        for row_num in sorted(rows.keys()):
            html += '<div style="display:flex;gap:4px;margin-bottom:4px;justify-content:center">'
            for seat in rows[row_num]:
                if seat.is_aisle_gap:
                    html += '<div style="width:28px;height:28px"></div>'
                elif seat.is_driver_seat:
                    html += '<div style="width:28px;height:28px;background:#374151;color:#fff;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px">D</div>'
                else:
                    bg, tc = color_map.get(seat.seat_class, ('#888', '#fff'))
                    if seat.bg_color:
                        bg = seat.bg_color
                    if seat.text_color:
                        tc = seat.text_color
                    label = seat.custom_label or seat.seat_number
                    html += (
                        f'<div title="Seat {seat.seat_number} | {seat.seat_class}" '
                        f'style="width:28px;height:28px;background:{bg};color:{tc};'
                        f'border-radius:4px;display:flex;align-items:center;justify-content:center;'
                        f'font-size:9px;font-weight:700;cursor:default">{label}</div>'
                    )
            html += '</div>'

        html += '<div style="text-align:center;font-weight:700;color:#666;margin-top:8px;font-size:11px">← REAR →</div>'

        # Legend
        html += '<div style="display:flex;gap:10px;margin-top:12px;font-size:11px">'
        for cls, (bg, tc) in color_map.items():
            html += (
                f'<span style="display:flex;align-items:center;gap:4px">'
                f'<span style="width:14px;height:14px;background:{bg};border-radius:3px;display:inline-block"></span>'
                f'{cls.upper()}</span>'
            )
        html += '</div></div>'
        return mark_safe(html)


# ─── SeatLayout ───────────────────────────────────────────────────────────────
@admin.register(SeatLayout)
class SeatLayoutAdmin(admin.ModelAdmin):
    list_display  = (
        'bus', 'seat_number', 'seat_class_badge', 'seat_type',
        'row_number', 'column_number', 'is_aisle_gap', 'is_active',
        'color_preview',
    )
    list_filter   = ('seat_class', 'seat_type', 'is_aisle_gap', 'is_active', 'bus')
    search_fields = ('seat_number', 'bus__name', 'bus__plate_number')
    list_editable = ('is_active',)
    ordering      = ('bus', 'row_number', 'column_number')
    list_per_page = 60

    @admin.display(description='Class')
    def seat_class_badge(self, obj):
        colors = {'vip': '#D4A017', 'business': '#2563EB', 'economy': '#16a34a'}
        return colored_badge(obj.seat_class.upper(), colors.get(obj.seat_class, '#888'))

    @admin.display(description='Color')
    def color_preview(self, obj):
        if not obj.bg_color:
            return '—'
        return format_html(
            '<span style="display:inline-block;width:60px;height:20px;background:{};'
            'border-radius:4px;border:1px solid #ddd" title="{}"></span>',
            obj.bg_color, obj.bg_color
        )


# ─── Route ────────────────────────────────────────────────────────────────────
@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display  = ('route_display', 'slug', 'distance_km', 'trip_count', 'is_active')
    list_filter   = ('is_active', 'origin', 'destination')
    search_fields = ('origin__name', 'destination__name')
    list_editable = ('is_active',)
    readonly_fields = ('slug',)

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_trip_count=Count('trips'))

    @admin.display(description='Route')
    def route_display(self, obj):
        return format_html(
            '<strong>{}</strong> <span style="color:#CC0000">→</span> <strong>{}</strong>',
            obj.origin.name, obj.destination.name
        )

    @admin.display(description='Trips', ordering='_trip_count')
    def trip_count(self, obj):
        return obj._trip_count


# ─── BoardingPoint ────────────────────────────────────────────────────────────
@admin.register(BoardingPoint)
class BoardingPointAdmin(admin.ModelAdmin):
    list_display  = ('name', 'city', 'slug', 'address_short', 'is_active')
    list_filter   = ('city', 'is_active')
    search_fields = ('name', 'city__name', 'address')
    list_editable = ('is_active',)
    readonly_fields = ('slug',)
    ordering = ('city__name', 'name')

    @admin.display(description='Address')
    def address_short(self, obj):
        return (obj.address[:50] + '…') if len(obj.address) > 50 else obj.address


# ─── SeatPrice inline ─────────────────────────────────────────────────────────
class SeatPriceInline(admin.TabularInline):
    model  = SeatPrice
    extra  = 3
    fields = ('seat_class', 'price', 'season')


# ─── Trip ─────────────────────────────────────────────────────────────────────
@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display  = (
        'route_display', 'bus', 'departure_date', 'departure_time_fmt',
        'arrival_time_fmt', 'duration_display', 'status_badge',
        'seats_available', 'revenue_display', 'is_active',
    )
    list_filter   = ('status', 'departure_date', 'is_active', 'route__origin', 'route__destination')
    search_fields = ('route__origin__name', 'route__destination__name', 'bus__name', 'bus__plate_number', 'slug')
    readonly_fields  = ('slug', 'seats_available', 'created_at', 'updated_at')
    date_hierarchy   = 'departure_date'
    ordering         = ('-departure_date', 'departure_time')
    filter_horizontal = ('boarding_points',)
    inlines   = [SeatPriceInline]
    list_per_page = 25
    list_editable = ('is_active',)

    fieldsets = (
        ('Trip Info', {
            'fields': ('route', 'bus', 'slug', 'status', 'is_active'),
        }),
        ('Schedule', {
            'fields': ('departure_date', 'departure_time', 'arrival_time', 'duration_minutes'),
        }),
        ('Boarding & Dropping Points', {
            'fields': ('boarding_points',),
        }),
        ('Meta', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    actions = ['mark_departed', 'mark_cancelled', 'mark_scheduled']

    @admin.display(description='Route')
    def route_display(self, obj):
        return format_html(
            '<span style="font-weight:700">{} → {}</span>',
            obj.route.origin.name, obj.route.destination.name
        )

    @admin.display(description='Dep.', ordering='departure_time')
    def departure_time_fmt(self, obj):
        return obj.departure_time.strftime('%I:%M %p') if obj.departure_time else '—'

    @admin.display(description='Arr.')
    def arrival_time_fmt(self, obj):
        return obj.arrival_time.strftime('%I:%M %p') if obj.arrival_time else '—'

    @admin.display(description='Duration')
    def duration_display(self, obj):
        if not obj.duration_minutes:
            return '—'
        h, m = divmod(obj.duration_minutes, 60)
        return f'{h}h {m}m' if m else f'{h}h'

    @admin.display(description='Status')
    def status_badge(self, obj):
        colors = {
            'scheduled': '#2563EB',
            'boarding':  '#D4A017',
            'departed':  '#6b7280',
            'arrived':   '#16a34a',
            'cancelled': '#CC0000',
        }
        return colored_badge(obj.status.upper(), colors.get(obj.status, '#888'))

    @admin.display(description='Available Seats')
    def seats_available(self, obj):
        total = obj.bus.seats.filter(is_active=True, is_aisle_gap=False, is_driver_seat=False).count()
        booked = BookedSeat.objects.filter(
            booking__trip=obj, booking__status__in=['pending', 'confirmed']
        ).count()
        avail = total - booked
        color = '#16a34a' if avail > 10 else '#D4A017' if avail > 0 else '#CC0000'
        return format_html(
            '<span style="font-weight:700;color:{}">{}</span> / {}',
            color, avail, total
        )

    @admin.display(description='Revenue')
    def revenue_display(self, obj):
        total = Payment.objects.filter(
            booking__trip=obj, status='completed'
        ).aggregate(t=Sum('amount'))['t'] or 0
        return format_html('<span style="font-weight:700;color:#16a34a">KES {:,.0f}</span>', total)

    @admin.action(description='Mark selected trips as Departed')
    def mark_departed(self, request, queryset):
        updated = queryset.update(status='departed')
        self.message_user(request, f'{updated} trip(s) marked as departed.')

    @admin.action(description='Mark selected trips as Cancelled')
    def mark_cancelled(self, request, queryset):
        updated = queryset.update(status='cancelled')
        self.message_user(request, f'{updated} trip(s) cancelled.')

    @admin.action(description='Mark selected trips as Scheduled')
    def mark_scheduled(self, request, queryset):
        updated = queryset.update(status='scheduled')
        self.message_user(request, f'{updated} trip(s) reset to scheduled.')


# ─── BookedSeat inline ────────────────────────────────────────────────────────
class BookedSeatInline(admin.TabularInline):
    model   = BookedSeat
    extra   = 0
    readonly_fields = ('seat', 'price', 'seat_class_display')
    fields  = ('seat', 'seat_class_display', 'price')
    can_delete = False

    @admin.display(description='Class')
    def seat_class_display(self, obj):
        colors = {'vip': '#D4A017', 'business': '#2563EB', 'economy': '#16a34a'}
        return colored_badge(obj.seat.seat_class.upper(), colors.get(obj.seat.seat_class, '#888'))


# ─── Payment inline ───────────────────────────────────────────────────────────
class PaymentInline(admin.StackedInline):
    model   = Payment
    extra   = 0
    readonly_fields = (
        'amount', 'phone_number', 'checkout_request_id',
        'merchant_request_id', 'mpesa_receipt_number',
        'transaction_date', 'status', 'result_code', 'result_desc',
        'created_at', 'updated_at',
    )
    can_delete = False
    fields = (
        ('amount', 'phone_number', 'status'),
        ('mpesa_receipt_number', 'transaction_date'),
        ('checkout_request_id', 'merchant_request_id'),
        ('result_code', 'result_desc'),
        ('created_at', 'updated_at'),
    )


# ─── Booking ──────────────────────────────────────────────────────────────────
@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display  = (
        'reference', 'passenger_name', 'passenger_email', 'passenger_phone',
        'trip_display', 'seats_display', 'total_amount_display',
        'status_badge', 'payment_status_display', 'ticket_sent', 'created_at',
    )
    list_filter   = ('status', 'ticket_sent', 'created_at', 'trip__departure_date')
    search_fields = (
        'reference', 'passenger_name', 'passenger_email',
        'passenger_phone', 'passenger_id_number',
    )
    readonly_fields = (
        'reference', 'slug', 'total_amount', 'created_at', 'updated_at', 'seats_detail',
    )
    ordering  = ('-created_at',)
    date_hierarchy = 'created_at'
    inlines   = [BookedSeatInline, PaymentInline]
    list_per_page = 30
    list_editable = ('ticket_sent',)

    fieldsets = (
        ('Booking Reference', {
            'fields': (('reference', 'slug', 'status'), 'ticket_sent'),
        }),
        ('Trip', {
            'fields': ('trip', 'boarding_point', 'dropping_point', 'seats_detail'),
        }),
        ('Passenger Details', {
            'fields': (
                ('passenger_name', 'passenger_nationality'),
                ('passenger_email', 'passenger_phone'),
                'passenger_id_number',
            ),
        }),
        ('Financials', {
            'fields': ('total_amount',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    actions = ['confirm_bookings', 'cancel_bookings', 'resend_tickets']

    @admin.display(description='Trip')
    def trip_display(self, obj):
        return format_html(
            '<span style="font-weight:600">{} → {}</span><br>'
            '<span style="color:#888;font-size:11px">{} @ {}</span>',
            obj.trip.route.origin.name,
            obj.trip.route.destination.name,
            obj.trip.departure_date,
            obj.trip.departure_time.strftime('%I:%M %p') if obj.trip.departure_time else '',
        )

    @admin.display(description='Seats')
    def seats_display(self, obj):
        seats = obj.booked_seats.select_related('seat').all()
        colors = {'vip': '#D4A017', 'business': '#2563EB', 'economy': '#16a34a'}
        parts = []
        for bs in seats:
            bg = colors.get(bs.seat.seat_class, '#888')
            tc = '#1a1a1a' if bs.seat.seat_class == 'vip' else '#fff'
            parts.append(
                f'<span style="background:{bg};color:{tc};padding:1px 6px;'
                f'border-radius:8px;font-size:11px;font-weight:700">{bs.seat.seat_number}</span>'
            )
        return mark_safe(' '.join(parts)) if parts else '—'

    @admin.display(description='Amount')
    def total_amount_display(self, obj):
        return format_html(
            '<span style="font-weight:700;color:#16a34a">KES {:,.0f}</span>',
            obj.total_amount
        )

    @admin.display(description='Status')
    def status_badge(self, obj):
        colors = {
            'pending': '#D4A017', 'confirmed': '#16a34a',
            'cancelled': '#CC0000', 'refunded': '#6b7280',
        }
        return colored_badge(obj.status.upper(), colors.get(obj.status, '#888'))

    @admin.display(description='Payment')
    def payment_status_display(self, obj):
        try:
            pmt = obj.payment
            colors = {
                'completed': '#16a34a', 'pending': '#D4A017',
                'failed': '#CC0000', 'initiated': '#2563EB',
                'cancelled': '#6b7280', 'timeout': '#CC0000',
            }
            badge = colored_badge(pmt.status.upper(), colors.get(pmt.status, '#888'))
            if pmt.mpesa_receipt_number:
                return format_html('{}<br><span style="font-size:11px;color:#888">{}</span>', badge, pmt.mpesa_receipt_number)
            return badge
        except Payment.DoesNotExist:
            return format_html('<span style="color:#ccc;font-size:11px">No payment</span>')

    @admin.display(description='Seat Details')
    def seats_detail(self, obj):
        seats = obj.booked_seats.select_related('seat').all()
        if not seats.exists():
            return '—'
        rows = []
        for bs in seats:
            rows.append(
                f'<tr>'
                f'<td style="padding:4px 10px;font-weight:700">{bs.seat.seat_number}</td>'
                f'<td style="padding:4px 10px">{bs.seat.seat_class.upper()}</td>'
                f'<td style="padding:4px 10px">{bs.seat.seat_type}</td>'
                f'<td style="padding:4px 10px;font-weight:700;color:#16a34a">KES {bs.price:,.0f}</td>'
                f'</tr>'
            )
        html = (
            '<table style="border-collapse:collapse;font-size:13px">'
            '<thead><tr>'
            '<th style="padding:4px 10px;background:#f0f0f0;text-align:left">Seat</th>'
            '<th style="padding:4px 10px;background:#f0f0f0;text-align:left">Class</th>'
            '<th style="padding:4px 10px;background:#f0f0f0;text-align:left">Type</th>'
            '<th style="padding:4px 10px;background:#f0f0f0;text-align:left">Price</th>'
            '</tr></thead><tbody>'
            + ''.join(rows)
            + '</tbody></table>'
        )
        return mark_safe(html)

    @admin.action(description='Confirm selected bookings')
    def confirm_bookings(self, request, queryset):
        updated = queryset.filter(status='pending').update(status='confirmed')
        self.message_user(request, f'{updated} booking(s) confirmed.')

    @admin.action(description='Cancel selected bookings')
    def cancel_bookings(self, request, queryset):
        updated = queryset.exclude(status='cancelled').update(status='cancelled')
        self.message_user(request, f'{updated} booking(s) cancelled.')

    @admin.action(description='Resend ticket email for selected bookings')
    def resend_tickets(self, request, queryset):
        from .views import PaymentViewSet
        pv = PaymentViewSet()
        count = 0
        for booking in queryset.filter(status='confirmed'):
            try:
                pv._send_ticket_email(booking)
                count += 1
            except Exception:
                pass
        self.message_user(request, f'Ticket emails resent for {count} booking(s).')


# ─── Payment ──────────────────────────────────────────────────────────────────
@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display  = (
        'booking_ref', 'passenger', 'phone_number', 'amount_display',
        'status_badge', 'mpesa_receipt_number', 'transaction_date', 'created_at',
    )
    list_filter   = ('status', 'created_at')
    search_fields = (
        'booking__reference', 'booking__passenger_name',
        'phone_number', 'mpesa_receipt_number', 'checkout_request_id',
    )
    readonly_fields = (
        'checkout_request_id', 'merchant_request_id',
        'mpesa_receipt_number', 'transaction_date',
        'result_code', 'result_desc', 'created_at', 'updated_at',
    )
    ordering   = ('-created_at',)
    date_hierarchy = 'created_at'

    @admin.display(description='Booking Ref')
    def booking_ref(self, obj):
        url = reverse('admin:booking_booking_change', args=[obj.booking.pk])
        return format_html('<a href="{}" style="font-weight:700;color:#CC0000">{}</a>', url, obj.booking.reference)

    @admin.display(description='Passenger')
    def passenger(self, obj):
        return obj.booking.passenger_name

    @admin.display(description='Amount')
    def amount_display(self, obj):
        return format_html('<span style="font-weight:700;color:#16a34a">KES {:,.0f}</span>', obj.amount)

    @admin.display(description='Status')
    def status_badge(self, obj):
        colors = {
            'completed': '#16a34a', 'pending': '#D4A017',
            'failed': '#CC0000', 'initiated': '#2563EB',
            'cancelled': '#6b7280', 'timeout': '#CC0000',
        }
        return colored_badge(obj.status.upper(), colors.get(obj.status, '#888'))


# ─── SeatPrice ────────────────────────────────────────────────────────────────
@admin.register(SeatPrice)
class SeatPriceAdmin(admin.ModelAdmin):
    list_display  = ('trip_display', 'seat_class_badge', 'price_display', 'season')
    list_filter   = ('seat_class', 'season')
    search_fields = ('trip__route__origin__name', 'trip__route__destination__name')
    list_editable = ('season',)
    ordering      = ('trip__departure_date', 'seat_class')

    @admin.display(description='Trip')
    def trip_display(self, obj):
        return f'{obj.trip.route.origin.name} → {obj.trip.route.destination.name} ({obj.trip.departure_date})'

    @admin.display(description='Class')
    def seat_class_badge(self, obj):
        colors = {'vip': '#D4A017', 'business': '#2563EB', 'economy': '#16a34a'}
        return colored_badge(obj.seat_class.upper(), colors.get(obj.seat_class, '#888'))

    @admin.display(description='Price')
    def price_display(self, obj):
        return format_html('<strong style="color:#CC0000">KES {:,.0f}</strong>', obj.price)


# ─── JobPosting ───────────────────────────────────────────────────────────────
@admin.register(JobPosting)
class JobPostingAdmin(admin.ModelAdmin):
    list_display  = ('title', 'department', 'location', 'deadline', 'is_active', 'created_at')
    list_filter   = ('department', 'is_active')
    search_fields = ('title', 'location', 'description')
    list_editable = ('is_active',)
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields     = ('created_at',)
    ordering = ('-created_at',)
    fieldsets = (
        (None, {
            'fields': ('title', 'slug', 'department', 'location', 'deadline', 'is_active'),
        }),
        ('Content', {
            'fields': ('description', 'requirements'),
        }),
        ('Meta', {
            'fields': ('created_at',),
            'classes': ('collapse',),
        }),
    )