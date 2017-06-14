/**
 * spider task.
 * created by zhupenghui on 17/6/12.
 */
let logger;
class setTask {
  constructor(monitorSpider) {
    this.settings = monitorSpider;
    logger = monitorSpider.settings.logger;
    logger.debug('Start the crawler platform task ...');
  }
  youku(platform, callback) {
    let work = {
      "p": 1, "id": 854459409, "name": "一色神技能", "encodeId": "UMzQxNzgzNzYzNg=="
    };
    platform.start(work, (err, result) => {
      if (err) {
        this.settings.emit(err);
        return;
      }
      logger.debug('优酷完成一次检测');
      setTimeout(() => {
        this.youku(platform, null);
      }, 12000);
    });
    if (callback) {
      callback();
    }
  }

}
module.exports = setTask;
