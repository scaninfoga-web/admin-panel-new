#!/bin/bash
set -e

echo "===== Stop Server Script Started ====="

# Stop PM2 process if running
if pm2 list | grep -q "admin-app"; then
    echo "Stopping PM2 process..."
    pm2 stop admin-app || true
    pm2 delete admin-app || true
    echo "PM2 process stopped"
else
    echo "No PM2 process found to stop"
fi

# Stop nginx if running
if systemctl is-active --quiet nginx; then
    echo "Stopping nginx..."
    systemctl stop nginx || true
    echo "Nginx stopped"
else
    echo "Nginx is not running"
fi

echo "===== Stop Server Script Completed ====="
