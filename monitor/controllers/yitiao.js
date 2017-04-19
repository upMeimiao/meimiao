const Redis = require('ioredis');

const redis = new Redis('redis://:C19prsPjHs52CHoA0vm@r-m5e43f2043319e64.redis.rds.aliyuncs.com:6379/12', {
  reconnectOnError(err) {
    return err.message.slice(0, 'READONLY'.length) === 'READONLY';
  }
});

exports.getMedia = (req, res) => {
  let key;
  if (!req.query.type) {
    key = `375520641_${req.query.hours}`;
  } else if (req.query.type && req.query.type === 'send') {
    key = `375520641_send_${req.query.hours}`;
  }
  redis.smembers(key, (err, result) => {
    if (err) {
      res.status(502).json({ status: false });
      return;
    }
    const list = [];
    for (const [index, elem] of result.entries()) {
      list.push(JSON.parse(elem));
    }
    res.status(200).json({ status: true, total: list.length, list });
  });
};