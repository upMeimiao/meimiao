/**
 * Created by dell on 2017/5/15.
 */
const child_process = require('child_process');

let logger;
class loginFacebook {
  constructor(core) {
    this.settings = core.settings;
    this.auth = this.settings.spiderAPI.facebook.auth;
    // this.pass = core.settings.spiderAPI.facebook.pass;
    this.loginAddr = core.settings.spiderAPI.facebook.loginAddr;
    this.timeout = 0;
    logger = core.settings.logger;
  }
  start(index, callback) {
    if (index >= this.auth.length) {
      callback('NoUser');
      return;
    }
    this.email = this.auth[index].email;
    this.pass = this.auth[index].pass;
    const spawn = child_process.spawn('casperjs',
      [`${__dirname}\\casper.js`, this.email, this.pass, this.loginAddr],
      { stdio: ['pipe', 'pipe', 'pipe'] });
    spawn.stdin.setEncoding('utf8');
    spawn.stdout.setEncoding('utf8');
    spawn.on('error', (error) => {
      logger.debug('检测到错误', error);
    });
    spawn.stdout.on('data', (result) => {
      const len = result.length;
      if (len < 30 && result == 'error') {
        if (this.timeout >= 2) {
          this.timeout = 0;
          index += 1;
          this.start(index, callback);
          return;
        }
        this.timeout += 1;
        this.start(callback);
        return;
      }
      if (len > 30) {
        result = result.substring(result.indexOf('OK') + 2, result.length).replace(/[\r\n]/g, '');
        callback(null, result);
        return;
      }
      logger.debug(result);
    });
    spawn.stdout.on('close', () => {
      logger.debug('关闭进程');
    });
  }
}
module.exports = loginFacebook;
