/**
 * Created by junhao on 2016/1/14.
 */
/**
 * spider core
 */
var util = require( 'util' );
var events = require( 'events' );
var path = require( 'path' );
var async = require( 'async' );
require( '../lib/jsextend.js' );


var logger;
////spider core/////////////////////////////////////////
var spiderCore = function ( settings ) {
    'use strict';
    events.EventEmitter.call( this );//eventemitter inherits
    this.settings = settings;
    this.cookie = settings.login.cookie_jn
    // redis连接
    this.redis = new (require( './redis.js' ))( this );
    // 爬虫
    this.spider = new (require( './spider.js' ))( this );
    // 下载器
    this.downloader = new (require( './downloader.js' ))( this );
    // 摘取
    this.extractor = new (require( './extractor.js' ))( this );
    // 业务逻辑控制
    this.controller = new (require( './controller.js' ))( this );
    // 向服务器返回
    this.sendToServer = new (require( './sendToServer.js' ))( this );
    this.login = new (require( './login.js' ))( this );
    // 获取任务
    this.task = new (require( './taskQueue.js' ))( this );
    
    logger = settings.logger;
    logger.debug( '控制器 实例化...' );
};
util.inherits( spiderCore, events.EventEmitter );

spiderCore.prototype.assembly = function () {
    'use strict';
    var self = this;
    async.series( [ function ( callback ) {
        self.redis.assembly( callback );
    }, function ( callback ) {
        self.spider.assembly( callback );
    } , function ( callback ) {
        self.downloader.assembly( callback );
    }, function ( callback ) {
        self.extractor.assembly( callback );
    } , function ( callback ) {
        self.login.assembly( function ( err, result ) {
            if ( err ) {
                logger.error( '登录准备出现错误:', err );
                logger.error( '程序将停止' );
                process.exit();
            }
            callback( err, result );
        } );
    }], function ( err, result ) {
        if ( err ) {
            logger.error( 'spider addembly occur error : ', err );
            logger.error( 'process will send a email then exit' );
            logger.warn( 'process exit' );
            process.exit();
        }
        self.spider.refreshDrillerRules();// 都初始化完毕以后，就调用 spider 去刷新规则
    } );
}

spiderCore.prototype.start = function () {
    var spiderCore = this;
    spiderCore.on( 'new_url_queue', function ( taskInfo ) {//如果没有找到urlinfo 那么触发这个事件 这个事件会更新
        spiderCore.downloader.download( taskInfo );
    } );
    spiderCore.on( 'crawled', function ( taskInfo ) {//拿到的结果
        logger.info( 'crawl ' + taskInfo.url + ' finish, proxy:' + taskInfo.remote_proxy + ', cost:' + (String( taskInfo.origin.jshandle ) === 'true' ? taskInfo.cost : Date.now() - parseInt( taskInfo.origin.start_time.getTime() )) + ' ms' );
        if ( spiderCore.extractor.validateContent( taskInfo ) ) {
            taskInfo = spiderCore.extractor.extract( taskInfo );
            var result = spiderCore.controller.classify( taskInfo )
            if ( result.origin.done === true ) {
                logger.debug( "任务：", result.origin.taskId, "完成" );
                // 把需要发送给服务器的内容提取出来
                var _result = taskInfo.backInfo//JSON.stringify(taskInfo.backInfo)
                spiderCore.sendToServer.send( _result, result.origin.taskType, function ( err, back ) {
                    if ( err ) {
                        logger.error( '向服务器发送结果出现问题' );
                        spiderCore.emit( 'slide_queue' );
                        return;
                    }
                    logger.debug( '服务器回复：', back.body );
                    spiderCore.task.finish( result.origin.taskId, function ( err, result ) {
                        if ( err ) {
                            logger.error( '删除任务状态失败' );
                            return;
                        }
                        logger.debug( '删除任务成功' );
                        spiderCore.emit( 'slide_queue' );
                        return;
                    } );
                })
            }else{
                spiderCore.emit( 'slide_queue' );
                return;
            }
        }
    })
    this.on( 'crawling_failure', function ( taskInfo, errMsg ) {
        logger.warn( util.format( 'Crawling failure: %s, reason: %s', taskInfo, errMsg ) );
        this.spider.retryCrawl( taskInfo );
    } );
    // when downloading is break
    this.on( 'crawling_break', function ( taskInfo, errMsg ) {
        logger.warn( util.format( 'Crawling break: %s, reason: %s', taskInfo.url, errMsg ) );
        this.spider.retryCrawl( taskInfo );
    } );

    this.on( 'slide_queue', function () {
        var spiderCore = this
        var hour = (new Date()).getHours()
        if(hour == 3){
            setTimeout( function () {
                if ( spiderCore.spider.queue_length > 0 ) {
                    spiderCore.spider.queue_length--;
                }
                spiderCore.spider.checkQueue( spiderCore.spider );//猜测 这个 checkQueue就是开始工作的函数，它的使命应该是 先检查队列 然后 再爬取，最后处理
            }, spiderCore.settings.waitTime )
        }else{
            logger.debug(hour)
            setTimeout( function () {
                spiderCore.emit( 'slide_queue' );
            }, spiderCore.settings.waitTime);
        }
    } );

    this.once( 'driller_rules_loaded', function ( rules ) {//爬取规则整合完毕
        var spiderIns = this.spider;
        spiderIns.checkQueue( spiderIns );
    } )
    this.assembly();
}
module.exports = spiderCore;