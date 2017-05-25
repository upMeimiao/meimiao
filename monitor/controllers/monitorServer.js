const schedule = require('node-schedule');
const async = require('async');
const crypto = require('crypto');
const platformMap = require('./platform');
const emailServer = require('./emailServer');
const monitorContronller = require('./monitorController');

const logger = monitorContronller.logger;
const client = monitorContronller.monitorClint;

const _inactivePretreatment = (info) => {
  if (info.length === 0) {
    return;
  }
  let emailContent = '';
  for (const [index, elem] of info.entries()) {
    if (elem) {
      emailContent += `<p>平台：${platformMap.get(Number(elem.p))}，未激活个数：${elem.num}</p>`;
    }
  }
  if (emailContent !== '') {
    emailServer.sendAlarm('任务未激活', emailContent);
  }
};
const _inactiveTaskAlarm = () => {
  let i = 1, key;
  const inactiveArr = [];
  async.whilst(
    () => i <= 45,
    (cb) => {
      key = `inactive:${i}`;
      client.hget(key, 'num', (err, result) => {
        if (err) {
          i += 1;
          cb();
          return;
        }
        if (result > 0) {
          inactiveArr.push({
            p: i,
            num: Number(result)
          });
        }
        i += 1;
        cb();
      });
    },
    () => {
      _inactivePretreatment(inactiveArr);
    }
  );
};
const _failedPretreatment = (info) => {
  if (info.length === 0) {
    return;
  }
  let emailContent = '';
  for (const [index, elem] of info.entries()) {
    if (elem) {
      emailContent += `<p>平台：${platformMap.get(Number(elem.p))}，bid：${elem.bid}，bname：${elem.bname}</p>`;
    }
  }
  if (emailContent !== '') {
    emailServer.sendAlarm('任务失败', emailContent);
  }
};
const _getFailedInfo = (info, callback) => {
  let hash, key, data;
  const getRedisData = (item, cb) => {
    hash = crypto.createHash('md5');
    hash.update(`${item.p}:${item.bid}`);
    key = `failed:${hash.digest('hex')}`;
    client.hmget(key, 'times', 'lastTime', (err, result) => {
      if (err) {
        cb(null, null);
        return;
      }
      if (!result[0]) {
        client.srem('failed', JSON.stringify(item));
        cb(null, null);
        return;
      }
      if (result[1] < new Date().getTime() - 1800000) {
        cb(null, null);
        return;
      }
      data = {
        p: item.p,
        bid: item.bid,
        bname: item.bname,
        times: result[0]
      };
      cb(null, data);
    });
  };
  async.map(info, getRedisData, (err, results) => {
    callback(null, results);
  });
};
const _failedTaskAlarm = () => {
  let sign = true, cursor = 0;
  const failedArr = [];
  async.whilst(
    () => sign,
    (cb) => {
      client.sscan('failed', cursor, 'count', 100, (err, result) => {
        if (err) {
          logger.debug(err);
          cb();
          return;
        }
        if (Number(result[0]) === 0) {
          sign = false;
        } else {
          cursor = result[0];
        }
        for (const [index, elem] of result[1].entries()) {
          failedArr.push(JSON.parse(elem));
        }
        cb();
      });
    },
    () => {
      _getFailedInfo(failedArr, (err, raw) => {
        _failedPretreatment(raw);
      });
    }
  );
};
exports.start = () => {
  const failedRule = new schedule.RecurrenceRule();
  const inactiveRule = new schedule.RecurrenceRule();
  failedRule.minute = [15, 45];
  inactiveRule.minute = [0, 30];
  schedule.scheduleJob(failedRule, () => {
    _failedTaskAlarm();
  });
  schedule.scheduleJob(inactiveRule, () => {
    _inactiveTaskAlarm();
  });
};