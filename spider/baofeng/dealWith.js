/**
 * Created by junhao on 16/6/21.
 */

const async = require('async');
const cheerio = require('cheerio');
const request = require('../../lib/request');
const spiderUtils = require('../../lib/spiderUtils');

let logger;
class dealWith {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    this.aidUrl = '';
    logger = this.settings.logger;
    logger.trace('DealWith instantiation ...');
  }
  todo(task, callback) {
    task.total = 0;
    this.getTheAlbum(task, (err) => {
      if (err) {
        logger.debug('最后返回的错误信息', err);
        callback(err);
        return;
      }
      callback(null, task.total);
    });
  }

  getTheAlbum(task, callback) {
    const bidstr = task.id.toString(),
      bid = bidstr.substring(bidstr.length - 2, bidstr.length),
      option = {
        url: `http://www.baofeng.com/detail/${bid}/detail-${task.id}.html`
      };
    task.bid = bid;
    request.get(logger, option, (error, result) => {
      if (error) {
        logger.debug('专辑视频信息请求失败', error);
        callback(error);
        return;
      }
      const $ = cheerio.load(result.body);
      let aid = $('div.episodes.clearfix').attr('m_aid');
      if (!aid) {
        aid = $('div.enc-episodes-detail').attr('m_aid');
      }
      if (!aid) {
        this.aidUrl = $('ul.hot-pic-list li').eq(0).find('a').attr('href');
        this.getAid(task, (err) => {
          if (err) {
            callback(err);
          } else {
            callback();
          }
        });
        return;
      }
      this.getVidList(task, aid, (err) => {
        if (err) {
          callback(err);
          return;
        }
        callback();
      });
    });
  }
  getAid(task, callback) {
    if (!this.aidUrl) {
      callback('结构出错，没有获取到播放详情页地址');
      return;
    }
    const option = {
      url: `http://www.baofeng.com/${this.aidUrl}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        this.getAid(task, callback);
        return;
      }
      result = result.body;
      const aid = result.match(/"aid":"\d+/).toString().replace(/"aid":"/, '');
      this.getVidList(task, aid, () => {
        callback();
      });
    });
  }
  getVidList(task, aid, callback) {
    const option = {
      url: `http://minfo.baofeng.net/asp_c/13/124/${aid}-n-100-r-50-s-1-p-1.json?_random=false`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('视频列表请求失败', err);
        callback(err);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('视频列表解析失败', err);
        callback(e);
        return;
      }
      task.total = result.album_info.videos_num;
      const videoList = result.video_list,
        length = videoList.length;
      this.deal(task, videoList, length, () => {
        callback();
      });
    });
  }
  deal(task, user, length, callback) {
    let index = 0;
    async.whilst(
      () => index < length,
      (cb) => {
        this.getAllInfo(task, index, user[index], () => {
          index += 1;
          cb();
        });
      },
      () => {
        callback();
      }
    );
  }
  getAllInfo(task, index, video, callback) {
    async.parallel(
      [
        (cb) => {
          this.support(video.vid, (err, result) => {
            cb(null, result);
          });
        },
        (cb) => {
          this.getDesc(task.id, index, (err, result) => {
            cb(null, result);
          });
        },
        (cb) => {
          this.getComment(video.vid, (err, result) => {
            cb(null, result);
          });
        }
      ],
      (err, result) => {
        const media = {
          author: task.name,
          platform: task.p,
          bid: task.id,
          aid: video.vid,
          title: spiderUtils.stringHandling(video.v_sub_title, 100),
          a_create_time: video.update_time.substring(0, 10),
          long_t: video.video_time / 1000,
          support: result[0].u,
          step: result[0].d,
          desc: spiderUtils.stringHandling(result[1].desc, 100),
          type: result[1].types,
          v_url: `http://www.baofeng.com/play/${task.bid}/play-${task.id}-drama-${video.location}.html`,
          comment_num: result[2]
        };
        spiderUtils.saveCache(this.core.cache_db, 'cache', media);
        spiderUtils.commentSnapshots(this.core.taskDB,
          { p: media.platform, aid: media.aid, comment_num: media.comment_num });
        callback();
      }
    );
  }
  getDesc(bid, index, callback) {
    const option = {
      url: `http://m.baofeng.com/play/73/play-786073-drama-${index}.html`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('视频的描述');
        callback(null, { type: '', desc: '' });
        return;
      }
      const $ = cheerio.load(result.body),
        type = $('div.details-info-right a').text(),
        desc = $('div.play-details-words').text().replace('简介：', '').substring(0, 100),
        res = {
          type: type || '',
          desc: desc || ''
        };
      callback(null, res);
    });
  }
  support(vid, callback) {
    const option = {
      url: `http://hd.baofeng.com/api/getud?wid=13&vid=${vid}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('视频的踩、顶请求失败', err);
        callback(null, { u: '', d: '' });
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('顶、踩数据解析失败', e);
        callback(null, { u: '', d: '' });
        return;
      }
      callback(null, result.data);
    });
  }
  getComment(vid, callback) {
    const option = {
      url: `http://comments.baofeng.com/pull?type=movie&from=2&sort=hot&xid=${vid}&page=1&pagesize=6`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('暴风评论量请求错误');
        callback(null, '0');
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('评论量解析失败');
        callback(null, '1');
        return;
      }
      callback(null, result.total);
    });
  }
}
module.exports = dealWith;