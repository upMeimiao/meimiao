const redis = require('redis');

/**
 * 创建链连接redis的客户端
 * @param  {string}   host     主机地址
 * @param  {string}   port     端口
 * @param  {string}   db       使用的redis数据库编号(从0开始)
 * @param  {string}   pwd      连接redis使用的密码
 * @param  {Function} 对redis每种操作完毕后的回调函数
 */
exports.createClient = (host, port, db, pwd, callback) => {
  const redisCli = redis.createClient(port, host);
  if (pwd) {
    redisCli.auth(pwd, (err) => {
      if (err) {
        throw err;
      }
      redisCli.select(db, (error) => {
        callback(error, redisCli);
      });
    });
  } else {
    redisCli.select(db, (err) => {
      callback(err, redisCli);
    });
  }
  redisCli.hlist = (name, cb) => {
    redisCli.keys(name, cb);
  };
  redisCli.hclear = (name, cb) => {
    redisCli.del(name, cb);
  };
  redisCli.zlen = (name, cb) => {
    redisCli.zcount(name, 0, (new Date()).getTime(), cb);
  };
  redisCli.zlist = (name, cb) => {
    redisCli.keys(name, cb);
  };
  redisCli.qlist = (name, cb) => {
    redisCli.keys(name, cb);
  };
  redisCli.close = () => {
    redisCli.quit();
  };
};
