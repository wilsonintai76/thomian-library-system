
# Thomian Library System — Deployment Guide

> **Last Updated:** 2026-03-09
> **Target Stack:** React 19 (Vite) + Django 6 + PostgreSQL 16 + Nginx + Gunicorn
> **Primary Deployment Method:** Docker Compose (Windows)

---

## 1. Architecture Overview

All three services run inside Docker containers coordinated by Docker Compose, plus an optional Cloudflare layer in front for SSL and DDoS protection.

```
Internet
   │
   ▼
Cloudflare (SSL, DNS — optional but recommended)
   │  :443
   ▼
Windows Host
   ├─ thomian-frontend  (Nginx :80)  ← serves React SPA + proxies /api/
   ├─ thomian-backend   (Gunicorn :8000, internal only)
   └─ thomian-db        (PostgreSQL :5432, internal only)
```

| Container | Image / Build | Role |
|---|---|---|
| `thomian-frontend` | `Dockerfile.frontend` (Nginx + React build) | Static SPA + reverse proxy |
| `thomian-backend` | `Dockerfile.backend` (Python + Gunicorn) | REST API, Auth, migrations |
| `thomian-db` | `postgres:16-alpine` | PostgreSQL with persistent volume |

> **HTTPS is mandatory** for the Mobile Scanner, AI Vision Upload, and QR features (Secure Context requirement). Use Cloudflare Tunnel or a reverse proxy with a certificate in front of port 80.

---

## 2. Windows Prerequisites

### Install Docker Desktop
1. Download from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/).
2. During install, select **"Use WSL 2 based engine"** (recommended).
3. After install, open Docker Desktop — wait until the taskbar icon shows **"Engine running"**.
4. Verify in PowerShell:
   ```powershell
   docker --version      # Docker Desktop 4.x or later
   docker compose version # v2.x or later
   ```

> Docker Desktop includes both the Docker engine and Compose v2 (`docker compose`). No separate install needed.

### Install Git (if not already present)
```powershell
winget install Git.Git
```

---

## 3. Quick Start (5 minutes)

```powershell
# 1. Clone the repository
git clone https://github.com/wilsonintai76/thomian-library-system.git
cd thomian-library-system

# 2. Create your environment file
Copy-Item docs\.env.example .env

# 3. Open .env and fill in required values (see Section 5)
notepad .env

# 4. Build and start all containers
docker compose up --build -d

# 5. Create the admin superuser (run once)
docker compose exec backend python manage.py createsuperuser

# 6. Open the app
Start-Process "http://localhost"
```

That's it. The backend auto-runs `migrate` and `collectstatic` on every startup.

---

## 4. Pre-Deployment Checklist

### ✅ Environment & Secrets
- [ ] Copied `docs/.env.example` to `.env`
- [ ] Set `DJANGO_SECRET_KEY` to a generated value (never use the default)
- [ ] Set `DEBUG=False`
- [ ] Set `ALLOWED_HOSTS` to your domain / server IP
- [ ] Set `CSRF_TRUSTED_ORIGINS` to your HTTPS URL
- [ ] Set a strong `DB_PASSWORD` (not `changeme`)
- [ ] Obtained a `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/)

### ✅ Docker
- [ ] Docker Desktop is running (Engine status = Running)
- [ ] `.env` file is present in the project root
- [ ] Ports 80 (and optionally 443) are free on the host

### ✅ First-run
- [ ] Superuser created via `docker compose exec backend python manage.py createsuperuser`
- [ ] Default password changed for `admin` and `librarian` accounts

---

## 5. Environment Variables (`.env`)

| Variable | Required | Example | Notes |
|---|---|---|---|
| `DJANGO_SECRET_KEY` | ✅ | `abc123...` | Generate with the command below |
| `DEBUG` | ✅ | `False` | Must be `False` in production |
| `ALLOWED_HOSTS` | ✅ | `library.stthomas.edu,localhost` | Comma-separated |
| `CSRF_TRUSTED_ORIGINS` | ✅ | `https://library.stthomas.edu` | Full HTTPS URL |
| `CORS_ALLOWED_ORIGINS` | ✅ | `https://library.stthomas.edu` | Full HTTPS URL |
| `DB_NAME` | ✅ | `thomian_db` | PostgreSQL database name |
| `DB_USER` | ✅ | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | ✅ | `str0ngP@ss!` | Must not be `changeme` |
| `DB_HOST` | ✅ | `db` | Always `db` inside Docker Compose |
| `DB_PORT` | ✅ | `5432` | Default PostgreSQL port |
| `GEMINI_API_KEY` | ✅ | `AIza...` | For AI features |
| `USE_S3` | — | `False` | `True` only for Cloudflare R2 |

