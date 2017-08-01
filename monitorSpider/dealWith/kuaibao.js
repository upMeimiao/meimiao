/**
 * Created by zhupenghui on 17/6/20.
 */
const jsonp = (data) => data;
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('kuaibao monitor begin...');
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
        total: (cb) => {
          this.getVideos(task);
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
      url: this.settings.spiderAPI.kuaibao.user + task.id
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
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      if (result.ret === 1) {
        typeErr = {type: 'data', err: `kuaibao-user-data-error, data: ${JSON.stringify(result)}`, interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      if (!result.channelInfo) {
        typeErr = {type: 'data', err: `kuaibao-user-data-null(undefind), data: ${JSON.stringify(result)}`, interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; task = null; result = null; typeErr = null;
    });
  }
  getVideos(task) {
    let option = {
      url: this.settings.spiderAPI.kuaibao.video,
      referer: 'http://r.cnews.qq.com/inews/iphone/',
      data: {
        chlid: task.id,
        is_video: 1
      }
    };
    task.request.post(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVideos', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVideos', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err:  `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getVideos', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      let idStr = '';
      for (const ids of result.ids) {
        idStr += `,${ids.id}`;
      }
      this.getVideoList(task, idStr.replace(',', ''));
      option = null; result = null; idStr = null; task = null;
    });
  }
  getVideoList(task, idStr) {
    let option = {
        url: this.settings.spiderAPI.kuaibao.list,
        referer: 'http://r.cnews.qq.com/inews/iphone/',
        data: {
          ids: idStr,
          is_video: 1
        }
      },
      videoArr = [];
    task.request.post(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVideoList', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVideoList', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getVideoList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      if (!result || !result.newslist.length) {
        typeErr = {type: 'data', err: `kuaibao-list-data-null, data: ${JSON.stringify(result)}`, interface: 'getVideoList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      let video = result.newslist[0];
      videoArr.push({
        id: video.id,
        title: video.title,
        desc: video.video_channel.video.desc,
        vid: video.video_channel.video.vid,
        img: video.thumbnails_qqnews_photo[0],
        longt: video.video_channel.video.duration,
        createTime: video.timestamp,
        commentid: video.commentid,
        type: video.articletype
      });
      this.videoInfo(task, videoArr[0]);
      this.getExpr(task, videoArr[0]);
      option = null; result = null; videoArr = null; video = null; task = null;
    });
  }
  videoInfo(task, info) {
    let option = {
      url: this.settings.spiderAPI.kuaibao.videoInfo,
      headers: {
        Host: 'r.cnews.qq.com',
        mac: '020000000000',
        deviceToken: '<3974bb04 ceb38ada 1b112517 33e04962 c93a1039 4d661ce1 92ae4227 4d1ae769>',
        'qn-rid': '1f3058de4b3b',
        'qn-sig': 'B7363F31352D9CF98A1E9F2914F5B533',
        'User-Agent': '%e5%a4%a9%e5%a4%a9%e5%bf%ab%e6%8a%a5 2.8.0 qnreading (iPhone; iOS 10.3.3; zh_CN; 2.8.0.11)',
        Referer: 'http://r.cnews.qq.com/inews/iphone/',
        '--qnr': '1f3058de1a30',
        'Content-Type': 'application/x-www-form-urlencoded',
        appver: '10.3.3_qnreading_2.8.0',
        appversion: '2.8.0',
        apptypeExt: 'qnreading',
        devid: '34F1E7F9-270C-473F-B1F4-454EEE21B9D9',
        'keep-alive': 'iPhone8,2',
        apptype: 'ios'
      },
      data: {
        chlid: 'media_video',
        id: info.id
      }
    };
    task.request.post(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'videoInfo', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'videoInfo', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'videoInfo', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      if (!result.kankaninfo || !result.kankaninfo.videoInfo) {
        typeErr = {type: 'json', err: `{error: 视频数据异常, data: ${JSON.stringify(result)}`, interface: 'videoInfo', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; task = null; result = null; typeErr = null;
      return;
    });
  }
  getExpr(task, info) {
    let option = {
      url: this.settings.spiderAPI.kuaibao.expr,
      referer: 'http://r.cnews.qq.com/inews/iphone/',
      data: {
        id: info.id,
        chlid: 'media_article'
      }
    };
    task.request.post(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getExpr', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getExpr', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getExpr', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; task = null; result = null; typeErr = null;
        return;
      }
      if (!result || !result.like_info || !result.expr_info) {
        typeErr = {type: 'data', err: `kuaibao-Expr-data-error, data: ${JSON.stringify(result)}`, interface: 'getExpr', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; task = null; result = null; typeErr = null;
    });
  }
}
module.exports = dealWith;