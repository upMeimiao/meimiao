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
    logger.trace('liVideo monitor begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.infoCheck = this.modules.infoCheck;
    this.getVidList(task, () => {
      task = null;
      callback();
    });
  }
  getVidList(task, callback) {
    let option = {
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
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVidList', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVidList', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; task = null; typeErr = null;
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getVidList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        callback();
        return;
      }
      if (!result.contList || result.contList.length === 0) {
        typeErr = {type: 'json', err: `liVideo-list-data-error, data: ${JSON.stringify(result)}`, interface: 'getVidList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        callback();
        return;
      }
      this.getVidInfo(task, result.contList[0].contId);
      option = null; result = null; task = null; typeErr = null;
      callback();
    });
  }
  getVidInfo(task, vid) {
    let option = {
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
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVidInfo', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVidInfo', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getVidInfo', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; result = null; task = null; typeErr = null;
        return;
      }
      if (!result.content) {
        typeErr = {type: 'data', err: `liVideo-data-error, data: ${JSON.stringify(result)}`, interface: 'getVidInfo', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; result = null; task = null; typeErr = null;
    });
  }
}
module.exports = dealWith;