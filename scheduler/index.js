/**
 * spider core
 */
var async = require( 'async' )
var kue = require( 'kue' )
var request = require( 'request' )
var test_data = require('../data.json')

var logger

var scheduler = function ( settings ) {
    'use strict'
    this.settings = settings
    logger = this.settings.logger
    this.queue = kue.createQueue( {
        redis : {
            port : settings.port ,
            host : settings.host ,
            auth : settings.auth ,
            db : settings.db
        }
    } )
    logger.trace( '调度器初始化完成' )
}
scheduler.prototype.start = function () {
    logger.trace('start')
    this.getTask()
}
scheduler.prototype.getTask = function () {
    request.get(this.settings.url,function (err,res,body) {
        if(err){
            logger.error()
        }
    })
    
}
scheduler.prototype.wait = function () {
    logger.debug("开始等待下次执行时间")
    var self = this
    setTimeout(function () {
        self.test()
    },this.settings.interval)
}
scheduler.prototype.createQueue = function (raw,callback) {
    var job = this.queue.create( raw.type , {
        uid: raw.uid,
        id: raw.id,
        p: raw.p,
        name: raw.name,
        property: raw.property
    }).priority('critical').attempts(5).backoff(true).removeOnComplete(true).ttl(90000)
        .save(function (err) {
        if(err){
            logger.error( 'Create queue occur error' )
            logger.info( 'error :' , err )
        }
        callback()
    })
}
scheduler.prototype.deal = function ( raw, callback ) {
    var self = this
    var data = raw.data,
        len = data.length,
        i = 0
    async.whilst(
        function () {
            return i < len
        },
        function (cb) {
            var _ = data[i],processed,type
            switch( _.p ){
                case 1:
                    type = "youku"
                    break
                case 2:
                    type = "iqiyi"
                    break
                case 3:
                    type = "le"
                    break
                case 4:
                    type = "tencent"
                    break
                case 5:
                    type = "meipai"
                    break
                case 6:
                    type = "toutiao"
                    break
                case 7:
                    type = "miaopai"
                    break
                case 8:
                    type = "bili"
                    break
                case 9:
                    type = "souhu"
                    break
                case 10:
                    type = "kuaibao"
                    break
                default:
                    break
            }
            processed = {
                uid: raw.id,
                id: _.id,
                p: _.p,
                name: _.name,
                type: type,
                property: _.property ? _.property : ''
            }
            self.createQueue(processed,function () {
                i++
                cb()
            })
        },
        function () {
            if(callback){
                callback()
            }
            self.wait()
        }
    )
}
scheduler.prototype.test = function () {
    logger.trace('测试模式')
    var data = test_data
    logger.debug(data)
    this.deal(data)
}
module.exports = scheduler