**Generate a secret key:**
```powershell
docker compose run --rm backend python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

## 6. Common Docker Commands

```powershell
# Start all services (detached)
docker compose up -d

# Start and rebuild images (after code changes)
docker compose up --build -d

# Stop all services
docker compose down

# Stop and delete volumes (⚠️ destroys database data)
docker compose down -v

# View live logs
docker compose logs -f

# View logs for a single service
docker compose logs -f backend
docker compose logs -f db

# Open a shell inside the backend container
docker compose exec backend bash

# Run a Django management command
docker compose exec backend python manage.py <command>

# Check migration status
docker compose exec backend python manage.py showmigrations

# Create a superuser
docker compose exec backend python manage.py createsuperuser

# Restart a single service (e.g. after .env change)
docker compose restart backend
```

---

## 7. HTTPS with Cloudflare Tunnel (Recommended for Windows)

Cloudflare Tunnel is the easiest way to get HTTPS on a Windows machine without opening firewall ports or managing certificates.

### Setup

1. **Create a Cloudflare account** at [cloudflare.com](https://cloudflare.com) and add your domain.

2. **Install `cloudflared` on Windows:**
   ```powershell
   winget install Cloudflare.cloudflared
   ```

3. **Authenticate:**
   ```powershell
   cloudflared tunnel login
   ```

4. **Create a tunnel:**
   ```powershell
   cloudflared tunnel create thomian
   ```

5. **Create a config file** at `C:\Users\<you>\.cloudflared\config.yml`:
   ```yaml
   tunnel: <your-tunnel-id>
   credentials-file: C:\Users\<you>\.cloudflared\<tunnel-id>.json

   ingress:
     - hostname: library.stthomas.edu
       service: http://localhost:80
     - service: http_status:404
   ```

6. **Route DNS and run:**
   ```powershell
   cloudflared tunnel route dns thomian library.stthomas.edu
   cloudflared tunnel run thomian
   ```

7. **Update your `.env`** to reflect the live HTTPS domain:
   ```
   ALLOWED_HOSTS=library.stthomas.edu,localhost
   CSRF_TRUSTED_ORIGINS=https://library.stthomas.edu
   CORS_ALLOWED_ORIGINS=https://library.stthomas.edu
   ```
   Then: `docker compose restart backend`

8. **Run cloudflared as a Windows Service** (runs on boot):
   ```powershell
   cloudflared service install
   Start-Service cloudflared
   ```

---

## 8. HTTPS with Nginx Reverse Proxy + Let's Encrypt (Alternative)

If you manage your own domain DNS on Windows Server or a VM:

```powershell
# Install Nginx for Windows (or use the container approach below)
# Then obtain a certificate with win-acme:
winget install win-acme.win-acme
wacs --target manual --host library.stthomas.edu --installation nginx
```

Add HTTPS to `nginx.conf` and mount it into the `thomian-frontend` container, or run a separate `certbot/certbot` container in `docker-compose.yml`.

---

## 9. Database Management

### Backup (PowerShell)
```powershell
# Create a timestamped SQL dump
$date = Get-Date -Format "yyyyMMdd_HHmmss"
docker compose exec db pg_dump -U postgres thomian_db | Out-File "backup_$date.sql" -Encoding utf8
```

### Restore
```powershell
Get-Content .\backup_20260309_020000.sql | docker compose exec -T db psql -U postgres thomian_db
```

### Automated Nightly Backup (Windows Task Scheduler)
1. Save the following as `C:\Scripts\thomian-backup.ps1`:
   ```powershell
   Set-Location C:\path\to\thomian-library-system
   $date = Get-Date -Format "yyyyMMdd"
   docker compose exec db pg_dump -U postgres thomian_db | Out-File "C:\Backups\thomian_$date.sql" -Encoding utf8
   # Delete backups older than 30 days
   Get-ChildItem C:\Backups\thomian_*.sql | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item
   ```
2. Open **Task Scheduler** → Create Basic Task → Daily at 02:00 AM → Action: `powershell.exe -File C:\Scripts\thomian-backup.ps1`.

### Accessing PostgreSQL directly
```powershell
docker compose exec db psql -U postgres thomian_db
```

---

## 10. Updating the Application

```powershell
# 1. Pull latest code
git pull origin main

# 2. Rebuild and restart (zero-downtime: db stays running)
docker compose up --build -d

