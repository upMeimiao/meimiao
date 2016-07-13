/**
 * spider core
 */
const async = require( 'async' )
const kue = require( 'kue' )
const schedule = require('node-schedule')
const request = require( 'request' )
const test_data = require('../data.json')

let logger

class scheduler {
    constructor ( settings ) {
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
    start () {
        let rule = new schedule.RecurrenceRule()
        rule.minute = 0
        rule.second = 0
        let data = test_data
        schedule.scheduleJob(rule, () => {
            this.deal(data)
            //this.getTask()
        })
    }
    getTask () {
        request.get(this.settings.url,function (err,res,body) {
            if(err){
                logger.error()
            }
        })
    }
    createQueue (raw,callback) {
        let job = this.queue.create( raw.platform , {
            uid: raw.uid,
            id: raw.id,
            p: raw.p,
            name: raw.name,
            encodeId: raw.encodeId,
            type: raw.type
        }).priority('critical').attempts(5).backoff(true).removeOnComplete(true).ttl(90000)
            .save(function (err) {
                if(err){
                    logger.error( 'Create queue occur error' )
                    logger.info( 'error :' , err )
                }
                logger.debug("任务: " + job.type + "_" + job.data.id + " 创建完成")
                callback()
            })
    }
    deal ( raw, callback ) {
        let data = raw.data,
            len = data.length,
            i = 0
        async.whilst(
            () => {
                return i < len
            },
            (cb) => {
                var _ = data[i],processed,platform
                switch( _.p ){
                    case 1:
                        platform = "youku"
                        break
                    case 2:
                        platform = "iqiyi"
                        break
                    case 3:
                        platform = "le"
                        break
                    case 4:
                        platform = "tencent"
                        break
                    case 5:
                        platform = "meipai"
                        break
                    case 6:
                        platform = "toutiao"
                        break
                    case 7:
                        platform = "miaopai"
                        break
                    case 8:
                        platform = "bili"
                        break
                    case 9:
                        platform = "souhu"
                        break
                    case 10:
                        platform = "kuaibao"
                        break
                    default:
                        break
                }
                processed = {
                    uid: raw.id,
                    id: _.id,
                    p: _.p,
                    name: _.name,
                    platform: platform,
                    encodeId: _.encodeId ? _.encodeId : '',
                    type: _.type ? _.type : ''
                }
                this.createQueue(processed, () => {
                    i++
                    cb()
                })
            },
            () => {
                if(callback){
                    callback()
                }
                logger.debug("开始等待下次执行时间")
            }
        )
    }
    test () {
        logger.trace('测试模式')
        let data = test_data
        this.deal(data)
    }
}
module.exports = scheduler