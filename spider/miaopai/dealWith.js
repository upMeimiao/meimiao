/**
 * Created by junhao on 16/6/22.
 */
const async = require( 'async' )
const request = require( '../lib/req' )
let logger
class dealWith {
    constructor (spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    todo (task,callback) {
        task.total = 0
        async.series(
            {
                user: (callback) => {
                    this.getUser(task,(err)=>{
                        callback(null,"用户信息已返回")
                    })
                },
                media: (callback) => {
                    this.getTotal(task,(err)=>{
                        if(err){
                            return callback(err)
                        }
                        callback(null,"视频信息已返回")
                    })
                }
            },
            ( err, result ) => {
                if(err){
                    return callback(err)
                }
                logger.debug(task.id + "_result:",result)
                callback(null,task.total)
            }
        )
    }
    getUser (task,callback){
        let option = {
            url: this.settings.api + "1&per=20&suid=" + task.id
        }
        request.get(option,(err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback()
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('json数据解析失败')
                logger.info('json error:',result.body)
                return callback()
            }
            let userInfo = result.header,
                user = {
                    platform: 7,
                    bid: userInfo.suid,
                    fans_num: userInfo.eventCnt.fans
                }
            this.sendUser (user,(err,result)=>{
                callback()
            })
        })
    }
    sendUser (user,callback){
        let option = {
            url: this.settings.sendToServer[0],
            data: user
        }
        request.post(option,(err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                logger.info(`返回秒拍用户 ${user.bid} 连接服务器失败`)
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error(`秒拍用户 ${user.bid} json数据解析失败`)
                logger.info(result)
                return callback(e)
            }
            if(result.errno == 0){
                logger.debug("秒拍用户:",user.bid + ' back_end')
            }else{
                logger.error("秒拍用户:",user.bid + ' back_error')
                logger.info(result)
                logger.info(`user info: `,user)
            }
            callback()
        })
    }
    getTotal ( task, callback ) {
        let option = {
            url: this.settings.api + "1&per=20&suid=" +task.id
        }
        request.get( option, (err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('json数据解析失败')
                logger.info('desc error:',result.body)
                return callback(e)
            }
            let videos_count = result.total,page
            task.total = videos_count
            if(videos_count%20 == 0){
                page = videos_count/20
            }else{
                page = Math.floor(videos_count/20)+1
            }
            this.getVideos(task,page, () => {
                callback()
            })
        })
    }
    getVideos ( task, page, callback ) {
        let sign = 1,option
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                option = {
                    url: this.settings.api + sign + "&per=20&suid=" + task.id
                }
                request.get(option, (err,result) => {
                    if(err){
                        logger.error( 'occur error : ', err )
                        return cb()
                    }
                    try {
                        result = JSON.parse(result.body)
                    } catch (e){
                        logger.error('json数据解析失败')
                        logger.info(result.body)
                        return cb()
                    }
                    let videos = result.result
                    this.deal(task,videos, () => {
                        sign++
                        cb()
                    })
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    deal ( task, list, callback ) {
        let index = 0,
            length = list.length,
            video,data
        async.whilst(
            () => {
                return index < length
            },
            ( cb ) => {
                video = list[index]
                data = {
                    author: video.channel.ext.owner.nick,
                    platform: 7,
                    bid: task.id,
                    aid:video.channel.scid,
                    title:video.channel.ext.t != '' ? video.channel.ext.t : `未命名${video.channel.scid}`,
                    play_num: video.channel.stat.vcnt,
                    comment_num: video.channel.stat.ccnt,
                    support: video.channel.stat.lcnt,
                    forward_num: video.channel.stat.scnt,
                    a_create_time: Math.ceil(video.channel.ext.finishTime / 1000)
                }
                this.sendCache( data )
                index++
                cb()
            },
            ( err, result ) => {
                callback()
            }
        )
    }
    sendCache (media){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`秒拍 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith