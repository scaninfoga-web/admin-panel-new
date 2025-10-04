#!/bin/bash
set -e

echo "===== Start Server Script Started ====="

# Navigate to application directory
cd /var/www/admin

# Create PM2 log directory if it doesn't exist
mkdir -p /var/log/pm2
chown -R ubuntu:ubuntu /var/log/pm2

# Start Next.js application with PM2 using ecosystem file
echo "Starting Next.js application with PM2..."
if [ -f ecosystem.config.js ]; then
    pm2 start ecosystem.config.js
else
    pm2 start npm --name "admin-app" -- start
fi

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd -u ubuntu --hp /home/ubuntu || true

# Start nginx
echo "Starting nginx..."
systemctl start nginx
systemctl enable nginx

# Reload nginx to apply configuration
systemctl reload nginx

echo "===== Start Server Script Completed ====="
echo "Application is now running on port 3000"
echo "Nginx is proxying requests from port 80/443 to the application"
