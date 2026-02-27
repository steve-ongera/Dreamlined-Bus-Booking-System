# booking/management/commands/unlock_expired_seats.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from booking.models import SeatLock

class Command(BaseCommand):
    help = 'Remove expired seat locks'

    def handle(self, *args, **kwargs):
        deleted, _ = SeatLock.objects.filter(expires_at__lte=timezone.now()).delete()
        self.stdout.write(f'Deleted {deleted} expired seat locks')