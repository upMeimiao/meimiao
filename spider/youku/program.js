/**
 * Created by ifable on 2017/1/16.
 */
const moment = require('moment');
const async = require('neo-async');
const request = require('../../lib/request');

let logger;
class getProgram {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    logger = this.settings.logger;
    logger.trace('DealWith instantiation ...');
  }
  start(task, callback) {
    /**
     * 获取专辑信息
     * 通过专辑获取视频ID
     * */
    this.getAlbum(task, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback();
    });
  }
  getAlbum(task, callback) {
    let sign = true, page = 1;
    const programArr = [],
      options = {
        ua: 3,
        own_ua: 'Youku;6.7.4;iOS;10.3.2;iPhone8,2'
      };
    async.whilst(
      () => sign,
      (cb) => {
        options.url = `${this.settings.spiderAPI.youku.programList + task.encodeId}&pg=${page}&_t_=${parseInt(new Date().getTime() / 1000, 10)}`;
        // console.log(options.url);
        // return;
        request.get(logger, options, (error, result) => {
          if (error) {
            logger.error('occur error : ', error);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('获取专辑列表 json error:', result.body);
            cb();
            return;
          }
          if (!result || !result.data || !result.data.items.length) {
            sign = false;
            cb();
            return;
          }
          this.dealAlbum(result.data.items, (err, list) => {
            for (const album of list) {
              programArr.push(album);
            }
            list = null;
            page += 1;
            cb();
          });
        });
      },
      () => {
        const program = {
          platform: task.p,
          bid: task.id,
          program_list: programArr
        };
        // logger.debug(program);
        // this.sendProgram(program);
        callback();
      }
    );
  }
  dealAlbum(albums, callback) {
    let index = 0, album;
    const albumArr = [],
      length = albums.length;
    async.whilst(
      () => index < length,
      (cb) => {
        album = albums[index];
        this.getAlbumVideo(album, (err, result) => {
          if (result) {
            albumArr.push({
              program_id: album.folderId_encode,
              program_name: album.folderName,
              // link: album.link,
              play_link: album.click_url, // 专辑播放链接
              thumbnail: album.logo, // 专辑截图
              video_count: album.contentTotal, // 专辑视频数量
              view_count: album.total_pv, // 专辑总播放数
              published: album.upTime, // 创建时间
              video_list: result
            });
          }
          index += 1;
          cb();
        });
      },
      () => {
        callback(null, albumArr);
      }
    );
  }
  getAlbumVideo(album, callback) {
    let videos;
    const albumVideo = [],
      options = {
        url: this.settings.spiderAPI.youku.albumList + album.folderId_encode,
        ua: 3,
        own_ua: 'Youku;6.7.4;iOS;10.3.2;iPhone8,2'
      };
    request.get(logger, options, (error, result) => {
      if (error) {
        logger.error('单个 occur error : ', error);
        this.getAlbumVideo(album, callback);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('获取专辑列表 json error:', result.body);
        this.getAlbumVideo(album, callback);
        return;
      }
      if (Number(result.code) !== 0) {
        callback();
        return;
      }
      videos = result.result.videos.data;
      if (!videos) {
        callback();
        return;
      }
      for (const video of videos) {
        albumVideo.push(video.id);
      }
      callback(null, albumVideo);
    });
  }
  // sendProgram(program) {
  //   const options = {
  //     method: 'POST',
  //     url: 'http://staging-dev.meimiaoip.com/index.php/Spider/Fans/postFans',
  //     form: program
  //   };
  //   request(options, (err, res, body) => {
  //     if (err) {
  //       logger.error('occur error : ', err);
  //       return;
  //     }
  //     try {
  //       body = JSON.parse(body);
  //     } catch (e) {
  //       logger.error('json数据解析失败');
  //       logger.error('send error:', body);
  //       return;
  //     }
  //     if (Number(body.errno) === 0) {
  //       logger.debug('专辑:', `${user.bid} back_end`);
  //     } else {
  //       logger.error('专辑:', `${user.bid} back_error`);
  //       logger.error(body);
  //     }
  //   });
  // }
}
module.exports = getProgram;
