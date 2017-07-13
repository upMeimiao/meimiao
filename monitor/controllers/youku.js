/**
 * Created by ifable on 2017/7/13.
 */
const Redis = require('ioredis');
const async = require('neo-async');

const redis = new Redis('redis://:C19prsPjHs52CHoA0vm@r-m5e970ad613f13a4.redis.rds.aliyuncs.com:6379/1', {
  reconnectOnError(err) {
    return err.message.slice(0, 'READONLY'.length) === 'READONLY';
  }
});
exports.getData = (req, res) => {
  const bid = req.query.bid;
  const aid = req.query.aid;
  const appArr = [];
  const openapiArr = [];
  async.parallel([
    (callback) => {
      redis.zrangebyscore(`app:${bid}:${aid}`, '-inf', '+inf', (err, result) => {
        if (err) {
          callback(err);
        } else {
          for (const [index, elem] of result.entries()) {
            appArr.push(JSON.parse(elem));
          }
          callback(null, appArr);
        }
      });
    },
    (callback) => {
      redis.zrangebyscore(`openapi:${bid}:${aid}`, '-inf', '+inf', (err, result) => {
        if (err) {
          callback(err);
        } else {
          for (const [index, elem] of result.entries()) {
            openapiArr.push(JSON.parse(elem));
          }
          callback(null, openapiArr);
        }
      });
    },
  ], (err, result) => {
    if (err) {
      res.status(502).send();
    } else {
      res.json({
        app: result[0],
        openapi: result[1]
      });
    }
  });
};