/**
 * Created by ifable on 2017/1/16.
 */
const moment = require('moment');
const async = require('neo-async');
const request = require('request');

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
        method: 'GET',
        url: 'https://openapi.youku.com/v2/playlists/by_user.json',
        qs: {
          client_id: this.settings.app_key,
          user_id: task.id,
          count: 10
        },
        timeout: 5000
      };
    async.whilst(
      () => sign,
      (cb) => {
        options.qs.page = page;
        request(options, (error, response, body) => {
          if (error) {
            logger.error('occur error : ', error);
            cb();
            return;
          }
          if (response.statusCode !== 200) {
            logger.error(`list error code: ${response.statusCode}`);
            cb();
            return;
          }
          try {
            body = JSON.parse(body);
          } catch (e) {
            logger.error('获取专辑列表json数据解析失败');
            logger.error('获取专辑列表 json error:', body);
            cb();
            return;
          }
          const data = body.playlists;
          if (!data) {
            // logger.error('body data : ',sign)
            // logger.error(body)
            page += 1;
            cb();
            return;
          }
          this.dealAlbum(task, data, (err, result) => {
            for (const [i, album] of result.entries()) {
              programArr.push(album);
            }
            if (body.total <= 10 * page) {
              sign = false;
              cb();
              return;
            }
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
        logger.debug(program)
        // this.sendProgram(program);
        callback();
      }
    );
  }
  dealAlbum(task, albums, callback) {
    let index = 0, album;
    const albumArr = [],
      length = albums.length;
    async.whilst(
      () => index < length,
      (cb) => {
        album = albums[index];
        this.getAlbumVideo(task, album, (err, result) => {
          albumArr.push({
            program_id: album.id,
            program_name: album.name,
            link: album.link,
            play_link: album.play_link, // 专辑播放链接
            thumbnail: album.thumbnail, // 专辑截图
            video_count: album.video_count, // 专辑视频数量
            view_count: album.view_count, // 专辑总播放数
            published: moment(album.published).format('X'), // 创建时间
            video_list: result
          });
          index += 1;
          cb();
        });
      },
      () => {
        callback(null, albumArr);
      }
    );
  }
  getAlbumVideo(task, album, callback) {
    let index = 1, page, videos;
    const albumVideo = [],
      options = {
        method: 'GET',
        url: 'https://openapi.youku.com/v2/playlists/videos.json',
        qs: {
          client_id: this.settings.app_key,
          playlist_id: album.id,
          count: 50
        },
        timeout: 5000
      };
    if (album.video_count % 50 !== 0) {
      page = Math.ceil(album.video_count / 50);
    } else {
      page = album.video_count / 50;
    }
    async.whilst(
      () => index <= page,
      (cb) => {
        options.qs.page = index;
        request(options, (error, response, body) => {
          if (error) {
            logger.error(' occur error : ', error);
            cb();
            return;
          }
          if (response.statusCode !== 200) {
            logger.error(`list error code: ${response.statusCode}`);
            cb();
            return;
          }
          try {
            body = JSON.parse(body);
          } catch (e) {
            logger.error('获取专辑列表json数据解析失败');
            logger.error('获取专辑列表 json error:', body);
            cb();
            return;
          }
          videos = body.videos;
          if (!videos) {
            // logger.error('body data : ',sign)
            // logger.error(body)
            index += 1;
            cb();
            return;
          }
          for (const [i, video] of videos.entries()) {
            albumVideo.push(video.id);
          }
          index += 1;
          cb();
        });
      },
      () => {
        callback(null, albumVideo);
      }
    );
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
