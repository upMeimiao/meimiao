/**
 * Created by penghui on 2017/4/26.
 */
const async = require('neo-async');
const request = require('../../lib/request');

let logger;
class getProgram {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    logger = this.settings.logger;
    logger.trace('getProgram instantiation ...');
  }
  start(task, callback) {
    this.getProgramList(task, () => {
      callback();
    });
  }
  getProgramList(task, callback) {
    const options = {
        url: 'http://web.rr.tv/v3plus/subject/list',
        headers: {
          clienttype: 'web',
          clientversion: '0.1.0',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
          referer: 'http//rr.tv/'
        },
        data: {
          id: `${task.id}`,
          row: 20
        }
      },
      programInfo = {
        platform: task.p,
        bid: task.id,
        program_list: []
      };
    let page = 1,
      cycle = true;
    async.whilst(
      () => cycle,
      (cb) => {
        options.data.page = page;
        request.post(logger, options, (err, result) => {
          if (err) {
            logger.debug('专辑列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('专辑列表数据解析失败', result.body);
            cb();
            return;
          }
          this.getVideoListId(task, result.data.results, (error, list) => {
            for (const value of list) {
              programInfo.program_list.push(value);
            }
            list = null;
            if (result.data.isEnd) {
              cycle = false;
            }
            page += 1;
            cb();
          });
        });
      },
      () => {
        logger.debug(programInfo);
        callback();
      }
    );
  }
  getVideoListId(task, programId, callback) {
    const length = programId.length,
      programList = [];
    let index = 0;
    async.whilst(
      () => index < length,
      (cb) => {
        this.getVideoList(task, programId[index], (err, programData) => {
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
        url: 'http://web.rr.tv/subject/detail',
        headers: {
          clienttype: 'web',
          clientversion: '0.1.0',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
          'content-type': 'application/x-www-form-urlencoded',
          referer: 'http//rr.tv/'
        },
        data: {
          id: `${program.id}`
        }
      },
      programData = {
        view_count: 0,
        video_list: [],
        video_count: program.videoCount,
        play_link: `https://mobile.rr.tv/pages/userCollectionsShare/?id=${program.id}&share=`,
        program_name: program.title,
        program_id: program.id
      },
      total = (Number(program.videoCount) % 20) === 0 ? Number(program.videoCount) / 20 : Math.ceil(Number(program.videoCount) / 20);
    let page = 1,
      videoList;
    async.whilst(
      () => page <= total,
      (cb) => {
        option.data.page = page;
        request.post(logger, option, (err, result) => {
          if (err) {
            logger.debug('专辑视频列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('专辑视频列表数据解析失败', result.body);
            cb();
            return;
          }
          programData.thumbnail = result.data.subject.horizontalImg;
          programData.published = result.data.subject.createTime;
          videoList = result.data.videos.results;
          for (let i = 0; i < videoList.length; i += 1) {
            programData.view_count += videoList[i].viewCount;
            programData.video_list.push(videoList[i].viewCount);
          }
          page += 1;
          cb();
        });
      },
      () => {
        callback(null, programData);
      }
    );
  }
}
module.exports = getProgram;