# 3. Check logs to confirm migrations ran cleanly
docker compose logs backend --tail 30
```

---

## 11. Default Credentials (⚠️ Change Immediately)

| Role | Username | Default Password |
|---|---|---|
| Administrator | `admin` | `admin123` |
| Librarian | `librarian` | `lib123` |

> **⚠️ CRITICAL:** Change these immediately via the Django Admin panel at `http://localhost/api/admin/` before going live.

---

## 12. Troubleshooting

### Port 80 is already in use
```powershell
# Find what is using port 80
netstat -ano | findstr :80
# Kill it by PID (replace 1234)
Stop-Process -Id 1234 -Force
```
Common culprits on Windows: **IIS** (`iisreset /stop`) or **SQL Server Reporting Services**.

### Backend won't start — "could not connect to server"
The backend depends on `db` being healthy. Check:
```powershell
docker compose logs db
docker compose ps     # db should show "healthy"
```
If DB_PASSWORD in `.env` doesn't match what Docker Compose used to initialise the volume, destroy the volume and reinitialise:
```powershell
docker compose down -v
docker compose up -d
docker compose exec backend python manage.py createsuperuser
```

### Migration errors after a code update
```powershell
docker compose exec backend python manage.py showmigrations
docker compose exec backend python manage.py migrate
```

### Frontend shows "Cannot reach API"
Ensure `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` in `.env` exactly match the URL in the browser (including `https://`), then restart the backend: `docker compose restart backend`.

### Checking which database is active
```powershell
docker compose exec backend python -c "from django.db import connection; print(connection.vendor, connection.settings_dict['NAME'])"
# Expected: postgresql thomian_db
```

---

## 13. Hardware Configuration

### Zebra Printer (Labels, Cards & Slips)

| Print Type | Format | Size |
|---|---|---|
| Spine Labels | ZPL (300 dpi) | 1.5" × 1" |
| Patron ID Cards | ZPL (300 dpi) | CR80 — 3.375" × 2.125" |
| Registration Slips | Receipt format | Standard width |

- Assign a **Static IP** to the printer (e.g., `192.168.1.100`).
- The backend sends ZPL over **raw TCP port 9100**.
- Verify connectivity: `Test-NetConnection 192.168.1.100 -Port 9100`

### Barcode Scanners
- **Mode:** HID Keyboard Emulation
- **Suffix:** Carriage Return (`CR`) after every scan
- **Inter-Character Delay:** 0 ms

---

## 14. Manual Setup (No Docker — Not Recommended for Production)

Only use this path for isolated testing or if Docker Desktop is unavailable.

### Backend
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
Copy-Item docs\.env.example .env   # edit .env and fill in all required values
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
python manage.py runserver
```

### Frontend
```powershell
npm install
npm run dev   # development HMR server on :5173
# Or for a production build:
npm run build
# Serve dist/ with any static file server
```


---

## 1. The "Hybrid Single-App" Strategy

The system runs as two cooperating services behind a single Nginx reverse proxy:

| Layer | Technology | Role |
|---|---|---|
| **Frontend** | React 19 + Vite (static files) | Kiosk UI + Admin Dashboard |
| **Backend** | Django + Gunicorn | REST API, Auth, File Storage |
| **Database** | PostgreSQL | Primary data store |
| **Web Server** | Nginx | Static file serving + API proxy |
| **CDN / Security** | Cloudflare | DNS, SSL termination, DDoS protection |
| **AI** | Google Gemini | Book summaries, AI Auto-Map |

> **HTTPS is mandatory.** The Mobile Scanner, QR features, and AI Vision Uploads all require a Secure Context. Do not run in HTTP in production.

---

## 2. Pre-Deployment Checklist

Before running any deployment command, verify the following items:

### ✅ Environment & Secrets
- [ ] Copied `docs/.env.example` to `.env` and filled in all values
- [ ] Generated a strong `DJANGO_SECRET_KEY` (never use the default)
- [ ] Set `DEBUG=False`
- [ ] Set `ALLOWED_HOSTS` to your actual domain
- [ ] Set `CSRF_TRUSTED_ORIGINS` to your HTTPS URL
- [ ] Set a strong `DB_PASSWORD`
- [ ] Obtained a `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/)

### ✅ Backend
- [ ] PostgreSQL is installed and running
- [ ] Database `thomian_db` created and user granted privileges
- [ ] Python virtual environment created and dependencies installed
- [ ] Database migrations applied (`python manage.py migrate`)
- [ ] Static files collected (`python manage.py collectstatic`)
- [ ] Superuser created (`python manage.py createsuperuser`)
- [ ] Default librarian account created via Django Admin

