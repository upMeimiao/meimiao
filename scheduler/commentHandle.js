const platformMap = require('./platform');

class commentHandle {
  constructor(commentScheduler) {
    this.scheduler = commentScheduler;
    this.logger = commentScheduler.logger;
    this.logger.debug('评论任务处理模块 实例化...');
  }
  classify(raw) {
    const baseInfo = []
    for (const [index, elem] of raw.entries()) {
      if (elem.bid !== '' && elem.aid !== '') {
        baseInfo.push({
          p: elem.platform,
          bid: elem.bid,
          aid: elem.aid,
          platform: platformMap.get(Number(elem.platform)),
          taskType: elem.taskType
        });
      }
    }
    raw = null;
    this.scheduler.emit('task_init', baseInfo);
  }
  checkInit(raw) {
    // const key = `c:${raw.p}:${raw.aid}`;
    let key = [];
    const initList = [], list = []
    for (const [index, elem] of raw.entries()) {
      key[index] = ['exists', `c:${elem.p}:${elem.aid}`];
    }
    this.scheduler.taskDB.pipeline(
      key
    ).exec((err, result) => {
      if (err) {
        err = null;
        return;
      }
      for (const [index, elem] of result.entries()) {
        if (elem[0] === null && elem[1] === 0) {
          initList.push(raw[index]);
        }
        if (elem[0] === null && elem[1] === 1) {
          list.push(raw[index]);
        }
      }
      result = null;
      raw = null;
      key = null;
      if (initList.length > 0) {
        this.scheduler.emit('task_init_set', initList);
      }
      if (list.length > 0) {
        this.scheduler.emit('task_info_get', list);
      }
    });
  }
  setInit(raw) {
    let key = [];
    const time = new Date().getTime();
    for (const [index, elem] of raw.entries()) {
      key[index] = ['hmset', `c:${elem.p}:${elem.aid}`, 'bid', elem.bid, 'aid', elem.aid, 'init', time, 'create', time,
        'comment_number', -1, 'last_comment_id', 0, 'last_comment_time', 0,
        'oldSnapshots', -1, 'newSnapshots', -1, ];
    }
    this.scheduler.taskDB.pipeline(
      key
    ).exec((err, result) => {
      if (err) {
        err = null;
        return;
      }
      for (const [index, elem] of result.entries()) {
        if (elem[0] === null && elem[1] === 'OK') {
          this.scheduler.emit('task_create', Object.assign(raw[index], {
            comment_id: 0,
            comment_time: 0,
            comment_num: -1
          }));
        }
      }
      result = null;
      key = null;
      raw = null;
    });
  }
  getRedisInfo(raw) {
    let key = [];
    const list = [];
    for (const [index, elem] of raw.entries()) {
      key[index] = ['hmget', `c:${elem.p}:${elem.aid}`, 'comment_number', 'last_comment_id', 'last_comment_time', 'oldSnapshots', 'newSnapshots'];
    }
    this.scheduler.taskDB.pipeline(
      key
    ).exec((err, result) => {
      if (err) {
        err = null;
        return;
      }
      for (const [index, elem] of result.entries()) {
        if (elem[0] === null && elem[1].length === 5) {
          if (Number(elem[1][4]) === 0
            || (Number(raw[index].p) === 23 && Number(elem[1][4]) === -1)) {
            continue;
          }
          if (Number(elem[1][3]) === -1 && Number(elem[1][4]) === -1) {
            list.push(Object.assign(raw[index], {
              comment_num: elem[1][0],
              comment_id: elem[1][1],
              comment_time: elem[1][2]
            }));
            continue;
          }
          if (Number(elem[1][4]) > Number(elem[1][3])) {
            list.push(Object.assign(raw[index], {
              comment_num: elem[1][0],
              comment_id: elem[1][1],
              comment_time: elem[1][2]
            }));
          }
        }
      }
      result = null;
      key = null;
      raw = null;
      if (list.length > 0) {
        this.scheduler.emit('task_set_create', list);
      }
    });
  }
  setCreate(raw) {
    if (!Array.isArray(raw)) {
      this.logger.debug(raw)
    }
    let key = [];
    const list = [], time = new Date().getTime();
    for (const [index, elem] of raw.entries()) {
      key[index] = ['hset', `c:${elem.p}:${elem.aid}`, 'create', time];
    }
    this.scheduler.taskDB.pipeline(
      key
    ).exec((err, result) => {
      if (err) {
        err = null;
        return;
      }
      for (const [index, elem] of result.entries()) {
        if (elem[0] === null && elem[1] === 0) {
          this.scheduler.emit('task_check_kue', raw[index]);
        }
      }
      result = null;
      key = null;
      raw = null;
    });
  }
}
module.exports = commentHandle;