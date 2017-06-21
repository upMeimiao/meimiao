/**
 * Created by zhupenghui on 17/6/21.
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
    logger.trace('mgtv monitor begin...');
  }
  start(task, callback) {
    task.total = 0;
    async.parallel(
      {
        list: (cb) => {
          this.getList(task);
          cb();
        },
        vidInfo: (cb) => {
          this.getVidInfo(task);
          cb();
        },
        play: (cb) => {
          this.getPlayNum(task);
          cb();
        },
        getClass: (cb) => {
          this.getClass(task);
          cb();
        },
        desc: (cb) => {
          this.getDesc(task);
          cb();
        },
        like: (cb) => {
          this.getLike(task);
          cb();
        },
        comNum: (cb) => {
          this.getComNum(task);
          cb();
        }
      },
      () => {
        callback();
      }
    );
  }
  getList(task) {
    const option = {
      url: `${this.settings.spiderAPI.mgtv.listVideo + task.id}&month=&_=${(new Date()).getTime()}`
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
      if (!result.data.list || result.data.list.length === 0) {
        typeErr = {type: 'data', err: 'mgtv-list-data-null', interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getVidInfo(task) {
    const option = {
      url: this.settings.spiderAPI.mgtv.videoInfo + task.aid
    };
    request.get(logger, option, (err, result) => {
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
        return;
      }
    });
  }
  getPlayNum(task) {
    const option = {
      url: `${this.settings.spiderAPI.mgtv.userInfo}vid=${task.aid}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getPlayNum', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getPlayNum', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getPlayNum', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getClass(task) {
    const option = {
      url: `http://mobile.api.hunantv.com/v7/video/info?device=iPhone&videoId=${task.aid}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getClass', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getClass', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getClass', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getDesc(task) {
    const option = {
      url: `http://www.mgtv.com/b/${task.id}/${task.aid}.html`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getDesc', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getDesc', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      const $ = cheerio.load(result.body),
        desc = $('span.details').text();
      if (!desc) {
        typeErr = {type: 'data', err: 'mgtv-desc-null', interface: 'getDesc', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getLike(task) {
    const option = {
      url: `http://vc.mgtv.com/v2/dynamicinfo?vid=${task.aid}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getLike', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getLike', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getLike', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getComNum(task) {
    const option = {
      url: `http://comment.mgtv.com/video_comment/list/?subject_id=${task.aid}&page=1&_=${new Date().getTime()}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getComNum', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getComNum', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getComNum', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
}
module.exports = dealWith;