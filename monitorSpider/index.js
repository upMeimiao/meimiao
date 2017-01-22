/**
 * Spider Core
 * Created by junhao on 16/6/22.
 */
const kue = require( 'kue' )
const request = require('request')
const myRedis = require( '../lib/myredis.js' )
const async = require( 'async' )
const domain = require('domain')
var schedule = require('node-schedule');

let logger,settings
class spiderCore {
    constructor (_settings) {
        settings = _settings
        this.settings = settings
        this.redis = settings.redis
        // this.dealWith = new( require('./dealWith'))(this)
        this.youkuDeal = new (require('./youkuDealWith'))(this)
        this.iqiyiDeal = new (require('./iqiyiDealWith'))(this)
        logger = settings.logger
        logger.trace('spiderCore instantiation ...')
    }
    assembly ( ) {
        //并行，最后传值按task顺序,连接数据库
        async.parallel([
            (callback) => {
                myRedis.createClient(this.redis.host,
                    this.redis.port,
                    this.redis.MSDB,
                    this.redis.auth,
                    ( err, cli ) => {
                        if(err){
                            return callback(err)
                        }
                        this.MSDB = cli
                        //用于存接口返回的正确数据
                        //下一次调用接口后，返回值与已经存储的返回值作比较，正常则存储新的，不正常则报错误
                        //
                        logger.debug( "接口监控数据库连接建立...成功" )
                        callback()
                    }
                )
            },
            (callback) => {
                myRedis.createClient(this.redis.host,
                    this.redis.port,
                    this.redis.errDb,
                    this.redis.auth,
                    ( err, cli ) => {
                        if(err){
                            return callback(err)
                        }
                        this.errDb = cli
                        //用于存储接口错误
                        logger.debug( "错误存储数据库连接建立...成功" )
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
            //this.setYoukuTask(1)
            this.setTask()
        })
    }
    start () {
        logger.trace('启动函数')
        this.assembly()
        
    }
    setTask () {
        logger.trace('启动函数')
        async.parallel(
            {
                youku:() => {
                    this.scheduleTask(1,(err)=>{
                        logger.debug(err)
                    })
                },
                aiqiyi:() => {
                    this.scheduleTask(2,(err)=>{
                        logger.debug(err)
                    })
                }
            },
            ( err, result ) => {
                logger.debug(err,result)
            }
        )
    }
    scheduleTask (platform) {
        const rule = new schedule.RecurrenceRule();
        switch(platform) {
            case 1:
                rule.second = [10,20,30,40,50]
                break
            case 2:
                rule.second = [5,15,25,35,45,55]
                break
            default:
                rule.second = [0,5,10,15,20,25,30,35,40,45,50,55]
        }
        const YOUKU = schedule.scheduleJob(rule, () =>{
            this.youku()
        })
        const IQIYI = schedule.scheduleJob(rule, () =>{
            this.iqiyi()
        })
    }
    youku() {
        let work = {
            "name":"youku","platform":1,"id":854459409,"bname":"一色神技能","encodeId":"UMzQxNzgzNzYzNg=="
        }
        this.youkuDeal.youku(work,(err,result) => {
            logger.debug(err,result)
        })
    }
    iqiyi() {
        let work = {
            "name":"iqiyi","platform":2,"id":1036522467,"bname":"笑实验阿拉苏"
        }
        this.iqiyiDeal.iqiyi(work,(err,result) => {
            logger.debug(err,result)
        })
    }
}
module.exports = spiderCore