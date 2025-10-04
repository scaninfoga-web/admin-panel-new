#!/bin/bash
# Cleanup old deployments and logs
set -e

echo "===== Cleanup Script Started ====="

# Keep only last 3 PM2 logs
pm2 flush

# Clean npm cache
npm cache clean --force

# Remove old deployment artifacts (keep last 5)
if [ -d "/opt/codedeploy-agent/deployment-root" ]; then
    cd /opt/codedeploy-agent/deployment-root
    ls -t | tail -n +6 | xargs -r rm -rf
fi

# Clean old nginx logs (older than 30 days)
find /var/log/nginx -name "*.log" -type f -mtime +30 -delete

# Clean systemd journal logs
journalctl --vacuum-time=7d

echo "===== Cleanup Script Completed ====="
