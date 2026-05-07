"""
Management command: populate_people_trip_data
=============================================
Seeds realistic Kenyan passenger bookings, booked seats and M-Pesa
payments for every existing Trip in the database.

Does NOT create cities, buses, routes or trips — those must already exist.

Usage:
    python manage.py populate_people_trip_data
    python manage.py populate_people_trip_data --clear   # wipe bookings first
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
from decimal import Decimal
import random
import uuid


# ---------------------------------------------------------------------------
# Kenyan fixture data
# ---------------------------------------------------------------------------

KENYAN_FIRST_NAMES_MALE = [
    "Kamau", "Mwangi", "Omondi", "Otieno", "Njoroge", "Kiptoo", "Mutua",
    "Waweru", "Kariuki", "Gitonga", "Abubakar", "Hassan", "Baraka", "Juma",
    "Kipchoge", "Cheruiyot", "Rotich", "Sang", "Koech", "Bett", "Mutai",
    "Chesang", "Kiprotich", "Saitoti", "Lenku", "Tobiko", "Ndegwa", "Ngugi",
    "Kimani", "Mugo", "Gichuru", "Maina", "Njenga", "Wainaina", "Murathe",
]

KENYAN_FIRST_NAMES_FEMALE = [
    "Wanjiku", "Akinyi", "Atieno", "Nyambura", "Wangari", "Njeri", "Wambui",
    "Mumbi", "Wanjira", "Wairimu", "Adhiambo", "Awino", "Akoth", "Anyango",
    "Nekesa", "Nafula", "Nasimiyu", "Naliaka", "Chelangat", "Chepkorir",
    "Jepchirchir", "Kosgei", "Chepngetich", "Jepkemoi", "Fatuma", "Amina",
    "Zainab", "Halima", "Maryam", "Grace", "Faith", "Mercy", "Hope", "Esther",
]

KENYAN_LAST_NAMES = [
    "Kamau", "Wanjiku", "Ochieng", "Otieno", "Mwangi", "Njoroge", "Kipchoge",
    "Mutua", "Kariuki", "Gitonga", "Hassan", "Baraka", "Koech", "Rotich",
    "Cheruiyot", "Chesang", "Saitoti", "Ndegwa", "Kimani", "Mugo",
    "Gichuru", "Maina", "Njenga", "Wainaina", "Abubakar", "Juma", "Bett",
    "Mutai", "Sang", "Kiprotich", "Tobiko", "Lenku", "Ngugi", "Waweru",
    "Ndirangu", "Macharia", "Muriuki", "Muthoni", "Gathoni", "Akinyi",
    "Adhiambo", "Ogolla", "Owino", "Ouma", "Okello", "Onyango",
    "Nekesa", "Nafula", "Wekesa", "Simiyu", "Barasa", "Wafula", "Masinde",
]

KENYAN_NATIONALITIES = [
    "Kenyan", "Kenyan", "Kenyan", "Kenyan", "Kenyan",
    "Ugandan", "Tanzanian", "Rwandan", "Ethiopian", "Sudanese",
]

KENYAN_EMAIL_DOMAINS = [
    "gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
    "ke.com", "safaricom.co.ke",
]

KENYAN_PHONE_PREFIXES = [
    "0700", "0701", "0702", "0703", "0710", "0711",
    "0712", "0720", "0721", "0722", "0723", "0733",
    "0740", "0741", "0742", "0743", "0755", "0756",
]

KENYAN_ID_PREFIXES = ["3", "2", "1", "4", "8", "9", "7", "6", "5"]

# Used when a trip has no SeatPrice records configured
FALLBACK_SEAT_PRICES = {
    "vip":      Decimal("2500"),
    "business": Decimal("1500"),
    "economy":  Decimal("900"),
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_phone():
    return random.choice(KENYAN_PHONE_PREFIXES) + "".join(
        str(random.randint(0, 9)) for _ in range(6)
    )


def make_id_number():
    return random.choice(KENYAN_ID_PREFIXES) + "".join(
        str(random.randint(0, 9)) for _ in range(7)
    )


def make_person():
    gender = random.choice(["M", "F"])
    first  = random.choice(
        KENYAN_FIRST_NAMES_MALE if gender == "M" else KENYAN_FIRST_NAMES_FEMALE
    )
    last  = random.choice(KENYAN_LAST_NAMES)
    email = (
        f"{first.lower()}.{last.lower()}"
        f"{random.randint(1, 99)}@{random.choice(KENYAN_EMAIL_DOMAINS)}"
    )
    return {
        "name":        f"{first} {last}",
        "email":       email,
        "phone":       make_phone(),
        "id_number":   make_id_number(),
        "nationality": random.choice(KENYAN_NATIONALITIES),
    }


# ---------------------------------------------------------------------------
# Command
# ---------------------------------------------------------------------------

class Command(BaseCommand):
    help = "Seed Kenyan passenger bookings for all existing trips"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear", action="store_true",
            help="Delete all existing bookings, booked seats and payments first",
        )

    def handle(self, *args, **options):
        from booking.models import Trip, BoardingPoint, Booking, BookedSeat, Payment

        if options["clear"]:
            self.stdout.write(self.style.WARNING(
                "Clearing bookings, booked seats and payments…"
            ))
            Payment.objects.all().delete()
            BookedSeat.objects.all().delete()
            Booking.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Cleared.\n"))

        trips = list(
            Trip.objects.select_related(
                "route__origin", "route__destination", "bus"
            ).all()
        )

        if not trips:
            self.stdout.write(self.style.ERROR(
                "No trips found in the database. Please create trips first."
            ))
            return

        self.stdout.write(f"Found {len(trips)} trip(s). Seeding bookings…\n")

        with transaction.atomic():
            for trip in trips:
                self._seed_trip(trip, BoardingPoint, Booking, BookedSeat, Payment)

        self.stdout.write(self.style.SUCCESS(
            f"\n✅  Done!\n"
            f"   Bookings:     {Booking.objects.count()}\n"
            f"   Booked Seats: {BookedSeat.objects.count()}\n"
            f"   Payments:     {Payment.objects.count()}\n"
        ))

    # -----------------------------------------------------------------------

    def _seed_trip(self, trip, BoardingPoint, Booking, BookedSeat, Payment):
        seats = list(trip.bus.seats.filter(is_active=True))
        if not seats:
            self.stdout.write(self.style.WARNING(
                f"  Trip {trip.id} — bus has no active seats, skipping."
            ))
            return

        # Seat-price lookup from existing SeatPrice rows, or fall back to defaults
        seat_prices_map = {
            sp.seat_class: sp.price
            for sp in trip.seat_prices.all()
        }
        if not seat_prices_map:
            seat_prices_map = FALLBACK_SEAT_PRICES

        # Boarding points for origin / destination cities
        origin_bps = list(
            BoardingPoint.objects.filter(city=trip.route.origin, is_active=True)
        )
        dest_bps = list(
            BoardingPoint.objects.filter(city=trip.route.destination, is_active=True)
        )

        # Skip seats that are already booked (safe to re-run without --clear)
        already_booked_ids = set(
            BookedSeat.objects.filter(
                booking__trip=trip
            ).values_list("seat_id", flat=True)
        )
        available = [s for s in seats if s.id not in already_booked_ids]

        if not available:
            self.stdout.write(
                f"  Trip {trip.id} ({trip.route}) — all seats already booked, skipping."
            )
            return

        # Fill 40–85 % of available seats
        fill_count    = max(1, int(len(available) * random.uniform(0.40, 0.85)))
        seats_to_book = random.sample(available, min(fill_count, len(available)))

        # ── Loop: group seats into realistic party sizes ─────────────────
        i = 0
        while i < len(seats_to_book):
            group_size = random.choice([1, 1, 1, 2, 2, 3, 4])
            group      = seats_to_book[i: i + group_size]
            i         += group_size

            person      = make_person()
            boarding_bp = random.choice(origin_bps) if origin_bps else None
            dropping_bp = random.choice(dest_bps)   if dest_bps   else None
            total       = sum(
                seat_prices_map.get(s.seat_class, Decimal("1000")) for s in group
            )

            # Payment status — weighted toward completed
            pay_status = random.choice(
                ["completed"] * 6 + ["pending"] + ["failed"] + ["cancelled"]
            )
            book_status = {
                "completed": "confirmed",
                "pending":   "pending",
                "failed":    "pending",
                "cancelled": "cancelled",
            }.get(pay_status, "pending")

            booking = Booking.objects.create(
                trip=trip,
                boarding_point=boarding_bp,
                dropping_point=dropping_bp,
                passenger_name=person["name"],
                passenger_email=person["email"],
                passenger_phone=person["phone"],
                passenger_id_number=person["id_number"],
                passenger_nationality=person["nationality"],
                total_amount=total,
                status=book_status,
                ticket_sent=(book_status == "confirmed"),
            )

            for seat in group:
                BookedSeat.objects.create(
                    booking=booking,
                    seat=seat,
                    price=seat_prices_map.get(seat.seat_class, Decimal("1000")),
                )

            # M-Pesa payment record
            mpesa_receipt = ""
            txn_date      = None
            if pay_status == "completed":
                mpesa_receipt = "QHG" + "".join(
                    str(random.randint(0, 9)) for _ in range(9)
                )
                txn_date = timezone.now() - timedelta(days=random.randint(0, 10))

            Payment.objects.create(
                booking=booking,
                amount=total,
                phone_number=person["phone"],
                checkout_request_id=f"ws_CO_{uuid.uuid4().hex[:16].upper()}",
                merchant_request_id=f"{uuid.uuid4().hex[:8].upper()}",
                mpesa_receipt_number=mpesa_receipt,
                transaction_date=txn_date,
                status=pay_status,
                result_code="0" if pay_status == "completed" else str(random.randint(1, 32)),
                result_desc=(
                    "The service request is processed successfully."
                    if pay_status == "completed"
                    else "Request cancelled by user."
                ),
            )

        self.stdout.write(
            f"  ✓ Trip {trip.id} ({trip.route}) "
            f"— {len(seats_to_book)} seats booked across "
            f"{booking.id - booking.id + 1 if False else '~'}{len(seats_to_book) // 2 or 1}+ bookings"
        )