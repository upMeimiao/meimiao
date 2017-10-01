/**
 * Created by zhupenghui on 17/8/15.
 */
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('xiaokaxiu comment begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.infoCheck = this.modules.infoCheck;
    task.zlib = this.modules.zlib;
    this.commentList(task, () => callback());
  }
  commentList(task, callback) {
    let option = {
      url: this.settings.xiaokaxiu,
      encoding: 1,
      headers: {
        'User-Agent': 'YXCaptureApp/1.7.6 (iPhone; iOS 10.3.2; Scale/3.00)',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: {
        _secdata: 'fCuZ0_Ms-qbyC4qqBOeeoMQy8R5R2hUJvIVd6fWGz0nLP1Pv2ohw19C6xI6dSjkapKvrMNoEDkqaSe3_Vhg2WvCrtCSjqLaW_Y5uP8vqFNR4iTaKSaSH5k7m8AVpQrckFxDVyYyLKrHmwFr06TXTQ_5TJi55BBf_1nc8avzmZTrE-3s9AkP5y8JmownDLlE6wSzczGa3s_qFV_H36O5cX29ij5AVtfFkqfszFzuF2p86w8G9eXondEFTldsc17YBISXniJR1k6v8f6PtiV2xrMpZV6DGzfuYVmPnp6ouEuZoWZ3Mz2Lqd2qHCRcAHjmKbBfraMvpEskjcc7aB_cPrVWqUScztHKtQ3EywufXxPu2dQ4thBArQ3-loiShxdhkkwRJb-ErTpLxC2UF_bDIbFlhShNZxL6_dL42tJr28pf2Ovutg0pELRhNmae-_kasBPqhbbgEaAmy2mcdiKrlrA..',
        limit: 20,
        page: 1,
        videoid: task.aid
      }
    };
    task.request.post(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'commentList', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'commentList', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      try {
        result = JSON.parse(task.zlib.unzipSync(result.body).toString());
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${e.message}, data: ${JSON.stringify(result)}}`, interface: 'commentList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      if (!result.data || !result.data.list) {
        typeErr = {type: 'data', err: `{error: 评论列表异常, data: ${JSON.stringify(result)}}`, interface: 'commentList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; typeErr = null; result = null; task = null;
      callback();
    });
  }
}
module.exports = dealWith;