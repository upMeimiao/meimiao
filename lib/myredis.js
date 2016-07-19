const redis = require("redis")

/**
 * 创建链连接redis的客户端
 * @param  {string}   host     主机地址
 * @param  {string}   port     端口
 * @param  {string}   db       使用的redis数据库编号(从0开始)
 * @param  {string}   pwd      连接redis使用的密码
 * @param  {Function} 对redis每种操作完毕后的回调函数
 */
exports.createClient = ( host, port, db, pwd, callback ) => {
    const redis_cli = redis.createClient( port, host )
    if(pwd) {
        redis_cli.auth( pwd, ( err ) => {
            if(err) {
                throw err
            }
            redis_cli.select(db, (err) => {
                callback(err,redis_cli)
            })
        })
    } else {
        redis_cli.select(db, (err,value) => {
            callback(err,redis_cli)
        })
    }
    redis_cli.hlist = (name,callback) => {
        redis_cli.keys(name,callback)
    }
    redis_cli.hclear = (name,callback) => {
        redis_cli.del(name,callback)
    }
    redis_cli.zlen = (name,callback) => {
        redis_cli.zcount(name,0,(new Date()).getTime(),callback)
    }
    redis_cli.zlist = (name,callback) => {
        redis_cli.keys(name,callback)
    }
    redis_cli.qlist = (name,callback) => {
        redis_cli.keys(name,callback)
    }
    redis_cli.close = () => {
        redis_cli.quit()
    }
}
