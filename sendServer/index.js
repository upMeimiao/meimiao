const async = require( 'async' )
const myRedis = require( '../lib/myredis.js' )
const request = require('request')

let logger
class sendServer {
    constructor ( settings ) {
        this.settings = settings
        this.redis = settings.redis
        logger = settings.logger
        logger.trace('sendServer instantiation ...')
    }
    assembly () {
        myRedis.createClient(this.redis.host,
            this.redis.port,
            this.redis.cache_db,
            this.redis.auth,
            ( err, cli ) => {
                if(err){
                    logger.error( "连接redis数据库出错。错误信息：", err )
                    logger.error( "出现错误，程序终止。" )
                    process.exit()
                    return
                }
                this.cache_db = cli
                logger.debug( "缓存队列数据库连接建立...成功" )
                setInterval(()=>{
                    this.deal()
                })
            }
        )
    }
    start () {
        logger.trace('启动函数')
        this.assembly()
    }
    deal () {
        this.cache_db.lpop( 'cache', ( err, result ) => {
            if ( err ) {
                logger.error( '获取缓存队列出现错误：', err );
                return callback( err )
            }
            if(!result){
                //logger.debug( '获取缓存队列为空,20毫秒后再次执行' )
                return
            }
            this.send(JSON.parse(result))
        } )
    }
    send (media) {
        let option = {
            method : 'POST',
            url: this.settings.url,
            form: media
        }
        //logger.debug(option)
        request.post(option, (err,res, result) => {
            if(err){
                logger.error( 'occur error : ', err )
                logger.info(`返回平台${media.platform}视频 ${media.aid} 连接服务器失败`)
                return
            }
            if(res.statusCode != 200){
                logger.debug(`errorCode: ${res.statusCode}`)
                logger.info(result)
                return
            }
            try{
                result = JSON.parse(result)
            }catch (e){
                logger.error(`平台${media.platform}视频 ${media.aid} json数据解析失败`)
                logger.info(result)
                return
            }
            if(result.errno == 0){
                logger.debug(`平台${media.platform}:`,media.aid + ' back end')
            }else{
                logger.error(`平台${media.platform}:`,media.aid + ' back error')
                logger.info(result)
                logger.info('media info: ',media)
            }
        })
    }
}
module.exports = sendServer