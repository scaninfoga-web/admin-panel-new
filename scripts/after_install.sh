#!/bin/bash
set -e

echo "===== After Install Script Started ====="

# Navigate to application directory
cd /var/www/admin

# Check if dependencies need to be installed
INSTALL_DEPS=false

if [ ! -d "node_modules" ]; then
    echo "node_modules not found, will install dependencies..."
    INSTALL_DEPS=true
elif [ "package.json" -nt "node_modules" ]; then
    echo "package.json is newer than node_modules, will update dependencies..."
    INSTALL_DEPS=true
else
    echo "Dependencies are up to date, skipping npm install..."
fi

# Install dependencies only if needed
if [ "$INSTALL_DEPS" = true ]; then
    echo "Installing Node.js dependencies..."
    npm ci --omit=dev
fi

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
