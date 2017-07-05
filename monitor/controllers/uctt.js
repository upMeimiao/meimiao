const Redis = require('ioredis');

const redis = new Redis('redis://:C19prsPjHs52CHoA0vm@192.168.1.31:6379/15', {
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