#!/bin/bash
# Make all deployment scripts executable

echo "Making all scripts executable..."

chmod +x scripts/before_install.sh
chmod +x scripts/stop_server.sh
chmod +x scripts/after_install.sh
chmod +x scripts/start_server.sh
chmod +x scripts/validate_service.sh
chmod +x scripts/install_codedeploy_agent.sh
chmod +x scripts/cleanup.sh
chmod +x scripts/setup_ec2.sh
chmod +x scripts/local_test.sh
chmod +x scripts/make_executable.sh

echo "All scripts are now executable!"
