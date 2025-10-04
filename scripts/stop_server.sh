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

# Clean up old deployment files to avoid conflicts
echo "Cleaning up old deployment files..."
if [ -d "/var/www/admin" ]; then
    # Keep .env file if it exists
    if [ -f "/var/www/admin/.env" ]; then
        cp /var/www/admin/.env /tmp/admin.env.backup
        echo "Backed up .env file"
    fi
    
    # Remove old files
    rm -rf /var/www/admin/*
    rm -rf /var/www/admin/.[!.]*
    echo "Old deployment files cleaned"
    
    # Restore .env file
    if [ -f "/tmp/admin.env.backup" ]; then
        cp /tmp/admin.env.backup /var/www/admin/.env
        rm /tmp/admin.env.backup
        echo "Restored .env file"
    fi
fi

echo "===== Stop Server Script Completed ====="
