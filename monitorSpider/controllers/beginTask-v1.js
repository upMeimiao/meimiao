/**
 * spider task.
 * created by zhupenghui on 17/6/12.
 */
const getTask = require('./platform.json');

let logger, db, async;
class setTask {
  constructor(monitorSpider) {
    this.settings = monitorSpider;
    db = monitorSpider.MSDB;
    async = monitorSpider.modules.async;
    logger = monitorSpider.settings.logger;
    logger.debug('Start the crawler platform task ...');
    monitorSpider = null;
  }
  start(task, callback) {
    const q = async.queue((work, callback) => {
      work.pname = task.name;
      work.type = task.type;
      this.beginTask(work, task.platform);
      work = null;
      callback();
    }, 2);
    q.drain = () => {
      // logger.debug('单个平台任务并发完成');
      task = null;
      callback();
    };
    q.push(getTask[task.name], (err) => {
      if (err) {
        this.settings.emit('error', { error: '任务启动失败', platform: pname });
        task = null;
      }
    });
  }
  beginTask(work, platform) {
    const time = parseInt(new Date().getTime() / 1000, 10);
    db.get(`alone:${work.pname}:${work.id}`, (err, result) => {
      if (err) {
        this.settings.emit('error', { error: err, platform: `平台号：${work.p}` });
        return;
      }
      if (result && work.p === 23 && (time - result) < 3600) {
        work = null;
        platform = null;
        return;
      }
      if (result && work.p === 17 && (time - result) < 300) {
        work = null;
        platform = null;
        return;
      }
      db.del(`alone:${work.pname}:${work.id}`);
      platform.start(work, (err) => {
        if (err) {
          this.settings.emit('error', { error: err, platform: `平台号：${work.p}` });
        }
      });
      work = null;
      platform = null;
    });
  }
}
module.exports = setTask;
