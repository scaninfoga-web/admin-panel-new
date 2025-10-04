#!/bin/bash
set -e

echo "===== After Install Script Started ====="

# Navigate to application directory
cd /var/www/admin

# Install dependencies
echo "Installing Node.js dependencies..."
npm ci --omit=dev

# Set environment variables (create .env file if needed)
if [ ! -f /var/www/admin/.env ]; then
    echo "Creating .env file..."
    cat > /var/www/admin/.env << EOF
NEXT_PUBLIC_BACKEND_URL=https://api.scaninfoga.com
NODE_ENV=production
PORT=3000
EOF
fi

echo "===== After Install Script Completed ====="
