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
        this.onlineOption = {
            url: settings.sendUrl
        }
        this.stagingOption = {
            url: 'http://staging-dev.meimiaoip.com/index.php/Spider/video/postVideos/'
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
                },15)
                // setInterval(()=>{
                //     this.emit('get_lists_staging')
                // },40)
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
        this.on( 'send_data', ( raw,time ) => {
            this.send( raw,time )
        })
        this.on( 'send_data_staging', ( raw,time ) => {
            this.send_staging( raw,time )
        })
        this.assembly()
    }
    deal () {
        this.cache_db.lpop( 'cache', ( err, result ) => {
            if ( err ) {
                logger.error( '获取缓存队列出现错误：', err );
                err = null
                return
            }
            if(!result){
                //logger.debug( '获取缓存队列为空,20毫秒后再次执行' )
                return
            }
            this.emit('send_data', JSON.parse(result),0)
            this.emit('send_data_staging', JSON.parse(result),0)
        } )
    }
    deal_staging () {
        this.cache_db.lpop( 'cache', ( err, result ) => {
            if ( err ) {
                logger.error( '获取缓存队列出现错误：', err.message );
                err = null
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
    send (media,time) {
        if(media.platform > 26 || media.platform == 21 || media.platform == 23){
            media = null
            return
        }
        this.onlineOption.form = media
        request.post(this.onlineOption, (err,res, result) => {
            if(err){
                logger.error( 'master occur error : ', err.message )
                logger.info(`返回平台${media.platform}视频 ${media.aid} 连接服务器失败`)
                //this.emailError('master',err)
                time++
                if(time > 3){
                    media = null
                    time = null
                }else{
                    this.emit('send_data', media,time)
                    err = null
                }
                return
            }
            if(res.statusCode != 200){
                logger.error(`errorCode: ${res.statusCode}`)
                logger.error(result)
                res = null
                result = null
                return
            }
            try{
                result = JSON.parse(result)
            }catch (e){
                //logger.error(`平台${media.platform}视频 ${media.aid} json数据解析失败`)
                logger.error(result)
                res = null
                result = null
                return
            }
            if(result.errno == 0){
                //logger.debug(`平台${media.platform}:`,media.aid + ' back end')
                //logger.info(result)
            }else{
                logger.error(`平台${media.platform}:`,media.aid + ' back error')
                logger.error(result)
                logger.error('media info: ',media)
            }
            media = null
            time = null
            res = null
            result = null
        })
    }
    send_staging (media,time) {
        //console.log('-----------------------------------staging----------------------------------------')
        this.stagingOption.form = media
        request.post(this.stagingOption, (err,res, result) => {
            //console.log('--------------------------staging-----------------------------')
            if(err){
                logger.error( 'staging occur error : ', err.message )
                logger.info(`返回平台${media.platform}视频 ${media.aid} 连接服务器失败`)
                //this.emailError('staging',err)
                time++
                if(time > 3){
                    media = null
                    time = null
                }else{
                    this.emit('send_data_staging', media,time)
                    err = null
                }
                return
            }
            if(res.statusCode != 200){
                logger.error(`errorCode: ${res.statusCode}`)
                // logger.error(result)
                // logger.error(media)
                res = null
                result = null
                return
            }
            try{
                result = JSON.parse(result)
            }catch (e){
                logger.error(`平台${media.platform}视频 ${media.aid} json数据解析失败`)
                logger.error(result)
                res = null
                result = null
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
            media = null
            time = null
            res = null
            result = null
        })
    }
    emailError( type, err ){
        const content = {
            subject: '发送数据连接服务器出错',
            content: `服务器${type},错误信息${JSON.stringify(err)}`
        }
        const options = {
            method : 'POST',
            url: 'http://monitor.iapi.site/email',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            form : JSON.stringify(content)
        }
        request( options, (err, res, body)=> {
            if(err){
                console.log(err)
                return
            }
            console.log(res.statusCode)
        })
    }
}
util.inherits( sendServer, events.EventEmitter )
module.exports = sendServer