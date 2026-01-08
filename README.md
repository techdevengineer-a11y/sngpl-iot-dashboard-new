# SNGPL IoT Dashboard - Production Deployment

**Sui Northern Gas Pipelines Limited**
**Smart Gas Metering & Monitoring System**

---

## 🏗️ Project Structure

```
sngpl-dashboard/
├── sngpl-frontend/          # React + Vite frontend application
│   ├── src/                 # React components, pages, utilities
│   ├── public/              # Static assets
│   ├── package.json         # Frontend dependencies
│   └── vite.config.js       # Vite configuration
│
└── sngpl-backend/           # FastAPI Python backend
    ├── app/                 # Application code
    │   ├── api/v1/          # API endpoints
    │   ├── models/          # Database models
    │   ├── core/            # Core utilities
    │   └── services/        # Business logic
    ├── main.py              # FastAPI application entry
    ├── mqtt_listener.py     # MQTT data ingestion
    └── requirements.txt     # Python dependencies
```

---

## 📋 Prerequisites

### Frontend
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher

### Backend
- **Python**: 3.10 or higher
- **PostgreSQL**: 14.x or higher
- **MQTT Broker**: Mosquitto or equivalent

### Server
- **Ubuntu**: 22.04 LTS
- **Nginx**: Latest stable
- **Supervisor**: For process management
- **SSL Certificate**: Let's Encrypt (Certbot)

---

## 🚀 Local Development Setup

### Frontend Setup

```bash
cd sngpl-frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

**Development server will run on:** `http://localhost:5173`

### Backend Setup

```bash
cd sngpl-backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (copy from .env.example)
cp .env.example .env

# Edit .env with your database credentials
nano .env

# Run database migrations
alembic upgrade head

# Run FastAPI server
python main.py
```

**API server will run on:** `http://localhost:8080`

### MQTT Listener

```bash
# In separate terminal (backend venv activated)
python mqtt_listener.py
```

---

## 🌐 Production Deployment (EC2)

### 1. Server Setup

```bash
# SSH into EC2 instance
ssh -i your-key.pem ubuntu@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y nginx postgresql postgresql-contrib python3-pip python3-venv supervisor certbot python3-certbot-nginx
```

### 2. PostgreSQL Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE sngpl_iot;
CREATE USER sngpl_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE sngpl_iot TO sngpl_user;
\q
```

### 3. Clone Repository

```bash
cd /var/www
sudo git clone https://github.com/your-username/sngpl-dashboard.git
sudo chown -R ubuntu:ubuntu sngpl-dashboard
```

### 4. Backend Deployment

```bash
cd /var/www/sngpl-dashboard/sngpl-backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
nano .env
```

**.env Configuration:**
```env
DATABASE_URL=postgresql://sngpl_user:your_password@localhost/sngpl_iot
MQTT_BROKER=localhost
MQTT_PORT=1883
JWT_SECRET_KEY=your-super-secret-key-change-this
AWS_IOT_ENDPOINT=your-iot-endpoint.iot.region.amazonaws.com
```

```bash
# Run database migrations
alembic upgrade head

# Create admin user
python setup_admin.py
```

### 5. Supervisor Configuration (Keep Backend Running)

```bash
sudo nano /etc/supervisor/conf.d/sngpl-api.conf
```

**sngpl-api.conf:**
```ini
[program:sngpl-api]
command=/var/www/sngpl-dashboard/sngpl-backend/venv/bin/python /var/www/sngpl-dashboard/sngpl-backend/main.py
directory=/var/www/sngpl-dashboard/sngpl-backend
user=ubuntu
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
stderr_logfile=/var/log/sngpl-api.err.log
stdout_logfile=/var/log/sngpl-api.out.log
```

```bash
sudo nano /etc/supervisor/conf.d/sngpl-mqtt.conf
```

**sngpl-mqtt.conf:**
```ini
[program:sngpl-mqtt]
command=/var/www/sngpl-dashboard/sngpl-backend/venv/bin/python /var/www/sngpl-dashboard/sngpl-backend/mqtt_listener.py
directory=/var/www/sngpl-dashboard/sngpl-backend
user=ubuntu
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
stderr_logfile=/var/log/sngpl-mqtt.err.log
stdout_logfile=/var/log/sngpl-mqtt.out.log
```

```bash
# Reload supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start sngpl-api
sudo supervisorctl start sngpl-mqtt

# Check status
sudo supervisorctl status
```

### 6. Frontend Deployment

```bash
cd /var/www/sngpl-dashboard/sngpl-frontend

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install dependencies
npm install

# Build for production
npm run build

# Frontend will be built to dist/ directory
```

### 7. Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/sngpl-dashboard
```

**sngpl-dashboard Nginx config:**
```nginx
# Redirect non-www to www (HTTPS)
server {
    listen 80;
    server_name sngpldashboard.online;
    return 301 https://www.sngpldashboard.online$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl;
    server_name www.sngpldashboard.online;

    ssl_certificate /etc/letsencrypt/live/www.sngpldashboard.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.sngpldashboard.online/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json image/svg+xml;
    gzip_comp_level 6;

    # Frontend root
    root /var/www/sngpl-dashboard/sngpl-frontend/dist;

    # Cache static assets (JS, CSS, images) for 1 year
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";

        # Security Headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    }

    # Frontend - HTML files (no cache)
    location / {
        try_files $uri $uri/ /index.html;

        # Don't cache HTML
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";

        # Security Headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Security Headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    }

    # WebSocket
    location /ws {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Redirect HTTP www to HTTPS www
server {
    listen 80;
    server_name www.sngpldashboard.online;
    return 301 https://www.sngpldashboard.online$request_uri;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/sngpl-dashboard /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 8. SSL Certificate (Let's Encrypt)

```bash
# Get SSL certificate
sudo certbot --nginx -d sngpldashboard.online -d www.sngpldashboard.online