### ✅ Frontend
- [ ] `.env` file contains `GEMINI_API_KEY`
- [ ] Production build completed (`npm run build`)
- [ ] `dist/` folder is present and populated

### ✅ Infrastructure
- [ ] Nginx installed and configuration tested (`nginx -t`)
- [ ] SSL certificate active (Cloudflare or Let's Encrypt/Certbot)
- [ ] Gunicorn systemd service file created and enabled
- [ ] Zebra printer reachable at its static IP on port `9100`
- [ ] Barcode scanners configured (HID mode, CR suffix)

---

## 3. Enterprise Self-Hosting (Recommended)

### Step 1: Backend Setup

```bash
# 1. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Set up environment variables
cp docs/.env.example .env
nano .env  # Fill in all values

# 4. Apply database migrations
python manage.py migrate

# 5. Collect static assets for Django Admin
python manage.py collectstatic --noinput

# 6. Create an admin superuser
python manage.py createsuperuser
```

### Step 2: Frontend Build

```bash
# 1. Install Node dependencies
npm install

# 2. Ensure GEMINI_API_KEY is set in your .env file, then build
npm run build

# 3. Output will be in dist/
```

### Step 3: Nginx Configuration

Save as `/etc/nginx/sites-available/thomian` and symlink to `sites-enabled`:

```nginx
server {
    listen 80;
    server_name library.stthomas.edu;
    return 301 https://$host$request_uri; # Force HTTPS
}

server {
    listen 443 ssl;
    server_name library.stthomas.edu; # Your Cloudflare Domain

    # SSL (managed by Cloudflare or Certbot)
    ssl_certificate     /etc/letsencrypt/live/library.stthomas.edu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/library.stthomas.edu/privkey.pem;

    # FRONTEND: Serve React Static Files
    location / {
        root /var/www/thomian-library/dist;
        try_files $uri $uri/ /index.html; # SPA Routing
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }

    # BACKEND: Proxy API to Django/Gunicorn
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        client_max_body_size 20M; # Allow book cover/patron photo uploads
    }

    # STATIC: Django Admin / REST Framework Assets
    location /static/ {
        alias /var/www/thomian-library/staticfiles/;
        expires 7d;
    }

    # MEDIA: User-uploaded files (covers, patron photos)
    location /media/ {
        alias /var/www/thomian-library/media/;
        expires 7d;
    }
}
```

Enable and test:
```bash
sudo ln -s /etc/nginx/sites-available/thomian /etc/nginx/sites-enabled/
sudo nginx -t  # Must say "syntax is ok"
sudo systemctl reload nginx
```

### Step 4: Gunicorn Systemd Service

Save as `/etc/systemd/system/thomian.service`:

```ini
[Unit]
Description=Thomian Library Gunicorn Daemon
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/thomian-library
EnvironmentFile=/var/www/thomian-library/.env
ExecStart=/var/www/thomian-library/venv/bin/gunicorn \
          --workers 3 \
          --bind 127.0.0.1:8000 \
          --timeout 120 \
          backend.wsgi:application
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable thomian
sudo systemctl start thomian
sudo systemctl status thomian  # Should show "active (running)"
```

---

## 4. Environment Variables Reference (`.env`)

See `docs/.env.example` for the full template. Key variables:

```bash
# Django Core
DJANGO_SECRET_KEY=<generated_key>  # REQUIRED — never use the default
DEBUG=False                         # REQUIRED — must be False in production
ALLOWED_HOSTS=library.stthomas.edu,localhost
CSRF_TRUSTED_ORIGINS=https://library.stthomas.edu

# Database
DB_NAME=thomian_db
DB_USER=postgres
DB_PASSWORD=<strong_password>
DB_HOST=localhost
DB_PORT=5432

# AI Features
GEMINI_API_KEY=<your_google_ai_studio_key>  # Required for AI features

# Storage
USE_S3=False  # True only if using Cloudflare R2
```

---

## 5. Default Credentials (⚠️ Change Immediately After First Login)

The system includes pre-configured demo accounts for initial access:

| Role | Username | Default Password |
|---|---|---|
| Administrator | `admin` | `admin123` |
| Librarian | `librarian` | `lib123` |

> **⚠️ CRITICAL:** Change these passwords immediately via the Django Admin panel (`/api/admin/`) before going live. Leaving these defaults active is a security vulnerability.

---

## 6. Data Backup Strategy

### Database (PostgreSQL)
Set up a nightly `pg_dump` cron job:

```bash
# Add to crontab: crontab -e
# Runs daily at 2:00 AM, keeps 30-day rolling backups
0 2 * * * pg_dump -U postgres thomian_db | gzip > /backups/thomian_$(date +\%Y\%m\%d).sql.gz

# Optional: prune backups older than 30 days
0 3 * * * find /backups/ -name "thomian_*.sql.gz" -mtime +30 -delete
```

### Media Files (Covers, Patron Photos)
Since local storage is used by default, the `/media` folder must be backed up separately:

```bash
# Example: nightly rsync to a backup location or Google Drive mount
0 2 * * * rsync -av /var/www/thomian-library/media/ /mnt/backup/thomian-media/
```

**Additional recommendation:** Periodically export to a USB drive for on-site disaster recovery.

---

## 7. Frontend Configuration

### AI Features (Gemini)
1. Obtain an API Key from [Google AI Studio](https://aistudio.google.com/).
2. Add it to your `.env` file as `GEMINI_API_KEY`.
3. The Vite build process injects it into the bundle at compile time. **Rebuild the frontend** any time the key changes.

> **Note:** The API key will be embedded in the compiled JavaScript bundle. Restrict the key in Google AI Studio to your production domain to prevent misuse.

### HTTPS Requirement
The **Mobile Scanner** and **AI Vision Uploads** strictly require a Secure Context (HTTPS).

| Environment | Solution |
|---|---|
| Local Development | Use `localhost` (treated as secure) or `mkcert` for local SSL |
| Production | Cloudflare Tunnel or Nginx with Let's Encrypt certificate |

---

## 8. Hardware Configuration

### Zebra Printer (Labels, Cards & Slips)
The system generates three ZPL print streams:

| Type | Format | Size |
|---|---|---|
| Spine Labels | ZPL (300 dpi) | 1.5" × 1" |
| Patron ID Cards | ZPL (300 dpi) | CR80 — 3.375" × 2.125" |
| Registration Slips | Receipt format | Standard width |

**Setup:**
- Set a **Static IP** on the printer (e.g., `192.168.1.100`).
- Ensure the backend `services.py` points to this IP on **port 9100** (Raw TCP/IP).
- Verify with: `telnet <printer-ip> 9100` — a connection means the printer is reachable.

### Barcode Scanners (Kiosk & Desk)
- **Mode:** HID Keyboard Emulation
- **Suffix:** Carriage Return (`CR` / `\n`) after every scan
- **Inter-Character Delay:** 0ms (minimal, to ensure the full barcode string is captured)

---

## 9. Rollback Plan

If a deployment goes wrong:

```bash
# 1. Stop the running service
sudo systemctl stop thomian

# 2. Restore the previous backend (if using Git)
git checkout <previous-tag-or-commit>

# 3. Re-run migrations if needed (check if any were applied)
python manage.py showmigrations

# 4. Restore database from last backup
gunzip -c /backups/thomian_YYYYMMDD.sql.gz | psql -U postgres thomian_db

# 5. Restore media files if necessary
rsync -av /mnt/backup/thomian-media/ /var/www/thomian-library/media/

# 6. Restart services
sudo systemctl start thomian
sudo systemctl reload nginx
```

---

## 10. Deployment Readiness Summary

| Area | Status | Notes |
|---|---|---|
| Backend dependencies | ✅ Defined | `requirements.txt` includes gunicorn, psycopg2, etc. |
| Django settings | ⚠️ Partial | `SECRET_KEY` has insecure fallback; `CORS_ALLOW_ALL_ORIGINS=True` |
| Django project shell | ⚠️ Missing | No `manage.py` or `wsgi.py` found in root — verify project structure |
| Migrations | ⚠️ Unverified | No `migrations/` folder found; must confirm before first deploy |
| Frontend build | ✅ Ready | `npm run build` will produce `dist/` |
| API key handling | ⚠️ Review | Gemini key embedded in JS bundle — restrict key to your domain |
| Nginx config | ✅ Provided | Full config in this guide |
| Gunicorn service | ✅ Provided | Systemd unit in this guide |
| CORS policy | ⚠️ Too open | Change `CORS_ALLOW_ALL_ORIGINS=True` to `CORS_ALLOWED_ORIGINS=[...]` |
| Default credentials | ⚠️ Danger | Must change `admin/admin123` and `librarian/lib123` before go-live |
| Backup strategy | ✅ Documented | pg_dump + rsync plan documented above |
| SSL/HTTPS | ✅ Documented | Nginx + Certbot or Cloudflare |
| Hardware (Zebra/Scanner) | ✅ Documented | Static IP + port 9100 + HID mode |
