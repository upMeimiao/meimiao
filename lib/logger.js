/**
 * logging, log4js based
 */
/**
 * 日志工厂
 * @param name 日志管理器的名称
 * @param instance  实例的名称
 * @param level 日志的级别（类型）
 * @returns {string} 日志字符串
 */
'use strict'

exports.getLogger = ( name , instance , level ) => {
    var log4js = require( 'log4js' )
    log4js.configure( {
            "appenders" : [
                {
                    "type" : "file" ,
                    "filename": "logs/"+name+"-"+process.pid+".log",
                    "maxLogSize": 80*1024*1024, // = 80Mb
                    "numBackups": 2, // keep two backup files
                    "compress": true, // compress the backups
                    "encoding": "utf-8"
                } ,
                {
                    "type": "stdout"
                }
            ]
        },
        { cwd : 'instance/' + instance }
    );
    let logger = log4js.getLogger( name )
    logger.setLevel( level )
    return logger
}