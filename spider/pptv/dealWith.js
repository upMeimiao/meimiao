/**
 * Created by junhao on 16/6/21.
 */
const async = require('async');
const cheerio = require('cheerio');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

let logger;
const jsonp = function (data) {
  return data;
};
class dealWith {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    logger = this.settings.logger;
    logger.trace('DealWith instantiation ...');
  }
  todo(task, callback) {
    task.total = 0;
    task.timeout = 0;
    this.getVidList(task, (err) => {
      if (err) {
        callback(err);
      } else {
        callback(null, task.total);
      }
    });
  }
  getppi(callback) {
    const option = {
      url: 'http://tools.aplusapi.pptv.com/get_ppi?cb=jsonp'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('获取cookie值出错');
        callback(err);
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        logger.debug('cookie数据解析失败');
        callback(e);
        return;
      }
      if (!result.ppi) {
        callback('cookie数据获取有问题');
        return;
      }
      callback(null, result.ppi);
    });
  }
  getVidList(task, callback) {
    const option = {
      url: `${this.settings.spiderAPI.pptv.listVideo}&pid=${task.id}&cat_id=${task.encodeId}`,
      ua: 1,
      Cookie: `ppi=${this.core.ppi}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('接口请求错误 : ', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败', result);
        callback(e.message);
        return;
      }
      if (result.err == -1 && !result.data) {
        if (task.timeout > 2) {
          spiderUtils.banned(this.core.taskDB, `${task.p}_${task.id}_${task.name}`);
          callback();
          return;
        }
        task.timeout += 1;
        this.getVidList(task, callback);
        return;
      }
      const length = result.data.list.length;
      task.total = result.data.total;
      this.deal(task, result.data, length, () => {
        callback();
      });
    });
  }
  deal(task, user, length, callback) {
    let index = 0;
    async.whilst(
      () => index < Math.min(length, 10000),
      (cb) => {
        this.getAllInfo(task, user.list[index], () => {
          index += 1;
          cb();
        });
      },
      () => {
        callback();
      }
    );
  }
  getAllInfo(task, video, callback) {
    async.parallel([
      (cb) => {
        this.getVideoInfo(task, video.url, 0, (err, result) => {
          if (err) {
            cb(err);
            return;
          }
          cb(null, result);
        });
      },
      (cb) => {
        this.getTotal(video.id, (err, result) => {
          if (err) {
            cb(err);
            return;
          }
          cb(null, result);
        });
      }
    ], (err, result) => {
      if (err) {
        callback();
        return;
      }
      const media = {
        author: task.name,
        platform: task.p,
        bid: task.id,
        aid: video.id,
        title: spiderUtils.stringHandling(video.title),
        comment_num: result[1],
        class: result[0].class,
        tag: result[0].tag,
        desc: spiderUtils.stringHandling(result[0].desc),
        long_t: result[0].time,
        v_img: video.capture,
        v_url: video.url,
        play_num: spiderUtils.numberHandling(video.pv)
      };
      spiderUtils.saveCache(this.core.cache_db, 'cache', media);
      spiderUtils.commentSnapshots(this.core.taskDB,
        { p: media.platform, aid: media.aid, comment_num: media.comment_num });
      callback();
    });
  }
  getVideoInfo(task, url, times, callback) {
    const vid = url.match(/show\/\w*\.html/).toString().replace(/show\//, ''),
      option = {
        url,
        referer: `http://v.pptv.com/page/${vid}`,
        ua: 1
      };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('单个视频请求失败 ', err);
        if (err.status === 404 || times > 3) {
          callback('next');
          return;
        }
        setTimeout(() => {
          times += 1;
          this.getVideoInfo(task, url, times, callback);
        }, 100);
        return;
      }
      const $ = cheerio.load(result.body),
        time = result.body.match(/"duration":\d+/) ? result.body.match(/"duration":\d+/).toString().replace('"duration":', '') : '',
        tag = $('div#video-info .bd .tabs a');
      let tags = '',
        desc = $('div#video-info .bd ul>li').eq(2).find('span,a').empty();
      desc = $('div#video-info .bd ul>li').eq(2).text();
      for (let i = 0; i < tag.length; i += 1) {
        tags += `,${tag.eq(i).text()}`;
      }
      tags.replace(',', '');
      const res = {
        class: $('div#video-info .bd .crumbs a').text() || '',
        tag: tags,
        desc,
        time
      };
      callback(null, res);
    });
  }
  getTotal(id, callback) {
    const option = {
      url: `http://apicdn.sc.pptv.com/sc/v3/pplive/ref/vod_${id}/feed/list?appplt=web&action=1&pn=0&ps=20`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('occur error : ', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.info('不符合JSON格式');
        callback(e);
        return;
      }
      callback(null, result.data.total);
    });
  }
}
module.exports = dealWith;