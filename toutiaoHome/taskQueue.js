var async = require( "async" );

var logger;
var settings;
var spiderCore;

var taskQueue = function ( _spiderCore ) {
    'use strict';
    spiderCore = _spiderCore;
    settings = _spiderCore.settings;
    logger = settings.logger;
    logger.debug( "任务队列模块 实例化..." );
};
/**
 * 获取任务函数
 * @param callback
 */
taskQueue.prototype.getTask = function ( callback ) {
    'use strict';
    var self = this;
    // 获取任务
    // 先获取前面的任务
    var taskQueue = settings.taskQueue;
    var i = 0;
    var length = taskQueue.length;
    async.whilst( function () {
        return i < length;
    }, function ( cb ) {
        logger.debug('taskQueue',taskQueue[i]);
        spiderCore.redis.taskInfo.lpop( taskQueue[ i ], function ( err, _taskInfo ) {
            if ( err ) {
                logger.error( '获取任务队列出现错误' );
                return cb( err );
            }
            // 如果获取的任务ID为空
            if ( !_taskInfo ) {
                logger.debug( '获取任务队列为空' );
                i++;
                return cb( null );
            }
            // 任务队列不为空
            var taskInfo;
            try {
                taskInfo = JSON.parse( _taskInfo );
                logger.info(taskInfo)
            } catch (e) {
                logger.error( '解析任务信息出现错误' );
                return cb( e.message );
            }
            // 任务解析完毕
            // 此时的结果已经是解析之后的对象了
            // 获取任务函数结束，返回结果
            spiderCore.redis.taskInfo.set( taskInfo.taskId, true, function ( result ) {
                return callback( null, taskInfo );
                //setTimeout(function(){
                //    return callback( null, taskInfo );
                //},5000)
            } );
        } );
    }, function ( err ) {
        // 暂时没有想好在出现错误的时候应该如何处理
        if ( err ) {
            logger.error( err );
        }
        return callback( null, null );
    } );
};
/**
 * 任务加入队列函数
 * @param taskInfo
 * @param callback
 * @returns {*}
 */
taskQueue.prototype.push = function ( taskInfo, callback ) {
    'use strict';
    if ( taskInfo === null ) {
        return callback( '参数 taskInfo 为 null' );
    }
    if ( taskInfo === undefined ) {
        return callback( '参数 taskInfo 为 undefined' );
    }
    spiderCore.redis.taskInfo.rpush( taskInfo.priority, JSON.stringify( taskInfo ), function ( err ) {
        if ( err ) {
            return callback( err );
        }
        return callback( null );
    } );
};
taskQueue.prototype.finish = function ( taskId, callback ) {
    'use strict';

    if ( taskId === null ) {
        return callback( '参数 taskId 为 null' );
    }

    if ( taskId === undefined ) {
        return callback( '参数 taskId 为 undefined' );
    }

    spiderCore.redis.taskInfo.del( taskId, function ( err, result ) {
        if ( err ) {
            logger.debug( '删除任务状态出现错误：', err );
            return callback( err );
        }
        return callback( err, result );
    } );
};
module.exports = taskQueue;
