/**
 * Created by ifable on 16/6/21.
 */
const async = require('async');
const moment = require('moment');
const cheerio = require('cheerio');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

let logger;
const jsonp = function (data) {
  return data;
};
const longT = (time) => {
  const timeArr = time.split(':');
  let _longT = '';
  if (timeArr.length === 2) {
    _longT = moment.duration(`00:${time}`).asSeconds();
  } else if (timeArr.length === 3) {
    _longT = moment.duration(time).asSeconds();
  }
  return _longT;
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
    this.getTotal(task, (err) => {
      if (err) {
        callback(err);
      } else {
        callback(null, task.total);
      }
    });
  }
  getTotal(task, callback) {
    logger.debug('开始获取视频总页数');
    const option = {};
    option.url = `${this.settings.spiderAPI.le.newList + task.id}/queryvideolist?callback=jsonp&orderType=0&pageSize=48&searchTitleString=&currentPage=1&_=${(new Date()).getTime()}`;
    option.referer = `http://chuang.le.com/u/${task.id}/videolist`;
    option.ua = 1;
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        result = eval(`(${result.body})`);
      } catch (e) {
        logger.error('jsonp解析错误:', e);
        logger.info(result);
        callback(e);
        return;
      }
      const page = result.data.totalPage;
      task.total = page * 48;
      this.getList(task, page, () => {
        callback();
      });
    });
  }
  getList(task, page, callback) {
    let sign = 1, backList;
    const option = {
      referer: `http://chuang.le.com/u/${task.id}/videolist`,
      ua: 1
    };
    async.whilst(
      () => sign <= Math.min(page, 208),
      (cb) => {
        logger.debug(`开始获取第${sign}页视频列表`);
        option.url = `${this.settings.spiderAPI.le.newList + task.id}/queryvideolist?callback=jsonp&orderType=0&pageSize=48&searchTitleString=&currentPage=${sign}&_=${(new Date()).getTime()}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            cb();
            return;
          }
          try {
            result = eval(`(${result.body})`);
          } catch (e) {
            logger.error('jsonp解析错误');
            logger.info(result);
            cb();
            return;
          }
          backList = result.data.list;
          this.deal(task, backList, () => {
            sign += 1;
            cb();
          });
        });
      },
      () => {
        callback();
      }
    );
  }
  deal(task, list, callback) {
    let index = 0;
    const length = list.length;
    async.whilst(
      () => index < length,
      (cb) => {
        this.info(task, list[index], () => {
          index += 1;
          cb();
        });
      },
      () => {
        callback();
      }
    );
  }
  info(task, video, callback) {
    const id = video.vid;
    async.parallel(
      [
        (cb) => {
          this.getInfo(id, (err, data) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, data);
          });
        },
        (cb) => {
          this.getExpr(id, (err, time) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, time);
          });
        },
        (cb) => {
          this.getDesc(id, (err, data) => {
            if (err) {
              cb(err);
              return;
            }
            cb(null, data);
          });
        }
      ],
      (err, result) => {
        if (err) {
          callback(err);
          return;
        }
        const media = {
          author: task.name,
          platform: 3,
          bid: task.id,
          aid: id,
          title: video.title.substr(0, 100).replace(/"/g, ''),
          desc: result[2] ? result[2].desc.substr(0, 100).replace(/"/g, '') : null,
          play_num: result[0].play_count,
          comment_num: result[0].vcomm_count,
          support: result[0].up,
          step: result[0].down,
          a_create_time: moment(result[1].time).unix(),
          long_t: longT(video.duration),
          v_img: video.videoPic,
          class: result[2] ? result[2].class : null
        };
        if (!media.desc) {
          delete media.desc;
        }
        if (!media.class) {
          delete media.class;
        }
        spiderUtils.saveCache(this.core.cache_db, 'cache', media);
        spiderUtils.commentSnapshots(this.core.taskDB,
          { p: media.platform, aid: media.aid, comment_num: media.comment_num });
        callback();
      }
    );
  }
  getInfo(id, callback) {
    const option = {
      url: `${this.settings.spiderAPI.le.info + id}&_=${(new Date()).getTime()}`,
      referer: `http://www.le.com/ptv/vplay/${id}.html`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      let backData;
      try {
        backData = JSON.parse(result.body);
      } catch (e) {
        logger.error('getInfo json error: ', e);
        logger.error(result.body);
        callback(e);
        return;
      }
      if (!backData || backData.length === 0) {
        logger.error('getInfo 异常');
        callback(true);
        return;
      }
      const info = backData[0];
      callback(null, info);
    });
  }
  getExpr(id, callback) {
    const option = {
      url: `http://www.le.com/ptv/vplay/${id}.html`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      const $ = cheerio.load(result.body),
        timeDom = $('p.p_02 b.b_02'),
        descDom = $('p.p_03'),
        timeDom2 = $('#video_time'),
        descDom2 = $('li.li_04 p'),
        timeDom3 = $('li.li_04 em'),
        descDom3 = $('li_08 em p');
      if (timeDom.length === 0 && timeDom2.length === 0 && timeDom3.length === 0) {
        callback(true);
        return;
      }
      let time, desc;
      if (timeDom.length !== 0) {
        time = timeDom.text();
        desc = descDom.attr('title') || '';
      } else if (timeDom2.length !== 0) {
        time = timeDom2.text();
        desc = descDom2.attr('title') || '';
      } else {
        time = timeDom3.text();
        desc = descDom3.attr('title') || '';
      }
      callback(null, { time, desc });
    });
  }
  getDesc(id, callback) {
    const option = {
      url: this.settings.spiderAPI.le.desc + id,
      referer: `http://m.le.com/vplay_${id}.html`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        callback(null, null);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info(result);
        callback(null, null);
        return;
      }
      result = result.data.introduction;
      if (!result) {
        callback(null, null);
        return;
      }
      const backData = {
        desc: result.video_description || '',
        class: result.style
      };
      callback(null, backData);
    });
  }
}
module.exports = dealWith;