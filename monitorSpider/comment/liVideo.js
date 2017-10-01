/**
 * Created by zhupenghui on 17/8/15.
 */
let logger, typeErr;
const _cookie = (arr) => {
  /* 随机生成一个cookie信息 */
  const str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let cookie = '';
  for (const num of arr) {
    cookie += '-';
    for (let i = 0; i < num; i += 1) {
      const random = Math.floor(Math.random() * str.length);
      cookie += str[random];
    }
  }
  return cookie.replace('-', '');
};
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    this.modules = core.modules;
    logger = this.settings.logger;
    logger.trace('liVideo comment begin...');
    core = null;
  }
  start(task, callback) {
    task.core = this.core;
    task.request = this.modules.request;
    task.infoCheck = this.modules.infoCheck;
    task.cheerio = this.modules.cheerio;
    this.getIds(task, () => callback());
  }
  getIds(task, callback) {
    let option = {
      url: `http://app.pearvideo.com/clt/jsp/v2/content.jsp?contId=${task.aid}`,
      ua: 3,
      own_ua: 'LiVideoIOS/2.2.1 (iPhone; iOS 10.3.1; Scale/3.00)',
      Cookie: `PEAR_UUID=${_cookie([8, 4, 4, 4, 12])}`
    };
    task.request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getIds', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getIds', url: JSON.stringify(option)};
          task.infoCheck.interface(task.core, task, typeErr);
        }
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `{error: ${JSON.stringify(e.message)}, data: ${JSON.stringify(result.body)}}`, interface: 'getIds', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      if (Number(result.resultCode) === 5 || result.resultMsg == '该文章已经下线！' || !result.postInfo) {
        typeErr = {type: 'data', err: `{error: 评论getIds异常, data: ${JSON.stringify(result)}}`, interface: 'getIds', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      task.postId = result.postInfo.postId;
      task.postUserId = result.content.authors.length ? result.content.authors[0].userId : '';
      task.postUserId = task.postUserId || (result.postInfo.childList[0].userInfo.userId || '');
      this.commentList(task, () => {
        option = null; typeErr = null; result = null; task = null;
        callback();
      });
    });
  }
  commentList(task, callback) {
    let option = {
      url: `http://app.pearvideo.com/clt/page/v2/topic_comm_loading.jsp?parentId=${task.postId}&pageidx=2&score=0&postUserId=${task.postUserId}&mrd=${Math.random()}`,
      ua: 2,
      Referer: `http://app.pearvideo.com/clt/page/v2/topic_comm.jsp?postId=${task.postId}&contId=${task.aid}`,
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    };
    task.request.get(logger, option, (err, result) => {
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
      if (!result.body || result.body == '') {
        typeErr = {type: 'data', err: `{error: 评论列表数据为空, data: ${JSON.stringify(result)}}`, interface: 'commentList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
        option = null; typeErr = null; result = null; task = null;
        callback();
        return;
      }
      let $ = task.cheerio.load(result.body);
      if (!$('.comm-li').first().attr('id')) {
        typeErr = {type: 'data', err: `{error: 评论列表异常, data: ${JSON.stringify(result)}}`, interface: 'commentList', url: JSON.stringify(option)};
        task.infoCheck.interface(task.core, task, typeErr);
      }
      option = null; typeErr = null; result = null; task = null;
      callback();
    });
  }
}
module.exports = dealWith;