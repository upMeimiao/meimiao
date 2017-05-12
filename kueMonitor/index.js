const kue = require('kue');
const express = require('express');
const kueUiExpress = require('kue-ui-express');
const cors = require('cors');
const basicAuth = require('basic-auth-connect');

const app = express();
class kueMonitor {
  constructor(settings) {
    this.settings = settings;
    this.redis = settings.redis;
    this.logger = this.settings.logger;
  }
  start() {
    let prefix = 'q';
    if (this.settings.type === 'comment') {
      prefix = 'c';
    } else if (this.settings.type === 'video') {
      prefix = 'q';
    }
    kue.createQueue({
      prefix,
      redis: {
        port: this.redis.port,
        host: this.redis.host,
        auth: this.redis.auth,
        db: this.redis.jobDB
      }
    });
    app.use(basicAuth('verona', '2319446'));
    app.use(cors());
    if (this.settings.type === 'comment') {
      kueUiExpress(app, '/c/kue/', '/c/api');
      app.use('/c/api', kue.app);
      app.use('/c/kue', kue.app);
      app.listen(3003);
      this.logger.debug('UI started on port 3003');
    } else if (this.settings.type === 'video') {
      kueUiExpress(app, '/kue/', '/api');
      app.use('/api', kue.app);
      app.use('/kue', kue.app);
      app.listen(3000);
      this.logger.debug('UI started on port 3000');
    }
  }
}


module.exports = kueMonitor;