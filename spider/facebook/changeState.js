/**
 * Created by dell on 2017/5/16.
 */
const request = require('request');
const async = require('async');

const jobInactive = (jobs, callback) => {
  let index = 0;
  const length = jobs.length,
    options = {
      method: 'PUT',
      headers: {
        Referer: 'http://127.0.0.1:3000/kue/jobs/state/active',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Authorization: 'Basic dmVyb25hOjIzMTk0NDY='
      }
    };
  async.whilst(
    () => index < length,
    (cb) => {
      options.url = `http://127.0.0.1:3000/api/job/${jobs[index].id}/state/inactive`;
      request(options, (err, res, body) => {
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
};

exports.start = () => {
  request.get('http://127.0.0.1:3000/api/jobs/Facebook/active/0..200/asc?', { auth: { user: 'verona', pass: '2319446' } }, (err, res, body) => {
    if (err) {
      console.error('状态获取错误', err);
      return;
    }
    if (res.statusCode !== 200) {
      console.log('获取状态信息，状态码错误', res.statusCode);
      return;
    }
    let result;
    try {
      result = JSON.parse(body);
    } catch (e) {
      console.log('解析失败', body);
      return;
    }
    jobInactive(result, (error) => {
      if (error) {
        console.log(error);
        return;
      }
      console.log('修改成功');
    });
  });
};

