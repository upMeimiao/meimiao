
/**
 * Created by zhupenghui on 17/6/22.
 */
const async = require( 'neo-async' );
const cheerio = require('cheerio');
const request = require( '../../lib/request' );
const infoCheck = require('../controllers/infoCheck');

const jsonp = (data) => data;
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('xinlan monitor begin...');
  }
  start(task, callback) {
    task.timeout = 0;
    async.parallel(
      {
        list: (cb) => {
          this.getList(task);
          cb();
        },
        video: (cb) => {
          this.getVideoInfo(task);
          cb();
        },
        comment: (cb) => {
          this.getComment(task);
          cb();
        },
        support: (cb) => {
          this.getSupport(task);
          cb();
        },
        sava: (cb) => {
          this.getSava(task);
          cb();
        }
      },
      () => {
        logger = null;
        typeErr = null;
        callback();
      }
    );
  }
  getList(task) {
    const option = {
      url: `${this.settings.spiderAPI.xinlan.listVideo + task.id}&cid=${task.encodeId}&_=${new Date().getTime()}`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'list', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'list', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.data || result.data.length) {
        typeErr = {type: 'data', err: 'xinlan-list-error', interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getVideoInfo(task) {
    const option = {
        url: this.settings.spiderAPI.xinlan.videoInfo + task.aid,
        authtoken: '103uXIxNMiH1xVhHVNZWabr1EOqgE3DdXlnzzbldw'
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
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'video', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getComment(task) {
    const option = {
      url: `http://api.my.cztv.com/api/list?xid=${task.id}&pid=6&type=video&page=1&rows=10&_=${new Date().getTime()}`,
      authtoken: '103uXIxNMiH1xVhHVNZWabr1EOqgE3DdXlnzzbldw'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getComment', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getComment', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getComment', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getSupport(task) {
    const option = {
      url: `http://proxy.app.cztv.com/getSupportStatus.do?videoIdList=${task.aid}`,
      authtoken: '103uXIxNMiH1xVhHVNZWabr1EOqgE3DdXlnzzbldw'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getSupport', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getSupport', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getSupport', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getSava(task) {
    const option = {
      url: `http://proxy.app.cztv.com/getCollectStatus.do?videoIdList=${vid}`,
      authtoken: '103uXIxNMiH1xVhHVNZWabr1EOqgE3DdXlnzzbldw'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getSava', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getSava', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getSava', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
}
module.exports = dealWith;