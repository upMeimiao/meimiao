/**
 * Created by ifable on 2017/3/8.
 */
const Redis = require('ioredis');
const pidMap = require('../../taskArray');

const redis = new Redis('redis://:C19prsPjHs52CHoA0vm@r-m5e970ad613f13a4.redis.rds.aliyuncs.com:6379/3', {
  reconnectOnError(err) {
    return err.message.slice(0, 'READONLY'.length) === 'READONLY';
  }
});

exports.getAid = (req, res) => {
  const p = req.query.p,
    bid = pidMap.get(Number(p)),
    key = `c:${p}:${bid}`;
  redis.smembers(key, (err, result) => {
    if (err) {
      res.status(502).json({ status: false });
      return;
    }
    const list = [];
    for (const [index, elem] of result.entries()) {
      list.push({
        p,
        bid,
        aid: elem
      });
    }
    const info = {
      status: true,
      aidNumber: result.length,
      aidList: list
    };
    res.status(200).json(info);
  });
};
exports.getCommentList = (req, res) => {
  const p = req.query.p,
    bid = pidMap.get(Number(p)),
    aid = req.query.aid,
    key = `c:${p}:${bid}:${aid}`;
  redis.smembers(key, (err, result) => {
    if (err) {
      res.status(502).json({ status: false });
      return;
    }
    const list = [];
    for (const [index, elem] of result.entries()) {
      list.push(JSON.parse(elem));
    }
    res.status(200).json({ status: true, commentsNumber: list.length, commentsList: list });
  });
};