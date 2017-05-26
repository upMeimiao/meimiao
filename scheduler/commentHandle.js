const async = require('neo-async');
const platformMap = require('./platform');

class commentHandle {
  constructor(commentScheduler) {
    this.scheduler = commentScheduler;
    this.logger = commentScheduler.logger;
    this.logger.debug('评论任务处理模块 实例化...');
  }
  rawLoop(raw) {
    const data = raw.data, // raw.d,
      len = data ? data.length : 0;
    let i = 0;
    async.whilst(
      () => i < len,
      (cb) => {
        this.classify(data[i], () => {
          i += 1;
          cb();
        });
      },
      () => {
        // this.logger.debug("开始等待下次执行时间");
      }
    );
  }
  classify(_, callback) {
    if (_ == 1) {
      callback();
      return;
    }
    if (Number(_.platform) === 12 || Number(_.platform) === 16 || Number(_.platform) === 37 || Number(_.platform) === 39) {
      callback();
      return;
    }
    if (_.bid === '' || _.aid === '') {
      this.logger.error('task info error:', _);
      callback();
      return;
    }
    const platform = platformMap.get(Number(_.platform)),
      baseInfo = {
        p: _.platform,
        bid: _.bid,
        aid: _.aid,
        platform,
        taskType: _.taskType
      };
    this.scheduler.emit('task_init', baseInfo);
    callback();
  }
  checkInit(raw) {
    const key = `c:${raw.p}:${raw.aid}`;
    this.scheduler.taskDB.exists(key, (err, result) => {
      if (err) {
        this.scheduler.emit('redis_error', { db: 'taskDB', action: 1 });
        return;
      }
      if (result === 0) {
        this.scheduler.emit('task_init_set', raw);
        return;
      }
      if (result === 1) {
        this.scheduler.emit('task_check_snapshots', raw);
      }
    });
  }
  checkSnapshots(raw) {
    const key = `c:${raw.p}:${raw.aid}`;
    this.scheduler.taskDB.hmget(key, 'oldSnapshots', 'newSnapshots', (err, result) => {
      if (err) {
        this.scheduler.emit('redis_error', { db: 'taskDB', action: 3 });
        return;
      }
      if (Number(result[0]) === -1 || Number(result[1]) === -1) {
        this.scheduler.emit('task_check_kue', raw);
        return;
      }
      // if (Number(raw.p) === 23 && (Number(result[0]) === -1 || Number(result[1]) === -1)) {
      //   this.scheduler.emit('task_check_kue', raw);
      //   return;
      // }
      if (Number(result[0]) !== Number(result[1])) {
        this.scheduler.emit('task_check_kue', raw);
      }
    });
  }
  setInit(raw) {
    const key = `c:${raw.p}:${raw.aid}`,
      time = new Date().getTime();
    this.scheduler.taskDB.hmset(key, 'bid', raw.bid, 'aid', raw.aid, 'init', time, 'create', time,
      'comment_number', -1, 'last_comment_id', 0, 'last_comment_time', 0,
      'oldSnapshots', -1, 'newSnapshots', -1, (err) => {
        if (err) {
          this.scheduler.emit('redis_error', { db: 'taskDB', action: 3 });
          return;
        }
        raw.comment_id = 0;
        raw.comment_time = 0;
        raw.comment_num = 0;
        this.scheduler.emit('task_create', raw);
      }
    );
  }
  setCreate(raw) {
    const key = `c:${raw.p}:${raw.aid}`,
      time = new Date().getTime();
    this.scheduler.taskDB.hset(key, 'create', time, (err) => {
      if (err) {
        this.scheduler.emit('redis_error', { db: 'taskDB', action: 3 });
        return;
      }
      this.getRedisInfo(raw);
    });
  }
  getRedisInfo(raw) {
    const key = `c:${raw.p}:${raw.aid}`;
    this.scheduler.taskDB.hmget(key, 'comment_number', 'last_comment_id', 'last_comment_time', (err, result) => {
      if (err) {
        this.scheduler.emit('redis_error', { db: 'taskDB', action: 3 });
        return;
      }
      raw.comment_num = result[0];
      raw.comment_id = result[1];
      raw.comment_time = result[2];
      this.scheduler.emit('task_create', raw);
    });
  }
}
module.exports = commentHandle;