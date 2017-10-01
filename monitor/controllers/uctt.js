const Redis = require('ioredis');
const redisConf = require('../config/redis');

const redis = new Redis(`redis://:${redisConf.auth}@${redisConf.host}:6379/15`, {
  reconnectOnError(err) {
    return err.message.slice(0, 'READONLY'.length) === 'READONLY';
  }
});

exports.getAids = (req, res) => {
  redis.smembers('article', (err, result) => {
    if (err) {
      res.status(502).json({ status: false });
      return;
    }
    res.status(200).json({ status: true, total: result.length, result });
  });
};