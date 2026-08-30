module.exports = {
  apps: [{
    name: 'mulan-server',
    script: 'server-http.js',
    cwd: '/var/www/mulan',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 5175,
    },
  }],
};
