/**
 * Created by dell on 2017/5/15.
 */
const child_process = require('child_process');

const loginModule = (parameter, callback) => {
  const spawn = child_process.spawn('casperjs',
    [`${__dirname}/casper.js`, parameter.auth.email, parameter.auth.pass, parameter.loginAddr],
    { stdio: ['pipe', 'pipe', 'pipe'] });
  spawn.stdin.setEncoding('utf8');
  spawn.stdout.setEncoding('utf8');
  spawn.on('error', (error) => {
    console.error('检测到错误', error);
  });
  spawn.stdout.on('data', (result) => {
    const len = result.length;
    if (result == 'error') {
      if (parameter.timeout >= 2) {
        callback('timeout');
        return;
      }
      parameter.timeout += 1;
      loginModule(parameter, callback);
      return;
    }
    if (len > 30) {
      result = result.substring(result.indexOf('OK') + 2, result.length).replace(/[\r\n]/g, '');
      callback(null, result);
      return;
    }
    console.log(result);
  });
  spawn.stdout.on('close', () => {
    console.log('关闭进程');
  });
};

exports.start = (parameter, callback) => {
  loginModule(parameter, (err, result) => {
    if (err) {
      callback(err);
      return;
    }
    callback(null, result);
  });
};