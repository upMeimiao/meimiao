/**
 * Created by ifable on 16/9/2.
 */
const async = require( 'async' )
const kue = require( 'kue' )
const request = require( 'request' )
const myRedis = require( '../lib/myredis.js' )

let logger

class scheduler {
    constructor(settings) {
        this.settings = settings
        this.redis = settings.redis
        logger = this.settings.logger
        this.queue = kue.createQueue({
            redis: {
                port: this.redis.port,
                host: this.redis.host,
                auth: this.redis.auth,
                db: this.redis.jobDB
            }
        })
        logger.trace('调度器初始化完成')
    }
    assembly () {
        myRedis.createClient(this.redis.host,
            this.redis.port,
            this.redis.taskDB,
            this.redis.auth,
            ( err, cli ) => {
                if(err){
                    logger.error( "连接redis数据库出错。错误信息：", err )
                    logger.error( "出现错误，程序终止。" )
                    process.exit()
                    return
                }
                this.taskDB = cli
                logger.debug( "任务信息数据库连接建立...成功" )
                setInterval( () => {
                    this.getTask()
                }, 5000)
            }
        )
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
                logger.error('code error:', res.statusCode)
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
            logger.debug(body)
            this.deal_online(result)
        })
    }
    createQueue (raw,callback) {
        let job
        this.checkKey( raw, ( err, result ) => {
            if(err){
                logger.error(err)
                return callback(err)
            }
            logger.debug(raw)
            if(result){
                job = this.queue.create( raw.platform , {
                    uid: raw.uid,
                    id: raw.id,
                    p: raw.p,
                    name: raw.name,
                    encodeId: raw.encodeId,
                    type: raw.type
                }).priority('critical').attempts(3).backoff({delay: 30*1000, type:'fixed'}).removeOnComplete(true)
                if( result.videoNumber >= 0 && result.videoNumber < 2500){
                    job.ttl( Math.ceil(result.videoNumber / 500) * 210000 )
                }
                if( result.videoNumber >= 2500 && result.videoNumber < 4000){
                    job.attempts(2).ttl( Math.ceil(result.videoNumber / 500) * 210000 )
                }
                if( result.videoNumber >= 4000 && result.videoNumber < 5000){
                    job.attempts(1).ttl( Math.ceil(result.videoNumber / 500) * 210000 )
                }
                job.save(function (err) {
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
    checkKey ( raw, callback ) {
        let key = raw.p + ':' + raw.id,
            time = new Date().getTime()
        this.taskDB.hmget( key, 'id', 'video_number', ( err, result ) => {
            if(err){
                logger.debug(err)
                return callback(err)
            }
            if(result[0] === null){
                this.taskDB.hmset( key, 'id', raw.id, 'bname',raw.name, 'init', time, 'create', time, 'video_number', 0)
                return callback(null,{videoNumber: 0})
            }
            if(result[1] === null){
                this.taskDB.hmset( key, 'create', time ,'bname',raw.name)
                return callback(null,{videoNumber: 0})
            }
            if(result[1] >= 0){
                this.taskDB.hmset( key, 'create', time,'bname',raw.name)
                return callback(null,{videoNumber: result[1]})
            }
        })
    }
    deal_online ( raw ) {
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
                switch( Number(_.platform) ){
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
                    case 21:
                        platform = "tv56"
                        break
                    case 22:
                        platform = "acfun"
                        break
                    default:
                        break
                }
                processed = {
                    uid: _.id,
                    id: _.bid,
                    p: _.platform,
                    name: _.bname,
                    platform: platform,
                    encodeId: _.encodeId ? _.encodeId : '',
                    type: _.type ? _.type : ''
                }
                if(Number(_.platform) > 20){
                    i++
                    return cb()
                }
                logger.debug(processed)
                this.createQueue(processed, (err) => {
                    i++
                    cb()
                })
            },
            () => {
                //logger.debug("online 开始等待下次执行时间")
            }
        )
    }
}

module.exports = scheduler