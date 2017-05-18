/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment');
const async = require('async');
const cheerio = require('cheerio');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

const jsonp = function (data) {
  return data;
};
const _tags = (raw) => {
  if (typeof raw === 'string') {
    return raw;
  }
  if (Object.prototype.toString.call(raw) === '[object Array]') {
    return raw.join(',');
  }
  return '';
};
let logger;
class dealWith {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    logger = this.settings.logger;
    logger.trace('DealWith instantiation ...');
  }
  todo(task, callback) {
    task.total = 0;
    task.page = 0;
    this.getList(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, task.total);
    });
  }

  getList(task, callback) {
    let _pos = '',
      page = 3;
    async.whilst(
      () => task.page < page,
      (cb) => {
        const option = {
          url: `http://napi.uc.cn/3/classes/article/categories/wemedia/lists/${task.id}?_app_id=cbd10b7b69994dca92e04fe00c05b8c2&_fetch=1&_fetch_incrs=1&_size=5&_max_pos=${_pos}&uc_param_str=frdnsnpfvecpntnwprdsssnikt`
        };
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('接口请求错误 : ', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('json数据解析失败');
            logger.info(result);
            cb();
            return;
          }
          const length = result.data.length;
          if (length <= 0) {
            page = 0;
            cb();
            return;
          }
          this.deal(task, result.data, () => {
            page += 1;
            if (result.length <= 0) {
              page = 0;
            }
            task.page += 1;
            _pos = result.data[length - 1]._pos;
            cb();
          });
        });
      },
      () => {
        logger.debug('没有数据了');
        callback();
      }
    );
  }
  deal(task, info, callback) {
    let index = 0;
    const length = info.length;
    async.whilst(
      () => index < length,
      (cb) => {
        this.getInfo(task, info[index], () => {
          index += 1;
          cb();
        });
      },
      () => {
        callback();
      }
    );
  }
  getInfo(task, data, callback) {
    const aid = data.xss_item_id,
      _id = data._id;
    if (!data.other_info) {
      logger.debug('当前文章不是视频');
      callback();
      return;
    }
    async.waterfall(
      [
        (cb) => {
          this.getVidInfo(task, _id, aid, (err, result) => {
            cb(null, result);
          });
        }
      ],
        (err, result) => {
          if (result === '没有数据') {
            logger.debug('没有数据');
            callback();
            return;
          }
          const media = {
            bid: task.id,
            author: task.name,
            platform: task.p,
            aid: result.id,
            title: data.title.substr(0, 100).replace(/"/g, ''),
            play_num: result.view_cnt,
            comment_num: result.descData.comment_num,
            support: data._incrs.liketimes,
            v_img: data.cover_url,
            class: data.category,
            v_url: data.other_info === undefined ? result.url : data.other_info.video_playurl,
            a_create_time: moment(data._created_at).unix(),
            tag: _tags(result.tags),
            desc: result.descData.desc.substr(0, 100).replace(/"/g, ''),
            long_t: result.videos[0] === undefined
              ? result.content_length / 1000 : result.videos[0].length / 1000
          };
          if (!media.support) {
            delete media.support;
          }
          task.total += 1;
          spiderUtils.saveCache(this.core.cache_db, 'cache', media);
          spiderUtils.commentSnapshots(this.core.taskDB,
            { p: media.platform, aid: media.aid, comment_num: media.comment_num });
          callback();
        }
    );
  }
  getVidInfo(task, _id, aid, callback) {
    const option = {
      url: `http://m.uczzd.cn/ucnews/video?app=ucnews-iflow&fr=iphone&aid=${aid}`
    };
    request.get(logger, option, (error, result) => {
      if (error) {
        logger.error('接口请求错误 : ', error);
        callback(null, '没有数据');
        return;
      }
      try {
        result = result.body.replace(/[\r\n]/g, '');
        const $ = cheerio.load(result);
        if ($('p.info').text() === '文章不存在') {
          callback(null, '没有数据');
          return;
        }
        result = result.replace(/[\s]/g, '');
        const startIndex = result.indexOf('xissJsonData='),
          endIndex = result.indexOf(';varzzdReadId');
        result = result.substring(startIndex + 13, endIndex);
        result = JSON.parse(result);
      } catch (e) {
        logger.error('单个视频json数据解析失败');
        logger.info(result);
        callback(null, '没有数据');
        return;
      }
      this.getCommentNum(task, _id, result.id, (err, data) => {
        result.descData = data;
        if (!result.descData) {
          result.descData = {
            comment_num: '',
            desc: ''
          };
          callback(null, result);
          return;
        }
        if (!result.descData.comment_num) {
          result.descData.comment_num = '';
        } else if (!result.descData.desc) {
          result.descData.desc = '';
        }
        callback(null, result);
      });
    });
  }
  getCommentNum(task, _id, id, callback) {
    const options = {};
    let num = null;
    options.url = `http://m.uczzd.cn/iflow/api/v2/cmt/article/${id}/comments/byhot?count=10&fr=iphone&dn=11341561814-acaf3ab1&hotValue=`;
    request.get(logger, options, (error, data) => {
      if (error) {
        logger.error('uc头条评论数请求失败 : ', error);
        this.getCommentNum(task, _id, id, callback);
        return;
      }
      try {
        data = JSON.parse(data.body);
      } catch (e) {
        logger.debug('UC数据解析失败');
        logger.info(data);
        this.getCommentNum(task, _id, id, callback);
        return;
      }
      num = data.data.comment_cnt;
      this.getDesc(_id, (err, result) => {
        if (err) {
          callback(err);
          return;
        }
        const res = {
          comment_num: num || '',
          desc: result.data ? (result.data.sub_title ? result.data.sub_title : '') : ''
        };
        callback(null, res);
      });
    });
  }
  getDesc(_id, callback) {
    const option = {
      url: `http://napi.uc.cn/3/classes/article/objects/${_id}?_app_id=cbd10b7b69994dca92e04fe00c05b8c2&_fetch=1&_fetch_incrs=1&_ch=article`
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
        logger.debug('UC数据解析失败');
        callback(e);
        return;
      }
      callback(null, result);
    });
  }
}
module.exports = dealWith;