/**
 * Created by zhupenghui on 17/6/23.
 */
const async = require( 'neo-async' );
const cheerio = require('cheerio');
const request = require( '../../lib/request' );
const infoCheck = require('../controllers/infoCheck');

let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('renren monitor begin...');
  }
  start(task, callback) {
    task.timeout = 0;
    async.parallel(
      {
        user: (cb) => {
          this.getUser(task, () => {
            cb();
          });
        },
        list: (cb) => {
          this.getList(task);
          cb();
        }
      },
      () => {
        callback();
      }
    );
  }
  getUser(task, callback) {
    const option = {
      url: 'http://web.rr.tv/v3plus/user/userInfo',
      headers: {
        clienttype: 'web',
        clientversion: '0.1.0',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
        referer: 'http//rr.tv/'
      },
      data: {
        id: task.id
      }
    };
    request.post(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getUser', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getUser', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getUser', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!result.data || !result.data.user || !result.data.user.fansCount) {
        typeErr = {type: 'json', err: 'renren-fans-error', interface: 'getUser', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getList(task) {
    const option = {
      url: 'http://web.rr.tv/v3plus/uper/videoList',
      headers: {
        clienttype: 'web',
        clientversion: '0.1.0',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
        referer: 'http//rr.tv/'
      },
      data: {
        sort: 'updateTime',
        userId: task.id,
        page: 1,
        row: 20
      }
    };
    request.post(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getList', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getList', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.data || !result.data.results.length === 0) {
        typeErr = {type: 'data', err: 'liVideo-data-list-error', interface: 'getList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      this.getVidInfo(task, result.data.results[0].id);
    });
  }
  getVidInfo(task, aid) {
    const option = {
      url: 'http://web.rr.tv/v3plus/video/detail',
      headers:
        { clienttype: 'web',
          clientversion: '0.1.0',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
          referer: 'http//rr.tv/'
        },
      data: {
        videoId: aid
      }
    };
    request.post(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVidInfo', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVidInfo', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getVidInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
}
module.exports = dealWith;