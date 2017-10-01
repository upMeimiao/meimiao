/**
 * Created by zhupenghui on 17/6/21.
 */

const _Callback = (data) => data;
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('qzone monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.async = this.modules.async;
    task.infoCheck = this.modules.infoCheck;
    task.async.parallel(
      {
        user: (cb) => {
          this.getUser(task);
          cb();
        },
        list: (cb) => {
          this.getList(task);
          cb();
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
        task = null;
        callback();
      }
    );
  }
  getUser(task) {
    let option = {
      url: `https://h5.qzone.qq.com/proxy/domain/r.qzone.qq.com/cgi-bin/tfriend/cgi_like_check_and_getfansnum.cgi?uin=${task.id}&mask=3&fupdate=1`,
      ua: 1
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'user', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        result = null; task = null; typeErr = null; option = null;
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        result = null; task = null; typeErr = null; option = null;
        return;
      }
      if (!result || !result.data || !result.data.data || !result.data.data.total) {
        typeErr = {type: 'data', err: `qzone-user-data-error, data: ${JSON.stringify(result)}`, interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      result = null; task = null; typeErr = null; option = null;
    });
  }
  getList(task) {
    let option = {
      referer: `https://h5.qzone.qq.com/proxy/domain/ic2.qzone.qq.com/cgi-bin/feeds/feeds_html_module?i_uin=${task.id}&mode=4&previewV8=1&style=31&version=8&needDelOpr=true&transparence=true&hideExtend=false&showcount=10&MORE_FEEDS_CGI=http%3A%2F%2Fic2.qzone.qq.com%2Fcgi-bin%2Ffeeds%2Ffeeds_html_act_all&refer=2&paramstring=os-win7|100`,
      url:  `${this.settings.spiderAPI.qzone.listVideo + task.id}&start=0`,
      ua: 1
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'list', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'list', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        result = null; task = null; typeErr = null; option = null;
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'list', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        result = null; task = null; typeErr = null; option = null;
        return;
      }
      if (!result.data || !result.data.friend_data || result.data.friend_data.length === 0) {
        typeErr = {type: 'data', err: `qzone-list-data-null, data: ${JSON.stringify(result)}`, interface: 'list', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      result = null; task = null; typeErr = null; option = null;
    });
  }
  getVidInfo(task) {
    let option = {
      url: `${this.settings.spiderAPI.qzone.videoInfo + task.id}&appid=${task.appid}&tid=${task.aid}&ugckey=${task.id}_${task.appid}_${task.aid}_&qua=V1_PC_QZ_1.0.0_0_IDC_B`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVidInfo', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVidInfo', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        result = null; task = null; typeErr = null; option = null;
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getVidInfo', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        result = null; task = null; typeErr = null; option = null;
        return;
      }
      if (!result.data || !result.data.all_videolist_data) {
        typeErr = {type: 'data', err: `qzone-data-null, data: ${JSON.stringify(result)}`, interface: 'getVidInfo', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        result = null; task = null; typeErr = null; option = null;
        return;
      }
      result = result.data.all_videolist_data[0];
      if (!result || !result.singlefeed) {
        typeErr = {type: 'data', err: `qzone-singlefeed-null, data: ${JSON.stringify(result)}`, interface: 'getVidInfo', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        result = null; task = null; typeErr = null; option = null;
        return;
      }
      if (result.singlefeed['1'] && result.singlefeed['1'].user && result.singlefeed['1'].user.uin != task.id) {
        typeErr = {type: 'data', err: '当前视频被删掉或者是数据错误', interface: 'getVidInfo', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      result = null; task = null; typeErr = null; option = null;
    });
  }
  getVidCom(task) {
    let option = {
      url: `https://h5.qzone.qq.com/proxy/domain/taotao.qq.com/cgi-bin/emotion_cgi_msgdetail_v6?uin=${task.id}&tid=${task.aid}&t1_source=1&ftype=0&sort=0&pos=0&num=20&code_version=1&format=jsonp&need_private_comment=1`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVidCom', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVidCom', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        result = null; task = null; typeErr = null; option = null;
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getVidCom', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        result = null; task = null; typeErr = null; option = null;
        return;
      }
      if (!result) {
        typeErr = {type: 'data', err: `qzone-comment-data-error, data: ${JSON.stringify(result)}`, interface: 'getVidCom', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      result = null; task = null; typeErr = null; option = null;
    });
  }
}
module.exports = dealWith;