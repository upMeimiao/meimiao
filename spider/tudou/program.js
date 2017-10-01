/**
 * Created by zhupenghui on 2017/7/19.
 */
const request = require('../../lib/request');
const moment = require('moment');
const async = require('async');

let logger;
class getProgram {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    logger = this.settings.logger;
    logger.trace('getProgram instantiation ...');
  }
  start(task, callback) {
    this.getProgramTotal(task, () => {
      callback();
    });
  }
  getProgramTotal(task, callback) {
    const option = {
      url: `${this.settings.spiderAPI.tudou.programList + task.encodeId}&pg=1`,
      ua: 3,
      own_ua: 'Tudou;6.6.1;iOS;10.3.2;iPhone8,2'
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('土豆栏目总数请求失败', err);
        this.getProgramTotal(task, callback);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('土豆栏目数据解析失败', result.body);
        this.getProgramTotal(task, callback);
        return;
      }
      if (!result || !result.data || !result.data.playlists.items.length) {
        callback();
        return;
      }
      const proTotal = result.data.playlists.total;
      this.getProgramList(task, proTotal, () => {
        callback();
      });
    });
  }
  getProgramList(task, proTotal, callback) {
    let pg = 1,
      page = 2;
    const option = {
        ua: 3,
        own_ua: 'Tudou;6.6.1;iOS;10.3.2;iPhone8,2'
      },
      programInfo = {
        platform: task.p,
        bid: task.id,
        program_list: []
      };

    if (proTotal % 20 === 0) {
      page = proTotal / 20;
    } else {
      page = Math.ceil(proTotal / 20);
    }
    async.whilst(
      () => pg <= page,
      (cb) => {
        option.url = `${this.settings.spiderAPI.tudou.programList + task.encodeId}&pg=${pg}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.error('栏目列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('栏目列表解析失败');
            logger.info(result);
            cb();
            return;
          }
          result = result.data.playlists.items;
          this.getProgramId(task, result, (error, programList) => {
            if (programList || programList.length) {
              for (const value of programList) {
                programInfo.program_list.push(value);
              }
            }
            programList = null;
            pg += 1;
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
  getProgramId(task, proList, callback) {
    let index = 0;
    const length = proList.length,
      programList = [];
    async.whilst(
      () => index < length,
      (cb) => {
        this.getVideoList(task, proList[index], (err, programData) => {
          programList.push(programData);
          programData = null;
          index += 1;
          cb();
        });
      },
      () => {
        callback(null, programList);
      }
    );
  }
  getVideoList(task, program, callback) {
    const option = {
        url: this.settings.spiderAPI.tudou.proVideoList + program.folderId_encode,
        ua: 3,
        own_ua: 'Tudou;6.6.1;iOS;10.3.2;iPhone8,2'
      },
      programData = {
        program_id: program.folderId_encode,
        program_name: program.folderName,
        // link: program.url,
        play_link: `http://video.tudou.com/v/${program.video_id_encode}`,
        thumbnail: program.logo,
        video_count: program.contentTotal,
        view_count: program.total_pv,
        published: moment(new Date(program.folderOrder)).format('X'),
        video_list: []
      };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.error('专辑的视频列表请求失败', err);
        this.getVideoList(task, program, callback);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.error('专辑视频列表解析失败', result.body);
        this.getVideoList(task, program, callback);
        return;
      }
      if (!result.result || !result.result.videos) {
        callback(programData);
        return;
      }
      for (let i = 0; i < result.result.videos.length; i += 1) {
        programData.video_list.push(result.result.videos[i].videoId);
      }
      // logger.debug(programData);
      callback(null, programData);
    });
  }
}
module.exports = getProgram;

