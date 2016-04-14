/**
 * Created by junhao on 16/4/6.
 */
var myRedis = require( '../lib/myredis.js' );
var async = require( 'async' );
var request = require( 'request' );

var logger;

var creatTask = function ( settings ) {
    'use strict';
    this.settings = settings
    logger = settings.logger
    logger.debug('主进程 实例化...')
}
creatTask.prototype.assembly = function () {
    'use strict';
    var self = this;
    var dbType = 'myRedis';//设置使用的队列数据库
    var pwd = this.settings.redis.pwd;
    async.parallel( [ function ( cb ) {
        myRedis.createClient( self.settings.task_info_redis_db[ 0 ],
            self.settings.task_info_redis_db[ 1 ],
            self.settings.task_info_redis_db[ 2 ],
            dbType,
            pwd,
            function ( err, cli ) {
                //if(err) throw err;
                self.redis_cli0 = cli;//taskInfo　redis
                logger.debug( "任务信息数据库连接建立...成功" );
                cb( err );
            } );
    } ], function ( err, result ) {
        if ( err ) {
            logger.error( "连接redis数据库出错。错误信息：", err );
            logger.error( "出现错误，程序终止。" );
            process.exit();
            return;
        } else {
            logger.debug( '创建数据库连接完毕' );
            self.getTask();
        }
    } );
};
creatTask.prototype.start = function () {
    'use strict';
    logger.debug( '启动函数' );
    this.assembly();
};
creatTask.prototype.getTask = function(){
    logger.debug( "开始创建任务" );
    var self = this;
    var info = [
        {
            app: 6,
            url: "https://mp.toutiao.com/",
            type: "ttmp"
        }
    ]
    self.dealWith(info,function(){
        self.wait()
    })
}
creatTask.prototype.wait = function () {
    var self = this
    setInterval(function () {
        var now = new Date()
        if(now.getHours() == 3){
            var info = [
                {
                    app: 6,
                    url: "https://mp.toutiao.com/",
                    type: "ttmp"
                }
            ]
            self.dealWith(info,function(){

            })
        }else{
            logger.debug(now.getHours())
        }
    },self.settings.waitTime)
}
creatTask.prototype.dealWith = function(info,callback){
    logger.debug( "开始处理信息" )
    //logger.debug(info)
    var self = this
    var len = info.length
    var sign = 0
    async.whilst(
        function(){
            return sign < len
        },
        function (cb){
            var taskInfo = {
                taskId: "6000_"+info[sign].type+"_"+(new Date()).getTime(),
                app: info[sign].app,
                taskUrl: info[sign].url,
                priority : '6000',
                cookie: self.settings.cookie,
                //cookie: 'uuid="w:30c47138882848d4b7c8005fe59a162e"; sessionid=8fc2c698ce59110a6e241e01b19f60e4',
                alias: info[sign].type,
                type: info[sign].type,
                done : 0
            }
            self.saveTask(taskInfo,function(){
                sign++
                return cb()
            })
        },
        function(err,result){
            return callback()
        }
    )

}
creatTask.prototype.saveTask = function(tasks,callback){
    logger.debug( "开始保存任务" )
    //logger.debug(tasks)
    var self = this
    var sign = true
    async.whilst(
        function(){
            return sign
        },
        function(cb){
            self.isRun(tasks.taskId,function(err,result){
                if ( err ) {
                    logger.error( "查询任务是否在运行中出现错误：", err );
                    //逻辑待完善
                }
                if ( !result ) {
                    logger.debug( '任务正在队列中，抛弃重复任务' );
                    sign = false
                    return cb();
                }else{
                    self.push(tasks,function(err){
                        if ( err ) {
                            logger.debug( "任务队列入栈出错：" );
                            return cb( err );
                        }
                        logger.debug( "任务入栈完成，任务id:", tasks.taskId );
                        sign = false
                        return cb();
                    })
                }
            })
        },
        function(err,result){
            return callback()
        }
    )
}
creatTask.prototype.push = function ( data, callback ) {
    'use strict';
    var self = this;
    //用queue作为前缀
    //taskInfo　写入
    async.series( [ function ( cb ) {
        self.redis_cli0.set( data.taskId, false, function ( err, result ) {
            if ( err ) {
                logger.error( '任务标示设置出现错误：', err );
            }
            return cb( err, result );
        } );
    }, function ( cb ) {
        self.redis_cli0.rpush( data.priority, JSON.stringify( data ), function ( err, result ) {
            if ( err ) {
                logger.error( '任务加入队列出现错误：', err );
                return callback( err );
            }
            return cb( err, result );
        } );
    } ], function ( err, result ) {
        return callback( err, result );
    } );
};
creatTask.prototype.isRun = function ( taskId, callback ) {
    'use strict';
    this.redis_cli0.get( taskId, function ( err, result ) {
        if ( err ) {
            return callback( err );
        }
        //logger.debug( result );
        if ( result === null ) {
            // 空的话
            // 可以加入这个任务
            return callback( err, true );
        }
        // 非空，不可以加入任务
        return callback( err, false );
    } );
}

module.exports = creatTask