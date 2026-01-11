#!/bin/bash
#####################################################################
# QUICK FIX FOR AWS SERVER - Install Redis Only
# This fixes the immediate slowness issue
# Run with: sudo bash AWS_QUICK_FIX.sh
#####################################################################

set -e

echo "============================================================"
echo "  SNGPL IoT - Quick Redis Installation"
echo "  This will fix the slow login issue immediately"
echo "============================================================"
echo ""

# Step 1: Install Redis
echo "[1/3] Installing Redis Server..."
apt update -qq
apt install -y redis-server

# Step 2: Start Redis
echo "[2/3] Starting Redis..."
systemctl enable redis-server
systemctl start redis-server
sleep 2

# Step 3: Verify
echo "[3/3] Verifying Redis..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✓ Redis is running and responding"
else
    echo "❌ Redis failed to start"
    exit 1
fi

echo ""
echo "============================================================"
echo "  Redis Installed Successfully!"
echo "============================================================"
echo ""
echo "Now manually restart your backend service:"
echo "  sudo systemctl restart sngpl-api"
echo ""
echo "OR if using PM2:"
echo "  pm2 restart sngpl-backend"
echo ""
echo "Your dashboard should now be MUCH faster!"
echo "============================================================"
