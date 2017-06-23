/**
 * Created by zhupenghui on 17/6/23.
 */
const async = require( 'neo-async' );
const cheerio = require('cheerio');
const request = require( '../../lib/request' );
const infoCheck = require('../controllers/infoCheck');

let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('baiduVideo monitor begin...');
  }
  start(task, callback) {
    task.timeout = 0;
    this.videoAlbum(task, () => {
      callback();
    });
  }
  videoAlbum(task, callback) {
    const option = {
      url: this.settings.spiderAPI.baidu.videoAlbum + task.id
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'videoAlbum', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'videoAlbum', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      const $ = cheerio.load(result.body),
        script = $('script')[14].children[0].data.replace(/[\s\n\r]/g, ''),
        startIndex = script.indexOf('[{"album":'),
        endIndex = script.indexOf(',frp:\'\',');
      if (startIndex === -1 || endIndex === -1) {
        typeErr = {type: 'data', err: `baiduVideo-fan-dom-indexOf: start: ${startIndex} --- end: ${endIndex}`, interface: 'videoAlbum', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      let listData = script.substring(startIndex, endIndex);
      try {
        listData = JSON.parse(listData);
      } catch (e) {
        typeErr = {type: 'json', err: `baiduVideo-fan-${JSON.stringify(e.message)}`, interface: 'videoAlbum', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      const length = listData.length,
        fan = $('div.num-sec').eq(0).find('p.num').text();
      if (!fan) {
        typeErr = {type: 'data', err: `baiduVideo-fan-dom-error`, interface: 'videoAlbum', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      this.getVidList(task, listData[0].album.id, () => {
        callback();
      });
    });
  }
  getVidList(task, listVid, callback) {
    const option = {
      url: `${this.settings.spiderAPI.baidu.videoList + listVid}&page=1&_=${new Date().getTime()}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVidList', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVidList', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getVidList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      this.getVidInfo(task, result.data[0].play_link);
      callback();
    });
  }
  getVidInfo(task, url) {
    if (!url) {
      typeErr = {type: 'data', err: 'baiduVideo-getVidInfo-url-error', interface: 'getVidInfo', url: option.url};
      infoCheck.interface(this.core, task, typeErr);
      return;
    }
    const option = {
      url
    };
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
      const $ = cheerio.load(result.body),
        playNum = $('p.title-info .play').text().replace('次', '');
      if (!playNum) {
        typeErr = {type: 'data', err: 'baiduVideo-playNum-null', interface: 'getVidInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
}
module.exports = dealWith;