#!/bin/bash
# Local testing script to verify deployment scripts work correctly
# Run this on your EC2 instance before setting up CodeDeploy

set -e

echo "===== Local Deployment Test Started ====="

# Set test directory
TEST_DIR="/var/www/admin-test"

# Create test directory
echo "Creating test directory..."
sudo mkdir -p $TEST_DIR
sudo chown -R ubuntu:ubuntu $TEST_DIR

# Copy current directory to test location
echo "Copying files to test directory..."
cp -r . $TEST_DIR/

# Run before_install script
echo "Running before_install.sh..."
sudo bash $TEST_DIR/scripts/before_install.sh

# Run stop_server script
echo "Running stop_server.sh..."
bash $TEST_DIR/scripts/stop_server.sh

# Run after_install script
echo "Running after_install.sh..."
bash $TEST_DIR/scripts/after_install.sh

# Run start_server script
echo "Running start_server.sh..."
bash $TEST_DIR/scripts/start_server.sh

# Wait a bit for services to start
sleep 5

# Run validate_service script
echo "Running validate_service.sh..."
bash $TEST_DIR/scripts/validate_service.sh

echo ""
echo "===== Local Deployment Test Completed Successfully ====="
echo ""
echo "Services are running. You can test the application at:"
echo "http://localhost:3000 (Direct)"
echo "http://localhost (Via Nginx)"
echo ""
echo "To clean up the test:"
echo "pm2 delete admin-app"
echo "sudo rm -rf $TEST_DIR"
