#!/bin/bash
# Deploy latest main branch to the running server (Azure VM).
# Run ON the VM as azureuser, or invoked by the GitHub self-hosted runner.
set -e

cd /var/www/sngpl-dashboard

echo "[1/5] Pulling latest from GitHub..."
git fetch origin main
git reset --hard origin/main

echo "[2/5] Installing Python deps..."
source sngpl-backend/venv/bin/activate
pip install -q -r sngpl-backend/requirements.txt
deactivate

echo "[3/5] Rebuilding frontend..."
cd sngpl-frontend
if [ -f package.json ]; then
  npm install --legacy-peer-deps --no-audit --no-fund
  VITE_WS_URL="wss://www.sngpldashboard.online/ws" npm run build
  rm -rf /var/www/sngpl-dashboard/frontend/dist
  mkdir -p /var/www/sngpl-dashboard/frontend
  cp -r dist /var/www/sngpl-dashboard/frontend/dist
fi
cd ..

echo "[4/5] Restarting backend + mqtt..."
sudo supervisorctl restart sngpl-api sngpl-mqtt

echo "[5/5] Reloading nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "Done. Status:"
sudo supervisorctl status
