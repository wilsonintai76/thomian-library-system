@echo off
:: ============================================================
:: start-tunnel.bat — Thomian Library: Start App + Cloudflare Tunnel
:: Double-click this file to bring the site online.
:: ============================================================

title Thomian Library - Live Server

echo ==========================================
echo  Thomian Library System - Starting Up...
echo ==========================================
echo.

:: 1. Make sure Docker Desktop is running
echo [1/3] Checking Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker is not running. Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo Waiting 20 seconds for Docker to start...
    timeout /t 20 /nobreak >nul
)
echo Docker OK.
echo.

:: 2. Start Docker containers (rebuild images to pick up .env changes)
echo [2/3] Starting Docker containers...
cd /d "%~dp0"
docker compose up -d --build
echo.
echo Containers started.
echo.

:: 3. Start the Cloudflare Tunnel
echo [3/3] Starting Cloudflare Tunnel...
echo  - Your site will be live at https://thomian-lib.com
echo  - Press Ctrl+C in this window to bring the site offline.
echo.
cloudflared tunnel run --token eyJhIjoiMGE5NWJkMWRlYzJjYTkwOTA5YThhNDFmZTA3N2RjZTUiLCJzIjoiWVRrek5tTmtOR1F0WVRGa05TMDBOMlV5TFRrellqY3RaR1F4WkdSaVpqQXpZbVF6IiwidCI6IjBiMDY4MmE0LThlNDgtNDQxMi05MTRjLTliY2UxZTIxMDA5MSJ9
:: If tunnel exits for any reason, pause so you can read the error
echo.
echo [!] Tunnel has stopped. Press any key to close.
pause >nul
