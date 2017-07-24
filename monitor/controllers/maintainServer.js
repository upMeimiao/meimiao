const schedule = require('node-schedule');
const moment = require('moment');
const kue = require('kue');
const Redis = require('ioredis');
const request = require('request');
const platformMap = require('./platform');
const redisConf = require('../config/redis');

const redis = new Redis(`redis://:${redisConf.auth}@${redisConf.host}:6379/1`, {
  reconnectOnError(err) {
    return err.message.slice(0, 'READONLY'.length) === 'READONLY';
  }
});

kue.createQueue({
  redis: {
    port: '6379',
    host: redisConf.host,
    auth: redisConf.auth,
    db: 2
  }
});
const failedJobRemove = (num) => {
  if (num > 2) {
    return;
  }
  kue.Job.rangeByState('failed', 0, 1000, 'asc', (err, jobs) => {
    if (err) {
      num += 1;
      setTimeout(() => {
        failedJobRemove(num);
      }, 300000);
      return;
    }
    jobs.forEach((job) => {
      if (moment().valueOf() - job.created_at > 86400000) {
        job.remove();
      }
    });
  });
};
const monitorBanned = () => {
  redis.zrangebyscore('channel:banned', '-1', '(0', (err, result) => {
    if (err || !result || result.length === 0) return;
    const key = [];
    let content = '';
    for (const [index, elem] of result.entries()) {
      content += `<p>平台：${platformMap.get(Number(elem.split('_')[0]))}，ID：${elem.split('_')[1]}，用户名：${elem.split('_')[2]}</p>`;
      key[index] = ['zadd', 'channel:banned', 1, elem];
    }
    redis.pipeline(key).exec();
    request({
      method: 'POST',
      url: 'http://10.251.55.50:3001/api/alarm',
      form: {
        mailGroup: 1,
        subject: 'IP账号疑似被封禁(或找不到)',
        content
      }
    });
  });
};
exports.start = () => {
  const rule = new schedule.RecurrenceRule();
  rule.hour = 8;
  rule.minute = 30;
  schedule.scheduleJob(rule, () => {
    failedJobRemove(0);
  });
  setInterval(() => {
    monitorBanned();
  }, 1200000);
  schedule.scheduleJob('*/2 * * * *', () => {
    redis.info('memory', (err, result) => {
      const memory = {}
      for (const [index, elem] of result.split('\r\n').entries()) {
        if (index !== 0 && elem !== '') {
          memory[elem.split(':')[0]] = elem.split(':')[1];
        }
      }
      if (Math.round((memory.used_memory / 4294967296) * 100) >= 90) {
        request({
          method: 'POST',
          url: 'http://10.251.55.50:3001/api/alarm',
          form: {
            mailGroup: 3,
            subject: 'Redis 内存占用报警',
            content: `当前Redis内存已使用${memory.used_memory_human}，达到${((memory.used_memory / 4294967296) * 100).toFixed(2)}%`
          }
        });
      }
    });
  });
};