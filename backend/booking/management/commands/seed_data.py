"""
Dreamline Bus Booking - Seed Data Command
Usage: python manage.py seed_data [--reset]

Seeds the database with:
  - Cities (Nairobi, Mombasa, Kisumu, Nakuru, Eldoret, Malindi, Kampala, Dar es Salaam)
  - Bus Types (Executive MD, Marcopolo G7, ZHONGTONG MEGA, Futura 43, Yutong Air, Yutong)
  - Buses with full seat layouts (VIP / Business / Economy with proper aisle gaps)
  - Routes between all major city pairs
  - Boarding points per city
  - Trips for the next 7 days with realistic schedules
  - Seasonal seat pricing per trip

Run once on a fresh database. Use --reset to wipe and re-seed.
"""

from django.core.management.base import BaseCommand
from django.utils.text import slugify
from django.utils import timezone
from datetime import date, time, timedelta
import random


class Command(BaseCommand):
    help = 'Seed the database with demo data for Dreamline bus booking system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete all existing data before seeding',
        )

    def handle(self, *args, **options):
        # Import models here to avoid circular imports at top level
        from booking.models import (
            City, BusType, Bus, SeatLayout, Route, BoardingPoint,
            Trip, SeatPrice, JobPosting
        )

        if options['reset']:
            self.stdout.write(self.style.WARNING('⚠  Deleting all existing data...'))
            SeatPrice.objects.all().delete()
            Trip.objects.all().delete()
            BoardingPoint.objects.all().delete()
            Route.objects.all().delete()
            SeatLayout.objects.all().delete()
            Bus.objects.all().delete()
            BusType.objects.all().delete()
            City.objects.all().delete()
            JobPosting.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('  All data cleared.\n'))

        self.stdout.write(self.style.HTTP_INFO('🚌 Seeding Dreamline data...\n'))

        cities = self._seed_cities(City)
        bus_types = self._seed_bus_types(BusType)
        buses = self._seed_buses(Bus, SeatLayout, bus_types)
        routes = self._seed_routes(Route, cities)
        boarding_points = self._seed_boarding_points(BoardingPoint, cities)
        self._seed_trips(Trip, SeatPrice, routes, buses, boarding_points)
        self._seed_jobs(JobPosting)

        self.stdout.write(self.style.SUCCESS('\n✅ Seed data complete! Summary:'))
        self.stdout.write(f'   Cities: {City.objects.count()}')
        self.stdout.write(f'   Bus Types: {BusType.objects.count()}')
        self.stdout.write(f'   Buses: {Bus.objects.count()}')
        self.stdout.write(f'   Seat Layouts: {SeatLayout.objects.count()}')
        self.stdout.write(f'   Routes: {Route.objects.count()}')
        self.stdout.write(f'   Boarding Points: {BoardingPoint.objects.count()}')
        self.stdout.write(f'   Trips: {Trip.objects.count()} (next 7 days)')
        self.stdout.write(f'   Seat Prices: {SeatPrice.objects.count()}')
        self.stdout.write(f'   Job Postings: {JobPosting.objects.count()}')

    # ─────────────────────────────────────────────────────────────
    def _seed_cities(self, City):
        self.stdout.write('  📍 Seeding cities...')
        CITIES = [
            'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret',
            'Malindi', 'Thika', 'Nyeri', 'Meru', 'Garissa',
            'Kampala', 'Dar es Salaam',
        ]
        cities = {}
        for name in CITIES:
            city, created = City.objects.get_or_create(name=name, defaults={'is_active': True})
            cities[name.lower()] = city
            if created:
                self.stdout.write(f'    + {name}')
        return cities

    # ─────────────────────────────────────────────────────────────
    def _seed_bus_types(self, BusType):
        self.stdout.write('  🚌 Seeding bus types...')
        TYPES = [
            ('Executive MD', 'Luxury VIP coach — 28 full-recliner seats, individual screens, premium service'),
            ('Marcopolo G7', 'Premium 38-seater business coach with wide seats and refreshments'),
            ('ZHONGTONG MEGA', 'High-capacity 55-seater economy coach with AC and entertainment'),
            ('ZHONGTONG', 'Standard 48-seater economy coach'),
            ('Futura 43', 'Mid-range 43-seater with reclining seats and WiFi'),
            ('Yutong Air', 'Modern 48-seater economy coach with air suspension'),
            ('Yutong', 'Reliable 52-seater standard economy coach'),
        ]
        bus_types = {}
        for name, desc in TYPES:
            bt, created = BusType.objects.get_or_create(name=name, defaults={'description': desc})
            bus_types[name] = bt
            if created:
                self.stdout.write(f'    + {name}')
        return bus_types

    # ─────────────────────────────────────────────────────────────
    def _seed_buses(self, Bus, SeatLayout, bus_types):
        self.stdout.write('  🪑 Seeding buses and seat layouts...')
        buses = {}

        BUS_CONFIGS = [
            {
                'name': 'DL Executive 001',
                'plate': 'KBZ 001A',
                'type': 'Executive MD',
                'amenities': ['WiFi', 'USB Charging', 'AC', 'Full Recliner', 'Individual Screen', 'Blanket & Pillow'],
                'layout': 'executive_vip',
            },
            {
                'name': 'DL Executive 002',
                'plate': 'KBZ 002B',
                'type': 'Executive MD',
                'amenities': ['WiFi', 'USB Charging', 'AC', 'Full Recliner', 'Individual Screen'],
                'layout': 'executive_vip',
            },
            {
                'name': 'DL Marcopolo 001',
                'plate': 'KCC 101C',
                'type': 'Marcopolo G7',
                'amenities': ['WiFi', 'USB Charging', 'AC', 'Recliner Seats', 'Snacks'],
                'layout': 'marcopolo_business',
            },
            {
                'name': 'DL Marcopolo 002',
                'plate': 'KCC 102D',
                'type': 'Marcopolo G7',
                'amenities': ['WiFi', 'USB Charging', 'AC', 'Recliner Seats'],
                'layout': 'marcopolo_business',
            },
            {
                'name': 'DL Zhongtong Mega 001',
                'plate': 'KDA 201E',
                'type': 'ZHONGTONG MEGA',
                'amenities': ['AC', 'USB Charging', 'Entertainment System'],
                'layout': 'zhongtong_economy_large',
            },
            {
                'name': 'DL Zhongtong 001',
                'plate': 'KDA 301F',
                'type': 'ZHONGTONG',
                'amenities': ['AC', 'USB Charging'],
                'layout': 'standard_economy_48',
            },
            {
                'name': 'DL Futura 001',
                'plate': 'KDB 401G',
                'type': 'Futura 43',
                'amenities': ['WiFi', 'AC', 'Recliner Seats'],
                'layout': 'futura_mixed',
            },
            {
                'name': 'DL Futura 002',
                'plate': 'KDB 402H',
                'type': 'Futura 43',
                'amenities': ['WiFi', 'AC', 'Recliner Seats'],
                'layout': 'futura_mixed',
            },
            {
                'name': 'DL Yutong Air 001',
                'plate': 'KDC 501I',
                'type': 'Yutong Air',
                'amenities': ['AC', 'USB Charging', 'Air Suspension'],
                'layout': 'standard_economy_48',
            },
            {
                'name': 'DL Yutong 001',
                'plate': 'KDC 601J',
                'type': 'Yutong',
                'amenities': ['AC'],
                'layout': 'standard_economy_52',
            },
        ]

        for cfg in BUS_CONFIGS:
            bus, created = Bus.objects.get_or_create(
                plate_number=cfg['plate'],
                defaults={
                    'name': cfg['name'],
                    'bus_type': bus_types.get(cfg['type']),
                    'amenities': cfg['amenities'],
                    'is_active': True,
                }
            )
            buses[cfg['plate']] = bus
            if created:
                self.stdout.write(f'    + {cfg["name"]} ({cfg["plate"]})')
                self._create_seat_layout(SeatLayout, bus, cfg['layout'])

        return buses

    def _create_seat_layout(self, SeatLayout, bus, layout_type):
        """
        Creates seat rows for each bus layout type.
        Layout conventions:
          - Columns: 1,2 = left side | 3 = aisle gap | 4,5 = right side (2+2)
          - VIP rows: 2+1 config (col 1 | aisle | col 3,4) — wider spacing
          - Last row can be 5 across or 4 (2+2)
        """
        SeatLayout.objects.filter(bus=bus).delete()
        seats = []

        if layout_type == 'executive_vip':
            # 7 VIP rows (2+1) + driver seat
            # Config: col1=window, col2=aisle-gap, col3=window, col4=aisle-gap (VIP wider)
            # Rows 1-7: VIP 2+1 layout
            for row in range(1, 8):
                # Col 1: window VIP
                seats.append(SeatLayout(bus=bus, seat_number=f'{row}A', seat_class='vip', seat_type='window', row_number=row, column_number=1, row_span=1, col_span=1, bg_color='#D4A017', text_color='#1a1a1a'))
                # Col 2: aisle VIP
                seats.append(SeatLayout(bus=bus, seat_number=f'{row}B', seat_class='vip', seat_type='aisle', row_number=row, column_number=2))
                # Col 3: AISLE GAP
                seats.append(SeatLayout(bus=bus, seat_number=f'gap-{row}-3', seat_class='economy', row_number=row, column_number=3, is_aisle_gap=True))
                # Col 4: single VIP window
                seats.append(SeatLayout(bus=bus, seat_number=f'{row}C', seat_class='vip', seat_type='window', row_number=row, column_number=4, bg_color='#D4A017', text_color='#1a1a1a'))
            # Last row: 4 seats across (2 VIP + 2 VIP) — full width
            for col, label in [(1,'L1'),(2,'L2'),(3,'L3'),(4,'L4')]:
                if col == 3:
                    seats.append(SeatLayout(bus=bus, seat_number=f'gap-L-3', seat_class='economy', row_number=8, column_number=3, is_aisle_gap=True))
                else:
                    seats.append(SeatLayout(bus=bus, seat_number=label, seat_class='vip', seat_type='window' if col in [1,4] else 'aisle', row_number=8, column_number=col, bg_color='#D4A017', text_color='#1a1a1a'))
            bus.total_seats = 28
            bus.save(update_fields=['total_seats'])

        elif layout_type == 'marcopolo_business':
            # Rows 1-3: Business class 2+2 (cols 1,2 | gap | 4,5)
            # Rows 4-10: Economy 2+2
            for row in range(1, 11):
                s_class = 'business' if row <= 3 else 'economy'
                bg = '#2563EB' if row <= 3 else ''
                tc = '#fff' if row <= 3 else ''
                seats.append(SeatLayout(bus=bus, seat_number=f'{row}A', seat_class=s_class, seat_type='window', row_number=row, column_number=1, bg_color=bg, text_color=tc))
                seats.append(SeatLayout(bus=bus, seat_number=f'{row}B', seat_class=s_class, seat_type='aisle', row_number=row, column_number=2, bg_color=bg, text_color=tc))
                seats.append(SeatLayout(bus=bus, seat_number=f'gap-{row}', seat_class='economy', row_number=row, column_number=3, is_aisle_gap=True))
                seats.append(SeatLayout(bus=bus, seat_number=f'{row}C', seat_class=s_class, seat_type='aisle', row_number=row, column_number=4, bg_color=bg, text_color=tc))
                seats.append(SeatLayout(bus=bus, seat_number=f'{row}D', seat_class=s_class, seat_type='window', row_number=row, column_number=5, bg_color=bg, text_color=tc))
            # Last row: 5 seats
            for col, label in [(1,'L1'),(2,'L2'),(3,'L3'),(4,'L4'),(5,'L5')]:
                seats.append(SeatLayout(bus=bus, seat_number=label, seat_class='economy', seat_type='window' if col in [1,5] else 'aisle', row_number=11, column_number=col))
            bus.total_seats = 48
            bus.save(update_fields=['total_seats'])

        elif layout_type == 'futura_mixed':
            # Row 1: 2 VIP seats (1A, 1B) on left, gap, 1 VIP (1C) on right
            seats.append(SeatLayout(bus=bus, seat_number='1A', seat_class='vip', seat_type='window', row_number=1, column_number=1, bg_color='#D4A017', text_color='#1a1a1a'))
            seats.append(SeatLayout(bus=bus, seat_number='1B', seat_class='vip', seat_type='aisle', row_number=1, column_number=2, bg_color='#D4A017', text_color='#1a1a1a'))
            seats.append(SeatLayout(bus=bus, seat_number='gap-1', seat_class='economy', row_number=1, column_number=3, is_aisle_gap=True))
            seats.append(SeatLayout(bus=bus, seat_number='1C', seat_class='vip', seat_type='window', row_number=1, column_number=4, bg_color='#D4A017', text_color='#1a1a1a'))
            seats.append(SeatLayout(bus=bus, seat_number='1D', seat_class='vip', seat_type='window', row_number=1, column_number=5, bg_color='#D4A017', text_color='#1a1a1a'))
            # Rows 2-3: Business 2+2
            for row in range(2, 4):
                for col, label in [(1,'A'),(2,'B'),(3,None),(4,'C'),(5,'D')]:
                    if col == 3:
                        seats.append(SeatLayout(bus=bus, seat_number=f'gap-{row}', seat_class='economy', row_number=row, column_number=3, is_aisle_gap=True))
                    else:
                        seats.append(SeatLayout(bus=bus, seat_number=f'{row}{label}', seat_class='business', seat_type='window' if col in [1,5] else 'aisle', row_number=row, column_number=col, bg_color='#2563EB', text_color='#fff'))
            # Rows 4-10: Economy 2+2
            for row in range(4, 11):
                for col, label in [(1,'A'),(2,'B'),(3,None),(4,'C'),(5,'D')]:
                    if col == 3:
                        seats.append(SeatLayout(bus=bus, seat_number=f'gap-{row}', seat_class='economy', row_number=row, column_number=3, is_aisle_gap=True))
                    else:
                        seats.append(SeatLayout(bus=bus, seat_number=f'{row}{label}', seat_class='economy', seat_type='window' if col in [1,5] else 'aisle', row_number=row, column_number=col))
            # Last row 5 seats
            for col, label in [(1,'L1'),(2,'L2'),(3,'L3'),(4,'L4'),(5,'L5')]:
                seats.append(SeatLayout(bus=bus, seat_number=label, seat_class='economy', row_number=11, column_number=col))
            bus.total_seats = 43
            bus.save(update_fields=['total_seats'])

        elif layout_type in ('standard_economy_48', 'zhongtong_economy_large', 'standard_economy_52'):
            total_rows = 12 if layout_type == 'standard_economy_48' else (14 if layout_type == 'zhongtong_economy_large' else 13)
            for row in range(1, total_rows + 1):
                for col, label in [(1,'A'),(2,'B'),(3,None),(4,'C'),(5,'D')]:
                    if col == 3:
                        seats.append(SeatLayout(bus=bus, seat_number=f'gap-{row}', seat_class='economy', row_number=row, column_number=3, is_aisle_gap=True))
                    else:
                        seats.append(SeatLayout(bus=bus, seat_number=f'{row}{label}', seat_class='economy', seat_type='window' if col in [1,5] else 'aisle', row_number=row, column_number=col))
            # Last row: 5 seats
            for col in range(1, 6):
                seats.append(SeatLayout(bus=bus, seat_number=f'L{col}', seat_class='economy', row_number=total_rows + 1, column_number=col))
            total = total_rows * 4 + 5
            bus.total_seats = total
            bus.save(update_fields=['total_seats'])

        if seats:
            SeatLayout.objects.bulk_create(seats, ignore_conflicts=True)

    # ─────────────────────────────────────────────────────────────
    def _seed_routes(self, Route, cities):
        self.stdout.write('  🗺  Seeding routes...')
        ROUTES = [
            ('nairobi', 'mombasa', 480),
            ('mombasa', 'nairobi', 480),
            ('nairobi', 'kisumu', 350),
            ('kisumu', 'nairobi', 350),
            ('nairobi', 'nakuru', 156),
            ('nakuru', 'nairobi', 156),
            ('nairobi', 'eldoret', 311),
            ('eldoret', 'nairobi', 311),
            ('mombasa', 'malindi', 120),
            ('malindi', 'mombasa', 120),
            ('nairobi', 'kampala', 680),
            ('kampala', 'nairobi', 680),
            ('nairobi', 'meru', 237),
            ('nairobi', 'nyeri', 150),
            ('kisumu', 'eldoret', 125),
            ('nairobi', 'dar es salaam', 860),
        ]
        routes = {}
        for orig, dest, km in ROUTES:
            origin_city = cities.get(orig)
            dest_city = cities.get(dest)
            if not origin_city or not dest_city:
                continue
            route, created = Route.objects.get_or_create(
                origin=origin_city,
                destination=dest_city,
                defaults={'distance_km': km, 'is_active': True}
            )
            routes[f'{orig}-{dest}'] = route
            if created:
                self.stdout.write(f'    + {orig.title()} → {dest.title()} ({km}km)')
        return routes

    # ─────────────────────────────────────────────────────────────
    def _seed_boarding_points(self, BoardingPoint, cities):
        self.stdout.write('  🏢 Seeding boarding points...')
        POINTS = {
            'nairobi': [
                ('Nairobi CBD – Ambassador Hotel', '9 University Way, Nairobi'),
                ('Westlands – Sarit Centre', 'Westlands Road, Nairobi'),
                ('Parklands – Pick n Pay', 'Parklands Road, Nairobi'),
                ('Embakasi – East Airport', 'Airport North Road, Nairobi'),
            ],
            'mombasa': [
                ('Mombasa CBD – Buxton Square', 'Jomo Kenyatta Avenue, Mombasa'),
                ('Nyali – City Mall', 'Links Road, Nyali'),
                ('Changamwe – Stage', 'Changamwe Road, Mombasa'),
            ],
            'kisumu': [
                ('Kisumu CBD – Oginga Odinga Stage', 'Oginga Odinga Street, Kisumu'),
                ('Kisumu Milimani', 'Milimani Road, Kisumu'),
            ],
            'nakuru': [
                ('Nakuru CBD – Westside Mall', 'Kenyatta Avenue, Nakuru'),
                ('Nakuru – Free Area Stage', 'Free Area, Nakuru'),
            ],
            'eldoret': [
                ('Eldoret CBD – Rupa Mall', 'Uganda Road, Eldoret'),
            ],
            'malindi': [
                ('Malindi CBD – Stage', 'Lamu Road, Malindi'),
            ],
            'kampala': [
                ('Kampala – Nakivubo Stage', 'Burton Street, Kampala'),
            ],
            'dar es salaam': [
                ('Dar – Ubungo Bus Terminal', 'Morogoro Road, Dar es Salaam'),
            ],
        }
        boarding_points = {}
        for city_key, points in POINTS.items():
            city = cities.get(city_key)
            if not city:
                continue
            for name, address in points:
                bp, created = BoardingPoint.objects.get_or_create(
                    city=city, name=name,
                    defaults={'address': address, 'is_active': True}
                )
                boarding_points[f'{city_key}-{name}'] = bp
                if created:
                    self.stdout.write(f'    + {city.name}: {name}')
        return boarding_points

    # ─────────────────────────────────────────────────────────────
    def _seed_trips(self, Trip, SeatPrice, routes, buses, boarding_points):
        self.stdout.write('  🕐 Seeding trips (next 7 days)...')

        bus_list = list(buses.values())

        # Schedule: route → list of (departure_time, arrival_time, duration_min, price_vip, price_biz, price_eco, bus_preference)
        SCHEDULES = {
            'nairobi-mombasa': [
                (time(8, 30), time(18, 15), 585, 2300, 1800, 1200, 'Executive MD'),
                (time(19, 30), time(5, 30), 600, 2000, 1600, 1000, 'Marcopolo G7'),
                (time(20, 50), time(5, 40), 590, 1800, 1500, 1200, 'Executive MD'),
                (time(21, 15), time(6, 0), 585, 2000, 1600, 1000, 'Futura 43'),
                (time(21, 45), time(6, 30), 585, 1600, 1300, 900, 'ZHONGTONG'),
                (time(22, 0), time(7, 0), 600, 2300, 1800, 1200, 'Executive MD'),
            ],
            'mombasa-nairobi': [
                (time(7, 0), time(16, 45), 585, 2300, 1800, 1200, 'Executive MD'),
                (time(19, 0), time(4, 30), 570, 2000, 1600, 1000, 'Futura 43'),
                (time(20, 0), time(5, 30), 570, 1800, 1500, 1000, 'Marcopolo G7'),
                (time(21, 30), time(6, 30), 600, 2000, 1600, 1000, 'Yutong Air'),
            ],
            'nairobi-kisumu': [
                (time(7, 0), time(13, 30), 390, 1800, 1400, 1000, 'Executive MD'),
                (time(9, 0), time(15, 0), 360, 1600, 1300, 900, 'Futura 43'),
                (time(22, 0), time(5, 0), 420, 1600, 1300, 900, 'ZHONGTONG'),
            ],
            'kisumu-nairobi': [
                (time(7, 0), time(13, 0), 360, 1800, 1400, 1000, 'Executive MD'),
                (time(21, 30), time(4, 30), 420, 1600, 1300, 900, 'Yutong'),
            ],
            'nairobi-nakuru': [
                (time(7, 0), time(9, 30), 150, 900, 700, 500, 'Futura 43'),
                (time(12, 0), time(14, 30), 150, 900, 700, 500, 'ZHONGTONG'),
                (time(17, 0), time(19, 30), 150, 900, 700, 500, 'Yutong Air'),
            ],
            'nakuru-nairobi': [
                (time(7, 0), time(9, 30), 150, 900, 700, 500, 'Futura 43'),
                (time(15, 0), time(17, 30), 150, 900, 700, 500, 'Yutong'),
            ],
            'nairobi-eldoret': [
                (time(7, 0), time(12, 30), 330, 1500, 1200, 900, 'Executive MD'),
                (time(22, 0), time(3, 30), 330, 1400, 1100, 800, 'ZHONGTONG MEGA'),
            ],
            'mombasa-malindi': [
                (time(8, 0), time(10, 30), 150, 900, 700, 600, 'Futura 43'),
                (time(14, 0), time(16, 30), 150, 900, 700, 600, 'Yutong'),
            ],
            'nairobi-kampala': [
                (time(19, 0), time(7, 0), 720, 3500, 2800, 2000, 'Executive MD'),
            ],
        }

        trip_count = 0
        today = date.today()

        from booking.models import Bus

        for route_key, schedules in SCHEDULES.items():
            route = routes.get(route_key)
            if not route:
                continue

            for dep_time, arr_time, duration, p_vip, p_biz, p_eco, preferred_type in schedules:
                for day_offset in range(7):
                    trip_date = today + timedelta(days=day_offset)

                    # Find a bus matching preferred type, else use any
                    matching_buses = Bus.objects.filter(
                        bus_type__name=preferred_type, is_active=True
                    )
                    bus = matching_buses.first() if matching_buses.exists() else bus_list[0]

                    trip, created = Trip.objects.get_or_create(
                        route=route,
                        bus=bus,
                        departure_date=trip_date,
                        departure_time=dep_time,
                        defaults={
                            'arrival_time': arr_time,
                            'duration_minutes': duration,
                            'status': 'scheduled',
                            'is_active': True,
                        }
                    )

                    if created:
                        # Set boarding points
                        origin_slug = route.origin.name.lower().replace(' ', '-')
                        dest_slug = route.destination.name.lower().replace(' ', '-')
                        from booking.models import BoardingPoint
                        bps = BoardingPoint.objects.filter(city=route.origin)
                        dps = BoardingPoint.objects.filter(city=route.destination)
                        trip.boarding_points.set(list(bps) + list(dps))

                        # Seat prices
                        # Check if weekend/holiday for peak pricing
                        is_peak = trip_date.weekday() in [4, 5] or day_offset == 0  # Fri, Sat, today
                        multiplier = 1.2 if is_peak else 1.0
                        season = 'peak' if is_peak else 'regular'

                        bus_has_vip = bus.seats.filter(seat_class='vip').exists()
                        bus_has_business = bus.seats.filter(seat_class='business').exists()

                        if bus_has_vip:
                            SeatPrice.objects.get_or_create(trip=trip, seat_class='vip', defaults={'price': round(p_vip * multiplier), 'season': season})
                        if bus_has_business:
                            SeatPrice.objects.get_or_create(trip=trip, seat_class='business', defaults={'price': round(p_biz * multiplier), 'season': season})
                        SeatPrice.objects.get_or_create(trip=trip, seat_class='economy', defaults={'price': round(p_eco * multiplier), 'season': season})

                        trip_count += 1

        self.stdout.write(f'    Created {trip_count} trips')

    # ─────────────────────────────────────────────────────────────
    def _seed_jobs(self, JobPosting):
        self.stdout.write('  💼 Seeding job postings...')
        JOBS = [
            {
                'title': 'Professional Long-Distance Coach Driver',
                'department': 'driving',
                'location': 'Nairobi / Mombasa / Kisumu',
                'description': 'We are seeking experienced, safety-conscious coach drivers to operate our luxury VIP and business class buses on long-distance routes including Nairobi–Mombasa, Nairobi–Kisumu, and Nairobi–Kampala. Successful candidates will represent Dreamlines highest service standards.',
                'requirements': '- Valid Class BCE driving license\n- Minimum 5 years long-distance driving experience\n- Clean driving record (no major accidents in 3 years)\n- PSV license and NTSA certification\n- Good communication skills in English and Swahili\n- Ability to work overnight shifts',
                'deadline': date.today() + timedelta(days=45),
            },
            {
                'title': 'Customer Service Representative',
                'department': 'customer_service',
                'location': 'Nairobi',
                'description': 'Handle passenger inquiries, reservations, complaints, and ticketing via phone, WhatsApp, email, and walk-in counter. You will be the first point of contact for Dreamlines 5,000+ daily passengers.',
                'requirements': '- Diploma or degree in Customer Service, Business or related field\n- 2+ years customer-facing experience\n- Fluent in English and Swahili (Kikuyu or Luo is a plus)\n- Computer literacy (MS Office, email)\n- Patience, empathy, and problem-solving skills',
                'deadline': date.today() + timedelta(days=30),
            },
            {
                'title': 'Bus Operations Coordinator',
                'department': 'operations',
                'location': 'Nairobi',
                'description': 'Oversee daily bus operations, track schedules in real-time, coordinate with drivers, manage boarding point logistics, and ensure on-time departures across all routes.',
                'requirements': '- Degree in Logistics, Operations or Transport Management\n- 3+ years experience in transport operations\n- Proficiency with GPS tracking systems\n- Strong organizational and leadership skills\n- Willing to work early morning shifts from 4:30 AM',
                'deadline': date.today() + timedelta(days=35),
            },
            {
                'title': 'Full Stack Developer (React + Django)',
                'department': 'it',
                'location': 'Nairobi (Hybrid)',
                'description': 'Join our technology team to build and maintain the Dreamline booking platform, mobile applications, admin dashboard, and internal tools. You will work on a system handling thousands of daily bookings.',
                'requirements': '- 3+ years full stack development experience\n- Strong proficiency in React and Django/DRF\n- Experience with PostgreSQL and REST APIs\n- Knowledge of M-Pesa Daraja API integration (preferred)\n- Familiarity with AWS or GCP deployment',
                'deadline': date.today() + timedelta(days=60),
            },
            {
                'title': 'Finance Officer',
                'department': 'finance',
                'location': 'Nairobi',
                'description': 'Manage daily financial transactions, reconcile M-Pesa payments, prepare financial reports, and assist with budgeting and forecasting for our transport operations.',
                'requirements': '- CPA Part II or degree in Finance/Accounting\n- 2+ years finance experience\n- Proficiency in QuickBooks or similar accounting software\n- Strong Excel skills\n- Experience with M-Pesa transaction reconciliation preferred',
                'deadline': date.today() + timedelta(days=25),
            },
        ]

        for job in JOBS:
            obj, created = JobPosting.objects.get_or_create(
                title=job['title'],
                defaults=job
            )
            if created:
                self.stdout.write(f'    + {job["title"]}')