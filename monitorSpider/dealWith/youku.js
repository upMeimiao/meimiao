/**
 * Created by junhao on 16/6/22.
 */
const moment = require('moment');
const async = require( 'async' );
const request = require( 'request' );
const infoCheck = require('../controllers/infoCheck');

let logger,api;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    api = this.settings.spiderAPI;
    logger.trace('youku monitor begin...');
  }
  start(task, callback) {
    task.total = 0;
    async.parallel(
      {
        user: (cb) => {
          this.getUser(task, (err, result) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, result);
          })
        }
      },
      (err, result) => {
        if (err) {
          callback(err);
          return
        }
        callback(null, result);
      }
    );
  }
  getUser(task, callback) {
    const options = {
      method: 'GET',
      url: `${this.settings.spiderAPI.youku.userInfo + task.encodeId}`
    };
    let typeErr = {};
    request(options, (err, res, body) => {
      if (err) {
        typeErr = {type: 'error', err: err.message, interface: 'user', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (res.statusCode !== 200) {
        typeErr = {type: 'status', err: res.statusCode, interface: 'user', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      try {
        body = JSON.parse(body)
      } catch (e) {
        typeErr = {type: 'json', err: e.message, interface: 'user', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (body.code !== 1) {
        typeErr = {type: 'bid', err: 'encodId-null', interface: 'user', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!body.data) {
        typeErr = {type: 'data', err: 'data-null', interface: 'user', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      let fansNum = body.data.channelOwnerInfo ?
          body.data.channelOwnerInfo.followerNum :
          '';
      task.url = options.url;
      infoCheck.fansNumber(this.core, task, fansNum);
      callback();
    })
  }
}
module.exports = dealWith;