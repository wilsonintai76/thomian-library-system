
# Thomian Library: Master AI-Generation Blueprint

## 1. Project Overview

**Name:** Thomian Library (St. Thomas Secondary School)
**Purpose:** Professional-grade Library Information System (ILS) with Wayfinding Kiosk.
**Version:** 1.0 (Production-Ready Draft)
**Last Updated:** 2026-02-26

The Thomian Library System is a full-stack web application designed for secondary school library operations. It supports end-to-end library workflows — cataloging, circulation, patron management, fine collection, and AI-assisted features — all accessible through a secure web interface.

---

## 2. Technical Architecture

### Frontend

- **Framework:** React 19 + TypeScript (Vite)
- **AI SDK:** `@google/genai` (Google Gemini)
- **QR/Barcode:** `html5-qrcode`
- **Icons:** `lucide-react`
- **Entry Point:** `index.tsx` → `App.tsx`
- **Key Config:** `vite.config.ts` maps `process.env.API_KEY` and `process.env.GEMINI_API_KEY` from the `GEMINI_API_KEY` env variable at build time.

### Backend

- **Framework:** Django 5+ with Django REST Framework
- **Auth:** Token-based (`rest_framework.authtoken`) + Session Auth
- **CORS:** `django-cors-headers`
- **File Storage:** Local `/media` (default) or Cloudflare R2/AWS S3 (`USE_S3=True`)
- **App Server:** Gunicorn
- **Database:** PostgreSQL

### Professional Cataloging (MARC-Lite)

- **Biblio vs Holdings:** Differentiates between bibliographic metadata (Title, Series) and item-level data (Barcode, Value).
- **Financial Integration:** Every book has a `value` (Replacement Cost) which feeds the automated "Assess Loss" logic.

---

## 3. System Modules

| Module | Description |
|---|---|
| **Catalog** | Book registration, MARC-lite fields, cover image upload, DDC/call number management |
| **Circulation** | Checkout, return, renewal, overdue detection, configurable loan rules |
| **Patron Management** | Student profiles, class grouping, photo ID, PIN, block/archive status |
| **Fine & Replacement** | Automated fine calculation, replacement assessment, payment recording |
| **Kiosk / Wayfinding** | Self-service patron login (PIN), book search, location map, AI Summary |
| **Admin Dashboard** | Real-time KPIs, system health, live circulation stream, alert management |
| **AI Features** | Gemini-powered book summaries, AI Auto-Map for shelf location |
| **Hardware Integration** | Zebra printer (spine labels, patron ID cards, registration slips), barcode scanner |
| **Role-Based Access** | Administrator (full access) and Librarian (filtered access to settings) |

---

## 4. Extended Schema

### Book
`id`, `title`, `author`, `isbn`, `ddc_code`, `call_number`, `barcode_id`, `shelf_location`, `status`, `value` (Replacement Cost), `series`, `edition`, `language`, `pages`, `vendor`, `acquisition_date`, `summary`, `publisher`, `pub_year`, `format`, `material_type`, `loan_count`, `created_at`, `cover_url`

### Patron
`student_id`, `full_name`, `patron_group`, `class_name`, `email`, `phone`, `is_blocked`, `fines`, `is_archived`, `photo_url`, `pin`

### Transaction
`id`, `patron_id`, `amount`, `type` (FINE_PAYMENT, REPLACEMENT, etc.), `method`, `timestamp`, `librarian_id` (audit trail)

### Supporting Models
- **CirculationRule:** Configurable loan periods, fine rates, and renewal limits per patron group.
- **LibraryEvent:** Scheduled library events and announcements.
- **SystemAlert:** Operational alerts surfaced to the dashboard.
- **SystemConfig:** Key-value store for runtime configuration (e.g., library name, logo, fine rate).
- **LibraryClass:** School class/grade groupings for bulk patron management.

---

## 5. Feature Details

- **Librarian Command Dashboard:** Central "Mission Control" for staff with real-time KPIs, system health monitoring, and a live circulation stream.
- **Undo Functionality:** Temporary rollback option for critical actions like deleting a book or patron.
- **Book Summaries:** `summary` field on Book, displayed in Kiosk search results and BookPosterCard. Can be AI-generated via Gemini.
- **Registration Slip:** Auto-generated Patron ID and printable registration slip with ID and PIN upon patron registration.
- **Profile Management:** Patrons can update their PIN via the ProfileEditModal in the Kiosk.
- **Role-Based Access:** Administrator and Librarian roles with filtered access to system settings.

---

## 6. Professional Standards

- **Koha Compliance:** Field alignment with the standard ILS for future migration to Koha or similar open-source ILS.
- **MARC-Lite:** Bibliographic and holdings separation mirrors MARC 21 principles.
- **Zebra Labeling:** 300 dpi ZPL streams for:
  - 1.5" × 1" spine labels
  - CR80 PVC identity cards (3.375" × 2.125")
  - Standard receipt-format registration slips

---

## 7. Known Constraints & Decisions

| Constraint | Decision |
|---|---|
| No Django project shell (`manage.py`) in version control | Backend is structured as a single Django app module (`backend/`) |
| API key for Gemini | Injected at Vite build time via `GEMINI_API_KEY`; never stored in source code |
| Default storage | Local `/media` folder — requires manual backup strategy |
| Auth default | `AllowAny` on DRF; specific views enforce `IsAuthenticated` or `IsAdminUser` |
