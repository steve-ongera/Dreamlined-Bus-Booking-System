# 🚌 Dreamline Bus Booking System

A full-stack bus booking platform built with **Django REST Framework** (backend) and **React + Vite** (frontend). Features luxury seat selection, M-Pesa STK Push payments, e-ticket delivery, and an admin dashboard for managing bus layouts.

---

## 📁 Project Structure

```
dreamline/
├── backend/               # Django project
│   ├── booking/           # Main app
│   │   ├── models.py      # All data models
│   │   ├── serializers.py # DRF serializers
│   │   ├── views.py       # ViewSets + M-Pesa integration
│   │   └── urls.py        # App URL routes
│   ├── dreamline/
│   │   ├── settings.py    # Project settings
│   │   └── urls.py        # Main URL config
│   └── requirements.txt
└── frontend/              # React + Vite
    ├── src/
    │   ├── App.jsx
    │   ├── global.css
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── Footer.jsx
    │   │   └── BusSeatMap.jsx    # Core seat layout component
    │   ├── pages/
    │   │   ├── Home.jsx
    │   │   ├── Results.jsx       # Search results + booking flow
    │   │   ├── TrackTicket.jsx
    │   │   ├── Contact.jsx
    │   │   ├── Careers.jsx
    │   │   ├── About.jsx
    │   │   └── AboutDreamline.jsx
    │   └── services/
    │       └── api.js
    └── package.json
```

---

## 🚀 Quick Start

### Backend Setup

```bash
# 1. Create virtual environment
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows

# 2. Install dependencies
pip install django djangorestframework django-filter django-cors-headers \
            psycopg2-binary requests python-dotenv pillow

# 3. Create project structure
django-admin startproject dreamline .
python manage.py startapp booking

# 4. Copy all backend files into place, then:
python manage.py makemigrations booking
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend

# Create Vite React project (if starting fresh)
npm create vite@latest . -- --template react

# Install dependencies
npm install react-router-dom axios bootstrap bootstrap-icons

# Start dev server
npm run dev
```

### Environment Variables (`.env`)

```env
# Django
SECRET_KEY=your-very-secret-key
DEBUG=True
DB_NAME=dreamline
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_PORT=5432

# M-Pesa Daraja API (get from developer.safaricom.co.ke)
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://yourdomain.co.ke/api/v1/payments/callback/
MPESA_ENVIRONMENT=sandbox

# Email (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
DEFAULT_FROM_EMAIL=tickets@dreamline.co.ke
```

---

## 🪑 Bus Seat Layout System

Each bus has its **own unique seat layout** stored in the database. Seats are positioned on a grid with `row_number` and `column_number`.

### Seat Classes

| Class    | Color  | Features                              |
|----------|--------|---------------------------------------|
| VIP      | Gold   | Extra width, leg room, premium spacing |
| Business | Blue   | Wider seats, USB charging              |
| Economy  | Green  | Standard comfortable seating           |

### Admin Layout Customization

Staff can customize bus layouts via the admin dashboard using simple keyword commands:

#### REST API - Update Individual Seat
```http
PATCH /api/v1/buses/{bus-slug}/update-seat/
{
  "seat_number": "1A",
  "updates": {
    "color": "#FFD700",
    "class": "vip",
    "label": "VIP1",
    "padding": 8
  }
}
```

#### Keyword Commands Reference

| Keyword      | Model Field   | Example Value      |
|--------------|---------------|--------------------|
| `color`      | `bg_color`    | `"#FFD700"`        |
| `text_color` | `text_color`  | `"#000000"`        |
| `class`      | `seat_class`  | `"vip"/"business"/"economy"` |
| `label`      | `custom_label`| `"VIP-A"`          |
| `padding`    | `extra_padding`| `8` (pixels)      |
| `active`     | `is_active`   | `true/false`       |
| `row_span`   | `row_span`    | `2`                |
| `col_span`   | `col_span`    | `2`                |

#### Bulk Update Seats
```http
POST /api/v1/buses/{bus-slug}/bulk-update-seats/
{
  "seats": [
    {"seat_number": "1A", "seat_class": "vip", "bg_color": "#FFD700"},
    {"seat_number": "1B", "seat_class": "vip", "bg_color": "#FFD700"},
    {"seat_number": "2A", "is_aisle_gap": true}
  ]
}
```

### Creating a Bus Layout (Example: 48-seater)

