/**
 * Created by zhupenghui on 17/6/21.
 */
let logger, typeErr, cheerio, request, infoCheck;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    cheerio = core.modules.cheerio;
    request = core.modules.request;
    infoCheck = core.modules.infoCheck;
    logger = this.settings.logger;
    logger.trace('baijia monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.total = 0;
    this.getList(task, () => {
      callback();
    });
  }
  getUser(task, vid) {
    let option = {
      url: `https://baijiahao.baidu.com/po/feed/video?wfr=spider&for=pc&context=%7B%22sourceFrom%22%3A%22bjh%22%2C%22nid%22%3A%22${vid}%22%7D`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'user', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      let $ = cheerio.load(result.body);
      if ($('div.item p').eq(0).text() === '视频已失效，请观看其他视频') {
        typeErr = {type: 'data', err: '视频已失效，请观看其他视频', interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      result = result.body.replace(/[\s\n\r]/g, '');
      const startIndex = result.indexOf('videoData={"id'),
        endIndex = result.indexOf(';window.listInitData');
      if (startIndex === -1 || endIndex === -1) {
        typeErr = {type: 'json', err: 'baijia-fans-播放详情页DOM结构异常', interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      let dataJson = result.substring(startIndex + 10, endIndex);
      try {
        dataJson = JSON.parse(dataJson);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(dataJson)}}`, interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      typeErr = null; option = null; $ = null; result = null; dataJson = null;
    });
  }
  getList(task, callback) {
    let option = {
      referer: `http://baijiahao.baidu.com/u?app_id=${task.id}&fr=bjhvideo`,
      url: `${this.settings.spiderAPI.baijia.videoList + task.id}&_limit=50&_skip=0`,
      ua: 1
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'list', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'list', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!result.items || result.items.length === 0) {
        typeErr = {type: 'data', err: `{error: baijia-list-视频列表数据异常, data: ${JSON.stringify(result.items)}}`, interface: 'list', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (result.items[0].feed_id === '') {
        this.getVidInfo(task, null, result.items[0].url);
      } else {
        this.getUser(task, result.items[0].feed_id);
        this.getVidInfo(task, result.items[0].feed_id, null);
      }
      result = null;
      option = null;
      callback();
    });
  }
  getVidInfo(task, vid, url) {
    let option = {};
    if (vid !== null) {
      option.url = `https://baijiahao.baidu.com/po/feed/video?wfr=spider&for=pc&context=%7B%22sourceFrom%22%3A%22bjh%22%2C%22nid%22%3A%22${vid}%22%7D`;
    } else {
      option.url = url;
    }
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVidInfo', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVidInfo', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      let $ = cheerio.load(result.body);
      if ($('div.item p').eq(0).text() === '视频已失效，请观看其他视频') {
        typeErr = {type: 'data', err: '视频已失效，请观看其他视频', interface: 'getVidInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      let dataJson = result.body.replace(/[\s\n\r]/g, '');
      if (dataJson.includes('很抱歉，您要访问的文章已蒸发，或者该网址不存在')) {
        option = null; typeErr = null; dataJson = null;
        return;
      }
      const startIndex = dataJson.indexOf('videoData={"id') === -1 ? dataJson.indexOf('={tplData:{') : dataJson.indexOf('videoData={"id'),
        endIndex = dataJson.indexOf(';window.listInitData') === -1 ? dataJson.indexOf(',userInfo:') : dataJson.indexOf(';window.listInitData');
      if (startIndex === -1 || endIndex === -1) {
        typeErr = {type: 'json', err: `dom-可能结构变了{star: ${startIndex}, end: ${endIndex}`, interface: 'getVidInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      dataJson = dataJson.substring(startIndex + 10, endIndex);
      try {
        dataJson = JSON.parse(dataJson);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${e.message}, data: ${dataJson}`, interface: 'getVidInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
      typeErr = null; option = null; dataJson = null; $ = null;
    });
  }
}
module.exports = dealWith;