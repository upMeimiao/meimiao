const Redis = require('ioredis');
const async = require('async');
const request = require('request');
const crypto = require('crypto');
const moment = require('moment');
const logging = require('log4js');

const logger = logging.getLogger('状态监控');
const monitorClint = new Redis('redis://:C19prsPjHs52CHoA0vm@r-m5e970ad613f13a4.redis.rds.aliyuncs.com:6379/5', {
  reconnectOnError(err) {
    return err.message.slice(0, 'READONLY'.length) === 'READONLY';
  }
});
const _saveInactiveLog = (info) => {
  const numArr = [];
  for (let i = 0; i < 45; i += 1) {
    numArr[i] = 0;
  }
  for (const [index, item] of info.entries()) {
    numArr[item.p - 1] += 1;
  }
  let i = 1, key;
  async.whilst(
    () => i <= numArr.length,
    (cb) => {
      key = `inactive:${i}`;
      monitorClint.hmset(key, 'p', i, 'num', numArr[i - 1], () => {
        i += 1;
        cb();
      });
    }
  );
};
const _saveFailedLog = (info) => {
  let i = 0, task, key, hash;
  async.whilst(
    () => i < info.length,
    (cb) => {
      task = info[i];
      hash = crypto.createHash('md5');
      hash.update(`${task.p}:${task.bid}`);
      key = `failed:${hash.digest('hex')}`;
      monitorClint.hmget(key, 'times', 'firstTime', 'lastTime', (err, result) => {
        if (result[0] && Number(task.failed_at) !== Number(result[1])) {
          if (task.failed_at < result[1]) {
            monitorClint.hmset(key, 'times', Number(result[0]) + 1, 'firstTime', task.failed_at, 'lastTime', result[1]);
          } else if (task.failed_at > result[2]) {
            monitorClint.hmset(key, 'times', Number(result[0]) + 1, 'lastTime', task.failed_at);
          } else {
            monitorClint.hmset(key, 'times', Number(result[0]) + 1);
          }
          delete task.failed_at;
          monitorClint.sadd('failed', JSON.stringify(task));
        }
        if (!result[0]) {
          monitorClint.hmset(key, 'times', 1, 'firstTime', task.failed_at, 'lastTime', task.failed_at);
          // monitorClint.expire(key, 200)
          monitorClint.expire(key, 86400);
          delete task.failed_at;
          monitorClint.sadd('failed', JSON.stringify(task));
        }
        i += 1;
        cb();
      });
    }
  );
};
const _getInactiveTask = () => {
  const options = {
    method: 'GET',
    url: 'http://127.0.0.1:3000/api/jobs/inactive/0...500/desc',
    headers: {
      authorization: 'Basic dmVyb25hOjIzMTk0NDY='
    }
  };
  request(options, (error, response, body) => {
    if (error) {
      logger.error('get inactive task error:', error.message);
      return;
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      logger.error('inactive task json parse error:', error.message);
      return;
    }
    const inactiveTask = [];
    for (const [index, elem] of body.entries()) {
      if (moment().valueOf() - elem.created_at < 30 * 60 * 1000) {
        if (moment().minute() > 30) {
          if (moment(Number(elem.created_at)).minute() > 30) {
            inactiveTask.push({
              p: Number(elem.data.p)
            });
          }
        } else if (moment(Number(elem.created_at)).minute() < 30) {
          inactiveTask.push({
            p: Number(elem.data.p)
          });
        }
      }
      // inactiveTask.push({
      //     p: Number(elem.data.p)
      // })
    }
    _saveInactiveLog(inactiveTask);
  });
};
const _getFailedTask = () => {
  const options = {
    method: 'GET',
    url: 'http://127.0.0.1:3000/api/jobs/failed/0...500/desc',
    headers: {
      authorization: 'Basic dmVyb25hOjIzMTk0NDY='
    }
  };
  request(options, (error, response, body) => {
    if (error) {
      logger.error('get failed task error:', error.message);
      return;
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      logger.error('failed task json parse error:', e.message);
      return;
    }
    const filedTask = [];
    for (const [index, elem] of body.entries()) {
      if (elem.error !== 'undefined' && elem.error !== 'TTL exceeded' && elem.error !== '异常错误') {
        filedTask.push({
          bid: elem.data.id,
          bname: elem.data.name,
          p: Number(elem.data.p),
          failed_at: elem.failed_at
        });
      }
    }
    _saveFailedLog(filedTask);
  });
};
const taskStatusMonitor = () => {
  setInterval(_getFailedTask, 60000);
  setInterval(_getInactiveTask, 60000);
};
taskStatusMonitor();
exports.monitorClint = monitorClint;
exports.logger = logger;