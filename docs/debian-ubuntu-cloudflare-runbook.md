# Debian/Ubuntu Local Hosting + Cloudflare Tunnel Runbook

This guide deploys Thomian Library System on a Debian/Ubuntu machine and publishes it securely to the internet using Cloudflare Tunnel.

## 1. Prerequisites

- Debian 12+ or Ubuntu 22.04+
- User with sudo privileges
- Docker Engine + Docker Compose plugin installed
- Domain name managed in Cloudflare DNS
- Project available on server at `/opt/thomian-lib` (or your preferred path)

## 2. Prepare project and environment

```bash
cd /opt/thomian-lib
cp docs/.env.example .env
nano .env
```

Set these minimum values:

```env
DEBUG=False
DJANGO_SECRET_KEY=<strong-random-secret>
ALLOWED_HOSTS=yourdomain.com,localhost
CSRF_TRUSTED_ORIGINS=https://yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
DB_PASSWORD=<strong-db-password>
GEMINI_API_KEY=<your-google-ai-studio-key>
```

## 3. Start application stack

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f --tail=50
```

## 4. Create Django superuser (first run only)

```bash
docker compose exec backend python manage.py createsuperuser
```

## 5. Install cloudflared

Use Cloudflare's official package instructions for your distro:
- Debian: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
- Ubuntu: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

After install:

```bash
cloudflared --version
```

## 6. Authenticate and create named tunnel

```bash
cloudflared tunnel login
cloudflared tunnel create thomian-library
```

Save the Tunnel ID shown in terminal.

## 7. Create cloudflared config

Create file:
- `/etc/cloudflared/config.yml`

```yaml
tunnel: <your-tunnel-id>
credentials-file: /etc/cloudflared/<your-tunnel-id>.json

ingress:
  - hostname: yourdomain.com
    service: http://localhost:80
  - service: http_status:404
```

Copy tunnel credentials from your user profile to `/etc/cloudflared/` if needed:

```bash
sudo mkdir -p /etc/cloudflared
sudo cp ~/.cloudflared/<your-tunnel-id>.json /etc/cloudflared/
sudo chown -R root:root /etc/cloudflared
sudo chmod 600 /etc/cloudflared/<your-tunnel-id>.json
```

## 8. Route DNS through tunnel

```bash
cloudflared tunnel route dns thomian-library yourdomain.com
```

## 9. Test tunnel in foreground

```bash
cloudflared tunnel --config /etc/cloudflared/config.yml run thomian-library
```

Open `https://yourdomain.com` from another network/device. If working, stop with `Ctrl+C`.

## 10. Install cloudflared as systemd service

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared
```

Expected state: `active (running)`.

## 11. Make app recover automatically on reboot

- Keep Docker running on boot:

```bash
sudo systemctl enable docker
```

- Ensure compose services use restart policies (already set in `docker-compose.yml`).
- On laptops, disable sleep to avoid tunnel downtime.

## 12. Post-go-live checklist

- Change default admin/librarian passwords immediately
- Keep `DEBUG=False`
- Access only through HTTPS domain
- Configure nightly PostgreSQL backups
- Keep OS security updates enabled

## Quick verification commands

```bash
docker compose ps
docker compose logs --tail=50 backend
docker compose logs --tail=50 frontend
systemctl status cloudflared
```
