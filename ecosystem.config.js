module.exports = {
  apps : [{
    name      : 'Pinnacle',
    script    : 'pinnacle.js',
    env: {
      NODE_ENV: 'development'
    },
    env_production : {
      NODE_ENV: 'production'
    }
  }]
};
