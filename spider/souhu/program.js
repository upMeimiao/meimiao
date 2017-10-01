/**
 * Created by penghui on 2017/4/26.
 */
const async = require('async');
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
    this.getProgramTotal(task, () => {
      callback();
    });
  }
  getProgramTotal(task, callback) {
    const option = {
      url: `${this.settings.spiderAPI.souhu.programList + task.id}&pg=1&_=${new Date().getTime()}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('搜狐视频栏目请求失败', err);
        this.getProgramTotal(task, callback);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('搜狐视频栏目解析失败');
        logger.info(result);
        this.getProgramTotal(task, callback);
        return;
      }
      task.program_count = Number(result.data.count);
      this.getProgramList(task, () => {
        callback();
      });
    });
  }
  getProgramList(task, callback) {
    const programInfo = {
        platform: task.p,
        bid: task.id,
        program_list: []
      },
      option = {};
    let pg = 1,
      page = 0;
    if (task.program_count % 40 === 0) {
      page = task.program_count / 40;
    } else {
      page = Math.ceil(task.program_count / 40);
    }
    async.whilst(
      () => pg <= page,
      (cb) => {
        option.url = `${this.settings.spiderAPI.souhu.programList + task.id}&pg=${pg}&_${new Date().getTime()}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('搜狐视频栏目列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('搜狐视频栏目列表解析失败');
            logger.info(result);
            cb();
            return;
          }
          result = result.data.list;
          this.getProgramId(task, result, (error, list) => {
            for (const value of list) {
              programInfo.program_list.push(value);
            }
            list = null;
            pg++;
            cb();
          });
        });
      },
      () => {
        // logger.debug(programInfo);
        callback();
      }
    );
  }
  getProgramId(task, programs, callback) {
    const length = programs.length,
      programList = [];
    let index = 0;
    async.whilst(
      () => index < length,
      (cb) => {
        this.getVideoList(task, programs[index], (err, programData) => {
          programList.push(programData);
          programData = null;
          index++;
          cb();
        });
      },
      () => {
        callback(null, programList);
      }
    );
  }
  getVideoList(task, program, callback) {
    let pg = 1,
      page = 2,
      videoId = null;
    const programData = {
        program_id: program.id,
        program_name: program.title,
        link: `http://my.tv.sohu.com/user/media/album.do?uid=${task.id}`,
        play_link: program.url,
        thumbnail: program.coverUrl,
        video_count: program.videoCount,
        published: program.createTime.toString().substring(0, 10),
        video_list: [],
        view_count: 0
      },
      option = {};
    if (program.videoCount % 30 === 0) {
      page = program.videoCount / 30;
    } else {
      page = Math.ceil(program.videoCount / 30);
    }
    async.whilst(
      () => pg <= page,
      (cb) => {
        option.url = `${this.settings.spiderAPI.souhu.programVideolist + program.id}&pg=${pg}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('单个专辑视频列表请求失败', err);
            return cb();
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('单个专辑列表解析失败');
            logger.info(result);
            return cb();
          }
          this.deal(result.data.list, (error, videoData) => {
            for (videoId of videoData.videoArr) {
              programData.video_list.push(videoId);
            }
            programData.view_count += videoData.playNum;
            pg++;
            cb();
          });
        });
      },
      () => {
        callback(null, programData);
      }
    );
  }
  deal(videoList, callback) {
    const length = videoList.length,
      videoArr = [];
    for (let i = 0; i < length; i += 1) {
      videoArr.push(videoList[i].id);
    }
    this.playCount(videoArr, (err, playNum) => {
      callback(null, { videoArr, playNum });
    });
  }
  playCount(videoArr, callback) {
    let vids = '',
      playNum = 0;
    const option = {};
    for (let i = 0; i < videoArr.length; i++) {
      vids += `|${videoArr[i]}`;
    }

    option.url = `http://vstat.v.blog.sohu.com/dostat.do?method=getVideoPlayCount&n=videoList_vids&v=${vids.replace(/\|/, '')}`;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('播放量请求失败');
        this.playCount(videoArr, callback);
        return;
      }
      try {
        result = JSON.parse(result.body.replace(/[\s\n\r]/g, '').replace(/varvideoList_vids=/, '').replace(/;/, ''));
      } catch (e) {
        logger.debug('播放量解析失败');
        logger.info(result.body);
        this.playCount(videoArr, callback);
        return;
      }
      for (let i = 0; i < result.length; i++) {
        playNum += Number(result[i].count);
      }
      callback(err, playNum);
    });
  }
}
module.exports = getProgram;