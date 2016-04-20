var async = require( 'async' );
var myRedis = require( './myredis.js' );

var logger;
var settings;

var redis = function ( spiderCore ) {
    'use strict';

    this.spiderCore = spiderCore;
    settings = spiderCore.settings;

    logger = settings.logger;

    logger.debug('redis模块 实例化...');
};

redis.prototype.assembly = function ( callback ) {
    'use strict';

    var self = this;

    var dbType = 'redis';
    var pwd = settings.redis.pwd;

    var drillerInfo = settings.driller_info_redis_db ? settings.driller_info_redis_db : null;
    var taskInfo = settings.task_info_redis_db ? settings.task_info_redis_db : null;
    var taskInfoCache = settings.task_cache_redis_db ? settings.task_cache_redis_db : null;

    async.series( [ function ( cb ) {
        if ( drillerInfo ) {
            myRedis.createClient( drillerInfo[ 0 ],
                drillerInfo[ 1 ],
                drillerInfo[ 2 ],
                dbType,
                pwd,
                function ( err, cli ) {
                    if ( err ) {
                        logger.debug( 'drillerInfo 连接出现错误' );
                        return cb( err );
                    }
                    self.drillerInfo = cli;
                    return cb( err );
                } );
        } else {
            return cb( 'drillerInfo is null' );
        }
    }, function ( cb ) {
        if ( taskInfo ) {
            myRedis.createClient( taskInfo[ 0 ], taskInfo[ 1 ], taskInfo[ 2 ], dbType, pwd, function ( err, cli ) {
                if ( err ) {
                    logger.error( 'taskInfo 连接出现错误' );
                    return cb( err );
                }
                self.taskInfo = cli;
                return cb( err );
            } );
        } else {
            return cb( 'taskInfo is null' );
        }
    }, function ( cb ) {
        if ( taskInfoCache ) {
            myRedis.createClient( taskInfoCache[ 0 ],
                taskInfoCache[ 1 ],
                taskInfoCache[ 2 ],
                dbType,
                pwd,
                function ( err, cli ) {
                    if ( err ) {
                        logger.error( 'taskInfoCaceh 连接出现错误' );
                        return cb( err );
                    }
                    self.taskInfoCache = cli;
                    return cb( err );
                } );
        } else {
            return cb( 'taskInfoCache is null' );
        }
    } ], function ( err ) {
        if(err){
            throw err;
        }
        callback(null,true);
    } );
};

module.exports = redis;
