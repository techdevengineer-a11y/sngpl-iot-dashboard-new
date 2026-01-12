#!/bin/bash
#####################################################################
# Fix Frontend WebSocket and 401 Issues
# Run on AWS EC2 server
#####################################################################

set -e

echo "============================================================"
echo "  Fixing Frontend Issues"
echo "============================================================"
echo ""

# Navigate to frontend directory
cd /var/www/sngpl-dashboard/frontend

echo "[1/4] Creating .env.production file..."
cat > .env.production << 'EOF'
VITE_API_URL=https://www.sngpldashboard.online/api
VITE_WS_URL=wss://www.sngpldashboard.online/ws
EOF

echo "✓ Created .env.production"
echo ""

echo "[2/4] Rebuilding frontend with production variables..."
npm run build

echo "✓ Frontend rebuilt"
echo ""

echo "[3/4] Copying vite.svg to dist..."
if [ -f "public/vite.svg" ]; then
    cp public/vite.svg dist/
    echo "✓ Copied vite.svg"
else
    echo "⚠️  vite.svg not found (minor issue, can ignore)"
fi
echo ""

echo "[4/4] Restarting Nginx..."
sudo systemctl reload nginx

echo "✓ Nginx reloaded"
echo ""

echo "============================================================"
echo "  Frontend Issues Fixed!"
echo "============================================================"
echo ""
echo "Changes made:"
echo "  ✓ WebSocket now uses: wss://www.sngpldashboard.online/ws"
echo "  ✓ API URL set to: https://www.sngpldashboard.online/api"
echo "  ✓ Frontend rebuilt with correct config"
echo ""
echo "Please:"
echo "  1. Clear your browser cache (Ctrl+Shift+Delete)"
echo "  2. Hard refresh the dashboard (Ctrl+F5)"
echo "  3. Login again"
echo ""
echo "The 401 and WebSocket errors should be gone!"
echo "============================================================"
