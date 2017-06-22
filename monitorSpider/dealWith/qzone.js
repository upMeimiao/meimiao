/**
 * Created by zhupenghui on 17/6/21.
 */
const async = require( 'neo-async' );
const cheerio = require('cheerio');
const request = require( '../../lib/request' );
const infoCheck = require('../controllers/infoCheck');

const _Callback = (data) => data;
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('qzone monitor begin...');
  }
  start(task, callback) {
    task.total = 0;
    async.parallel(
      {
        user: (cb) => {
          this.getUser(task, () => {
            cb();
          });
        },
        list: (cb) => {
          this.getList(task, () => {
            cb();
          });
        },
        videoInfo: (cb) => {
          this.getVidInfo(task);
          cb();
        },
        com: (cb) => {
          this.getVidCom(task);
          cb();
        }
      },
      () => {
        callback();
      }
    );
    this.getList(task, () => {
      callback();
    });
  }
  getUser(task, callback) {
    const option = {
      url: `https://h5.qzone.qq.com/proxy/domain/r.qzone.qq.com/cgi-bin/tfriend/cgi_like_check_and_getfansnum.cgi?uin=${task.id}&mask=3&fupdate=1`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'user', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      callback();
    });
  }
  getList(task, callback) {
    const option = {
      referer: `https://h5.qzone.qq.com/proxy/domain/ic2.qzone.qq.com/cgi-bin/feeds/feeds_html_module?i_uin=${task.id}&mode=4&previewV8=1&style=31&version=8&needDelOpr=true&transparence=true&hideExtend=false&showcount=10&MORE_FEEDS_CGI=http%3A%2F%2Fic2.qzone.qq.com%2Fcgi-bin%2Ffeeds%2Ffeeds_html_act_all&refer=2&paramstring=os-win7|100`,
      url:  `${this.settings.spiderAPI.qzone.listVideo + task.id}&start=0`,
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
        callback();
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!result.data || !result.data.friend_data || result.data.friend_data.length === 0) {
        typeErr = {type: 'data', err: 'qzone-list-data-null', interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      callback();
    });
  }
  getVidInfo(task) {
    const option = {
      url: `${this.settings.spiderAPI.qzone.videoInfo + task.id}&appid=${task.appid}&tid=${task.aid}&ugckey=${task.id}_${task.appid}_${task.aid}_&qua=V1_PC_QZ_1.0.0_0_IDC_B`
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
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getVidInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.data) {
        typeErr = {type: 'data', err: 'qzone-data-null', interface: 'getVidInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      result = result.data.all_videolist_data[0];
      if (!result || !result.singlefeed) {
        typeErr = {type: 'data', err: 'qzone-singlefeed-null', interface: 'getVidInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (result.singlefeed['1'] && result.singlefeed['1'].user && result.singlefeed['1'].user.uin != task.id) {
        typeErr = {type: 'data', err: '当前视频被删掉或者是数据错误', interface: 'getVidInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getVidCom(task) {
    const option = {
      url: `https://h5.qzone.qq.com/proxy/domain/taotao.qq.com/cgi-bin/emotion_cgi_msgdetail_v6?uin=${task.id}&tid=${task.aid}&t1_source=1&ftype=0&sort=0&pos=0&num=20&code_version=1&format=jsonp&need_private_comment=1`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVidCom', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVidCom', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getVidCom', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
}
module.exports = dealWith;