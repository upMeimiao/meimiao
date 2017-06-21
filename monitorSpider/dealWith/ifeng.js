/**
 * Created by zhupenghui on 17/6/21.
 */
const async = require( 'neo-async' );
const request = require( '../../lib/request' );
const infoCheck = require('../controllers/infoCheck');

let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('ifeng monitor begin...');
  }
  start(task, callback) {
    task.total = 0;
    this.getUser(task, () => {
      callback();
    });
  }
  getUser(task, callback) {
    const options = {
      url: `${this.settings.spiderAPI.ifeng.medialist + task.id}&pageNo=1&platformType=iPhone&protocol=1.0.1`,
      ua: 3,
      own_ua: 'ifengPlayer/7.1.0 (iPhone; iOS 10.2; Scale/3.00)'
    };
    request.get(logger, options, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'user-total', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user-total', url: options.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'user-total', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (result.infoList.length === 0) {
        typeErr = {type: 'data', err: 'ifeng-list-异常错误', interface: 'user-total', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!result.infoList[0] || !result.infoList[0].weMedia.followNo) {
        typeErr = {type: 'data', err: 'ifeng-fans-data-error', interface: 'user', url: options.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      this.getVideo(task, result.infoList[0].bodyList[0]);
      callback();
    });
  }
  getVideo(task, video) {
    const option = {
      url: this.settings.spiderAPI.ifeng.info + video.memberItem.guid,
      ua: 3,
      own_ua: 'ifengPlayer/7.1.0 (iPhone; iOS 10.2; Scale/3.00)'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'video', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'video', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(err.message), interface: 'video', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      this._ding(video.memberItem.guid);
      this._cai(video.memberItem.guid);
    });
  }
  _ding(guid) {
    const option = {
      url: `http://survey.news.ifeng.com/getaccumulator_ext.php?key=${guid}ding&format=js&serverid=1&var=ding`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'ding', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'ding', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      result = result.body.replace('var ding=', '').replace(';', '');
      try {
        result = JSON.parse(result);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'ding', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  _cai(guid) {
    const option = {
      url: `http://survey.news.ifeng.com/getaccumulator_ext.php?key=${guid}cai&format=js&serverid=1&var=cai`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'cai', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'cai', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      result = result.body.replace('var cai=', '').replace(';', '');
      try {
        result = JSON.parse(result);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'cai', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
}
module.exports = dealWith;