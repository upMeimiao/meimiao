const async = require( 'async' )
const kue = require( 'kue' )
const request = require( 'request' )
const myRedis = require( '../lib/myredis.js' )

let logger
class server {
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
                this.deal()
            }
        )
    }
    start () {
        logger.trace('启动函数')
        this.assembly()
    }
    deal(){
        this.taskDB.scan (0 , 20,function (err,result) {
            console.log(result)
        })
    }
}
module.exports = server
