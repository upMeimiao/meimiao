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
    logger.trace('liVideo monitor begin...');
  }
  start(task, callback) {
    task.timeout = 0;
    this.getVidList(task, () => {
      callback();
    });
  }
  getVidList(task, callback) {
    const option = {
      url: `${this.settings.spiderAPI.liVideo.list}${task.id}&start=0`,
      headers:
        {
          'cache-control': 'no-cache',
          'x-platform-version': '10.2.1',
          'x-client-hash': 'b90e74ec3b4e9511e9cf87e96438e461',
          connection: 'keep-alive',
          'x-client-version': '2.2.1',
          'x-client-agent': 'APPLE_iPhone8,2_iOS10.2.1',
          'user-agent': 'LiVideoIOS/2.2.1 (iPhone; iOS 10.2.1; Scale/3.00)',
          'X-Platform-Type': '1',
          'X-Client-ID': '2C2DECE9-B2CD-4B8B-A044-6D904ACFB5E7'
        }
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
      if (!result.contList || result.contList.length === 0) {
        typeErr = {type: 'json', err: 'liVideo-list-data-error', interface: 'getVidList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      this.getVidInfo(task, result.contList[0].contId);
      callback();
    });
  }
  getVidInfo(task, vid) {
    const option = {
      url: `http://app.pearvideo.com/clt/jsp/v2/content.jsp?contId=${vid}`,
      headers:
        {
          'cache-control': 'no-cache',
          'x-platform-version': '10.2.1',
          'x-client-hash': 'b90e74ec3b4e9511e9cf87e96438e461',
          connection: 'keep-alive',
          'x-client-version': '2.2.1',
          'x-client-agent': 'APPLE_iPhone8,2_iOS10.2.1',
          'user-agent': 'LiVideoIOS/2.2.1 (iPhone; iOS 10.2.1; Scale/3.00)',
          'X-Platform-Type': '1',
          'X-Client-ID': '2C2DECE9-B2CD-4B8B-A044-6D904ACFB5E7'
        }
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
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: JSON.stringify(e.message), interface: 'getVidInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.content) {
        typeErr = {type: 'data', err: 'liVideo-data-error', interface: 'getVidInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
}
module.exports = dealWith;