# Auto-renewal is configured by certbot
# Test renewal
sudo certbot renew --dry-run
```

---

## 🔄 Deploying Updates

### Frontend Updates

```bash
# On your local machine
cd sngpl-frontend
npm run build

# Upload to server
scp -i your-key.pem -r dist/* ubuntu@your-server:/tmp/frontend-update/

# On server
ssh -i your-key.pem ubuntu@your-server
sudo rm -rf /var/www/sngpl-dashboard/sngpl-frontend/dist/assets/*
sudo mv /tmp/frontend-update/assets/* /var/www/sngpl-dashboard/sngpl-frontend/dist/assets/
sudo mv /tmp/frontend-update/index.html /var/www/sngpl-dashboard/sngpl-frontend/dist/
sudo chown -R ubuntu:ubuntu /var/www/sngpl-dashboard/sngpl-frontend/dist/
```

**OR use the deployment script:**
```bash
cd E:\SNGPL-Frontend-Source\frontend
.\deploy-to-server.bat
```

### Backend Updates

```bash
# On server
cd /var/www/sngpl-dashboard/sngpl-backend
git pull origin main

# Activate venv
source venv/bin/activate

# Install any new dependencies
pip install -r requirements.txt

# Run migrations if any
alembic upgrade head

# Restart services
sudo supervisorctl restart sngpl-api
sudo supervisorctl restart sngpl-mqtt

# Check logs
sudo tail -f /var/log/sngpl-api.err.log
```

---

## 🔧 Common Commands

### Check Service Status
```bash
sudo supervisorctl status
sudo systemctl status nginx
sudo systemctl status postgresql
```

### View Logs
```bash
# API logs
sudo tail -f /var/log/sngpl-api.out.log
sudo tail -f /var/log/sngpl-api.err.log

# MQTT logs
sudo tail -f /var/log/sngpl-mqtt.out.log
sudo tail -f /var/log/sngpl-mqtt.err.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Restart Services
```bash
sudo supervisorctl restart sngpl-api
sudo supervisorctl restart sngpl-mqtt
sudo systemctl reload nginx
```

### Database Backup
```bash
# Backup
sudo -u postgres pg_dump sngpl_iot > sngpl_backup_$(date +%Y%m%d).sql

# Restore
sudo -u postgres psql sngpl_iot < sngpl_backup_20260108.sql
```

---

## 🔐 Security Checklist

- [ ] Change default database password
- [ ] Generate new JWT secret key
- [ ] Configure firewall (UFW)
- [ ] Enable fail2ban
- [ ] Keep SSL certificates updated
- [ ] Regular security updates
- [ ] Enable PostgreSQL authentication
- [ ] Restrict MQTT broker access
- [ ] Use strong passwords for all services
- [ ] Regular backups

---

## 📊 Monitoring

### Key Metrics to Monitor
- API response time
- Database connection pool
- MQTT message queue depth
- Disk space usage
- Memory usage
- CPU usage
- Active WebSocket connections

### Recommended Tools
- **Prometheus** + **Grafana**: Metrics visualization
- **AWS CloudWatch**: If using AWS
- **Sentry**: Error tracking
- **UptimeRobot**: Uptime monitoring

---

## 🐛 Troubleshooting

### Frontend Not Loading
1. Check Nginx configuration: `sudo nginx -t`
2. Check file permissions: `ls -la /var/www/sngpl-dashboard/sngpl-frontend/dist/`
3. Clear browser cache
4. Check Nginx error log: `sudo tail -f /var/log/nginx/error.log`

### API Not Responding
1. Check if service is running: `sudo supervisorctl status sngpl-api`
2. Check logs: `sudo tail -f /var/log/sngpl-api.err.log`
3. Restart service: `sudo supervisorctl restart sngpl-api`
4. Check database connection
5. Verify firewall rules

### MQTT Data Not Updating
1. Check MQTT listener: `sudo supervisorctl status sngpl-mqtt`
2. Check MQTT broker: `sudo systemctl status mosquitto`
3. Test MQTT connection: `mosquitto_sub -h localhost -t test`
4. Check database for new records

### Database Connection Error
1. Check PostgreSQL status: `sudo systemctl status postgresql`
2. Verify credentials in .env file
3. Check pg_hba.conf for authentication settings
4. Restart PostgreSQL: `sudo systemctl restart postgresql`

---

## 📞 Support

**SNGPL IoT Platform Team**
Email: iot-engineering@sngpl.com.pk
Emergency: +92-XXX-XXXXXXX

---

## 📄 License

Proprietary - Sui Northern Gas Pipelines Limited (SNGPL)
© 2026 All Rights Reserved

---

## 🔖 Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | Jan 2026 | Added T18-T114 analytics, optimized nginx, updated security |
| 1.5 | Dec 2025 | DeviceAnalytics page, improved performance |
| 1.0 | Nov 2025 | Initial production deployment |

---

**Last Updated:** January 8, 2026

## Automatic Deployment Active

This repository is now connected to the EC2 server. Any push to the main branch will automatically deploy!
