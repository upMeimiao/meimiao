/**
 * Created by zhupenghui on 17/6/23.
 */
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('baiduVideo monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.request = this.modules.request;
    task.infoCheck = this.modules.infoCheck;
    task.cheerio = this.modules.cheerio;
    task.core = this.core;
    this.videoAlbum(task, () => {
      task = null;
      callback();
    });
  }
  videoAlbum(task, callback) {
    let option = {
      url: this.settings.spiderAPI.baidu.videoAlbum + task.id
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'videoAlbum', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'videoAlbum', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; task = null;
        callback();
        return;
      }
      let $ = task.cheerio.load(result.body),
        script = $('script')[14].children[0].data.replace(/[\s\n\r]/g, ''),
        startIndex = script.indexOf('[{"album":'),
        endIndex = script.indexOf(',frp:\'\',');
      if (startIndex === -1 || endIndex === -1) {
        typeErr = {type: 'data', err: `baiduVideo-fan-dom-indexOf: start: ${startIndex} --- end: ${endIndex}`, interface: 'videoAlbum', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; task = null; $ = null; script = null; startIndex = null; endIndex = null;
        callback();
        return;
      }
      let listData = script.substring(startIndex, endIndex);
      try {
        listData = JSON.parse(listData);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'videoAlbum', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; task = null; $ = null; listData = null;
        callback();
        return;
      }
      const fan = $('div.num-sec').eq(0).find('p.num').text();
      if (!fan) {
        typeErr = {type: 'data', err: `baiduVideo-粉丝数: ${JSON.stringify(fan)}, DOM结构可能出问题了`, interface: 'videoAlbum', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        listData = null;
        callback();
        return;
      }
      this.getVidList(task, listData[0].album.id);
      listData = null; option = null; $ = null; script = null; startIndex = null; endIndex = null; task = null; result = null;
      callback();
    });
  }
  getVidList(task, listVid) {
    let option = {
      url: `${this.settings.spiderAPI.baidu.videoList + listVid}&page=1&_=${new Date().getTime()}`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVidList', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVidList', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        result = null; option = null; typeErr = null; task = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'getVidList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        result = null; option = null; typeErr = null; task = null;
        return;
      }
      if (!result || !result.data.length) {
        typeErr = {type: 'json', err: `{error: 视频列表, data: ${JSON.stringify(result.data)}}`, interface: 'getVidList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        result = null; option = null; typeErr = null; task = null;
        return;
      }
      this.getVidInfo(task, result.data[0].play_link);
      result = null; option = null; typeErr = null; task = null;
    });
  }
  getVidInfo(task, url) {
    if (!url) {
      typeErr = {type: 'data', err: 'baiduVideo-getVidInfo-url-error', interface: 'getVidInfo', url};
      task.infoCheck.interface(task.core, task, typeErr);
      return;
    }
    let option = {
      url
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVidInfo', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVidInfo', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        result = null; option = null; typeErr = null; task = null;
        return;
      }
      let $ = task.cheerio.load(result.body),
        playNum = $('p.title-info .play').text().replace('次', '');
      if (!playNum) {
        typeErr = {type: 'data', err: `{error: 单视频接口播放量, data: ${playNum}}`, interface: 'getVidInfo', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; typeErr = null; $ = null; playNum = null; result = null;
    });
  }
}
module.exports = dealWith;