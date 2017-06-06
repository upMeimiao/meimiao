const Redis = require('ioredis');
const async = require('async');
const request = require('request');

const redis = new Redis('redis://:C19prsPjHs52CHoA0vm@r-m5e970ad613f13a4.redis.rds.aliyuncs.com:6379/1', {
  reconnectOnError(err) {
    return err.message.slice(0, 'READONLY'.length) === 'READONLY';
  }
});

const _getServerData = (p, callback) => {
  request.get(`http://qiaosuan-intra.meimiaoip.com/index.php/spider/videoO/getTaskStatus?p=${p}`, (err, res, body) => {
    if (err) {
      callback(err);
      return;
    }
    if (res.statusCode !== 200) {
      callback(res.statusCode);
      return;
    }
    let result;
    try {
      result = JSON.parse(body);
    } catch (e) {
      callback(e);
      return;
    }
    if (result.errno !== 0) {
      callback(result.errno);
      return;
    }
    callback(null, result.data);
  });
};
const _getInfo = (list, callback) => {
  const getRedisData = (item, cb) => {
    const key = `${item.platform}:${item.bid}`;
    let info;
    redis.hmget(key, 'init', 'create', 'video_number', 'update', (err, result) => {
      if (err) return;
      info = {
        p: item.platform,
        bid: item.bid,
        bname: item.bname,
        post_t: item.post_t,
        update_t: item.update_t,
        is_post: item.is_post,
        init: result[0],
        create: result[1],
        videoNumber: Number(result[2]).toString() !== 'NaN' ? Number(result[2]) : result[2],
        update: result[3] || null
      };
      cb(null, info);
    });
  };
  async.map(list, getRedisData, (err, results) => {
    const data = {
      infos: results,
      count: list.length
    };
    return callback(null, data);
  });
};
exports.findData = (req, res) => {
  async.waterfall([
    (callback) => {
      _getServerData(req.query.p || '', (err, result) => {
        if (err) {
          callback(err);
          return;
        }
        callback(null, result);
      });
    },
    (list, callback) => {
      _getInfo(list, (err, info) => {
        if (err) {
          callback(err);
          return;
        }
        callback(null, info);
      });
    }
  ], (err, result) => {
    if (err) {
      res.status(502).send();
      return;
    }
    res.json(result);
  });
};
exports.changeStatus = (req, res) => {
  redis.hmset(req.body.key, 'update', req.body.time, 'video_number', req.body.total, (err, result) => {
    if (err) {
      res.status(502).send();
      return;
    }
    res.json(result);
  });
};