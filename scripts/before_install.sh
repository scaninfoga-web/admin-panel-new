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

# Clean up old deployment to avoid file conflicts
echo "Cleaning up old deployment..."
if [ -d "/var/www/admin" ]; then
    # Backup .env file if it exists
    if [ -f "/var/www/admin/.env" ]; then
        cp /var/www/admin/.env /tmp/admin.env.backup
        echo "Backed up .env file"
    fi
    
    # Remove entire directory
    rm -rf /var/www/admin
    echo "Old deployment removed"
fi

# Create fresh application directory
echo "Creating application directory..."
mkdir -p /var/www/admin

# Restore .env file if it was backed up
if [ -f "/tmp/admin.env.backup" ]; then
    cp /tmp/admin.env.backup /var/www/admin/.env
    rm /tmp/admin.env.backup
    echo "Restored .env file"
fi

# Set proper ownership
chown -R ubuntu:ubuntu /var/www/admin

echo "===== Before Install Script Completed ====="
