/**
 * spider task.
 * created by zhupenghui on 17/6/12.
 */
const async = require('neo-async');
const getTask = require('./platform.json');
let logger;
class setTask {
  constructor(monitorSpider) {
    this.settings = monitorSpider;
    logger = monitorSpider.settings.logger;
    logger.debug('Start the crawler platform task ...');
  }
  start(pname, platform, callback) {
    const q = async.queue((work, callback) => {
      this.beginTask(work, platform);
      callback();
    }, 2);
    q.drain = () => {
      // logger.debug('单个平台任务并发完成');
      pname = null;
      platform = null;
      callback();
    };
    q.push(getTask[pname], (err) => {
      if (err) {
        this.settings.emit('error', {error: '任务启动失败', platform: pname});
        pname = null;
        platform = null;
      }
    });
  }
  beginTask(work, platform) {
    platform.start(work, (err) => {
      if (err) {
        this.settings.emit('error', {error: err, platform: `平台号：${work.p}`});
      }
      // setTimeout(() => {
      //   this.beginTask(work, platform);
      // }, 12000);
    });
    work = null;
    platform = null;
  }
}
module.exports = setTask;
