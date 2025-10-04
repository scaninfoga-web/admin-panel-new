#!/bin/bash
set -e

echo "===== Validate Service Script Started ====="

# Wait for application to start
echo "Waiting for application to start..."
sleep 10

# Check if PM2 process is running
if pm2 list | grep -q "admin-app.*online"; then
    echo "✓ PM2 process is running"
else
    echo "✗ PM2 process is not running"
    pm2 logs admin-app --lines 50
    exit 1
fi

# Check if nginx is running
if systemctl is-active --quiet nginx; then
    echo "✓ Nginx is running"
else
    echo "✗ Nginx is not running"
    systemctl status nginx
    exit 1
fi

# Check if application is responding on port 3000
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✓ Application is responding on port 3000"
else
    echo "✗ Application is not responding on port 3000"
    pm2 logs admin-app --lines 50
    exit 1
fi

# Check if nginx is responding
if curl -f http://localhost > /dev/null 2>&1; then
    echo "✓ Nginx is responding on port 80"
else
    echo "✗ Nginx is not responding on port 80"
    nginx -t
    systemctl status nginx
    exit 1
fi

echo "===== Validate Service Script Completed ====="
echo "All health checks passed successfully!"
