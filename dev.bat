@echo off
REM ============================================================
REM dev.bat — Thomian Library Local Development Launcher
REM Starts both the Django backend and Vite frontend.
REM Usage: double-click or run from project root
REM ============================================================

echo Starting Thomian Library in development mode...
echo.

REM Check .env exists
IF NOT EXIST ".env" (
    echo [ERROR] .env file not found.
    echo Copy docs\.env.example to .env and set DEBUG=True and your DB credentials.
    pause
    exit /b 1
)

echo [1/2] Starting Django backend on http://localhost:8000 ...
start "Django Backend" cmd /k "call venv\Scripts\activate && python manage.py runserver 8000"

timeout /t 3 /nobreak > NUL

echo [2/2] Starting Vite frontend on http://localhost:3000 ...
start "Vite Frontend" cmd /k "npm run dev"

echo.
echo Both servers are running. Open http://localhost:3000 in your browser.
pause
