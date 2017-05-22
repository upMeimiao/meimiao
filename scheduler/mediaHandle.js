const async = require('async');
const platformMap = require('./platform');

class mediaHandle {
  constructor(mediaScheduler) {
    this.scheduler = mediaScheduler;
    this.logger = mediaScheduler.logger;
    this.logger.debug('视频任务处理模块 实例化...');
  }
  rawLoop(raw) {
    const data = raw.data,
      len = data ? data.length : 0;
    let i = 0;
    // this.logger.debug(raw)
    async.whilst(
      () => i < len,
      (cb) => {
        this.classify(data[i], () => {
          i += 1;
          cb();
        });
      },
      () => {
        // this.logger.debug("开始等待下次执行时间")
      }
    );
  }
  classify(_, callback) {
    // const platform = platformMap.get(Number(_.p)),
    // baseInfo = {
    //   id: _.id,
    //   p: _.p,
    //   name: _.name,
    //   platform: platform,
    //   encodeId: _.encodeId ? _.encodeId : '',
    //   type: _.type ? _.type : ''
    // }
    if (Number(_.platform) === 12) {
      callback();
      return;
    }
    const platform = platformMap.get(Number(_.platform)),
      baseInfo = {
        id: _.bid,
        p: _.platform,
        name: _.bname,
        platform,
        encodeId: _.encodeId ? _.encodeId : '',
        type: _.type ? _.type : ''
        // uid: ''
      };
    this.scheduler.emit('task_init', baseInfo);
    callback();
  }
  checkInit(raw) {
    const key = `${raw.p}:${raw.id}`;
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
        this.scheduler.emit('task_check_kue', raw);
      }
    });
  }
  setInit(raw) {
    const key = `${raw.p}:${raw.id}`,
      time = new Date().getTime();
    this.scheduler.taskDB.hmset(key, 'id', raw.id, 'bname', raw.name, 'init', time, 'create', time, 'video_number', 0,
      (err) => {
        if (err) {
          this.scheduler.emit('redis_error', { db: 'taskDB', action: 3 });
          return;
        }
        raw.first = true;
        this.scheduler.emit('task_create', raw);
      }
    );
  }
  setCreate(raw) {
    const key = `${raw.p}:${raw.id}`,
      time = new Date().getTime();
    this.scheduler.taskDB.hset(key, 'create', time, (err) => {
      if (err) {
        this.scheduler.emit('redis_error', { db: 'taskDB', action: 3 });
        return;
      }
      raw.first = false;
      this.scheduler.emit('task_create', raw);
    });
  }
}
module.exports = mediaHandle;