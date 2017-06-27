/**
 * Created by zhupenghui on 17/6/20.
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
    logger.trace('kuaibao monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.total = 0;
    async.parallel(
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
        callback();
      }
    );
  }
  getUser(task) {
    let option = {
      url: this.settings.spiderAPI.kuaibao.user + task.id
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
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err:  `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
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
    request.post(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVideos', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVideos', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err:  `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getVideos', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      let idStr = '';
      for (const ids of result.ids) {
        idStr += `,${ids.id}`;
      }
      this.getVideoList(task, idStr.replace(',', ''));
      option = null; result = null; idStr = null;
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
    request.post(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVideoList', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVideoList', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err:  `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getVideoList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      const video = result.newslist[0];
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
      this.getCommentNum(task, videoArr[0]);
      this.getExpr(task, videoArr[0]);
      this.getField(task, videoArr[0]);
      option = null; result = null; videoArr = null;
    });
  }
  getCommentNum(task, info) {
    let option = {
      url: this.settings.spiderAPI.kuaibao.comment,
      referer: 'http://r.cnews.qq.com/inews/iphone/',
      data: {
        chlid: 'media_article',
        comment_id: info.commentid,
        c_type: 'comment',
        article_id: info.id,
        page: 1
      }
    };
    request.post(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getCommentNum', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getCommentNum', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getCommentNum', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
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
    request.post(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getExpr', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getExpr', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getExpr', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
  getField(task, info) {
    let option = {
      url: `http://ncgi.video.qq.com/tvideo/fcgi-bin/vp_iphone?vid=${info.vid}&plat=5&pver=0&otype=json&callback=jsonp`,
      referer: 'http://r.cnews.qq.com/inews/iphone/'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getExpr', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getExpr', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getExpr', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      option = null; result = null;
    });
  }
}
module.exports = dealWith;