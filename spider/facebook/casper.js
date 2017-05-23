/**
 * Created by dell on 2017/5/15.
 */
const system = require('system');
const casper = require('casper').create();

casper.userAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36');

const auth = {
    email: casper.cli.get(0),
    pass: casper.cli.get(1)
  },
  loginAddr = casper.cli.get(2),
  headers = {
    Host: 'www.facebook.com',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
    'Accept-Encoding': 'gzip, deflate, br',
    Connection: 'keep-alive',
    'Upgrade-Insecure-Request': '1',
    'Cache-control': 'max-age=0',
    // proxy: 'http://127.0.0.1:56777'
  };

casper.start();
casper.open(loginAddr, headers);
casper.then(function () {
  console.log('填写表单');
  this.fill('form', auth, true);
  console.log('填写完成，开始登录');
});
casper.then(function () {
  const self = this;
  console.log('等待登录结果......');
  self.waitForSelector('#u_0_4', function () {
    console.log('登录成功');
    var _cookies = phantom.cookies;
    var cookies = 'OK';
    _cookies.forEach(function(val) {
      cookies += val.name + '=' + val.value + ';';
    });
    system.stdout.writeLine(cookies);
    casper.exit();
  }, function () {
    var content = phantom.content;
    console.log('登录失败', content);
    system.stdout.writeLine('error');
    casper.exit();
  }, 25000);
});
casper.run();
