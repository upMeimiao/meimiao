/**
 * Created by junhao on 17/3/17.
 */
const moment = require('moment');
const async = require('async');
const request = require('request');
const spiderUtils = require('../../lib/spiderUtils');

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
        /* this.getListInfo(task,(err) => {
            if(err){
                return callback(err)
            }
            callback(null,task.total)
        })*/
  }
}
module.exports = dealWith;