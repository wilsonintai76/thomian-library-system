#!/bash/bin

# Thomian Library System - Ubuntu Deployment Script (Lenovo P310)

set -e

echo "Starting Deployment Setup for Lenovo P310..."

# 1. Update and Dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx postgresql postgresql-contrib redis-server python3-venv python3-pip nodejs npm curl 

# 2. PostgreSQL Setup (Bare Metal)
echo "Configuring PostgreSQL..."
sudo -u postgres psql -c "CREATE DATABASE thomian_db;" || true
sudo -u postgres psql -c "CREATE USER thomian_user WITH PASSWORD 'change_this_password';" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE thomian_db TO thomian_user;"
sudo -u postgres psql -d thomian_db -c "ALTER SCHEMA public OWNER TO thomian_user;"

# 3. Backend Setup
echo "Setting up Django Backend..."
cd /home/sysadmin/Projects/thomian-library-system
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt gunicorn psycopg2-binary
python manage.py migrate
python manage.py collectstatic --noinput

# 4. Main App Build (React/Vite)
echo "Building Main App..."
npm install
npm run build
sudo mkdir -p /var/www/thomian/main-app
sudo cp -r dist/* /var/www/thomian/main-app/

# 5. Kiosk Setup (Next.js)
echo "Building Kiosk App..."
cd kiosk
npm install
npm run build

# 6. Service Configuration
echo "Installing Systemd Services..."
sudo cp ../deployment/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable thomian-backend thomian-kiosk
sudo systemctl start thomian-backend thomian-kiosk

# 7. Nginx Configuration
echo "Configuring Nginx..."
sudo cp ../deployment/nginx/thomian.conf /etc/nginx/sites-available/thomian
sudo ln -sf /etc/nginx/sites-available/thomian /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

# 8. Cloudflare Tunnel (Info only)
echo "--------------------------------------------------------"
echo "DEPLOYMENT COMPLETE!"
echo "Check services: systemctl status thomian-backend thomian-kiosk"
echo "Next step: Configure Cloudflare Tunnel (cloudflared)"
echo "Example: cloudflared tunnel route dns <ID> thomian-lib.com"
echo "Example: cloudflared tunnel route dns <ID> admin.thomian-lib.com"
echo "--------------------------------------------------------"
