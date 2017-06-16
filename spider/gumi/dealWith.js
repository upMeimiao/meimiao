/**
 * Created by junhao on 16/6/21.
 */
// const moment = require('moment');
// const async = require('neo-async');
// const cheerio = require('cheerio');
// const request = require('../../lib/request');
// const spiderUtils = require('../../lib/spiderUtils');

let logger;
class dealWith {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    logger = this.settings.logger;
    logger.trace('DealWith instantiation ...');
  }
  todo(task, callback) {
    task.total = 0;
    this.getVideo(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.total);
    });
  }
}
module.exports = dealWith;