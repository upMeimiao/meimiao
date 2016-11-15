const async = require( 'async' )
const request = require('request')
const util = require( 'util' )
const events = require( 'events' )
const myRedis = require( '../lib/myredis.js' )

let logger
class sendServer {
    constructor ( settings ) {
        events.EventEmitter.call( this )
        this.settings = settings
        this.redis = settings.redis
        logger = settings.logger
        this.option = {
            url: settings.sendUrl
        }
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
                    this.emit('get_lists')
                },20)
                setInterval(()=>{
                    this.emit('get_lists_staging')
                },1000)
            }
        )
    }
    start () {
        logger.trace('启动函数')
        this.on( 'get_lists', () => {
            this.deal()
        })
        this.on( 'get_lists_staging', () => {
            this.deal_staging()
        })
        this.on( 'send_data', ( raw ) => {
            this.send( raw )
        })
        this.on( 'send_data_staging', ( raw ) => {
            this.send_staging( raw )
        })
        this.assembly()
    }
    deal () {
        this.cache_db.lpop( 'cache', ( err, result ) => {
            if ( err ) {
                logger.error( '获取缓存队列出现错误：', err );
                return
            }
            if(!result){
                //logger.debug( '获取缓存队列为空,20毫秒后再次执行' )
                return
            }
            this.emit('send_data', JSON.parse(result))
        } )
    }
    deal_staging () {
        this.cache_db.lpop( 'cache', ( err, result ) => {
            if ( err ) {
                logger.error( '获取缓存队列出现错误：', err );
                return
            }
            if(!result){
                //logger.debug( '获取缓存队列为空,20毫秒后再次执行' )
                return
            }
            this.emit('send_data', JSON.parse(result))
            this.emit('send_data_staging', JSON.parse(result))
        } )
    }
    send (media) {
        // const option = {
        //     url: this.settings.url,
        //     form: media
        // }
        this.option.form = media
        request.post(this.option, (err,res, result) => {
            if(err){
                logger.error( 'occur error : ', err )
                logger.info(`返回平台${media.platform}视频 ${media.aid} 连接服务器失败`)
                return
            }
            if(res.statusCode != 200){
                logger.error(`errorCode: ${res.statusCode}`)
                logger.error(result)
                return
            }
            try{
                result = JSON.parse(result)
            }catch (e){
                logger.error(`平台${media.platform}视频 ${media.aid} json数据解析失败`)
                logger.error(result)
                return
            }
            if(result.errno == 0){
                logger.debug(`平台${media.platform}:`,media.aid + ' back end')
                //logger.info(result)
            }else{
                logger.error(`平台${media.platform}:`,media.aid + ' back error')
                logger.error(result)
                logger.error('media info: ',media)
            }
        })
    }
    send_staging (media) {
        //console.log('-----------------------------------staging----------------------------------------')
        const option = {
            url: 'http://staging.caihongip.com/index.php/Spider/video/postVideos/',
            form: media
        }
        request.post(option, (err,res, result) => {
            //console.log('--------------------------staging-----------------------------')
            if(err){
                logger.error( 'occur error : ', err )
                logger.info(`返回平台${media.platform}视频 ${media.aid} 连接服务器失败`)
                return
            }
            if(res.statusCode != 200){
                logger.error(`errorCode: ${res.statusCode}`)
                // logger.error(result)
                // logger.error(media)
                return
            }
            try{
                result = JSON.parse(result)
            }catch (e){
                logger.error(`平台${media.platform}视频 ${media.aid} json数据解析失败`)
                logger.error(result)
                return
            }
            if(result.errno == 0){
                logger.debug(`平台${media.platform}:`,media.aid + ' back end')
                //logger.info(result)
            }else{
                logger.error(`平台${media.platform}:`,media.aid + ' back error')
                logger.error(result)
                logger.error('media info: ',media)
            }
        })
    }
}
util.inherits( sendServer, events.EventEmitter )
module.exports = sendServer