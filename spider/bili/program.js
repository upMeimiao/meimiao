/**
 * Created by penghui on 2017/4/26.
 */
const async = require('neo-async');
const moment = require('moment');
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
    this.getProgramTotal(task, (err, result) => {
      callback(null, result);
    });
  }
  getProgramTotal(task, callback) {
    const option = {
      url: `${this.settings.spiderAPI.bili.programList + task.id}&_=${new Date().getTime()}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('bili栏目总数请求失败');
        this.getProgramTotal(task, callback);
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        logger.debug('bili栏目数据解析失败');
        logger.info(result);
        this.getProgramTotal(task, callback);
        return;
      }
      if (result.data === '未找到数据') {
        callback(null, '当前用户没有专辑视频');
        return;
      }
      this.getProgramId(task, result.data.list, () => {
        callback(null, '栏目信息已返回');
      });
    });
  }

  getProgramId(task, proList, callback) {
    const length = proList.length,
      programInfo = {
        platform: task.p,
        bid: task.id,
        program_list: []
      };
    let index = 0;
    async.whilst(
      () => index < length,
      (cb) => {
        if (proList[index].count === 0) {
          index += 1;
          cb();
          return;
        }
        this.getVideoList(task, proList[index], (err, programData) => {
          programInfo.program_list.push(programData);
          programData = null;
          index += 1;
          cb();
        });
      },
      () => {
        // logger.info(programInfo);
        callback();
      }
    );
  }
  getVideoList(task, program, callback) {
    const option = {},
      programData = {
        video_list: [],
        view_count: 0
      };
    let pg = 1,
      page = 2;
    task.playNum = 0;
    if (program.count % 30 === 0) {
      page = program.count / 30;
    } else {
      page = Math.ceil(program.count / 30);
    }
    async.whilst(
      () => pg <= page,
      (cb) => {
        option.url = `http://space.bilibili.com/ajax/channel/getVideo?mid=${task.id}&cid=${program.id}&p=${pg}&num=30&order=0&_=${new Date().getTime()}`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('专辑列表请求失败');
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.debug('专辑列表解析失败');
            logger.info(result);
            cb();
            return;
          }
          result = result.data.list;
          for (const values of result) {
            programData.video_list.push(values.aid);
            programData.view_count += values.info.view;
          }
          pg += 1;
          cb();
        });
      },
      () => {
        programData.program_id = program.id;
        programData.program_name = program.name;
        programData.link = `http://space.bilibili.com/${task.id}/#!/channel-detail/${program.id}/1/0`;
        programData.play_link = '';
        programData.thumbnail = program.video_list[0].pic || '';
        programData.video_count = program.count;
        programData.published = moment(new Date(program.modify_time)).format('X');
        callback(null, programData);
      }
    );
  }
}
module.exports = getProgram;