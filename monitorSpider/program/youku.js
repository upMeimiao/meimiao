/**
 * Created by zhupenghui on 2017/7/17.
 */
let async, request, logger, typeErr, infoCheck;
class program {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    async = core.modules.async;
    request = core.modules.req;
    infoCheck = core.modules.infoCheck;
    logger = core.settings.logger;
    logger.trace('youku program instantiation ...');
  }
  start(task, callback) {
    this.getProgramList(task, () => {
      callback();
    });
  }
  getProgramList(task, callback) {
    let option = {
        method: 'GET',
        url: 'https://openapi.youku.com/v2/playlists/by_user.json',
        qs: {
          client_id: this.settings.app_key,
          user_id: task.id,
          count: 10
        },
        timeout: 5000
      },
      result;
    request(option, (err, response, body) => {
      if (err) {
        typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'proList', url: JSON.stringify(option)};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (response.statusCode !== 200) {
        typeErr = {type: 'status', err: JSON.stringify(response.statusCode), interface: 'proList', url: JSON.stringify(option)};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      try {
        result = JSON.parse(body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(body)}}`, interface: 'proList', url: JSON.stringify(option)};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!result || !result.playlists) {
        typeErr = {type: 'data', err: `栏目数据出问题: ${JSON.stringify(result.data)}}`, interface: 'proList', url: JSON.stringify(option)};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      if (!result.playlists.length) {
        callback();
        return;
      }
      this.programIdlist(task, result.playlists[0].id);
      callback();
      option = null; result = null;  typeErr = null;
    });
  }
  programIdlist(task, proId) {
    let option = {
        method: 'GET',
        url: 'https://openapi.youku.com/v2/playlists/videos.json',
        qs: {
          client_id: this.settings.app_key,
          playlist_id: proId,
          count: 50
        },
        timeout: 5000
      },
      result;
    request(option, (err, response, body) => {
     if (err) {
       typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'proIdList', url: JSON.stringify(option)};
       infoCheck.interface(this.core, task, typeErr);
       return;
     }
     if (response.statusCode !== 200) {
       typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'proIdList', url: JSON.stringify(option)};
       infoCheck.interface(this.core, task, typeErr);
       return;
     }
     try {
       result = JSON.parse(body);
     } catch (e) {
       typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(body)}}`, interface: 'proIdList', url: JSON.stringify(option)};
       infoCheck.interface(this.core, task, typeErr);
       return;
     }
     if (!result || !result.videos) {
       typeErr = {type: 'data', err: `list-data: ${JSON.stringify(result.data)}}`, interface: 'proIdList', url: JSON.stringify(option)};
       infoCheck.interface(this.core, task, typeErr);
     }
     option = null; result = null; typeErr = null;
    });
  }
}
module.exports = program;

