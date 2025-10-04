module.exports = {
  apps: [
    {
      name: "nextjs-app",
      script: "./node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "/var/www/admin",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};