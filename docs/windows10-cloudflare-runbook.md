# Windows 10 Local Hosting + Cloudflare Tunnel Runbook

This guide deploys Thomian Library System on a Windows 10 desktop and publishes it securely to the internet using Cloudflare Tunnel.

## 1. Prerequisites

- Windows 10 machine that stays powered on
- Docker Desktop installed and running
- Domain name in Cloudflare DNS
- Project checked out at `D:\thomian-lib`

## 2. Create `.env`

From project root:

```powershell
Copy-Item docs\.env.example .env
notepad .env
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

## 3. Start the app stack

```powershell
docker compose up --build -d
docker compose ps
docker compose logs -f --tail 50
```

## 4. Create Django superuser (first run only)

```powershell
docker compose exec backend python manage.py createsuperuser
```

## 5. Install Cloudflare tunnel agent

```powershell
winget install Cloudflare.cloudflared
cloudflared --version
```

## 6. Authenticate and create tunnel

```powershell
cloudflared tunnel login
cloudflared tunnel create thomian-library
```

Save the Tunnel ID shown in terminal.

## 7. Create Cloudflare config file

Create file:

- `C:\Users\<YourUsername>\.cloudflared\config.yml`

Use:

```yaml
tunnel: <your-tunnel-id>
credentials-file: C:\Users\<YourUsername>\.cloudflared\<your-tunnel-id>.json

ingress:
  - hostname: yourdomain.com
    service: http://localhost:80
  - service: http_status:404
```

## 8. Route DNS to tunnel

```powershell
cloudflared tunnel route dns thomian-library yourdomain.com
```

## 9. Test tunnel in foreground

```powershell
cloudflared tunnel run thomian-library
```

Open `https://yourdomain.com` from another device/network. If it works, stop with `Ctrl+C`.

## 10. Install cloudflared as Windows service

Run PowerShell as Administrator:

```powershell
cloudflared service install
Start-Service cloudflared
Get-Service cloudflared
```

Expected status: `Running`.

## 11. Enable restart on boot

- In Docker Desktop: enable **Start Docker Desktop when you sign in**.
- Keep `docker-compose.yml` restart policies as configured.
- Disable sleep/hibernate on the host machine.

## 12. Post-go-live checklist

- Change all default user passwords immediately
- Keep `DEBUG=False`
- Use only HTTPS domain access
- Configure automated PostgreSQL backups

## Quick verification commands

```powershell
docker compose ps
docker compose logs --tail 50 backend
docker compose logs --tail 50 frontend
Get-Service cloudflared
```
