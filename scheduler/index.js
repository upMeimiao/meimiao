/**
 * spider core
 */
const async = require( 'async' )
const kue = require( 'kue' )
const request = require( 'request' )
const myRedis = require( '../lib/myredis.js' )
const test_data = require('../data.json')

let logger
    
class scheduler {
    constructor ( settings ) {
        this.settings = settings
        this.redis = settings.redis
        logger = this.settings.logger
        this.queue = kue.createQueue( {
            redis : {
                port : this.redis.port ,
                host : this.redis.host ,
                auth : this.redis.auth ,
                db : this.redis.jobDB
            }
        } )
        logger.trace( '调度器初始化完成' )
    }
    assembly ( ) {
        async.parallel([
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
            // setInterval( () => {
            //     this.getTask()
            // }, 30000)
            setInterval( () => {
                this.deal(test_data)
            }, 30000)
        })
    }
    start () {
        logger.trace('启动函数')
        this.assembly()
    }
    getTask () {
        request.get(this.settings.url, (err,res,body) => {
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
            this.deal(result, (err) => {

            })
        })
    }
    createQueue (raw,callback) {
        let job
        this.checkKey( raw, ( err, result ) => {
            if(err){
                return callback(err)
            }
            if(result){
                job = this.queue.create( raw.platform , {
                    uid: raw.uid,
                    id: raw.id,
                    p: raw.p,
                    name: raw.name,
                    encodeId: raw.encodeId,
                    type: raw.type
                }).priority('critical').attempts(3).backoff(true).removeOnComplete(true)
                    .save(function (err) {
                        if(err){
                            logger.error( 'Create queue occur error' )
                            logger.info( 'error :' , err )
                        }
                        logger.debug("任务: " + job.type + "_" + job.data.id + " 创建完成")
                        callback()
                    })
            }else{
                callback()
            }
        })
    }
    deal ( raw, callback ) {
        let data = raw.data,
            len = data ? data.length : 0,
            i = 0, _,processed,platform
        //logger.debug(raw)
        async.whilst(
            () => {
                return i < len
            },
            (cb) => {
                _ = data[i]
                switch( _.p ){//Number(_.platform)
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
                    case 11:
                        platform = "yidian"
                        break
                    case 12:
                        platform = "tudou"
                        break
                    case 13:
                        platform = "baomihua"
                        break
                    case 14:
                        platform = "ku6"
                        break
                    case 15:
                        platform = "btime"
                        break
                    case 16:
                        platform = "weishi"
                        break
                    case 17:
                        platform = "xiaoying"
                        break
                    case 18:
                        platform = "budejie"
                        break
                    case 19:
                        platform = "neihan"
                        break
                    case 20:
                        platform = "yy"
                        break
                    default:
                        break
                }
                // processed = {
                //     uid: _.id,
                //     id: _.bid,
                //     p: _.platform,
                //     name: _.bname,
                //     platform: platform,
                //     encodeId: _.encodeId ? _.encodeId : '',
                //     type: _.type ? _.type : ''
                // }
                processed = {
                    uid: raw.id,
                    id: _.id,
                    p: _.p,
                    name: _.name,
                    platform: platform,
                    encodeId: _.encodeId ? _.encodeId : '',
                    type: _.type ? _.type : ''
                }
                //logger.debug(processed)
                this.createQueue(processed, (err) => {
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
    checkKey ( raw, callback ) {
        let key = raw.p + ':' + raw.id
        this.taskDB.hmget( key, 'id', ( err, result ) => {
            if(err){
                logger.debug(err)
                return callback(err)
            }
            if(result[0] === null){
                this.setKey( raw, () => {
                    return callback(null,true)
                })
            }else{
                this.checkTime( raw, ( err, result ) => {
                    if(err){
                        return callback(err)
                    }
                    if(result){
                        return callback(null,true)
                    }
                    return callback(null,false)
                })
            }
        })
    }
    setKey ( raw, callback ) {
        let key = raw.p + ':' + raw.id
        this.taskDB.hmset( key, 'id', raw.id, 'init', (new Date().getTime()),
            ( err, result ) => {
                if(err){
                    return callback(err)
                }
                if( result === 'OK' ){
                    return callback(null,true)
                }
                return callback(null,false)
            })
    }
    checkTime ( raw, callback ) {
        let key = raw.p + ':' + raw.id
        this.taskDB.hmget( key, 'update', 'init', ( err, result) => {
            if(err){
                return callback(err)
            }
            if(result[0] === null && (new Date().getTime()) - result[1] >= 300000){
                return callback(null,true)
            }
            if(result[0] !== null && (new Date().getTime()) - result[0] >= 3600000){
                return callback(null,true)
            }
            return callback(null,false)
        })
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