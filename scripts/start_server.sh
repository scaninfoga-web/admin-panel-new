#!/bin/bash
set -e

echo "===== Start Server Script Started ====="

# Navigate to application directory
cd /var/www/admin

# Start Next.js application with PM2 using ecosystem file
echo "Starting Next.js application with PM2..."
if [ -f ecosystem.config.cjs ]; then
    pm2 start ecosystem.config.cjs
else
    pm2 start npm --name "admin-app" -- start
fi

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd -u ubuntu --hp /home/ubuntu || true

echo "===== Start Server Script Completed ====="
echo "Application is now running on port 3000"
