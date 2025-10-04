#!/bin/bash
# Complete EC2 instance setup script for first-time deployment
# Run this script on a fresh Ubuntu EC2 instance

set -e

echo "===== EC2 Instance Setup Started ====="

# Update system
echo "Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# Install Node.js 20.x
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
echo "Node.js version: $(node -v)"
echo "NPM version: $(npm -v)"

# Install Nginx
echo "Installing Nginx..."
sudo apt-get install -y nginx

# Install PM2
echo "Installing PM2..."
sudo npm install -g pm2

# Install CodeDeploy Agent
echo "Installing AWS CodeDeploy Agent..."
sudo apt-get install -y ruby wget
cd /home/ubuntu
wget https://aws-codedeploy-us-east-1.s3.us-east-1.amazonaws.com/latest/install
chmod +x ./install
sudo ./install auto

# Start and enable CodeDeploy Agent
sudo systemctl start codedeploy-agent
sudo systemctl enable codedeploy-agent

# Create application directory
echo "Creating application directory..."
sudo mkdir -p /var/www/admin
sudo chown -R ubuntu:ubuntu /var/www/admin

# Create log directories
sudo mkdir -p /var/log/pm2
sudo chown -R ubuntu:ubuntu /var/log/pm2

# Configure firewall (UFW)
echo "Configuring firewall..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw --force enable

# Set up log rotation for PM2
echo "Setting up log rotation..."
sudo tee /etc/logrotate.d/pm2 > /dev/null <<EOF
/var/log/pm2/*.log {
    daily
    rotate 7
    missingok
    notifempty
    compress
    delaycompress
    copytruncate
}
EOF

# Display status
echo ""
echo "===== Installation Summary ====="
echo "Node.js: $(node -v)"
echo "NPM: $(npm -v)"
echo "PM2: $(pm2 -v)"
echo "Nginx: $(nginx -v 2>&1)"
echo "CodeDeploy Agent: $(sudo systemctl is-active codedeploy-agent)"
echo ""
echo "===== EC2 Instance Setup Completed ====="
echo ""
echo "Next steps:"
echo "1. Attach an IAM role to this EC2 instance with CodeDeploy permissions"
echo "2. Tag this instance for CodeDeploy deployment group"
echo "3. Configure your domain's DNS to point to this instance"
echo "4. Set up SSL certificates (recommended: Let's Encrypt)"
echo "5. Trigger a deployment from CodePipeline"
