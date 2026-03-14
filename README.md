# Thomian Library System

> Professional-grade Library Information System (ILS) with Wayfinding Kiosk for St. Thomas Secondary School.

**Stack:** React 19 + TypeScript (Vite) · Django 5 + DRF · PostgreSQL · Nginx + Gunicorn · Google Gemini AI

---

## Quick Start (Development)

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL running locally

### 1. Clone & set up environment
```bash
# Copy the environment template
cp docs/.env.example .env
```

Edit `.env` and set at minimum:
- `DJANGO_SECRET_KEY` — generate with the command in the file
- `DB_PASSWORD` — your local PostgreSQL password
- `DEBUG=True` — for development
- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/)

### 2. Backend setup
```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/macOS

# Install dependencies
pip install -r backend/requirements.txt

# Apply database migrations
python manage.py migrate

# Create an admin user
python manage.py createsuperuser
```

### 3. Frontend setup
```bash
npm install
```

### 4. Run both servers

**Windows (recommended):**
```
Double-click dev.bat
```

**Or manually:**
```bash
# Terminal 1 — Backend
python manage.py runserver 8000

# Terminal 2 — Frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Production Deployment

See [`docs/deployment.md`](docs/deployment.md) for the full guide including:
- Nginx + Gunicorn + systemd setup
- SSL/HTTPS with Cloudflare or Let's Encrypt
- PostgreSQL backup strategy (`pg_dump` cron)
- Hardware setup (Zebra printer, barcode scanners)

**Quick deploy (Linux server):**
```bash
chmod +x deploy.sh && ./deploy.sh
```

---

## Project Structure

```
thomian-lib/
├── manage.py               # Django management entry point
├── deploy.sh               # Production deployment script (Linux)
├── dev.bat                 # Development launcher (Windows)
├── package.json            # Frontend dependencies
├── vite.config.ts          # Vite build config
├── App.tsx                 # React root component
├── types.ts                # Shared TypeScript types
├── backend/                # Django app (API, models, auth)
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   ├── models.py
│   ├── views.py
│   ├── serializers.py
│   └── migrations/
├── components/             # React UI components
├── services/               # Frontend service modules
├── docs/                   # Documentation
│   ├── blueprint.md        # Architecture & schema reference
│   ├── deployment.md       # Deployment guide
│   └── .env.example        # Environment variable template
└── public/                 # Static public assets
```

---

## Default Accounts (Demo)

| Role | Username | PIN |
|---|---|---|
| Administrator | `admin` | `1234` |
| Librarian | `librarian` | `5678` |

> ⚠️ **Change these immediately** after first login via Django Admin (`/api/admin/`).

---

## Key Features

- 📚 MARC-Lite book cataloging with DDC/call number
- 🔄 Full circulation (checkout, return, renewal, holds)
- 👤 Patron management with photo IDs and PINs
- 💰 Automated fine calculation and replacement assessment
- 🖥️ Self-service Kiosk / Wayfinding interface
- 📊 Librarian Command Dashboard with live KPIs
- 🤖 Google Gemini AI (book summaries, shelf mapping)
- 🏷️ Zebra ZPL printing (spine labels, patron cards, slips)
- 📱 Barcode scanner integration (HID mode)
- 🔒 Role-based access (Administrator / Librarian)
