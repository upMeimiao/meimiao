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
      "name": "youku", "platform": 1, "id": 854459409, "bname": "一色神技能", "encodeId": "UMzQxNzgzNzYzNg=="
    };
    platform.start(work, (err, result) => {
      if (err) {
        this.settings.emit(err);
        return;
      }
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
