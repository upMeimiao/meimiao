/**
 * Created by ifable on 2017/7/13.
 */
const Redis = require('ioredis');
const async = require('neo-async');

const redis = new Redis('redis://:@127.0.0.1:6379/15', {
  reconnectOnError(err) {
    return err.message.slice(0, 'READONLY'.length) === 'READONLY';
  }
});
exports.getData = (req, res) => {
  async.parallel([
    (callback) => {
      redis.zrangebyscore('app:401218607:XMjc0MDg2MzQ1Mg==', '-inf', '+inf', (err, result) => {
        if (err) {
          callback(err);
        } else {
          callback(null, result);
        }
      });
    },
    (callback) => {
      redis.zrangebyscore('openapi:401218607:XMjc0MDg2MzQ1Mg==', '-inf', '+inf', (err, result) => {
        if (err) {
          callback(err);
        } else {
          callback(null, result);
        }
      });
    },
  ], (err, result) => {
    if (err) {
      res.status(502).send();
    } else {
      res.json(result);
    }
  });
};