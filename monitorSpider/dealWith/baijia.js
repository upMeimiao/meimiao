/**
 * Created by zhupenghui on 17/6/21.
 */
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('baijia monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.cheerio = this.modules.cheerio;
    task.request = this.modules.request;
    task.infoCheck = this.modules.infoCheck;
    task.core = this.core;
    this.getList(task, () => {
      task = null;
      callback();
    });
  }
  getUser(task, vid) {
    let option = {
      url: this.settings.spiderAPI.baijia.api,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_2 like Mac OS X) AppleWebKit/603.2.4 (KHTML, like Gecko) Mobile/14F89 haokan/2.6.1 (Baidu; P2 10.3.2)/2.3.01_2,8enohP/381d/C2BB16A6BC640F0CD9DA2060098AC66793B62A080FCTOPTMEQM/1',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: {
        'baijia/authorInfo': `method=get&app_id=${task.id}`
      }
    };
    task.request.post(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'user', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; result = null; task = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        return;
      }
      if (!result['baijia/authorInfo'] || !result['baijia/authorInfo'].data || !result['baijia/authorInfo'].data.subscribe_total) {
        typeErr = {type: 'data', err: `{fans-error: 粉丝接口获取错误, data: ${JSON.stringify(result)}}`, interface: 'user', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      typeErr = null; option = null; $ = null; result = null;
    });
  }
  getList(task, callback) {
    let option = {
      referer: `http://baijiahao.baidu.com/u?app_id=${task.id}&fr=bjhvideo`,
      url: `${this.settings.spiderAPI.baijia.videoList + task.id}&_limit=50&_skip=0`,
      ua: 1
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'list', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'list', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        result = null; task = null; typeErr = null; option = null;
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'list', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        result = null; task = null; typeErr = null; option = null;
        callback();
        return;
      }
      if (!result.items || result.items.length === 0) {
        typeErr = {type: 'data', err: `{error: baijia-list-视频列表数据异常, data: ${JSON.stringify(result.items)}}`, interface: 'list', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        result = null; task = null; typeErr = null; option = null;
        callback();
        return;
      }
      if (result.items[0].feed_id === '') {
        this.getVidInfo(task, null, result.items[0].url);
      }
      result = null; task = null; typeErr = null; option = null;
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
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVidInfo', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVidInfo', url: option.url};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      let $ = task.cheerio.load(result.body);
      if ($('div.item p').eq(0).text() === '视频已失效，请观看其他视频') {
        typeErr = {type: 'data', err: '视频已失效，请观看其他视频', interface: 'getVidInfo', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null; $ = null;
        return;
      }
      let dataJson = result.body.replace(/[\s\n\r]/g, '');
      if (dataJson.includes('很抱歉，您要访问的文章已蒸发，或者该网址不存在')) {
        option = null; typeErr = null; dataJson = null; result = null; task = null;
        return;
      }
      const startIndex = dataJson.indexOf('videoData={"id') === -1 ? dataJson.indexOf('={tplData:{') : dataJson.indexOf('videoData={"id'),
        endIndex = dataJson.indexOf(';window.listInitData') === -1 ? dataJson.indexOf(',userInfo:') : dataJson.indexOf(';window.listInitData');
      if (startIndex === -1 || endIndex === -1) {
        typeErr = {type: 'json', err: `dom-可能结构变了{star: ${startIndex}, end: ${endIndex}`, interface: 'getVidInfo', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; dataJson = null; result = null; task = null;
        return;
      }
      dataJson = dataJson.substring(startIndex + 10, endIndex);
      try {
        dataJson = JSON.parse(dataJson);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${e.message}, data: ${dataJson}`, interface: 'getVidInfo', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; dataJson = null; result = null; task = null;
        return;
      }
      if (!dataJson.video || !dataJson.video.playcnt) {
        typeErr = {type: 'data', err: `{error: 视频详细数据获取失败, data: ${JSON.stringify(dataJson)}`, interface: 'getVidInfo', url: option.url};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      typeErr = null; option = null; dataJson = null; $ = null; task = null; result = null;
    });
  }
}
module.exports = dealWith;