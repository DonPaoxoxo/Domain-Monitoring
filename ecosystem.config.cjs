/** @type {import('pm2').ApplicationDeclaration[]} */
module.exports = {
  apps: [
    {
      name: "mi-hawk",
      script: "npm",
      args: "start",
      cwd: "/opt/mi-hawk",
      env_file: "/opt/mi-hawk/.env",
      max_memory_restart: "512M",
    },
    {
      name: "globalping-checker",
      script: "npx",
      args: "tsx scripts/globalping-checker.ts",
      cwd: "/opt/mi-hawk",
      env_file: "/opt/mi-hawk/.env",
      // Runs on schedule; does not auto-restart on crash
      autorestart: false,
      cron_restart: "0 */4 * * *",
    },
  ],
};
