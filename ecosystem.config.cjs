module.exports = {
  apps: [
    {
      name: 'antigravity-backend',
      script: 'apps/backend/dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'antigravity-admin',
      script: 'apps/admin/dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        ADMIN_PORT: 3002
      }
    },
    {
      name: 'antigravity-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start apps/frontend -p 3000',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'antigravity-gateway',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        GATEWAY_PORT: 8080,
        FRONTEND_TARGET: 'http://localhost:3000',
        BACKEND_TARGET: 'http://localhost:3001',
        ADMIN_TARGET: 'http://localhost:3002'
      }
    }
  ]
};