/**
 * Created by dell on 2017/5/16.
 */
const request = require('request');
const async = require('async');

let logger;
class changeState {
  constructor(core) {
    logger = core.settings.logger;
  }
  start() {
    let offset = 0,
      length = 100,
      cycle = true;
    async.whilst(
      () => cycle,
      (cb) => {
        request.get(`http://127.0.0.1:3000/api/jobs/Facebook/active/${offset}..${length}/asc?`, { auth: { user: 'verona', pass: '2319446' } }, (err, res, body) => {
          if (err) {
            logger.debug('状态获取错误', err);
            cb();
            return;
          }
          if (res.statusCode !== 200) {
            logger.debug('获取状态信息，状态码错误', res.statusCode);
            cb();
            return;
          }
          let result;
          try {
            result = JSON.parse(body);
          } catch (e) {
            logger.debug('解析失败', body);
            cb();
            return;
          }
          if (result.length <= 0) {
            cycle = false;
            cb();
            return;
          }
          this.jobInactive(result, () => {
            offset += 100;
            length += 100;
            cb();
          });
        });
      },
      () => {
        logger.debug('状态修改完成');
      }
    );
  }
  jobInactive(jobs, callback) {
    let index = 0;
    const length = jobs.length;
    async.whilst(
      () => index < length,
      (cb) => {
        request.put(`http://127.0.0.1:3000/api/job/${jobs[index].id}/state/inactive`, { auth: { user: 'verona', pass: '2319446' } }, (err, res) => {
          if (err) {
            cb(err);
            return;
          }
          if (res.statusCode !== 200) {
            cb(`change job:${res.statusCode}`);
            return;
          }
          index += 1;
          cb();
        });
      },
      (err) => {
        if (err) {
          callback(err);
          return;
        }
        callback();
      }
    );
  }
  searchDB(db, email, callback) {
    db.zscore('error:email', email, (err, res) => {
      if (err) {
        callback(err);
        return;
      }
      if (res || res == -1) {
        callback(null, 1);
        return;
      }
      callback(null, 0);
    });
  }
  sendError(db, emaill, callback) {
    db.zscore('error:email', emaill, (err, result) => {
      if (err) return;
      if (!result) {
        db.zadd('error:email', -1, emaill);
      }
      this.sendEmail(db);
      callback();
    });
  }
  sendEmail(db) {
    db.zrangebyscore('error:email', '-1', '(0', (err, result) => {
      if (err || !result || result.length === 0) return;
      const key = [];
      let content = '';
      for (const [index, elem] of result.entries()) {
        content += `<p>平台: Facebook，平台ID: 40，出错账号: ${elem}</p>`;
        key[index] = ['zadd', 'error:email', 1, elem];
      }
      db.pipeline(key).exec();
      request({
        method: 'POST',
        url: 'http://localhost:3001/api/alarm',
        form: {
          subject: '用户账号被封禁(或Cookie到期)',
          content
        }
      });
    });
  }
}

module.exports = changeState;
