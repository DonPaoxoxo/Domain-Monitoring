// PM2 process definition for this checker node.
// Usage:
//   pm2 start ecosystem.config.cjs
//   pm2 logs mi-hawk-checker
//   pm2 restart mi-hawk-checker
module.exports = {
  apps: [
    {
      name: "mi-hawk-checker",
      script: "src/index.js",
      cwd: __dirname,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
