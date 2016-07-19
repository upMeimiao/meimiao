/**
 * spider core
 */
const async = require( 'async' )
const kue = require( 'kue' )
const schedule = require('node-schedule')
const request = require( 'request' )
const myRedis = require( '../lib/myredis.js' )
const test_data = require('../data.json')

let logger

class scheduler {
    constructor ( settings ) {
        'use strict'
        this.settings = settings
        this.redis = settings.redis
        logger = this.settings.logger
        logger.trace( '调度器初始化完成' )
    }
    assembly ( callback ) {
        async.parallel([
            (callback) => {
                myRedis.createClient(this.redis.host,
                    this.redis.port,
                    this.redis.userDB,
                    this.redis.auth,
                    ( err, cli ) => {
                        if(err){
                            return callback(err)
                        }
                        this.userDB = cli
                        logger.debug( "用户平台信息数据库连接建立...成功" )
                        callback()
                    }
                )
            },
            (callback) => {
                myRedis.createClient(this.redis.host,
                    this.redis.port,
                    this.redis.taskDB,
                    this.redis.auth,
                    ( err, cli ) => {
                        if(err){
                            return callback(err)
                        }
                        this.taskDB = cli
                        logger.debug( "任务信息数据库连接建立...成功" )
                        callback()
                    }
                )
            }
        ],(err, results) => {
            if ( err ) {
                logger.error( "连接redis数据库出错。错误信息：", err )
                logger.error( "出现错误，程序终止。" )
                process.exit()
                return
            }
            logger.debug( '创建数据库连接完毕' )
            callback()
        })
    }
    start () {
        logger.trace('启动函数')
        this.assembly( () => {
            let userRule = new schedule.RecurrenceRule(),
                jobRule = new schedule.RecurrenceRule()
            userRule.minute = 30
            userRule.second = 0
            jobRule.minute = 0
            jobRule.second = 0
            let data = test_data
            schedule.scheduleJob(jobRule, () => {
                this.deal(data)
                //this.getTask()
            })
            schedule.scheduleJob(userRule, () => {
                this.getUser()
            })
        })
    }
    getUser () {
        request.get(this.settings.url,function (err,res,body) {
            if(err){
                logger.error( 'occur error : ', err )
                return
            }
            if(res.statusCode !== 200){
                return
            }
            let result
            try {
                result = JSON.parse(body)
            } catch (e){
                logger.error('json数据解析失败')
                logger.info(body)
                return
            }
            this.saveUser(result, (err) => {

            })
        })
    }
    saveUser ( info, callback ) {
        let user
        async.whilst(
            () => {
                return info.length > 0
            },
            (cb) => {
                user = info.shift()
                this.userDB.set( user.id, JSON.stringify(user.data),( err, result ) => {
                    if(err){
                        logger.error('用户平台信息保存失败:',err)
                    }
                    logger.debug(user.id + " save end")
                    cb()
                })
            },
            ( err, result ) => {
                callback()
            }
        )
    }
    getTask () {

    }
    createQueue (raw,callback) {
        let queue = kue.createQueue( {
            redis : {
                port : this.redis.port ,
                host : this.redis.host ,
                auth : this.redis.auth ,
                db : this.redis.jobDB
            }
        } ),
            job = queue.create( raw.platform , {
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
        this.assembly( () => {
            let data = test_data
            this.saveUser(data,()=>{
                logger.debug('用户平台信息已保存到镜像库')
            })
            //this.deal(data)
        })
    }
}
module.exports = scheduler