```python
# In Django shell: python manage.py shell
from booking.models import Bus, SeatLayout

bus = Bus.objects.get(slug='executive-md-kxx-123')

# VIP rows 1-3 (cols 1,2 | gap | 3,4)
for row in range(1, 4):
    for col in [1, 2]:
        SeatLayout.objects.create(
            bus=bus, seat_number=f"{row}{'AB'[col-1]}",
            seat_class='vip', row_number=row, column_number=col
        )
    # aisle gap
    SeatLayout.objects.create(
        bus=bus, seat_number=f"gap-{row}",
        row_number=row, column_number=3, is_aisle_gap=True, seat_class='economy'
    )
    for col in [4, 5]:
        SeatLayout.objects.create(
            bus=bus, seat_number=f"{row}{'CD'[col-4]}",
            seat_class='vip', row_number=row, column_number=col
        )

# Economy rows 4-12
for row in range(4, 13):
    for col, label in [(1,'A'),(2,'B'),(3,None),(4,'C'),(5,'D')]:
        SeatLayout.objects.create(
            bus=bus, seat_number=f"gap-{row}-{col}" if col==3 else f"{row}{label}",
            seat_class='economy', row_number=row, column_number=col,
            is_aisle_gap=(col==3)
        )

# Last row: 5 seats across
for col in range(1, 6):
    SeatLayout.objects.create(
        bus=bus, seat_number=f"L{col}",
        seat_class='economy', row_number=13, column_number=col
    )
```

---

## 💳 M-Pesa Integration

The system uses **Safaricom Daraja API** STK Push (Lipa Na M-Pesa Online).

### Flow

1. Customer selects seats → enters phone → clicks Pay
2. Backend calls `stkpush/v1/processrequest` → STK push sent
3. Customer enters PIN on phone
4. M-Pesa calls our callback URL with result
5. Frontend polls `/api/v1/payments/status/{ref}/` every **5 seconds**
6. On success: booking confirmed, ticket emailed

### Callback URL Setup

For development, use [ngrok](https://ngrok.com):
```bash
ngrok http 8000
# Update MPESA_CALLBACK_URL to: https://abc123.ngrok.io/api/v1/payments/callback/
```

### Switch to Production

```env
MPESA_ENVIRONMENT=production
```
Update base URLs in `views.py` from `sandbox.safaricom.co.ke` to `api.safaricom.co.ke`.

---

## 📧 Email Tickets

On payment confirmation, the system sends an HTML email ticket to the passenger containing:
- Booking reference number
- Trip details (route, date, time, bus)
- Seat numbers
- Total amount paid
- Ticket tracking link

---

## 🗺️ API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/cities/` | List all cities |
| GET | `/api/v1/trips/search/?origin=nairobi&destination=mombasa&date=2026-02-27` | Search trips |
| GET | `/api/v1/trips/{slug}/` | Trip detail with seat layout |
| POST | `/api/v1/bookings/` | Create booking |
| GET | `/api/v1/bookings/track/{reference}/` | Track booking |
| POST | `/api/v1/payments/initiate/` | Initiate M-Pesa STK |
| POST | `/api/v1/payments/callback/` | M-Pesa callback |
| GET | `/api/v1/payments/status/{ref}/` | Poll payment status |
| GET | `/api/v1/jobs/` | List job openings |

---

## 📱 Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Search + popular routes + features |
| `/results` | Results | Trip list, seat map, booking flow |
| `/track/:ref` | Track Ticket | Look up booking by reference |
| `/about-dreamline` | About | Company info, fleet |
| `/careers` | Careers | Job listings |
| `/contact` | Contact | Contact form + info |

---

## 🔒 Admin Dashboard

Access at `/admin/` with superuser credentials.

All models are registered. Staff can:
- Create/edit cities, routes, bus types
- Build bus layouts seat by seat
- Schedule trips and set seat prices
- View and manage bookings
- Monitor payments

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+, Django 5.x, DRF |
| Database | PostgreSQL |
| Frontend | React 18, Vite, React Router v6 |
| Styling | Custom CSS + Bootstrap Icons |
| Payments | Safaricom Daraja M-Pesa API |
| Email | SMTP (Gmail/SendGrid) |
| HTTP Client | Axios |

---

## 📞 Support

- **Email:** info@dreamline.co.ke
- **Website:** https://dreamline.co.ke
- **Phone:** +254 700 000 000