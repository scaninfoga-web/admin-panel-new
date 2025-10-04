#!/bin/bash
set -e

echo "===== After Install Script Started ====="

# Navigate to application directory
cd /var/www/admin

# Set proper ownership
echo "Setting proper ownership..."
chown -R ubuntu:ubuntu /var/www/admin

# Install dependencies
echo "Installing Node.js dependencies..."
npm ci --production

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

# Set environment variables (create .env file if needed)
if [ ! -f /var/www/admin/.env ]; then
    echo "Creating .env file..."
    cat > /var/www/admin/.env << EOF
NEXT_PUBLIC_BACKEND_URL=https://api.scaninfoga.com
NODE_ENV=production
PORT=3000
EOF
    chown ubuntu:ubuntu /var/www/admin/.env
fi

echo "===== After Install Script Completed ====="
