/**
 * Created by zhupenghui on 2017/7/4.
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
    let start = 0, cycle = true;
    const option = {
        ua: 3,
        own_ua: 'Eyepetizer/3107 CFNetwork/811.5.4 Darwin/16.6.0'
      },
      programInfo = {
        platform: task.p,
        bid: task.id,
        program_list: []
      };
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `${this.settings.spiderAPI.kaiyan.programList + task.id}&start=${start}&num=50`;
        // logger.debug(option.url);
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('栏目列表请求失败', err);
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('专辑id列表解析失败', result.body);
            cb();
            return;
          }
          if (!result.itemList || !result.itemList.length) {
            cycle = false;
            cb();
            return;
          }
          this.getProgramId(task, result.itemList, (error, list) => {
            for (const value of list) {
              programInfo.program_list.push(value);
            }
            list = null;
            start += 50;
            cb();
          });
        });
      },
      () => {
        // logger.info(programInfo);
        callback();
      }
    );
  }
  getProgramId(task, proList, callback) {
    const length = proList.length;
    let index = 0,
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
        programList = null;
      }
    );
  }
  getVideoList(task, program, callback) {
    const listId = program.data.header.id,
      option = {
        ua: 3,
        own_ua: 'Eyepetizer/3107 CFNetwork/811.5.4 Darwin/16.6.0'
      };
    let start = 0,
      cycle = true,
      num = 0,
      programData = {
        video_list: [],
        view_count: ''
      };
    async.whilst(
      () => cycle,
      (cb) => {
        option.url = `https://baobab.kaiyanapp.com/api/v4/playlists/${listId}/videos?start=${start}&num=50`;
        request.get(logger, option, (err, result) => {
          if (err) {
            logger.debug('专辑列表请求失败');
            cb();
            return;
          }
          try {
            result = JSON.parse(result.body);
          } catch (e) {
            logger.error('单个专辑解析失败', result.body);
            cb();
            return;
          }
          if (!result.itemList || !result.itemList.length) {
            cycle = false;
            cb();
            return;
          }
          for(const value of result.itemList) {
            programData.video_list.push(value.data.id);
          }
          num += Number(result.itemList.length);
          start += 50;
          cb();
        });
      },
      () => {
        programData.program_id = listId;
        programData.program_name = program.data.header.title;
        programData.link = '';
        programData.thumbnail = program.data.header.icon;
        programData.video_count = num;
        programData.published = '';
        callback(null, programData);
        programData = null;
      }
    );
  }
}
module.exports = getProgram;
