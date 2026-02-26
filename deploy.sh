#!/usr/bin/env bash
# =============================================================
# deploy.sh — Thomian Library Production Deployment Script
# Run once from the project root on your server.
# Usage: chmod +x deploy.sh && ./deploy.sh
# =============================================================

set -e  # Exit immediately on any error

echo "=== [1/7] Checking .env file ==="
if [ ! -f ".env" ]; then
  echo "ERROR: .env file not found. Copy docs/.env.example to .env and fill in all values."
  exit 1
fi

echo "=== [2/7] Installing Python dependencies ==="
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

echo "=== [3/7] Running database migrations ==="
python manage.py migrate --noinput

echo "=== [4/7] Collecting static files ==="
python manage.py collectstatic --noinput

echo "=== [5/7] Installing Node dependencies & building frontend ==="
npm install
npm run build

echo "=== [6/7] Syncing files to web root ==="
# Update these paths to match your server
sudo rsync -av --delete dist/         /var/www/thomian-library/dist/
sudo rsync -av --delete staticfiles/  /var/www/thomian-library/staticfiles/
sudo rsync -av --delete media/        /var/www/thomian-library/media/
sudo cp -r venv /var/www/thomian-library/
sudo cp manage.py backend/ .env /var/www/thomian-library/

echo "=== [7/7] Restarting services ==="
sudo systemctl restart thomian
sudo systemctl reload nginx

echo ""
echo "✅ Deployment complete! Visit https://library.stthomas.edu"
echo "⚠️  If this is the FIRST deploy, run: python manage.py createsuperuser"
