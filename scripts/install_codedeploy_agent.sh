#!/bin/bash
# Script to install AWS CodeDeploy Agent on Ubuntu EC2 instance
set -e

echo "===== Installing AWS CodeDeploy Agent ====="

# Update system
apt-get update -y

# Install required packages
apt-get install -y ruby wget

# Download and install CodeDeploy agent
cd /home/ubuntu
wget https://aws-codedeploy-us-east-1.s3.us-east-1.amazonaws.com/latest/install
chmod +x ./install
./install auto

# Start CodeDeploy agent
systemctl start codedeploy-agent
systemctl enable codedeploy-agent

# Check status
systemctl status codedeploy-agent

echo "===== CodeDeploy Agent Installation Completed ====="
