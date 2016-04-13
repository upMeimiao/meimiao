/*
 * redis instance
 * Created by cherokee on 14-5-22.
 */

var redis = require("redis");

/**
 * 创建链连接redis的客户端
 * @param  {string}   host     主机地址
 * @param  {string}   port     端口
 * @param  {string}   db       使用的redis数据库编号(从0开始)
 * @param  {string}   type     使用的缓存服务器名称：ssdb、redis
 * @param  {string}   pwd      连接redis使用的密码
 * @param  {Function} 对redis每种操作完毕后的回调函数
 */
exports.createClient = function(host,port,db,type,pwd,callback){
    "use strict";
    var redis_cli = redis.createClient(port,host);
    //redis密码验证
    if(pwd) {
        //如果存在密码，就验证，否则直接连接
        redis_cli.auth(pwd, function(err){
            if(err) {
                throw err;
            }
            redis_cli.select(db, function(err) {
                callback(err,redis_cli);
            });
        });
    } else {
        redis_cli.select(db, function(err,value) {
            callback(err,redis_cli);
        });
    }
    redis_cli.hlist = function(name,callback){
        redis_cli.keys(name,callback);
    };
    redis_cli.hclear = function(name,callback){
        redis_cli.del(name,callback);
    };
    redis_cli.zlen = function(name,callback){
        redis_cli.zcount(name,0,(new Date()).getTime(),callback);
    };
    redis_cli.zlist = function(name,callback){
        redis_cli.keys(name,callback);
    };
    redis_cli.qlist = function(name,callback){
        redis_cli.keys(name,callback);
    };
    redis_cli.close = function(){
        redis_cli.quit();
    };
};
