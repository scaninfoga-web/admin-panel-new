#!/bin/bash
set -e

echo "===== Configure Nginx Script Started ====="

# Copy nginx configuration
echo "Configuring nginx..."
if [ -f /var/www/admin/nginx/admin.conf ]; then
    cp /var/www/admin/nginx/admin.conf /etc/nginx/sites-available/admin
    
    # Create symbolic link if it doesn't exist
    if [ ! -L /etc/nginx/sites-enabled/admin ]; then
        ln -s /etc/nginx/sites-available/admin /etc/nginx/sites-enabled/admin
    fi
    
    # Remove default nginx config if exists
    if [ -L /etc/nginx/sites-enabled/default ]; then
        rm /etc/nginx/sites-enabled/default
    fi
    
    echo "Nginx configuration updated"
fi

# Test nginx configuration
echo "Testing nginx configuration..."
nginx -t

# Create PM2 log directory
echo "Creating PM2 log directory..."
mkdir -p /var/log/pm2
chown -R ubuntu:ubuntu /var/log/pm2

# Set proper ownership for application directory
echo "Setting proper ownership..."
chown -R ubuntu:ubuntu /var/www/admin

echo "===== Configure Nginx Script Completed ====="
