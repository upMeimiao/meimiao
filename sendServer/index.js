const Redis = require('ioredis');

class sendServer {
  constructor(settings) {
    this.settings = settings;
    this.logger = settings.logger;
    this.redis = new Redis(`redis://:${settings.redis.auth}@${settings.redis.host}:${settings.redis.port}/${settings.redis.cache_db}`, {
      reconnectOnError(err) {
        return err.message.slice(0, 'READONLY'.length) === 'READONLY';
      }
    });
  }
  start() {
    switch (this.settings.type) {
      case 'video':
        this.videoSend = new (require('./videoSend'))(this);
        this.logger.trace('sendServer instantiation ...');
        this.videoSend.start();
        break;
      case 'comment':
        this.commentSend = new (require('./commentSend'))(this);
        this.logger.trace('sendServer instantiation ...');
        this.commentSend.start();
        break;
      default:
        this.videoSend = new (require('./videoSend'))(this);
        this.logger.trace('sendServer instantiation ...');
        this.videoSend.start();
        break;
    }
  }
}
module.exports = sendServer;