# Thomian Library Deployment Guide (Windows 10 + Debian/Ubuntu)

This guide provides deployment paths for both supported local-hosting options:
- Option 1: Windows 10 desktop + Cloudflare Tunnel
- Option 2: Debian/Ubuntu server + Cloudflare Tunnel

Both options expose the app securely through HTTPS without opening inbound firewall ports.

## 1. Recommended choice

- Choose Debian/Ubuntu for better 24/7 stability, lower overhead, and easier server operations.
- Choose Windows 10 if you need the fastest setup on an existing school desktop.

## 2. Shared architecture

Traffic flow:

1. User accesses `https://yourdomain.com`
2. Cloudflare edge terminates TLS
3. Cloudflare Tunnel forwards to local host on port 80
4. Frontend (Nginx) serves SPA and proxies `/api` to backend
5. Backend (Django/Gunicorn) communicates with PostgreSQL internally

## 3. Shared prerequisites

- Domain name added to Cloudflare account
- Docker + Compose available on host machine
- Project cloned on host
- `.env` created from `docs/.env.example`

Minimum `.env` values:

```env
DEBUG=False
DJANGO_SECRET_KEY=<strong-random-secret>
ALLOWED_HOSTS=yourdomain.com,localhost
CSRF_TRUSTED_ORIGINS=https://yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
DB_PASSWORD=<strong-db-password>
GEMINI_API_KEY=<your-google-ai-studio-key>
```

## 4. Option 1: Windows 10

Use the full runbook:
- `docs/windows10-cloudflare-runbook.md`

Quick command flow:

```powershell
docker compose up --build -d
cloudflared tunnel login
cloudflared tunnel create thomian-library
cloudflared tunnel route dns thomian-library yourdomain.com
cloudflared tunnel run thomian-library
```

Then install Cloudflared as a service:

```powershell
cloudflared service install
Start-Service cloudflared
```

## 5. Option 2: Debian/Ubuntu

Use the full runbook:
- `docs/debian-ubuntu-cloudflare-runbook.md`

Quick command flow:

```bash
docker compose up --build -d
cloudflared tunnel login
cloudflared tunnel create thomian-library
cloudflared tunnel route dns thomian-library yourdomain.com
cloudflared tunnel --config /etc/cloudflared/config.yml run thomian-library
```

Then install Cloudflared as a systemd service:

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

## 6. First production start checklist

1. Start stack: `docker compose up --build -d`
2. Create admin user: `docker compose exec backend python manage.py createsuperuser`
3. Verify containers: `docker compose ps`
4. Verify public URL from another network/device
5. Change default credentials immediately

## 7. Post-deployment operations

- Logs:
  - `docker compose logs -f backend`
  - `docker compose logs -f frontend`
- Update release:
  1. `git pull origin main`
  2. `docker compose up --build -d`
- Backup strategy:
  - Run nightly PostgreSQL dumps
  - Keep at least 30 days retention

## 8. Security baseline

- Keep `DEBUG=False`
- Use strong secret key and DB password
- Restrict allowed hosts and trusted origins to real HTTPS domain
- Keep host OS updates enabled
- Disable sleep/hibernate on host running production stack
