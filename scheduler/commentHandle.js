const async = require('neo-async');
const platformMap = require('./platform');

class commentHandle {
  constructor(commentScheduler) {
    this.scheduler = commentScheduler;
    this.logger = commentScheduler.logger;
    this.logger.debug('评论任务处理模块 实例化...');
  }
  rawLoop(raw) {
    async.whilst(
      () => raw.length,
      (cb) => {
        this.classify(raw.shift(), () => {
          cb();
        });
      },
      () => {
        raw = null;
        // this.logger.debug("开始等待下次执行时间");
      }
    );
  }
  classify(_, callback) {
    if (Number(_.platform) === 16 || Number(_.platform) === 37
      || Number(_.platform) === 42) {
      _ = null;
      callback();
      return;
    }
    if (_.bid === '' || _.aid === '') {
      this.logger.error('task info error:', _);
      _ = null;
      callback();
      return;
    }
    const baseInfo = {
      p: _.platform,
      bid: _.bid,
      aid: _.aid,
      platform: platformMap.get(Number(_.platform)),
      taskType: _.taskType
    };
    this.scheduler.emit('task_init', baseInfo);
    _ = null;
    callback();
  }
  checkInit(raw) {
    // const key = `c:${raw.p}:${raw.aid}`;
    this.scheduler.taskDB.exists(`c:${raw.p}:${raw.aid}`, (err, result) => {
      if (err) {
        this.scheduler.emit('redis_error', { db: 'taskDB', action: 1 });
        err = null;
        return;
      }
      if (result === 0) {
        this.scheduler.emit('task_init_set', raw);
        result = null;
        return;
      }
      if (result === 1) {
        this.scheduler.emit('task_check_snapshots', raw);
        result = null;
      }
    });
  }
  checkSnapshots(raw) {
    // const key = `c:${raw.p}:${raw.aid}`;
    this.scheduler.taskDB.hmget(`c:${raw.p}:${raw.aid}`, 'oldSnapshots', 'newSnapshots', (err, result) => {
      if (err) {
        this.scheduler.emit('redis_error', { db: 'taskDB', action: 3 });
        err = null;
        return;
      }
      // if (Number(result[0]) === -1 || Number(result[1]) === -1) {
      //   this.scheduler.emit('task_check_kue', raw);
      //   result = null;
      //   return;
      // }
      // if (Number(raw.p) === 23 && (Number(result[0]) === -1 || Number(result[1]) === -1)) {
      //   this.scheduler.emit('task_check_kue', raw);
      //   return;
      // }
      // this.scheduler.emit('task_check_kue', raw);
      if (Number(result[1]) !== Number(result[0])) {
        this.scheduler.emit('task_check_kue', raw);
      }
      result = null;
    });
  }
  setInit(raw) {
    // const key = `c:${raw.p}:${raw.aid}`
    const time = new Date().getTime();
    this.scheduler.taskDB.hmset(`c:${raw.p}:${raw.aid}`, 'bid', raw.bid, 'aid', raw.aid, 'init', time, 'create', time,
      'comment_number', -1, 'last_comment_id', 0, 'last_comment_time', 0,
      'oldSnapshots', -1, 'newSnapshots', -1, (err) => {
        if (err) {
          this.scheduler.emit('redis_error', { db: 'taskDB', action: 3 });
          err = null;
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
    // const key = `c:${raw.p}:${raw.aid}`,
    //   time = new Date().getTime();
    this.scheduler.taskDB.hset(`c:${raw.p}:${raw.aid}`, 'create', new Date().getTime(), (err) => {
      if (err) {
        this.scheduler.emit('redis_error', { db: 'taskDB', action: 3 });
        err = null;
        return;
      }
      this.getRedisInfo(raw);
    });
  }
  getRedisInfo(raw) {
    // const key = `c:${raw.p}:${raw.aid}`;
    this.scheduler.taskDB.hmget(`c:${raw.p}:${raw.aid}`, 'comment_number', 'last_comment_id', 'last_comment_time', (err, result) => {
      if (err) {
        this.scheduler.emit('redis_error', { db: 'taskDB', action: 3 });
        err = null;
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