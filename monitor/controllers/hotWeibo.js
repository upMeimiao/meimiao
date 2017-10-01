const Redis = require('ioredis');
const redisConf = require('../config/redis');

const redis = new Redis(`redis://:${redisConf.auth}@${redisConf.host}:6379/15`, {
  reconnectOnError(err) {
    return err.message.slice(0, 'READONLY'.length) === 'READONLY';
  }
});

exports.saveMblog = (req, res) => {
  redis.zadd('hotMblog', req.body.score, JSON.stringify(req.body.mblog), (err, result) => {
    if (err) {
      return res.status(502).json({ status: false });
    }
    res.status(200).json({ status: result });
  });
};
exports.getMblog = (req, res) => {
  redis.zrangebyscore('hotMblog', '-inf', '+inf', (err, result) => {
    if (err) {
      return res.status(502).json({ status: false });
    }
    const list = [];
    for (const [index, elem] of result.entries()) {
      list.push(JSON.parse(elem));
    }
    res.status(200).json({ status: true, total: list.length, list });
  });
};