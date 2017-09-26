/**
 * Created by dell on 2017/5/15.
 */
const child_process = require('child_process');

const loginModule = (parameter, callback) => {
  const spawn = child_process.spawn('node',
    [`${__dirname}/puppeteer.js`, parameter.auth.email, parameter.auth.pass, parameter.loginAddr],
    { stdio: ['pipe', 'pipe', 'pipe'] });
  spawn.stdin.setEncoding('utf8');
  spawn.stdout.setEncoding('utf8');
  spawn.on('error', (error) => {
    console.error('检测到错误', error);
  });
  spawn.stdout.on('data', (result) => {
    console.log('----', result);
    if (result === 'error') {
      loginModule(parameter, callback);
      return
    }
    if (result === 'emailError') {
      callback(null, 'emailError');
      return;
    }
    callback(null, result)
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