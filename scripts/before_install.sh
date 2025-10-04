#!/bin/bash
set -e

echo "===== Before Install Script Started ====="

# Update system packages
echo "Updating system packages..."
apt-get update -y

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "Node.js is already installed: $(node -v)"
fi

# Install nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "Installing nginx..."
    apt-get install -y nginx
else
    echo "Nginx is already installed"
fi

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
else
    echo "PM2 is already installed: $(pm2 -v)"
fi

# Create application directory if it doesn't exist
echo "Creating application directory..."
mkdir -p /var/www/admin

# Set proper ownership
chown -R ubuntu:ubuntu /var/www/admin

echo "===== Before Install Script Completed ====="
