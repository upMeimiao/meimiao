/**
 * Created by junhao on 17/3/17.
 */
const moment = require('moment');
const async = require('async');
const request = require('request');
const spiderUtils = require('../../lib/spiderUtils');

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
    this.getListInfo(task, (err) => {
      if (err) {
        return callback(err);
      }
      callback(null, task.total);
    });
  }
  getListInfo(task, callback) {
    let options = {
        method: 'GET',
        headers:
        {
          'cache-control': 'no-cache',
          'x-platform-version': '10.2.1',
          'x-client-hash': 'b90e74ec3b4e9511e9cf87e96438e461',
          connection: 'keep-alive',
          'x-client-version': '2.2.1',
          'x-client-agent': 'APPLE_iPhone8,2_iOS10.2.1',
          'user-agent': 'LiVideoIOS/2.2.1 (iPhone; iOS 10.2.1; Scale/3.00)',
          'X-Platform-Type': '1',
          'X-Client-ID': '2C2DECE9-B2CD-4B8B-A044-6D904ACFB5E7'
        }
      },
      start = 0,
      cycle = true;
    async.whilst(
            () => cycle,
            (cb) => {
              options.url = `${this.settings.spiderAPI.liVideo.list}${task.id}&start=${start}`;
                // logger.debug(options);
              request(options, (error, response, body) => {
                if (error) {
                  logger.debug('LI视频总量请求失败', error);
                  return this.getListInfo(task, callback);
                }
                if (response.statusCode != 200) {
                  logger.debug('LI视频状态码错误', response.statusCode);
                  return this.getListInfo(task, callback);
                }
                try {
                  body = JSON.parse(body);
                } catch (e) {
                  logger.debug('梨视频数据解析失败');
                  logger.debug(body);
                  return this.getListInfo(task, callback);
                }
                task.total += body.contList.length;
                if (body.contList.length <= 0) {
                  cycle = false;
                  return cb();
                }
                this.deal(task, body.contList, () => {
                  start += 11;
                  cb();
                });
              });
            },
            (err, result) => {
              callback();
            }
        );
  }
  deal(task, list, callback) {
    let index = 0;
    async.whilst(
            () => index < list.length,
            (cb) => {
              this.getMedia(task, list[index], (err) => {
                index++;
                cb();
              });
            },
            (err, result) => {
              callback();
            }
        );
  }
  getMedia(task, video, callback) {
    async.series(
      [
        (cb) => {
          this.getVidInfo(video.contId, (err, result) => {
            cb(null, result);
          });
        }
      ],
            (err, result) => {
              const media = {
                author: task.name,
                platform: task.p,
                bid: task.id,
                aid: video.contId,
                title: spiderUtils.stringHandling(video.name, 100),
                tag: result[0].tags,
                a_create_time: result[0].content.pubTime,
                long_t: result[0].content.videos[0].duration,
                v_img: video.pic,
                support: video.praiseTimes,
                desc: spiderUtils.stringHandling(result[0].content.summary, 100),
                v_url: result[0].content.shareUrl,
                comment_num: result[0].content.commentTimes
              };
                // logger.debug(media);
              spiderUtils.saveCache(this.core.cache_db, 'cache', media);
              spiderUtils.commentSnapshots(this.core.taskDB,
                { p: media.platform, aid: media.aid, comment_num: media.comment_num });
              callback();
            }
        );
  }
  getVidInfo(vid, callback) {
    let options = {
        method: 'GET',
        url: `http://app.pearvideo.com/clt/jsp/v2/content.jsp?contId=${vid}`,
        headers:
        {
          'cache-control': 'no-cache',
          'x-platform-version': '10.2.1',
          'x-client-hash': 'b90e74ec3b4e9511e9cf87e96438e461',
          connection: 'keep-alive',
          'x-client-version': '2.2.1',
          'x-client-agent': 'APPLE_iPhone8,2_iOS10.2.1',
          'user-agent': 'LiVideoIOS/2.2.1 (iPhone; iOS 10.2.1; Scale/3.00)',
          'X-Platform-Type': '1',
          'X-Client-ID': '2C2DECE9-B2CD-4B8B-A044-6D904ACFB5E7'
        }
      },
      tags = [];
    request(options, (error, response, body) => {
      if (error) {
        logger.debug('视频的详细信息请求出错', error);
        return this.getVidInfo(vid, callback);
      }
      if (response.statusCode != 200) {
        logger.debug('视频的详情信息状态码出错', response.statusCode);
        return this.getVidInfo(vid, callback);
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        logger.debug('视频的详细信息解析失败');
        logger.info(body);
        return this.getVidInfo(vid, callback);
      }
      if (!body.content) {
        return logger.debug('暂停');
      }
      for (let i = 0; i < body.content.tags.length; i++) {
        tags.push(body.content.tags[i].name);
      }
      body.tags = tags.join(',');
      body.content.pubTime = moment(new Date(`${body.content.pubTime}:00`)).format('X');
      callback(null, body);
    });
  }
}
module.exports = dealWith;