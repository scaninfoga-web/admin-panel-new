#!/bin/bash
set -e

echo "===== Start Nginx Script Started ====="

# Start nginx
echo "Starting nginx..."
systemctl start nginx

# Enable nginx to start on boot
systemctl enable nginx

# Reload nginx to apply configuration
systemctl reload nginx

echo "===== Start Nginx Script Completed ====="
echo "Nginx is proxying requests from port 80 to the application"
