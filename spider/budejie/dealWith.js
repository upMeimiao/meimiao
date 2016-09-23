const async = require( 'async' )
const moment = require('moment')
const request = require( '../lib/req' )

let logger

class dealWith {
    constructor(spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    todo ( task, callback) {
        task.total = 0
        this.getUser( task, ( err, result ) => {
            if(err){
                return callback(err)
            }
            callback(null, task.total)
        })
    }
    getUser ( task, callback) {
        let option = {
            url : this.settings.userInfo + task.id
        }
        request.get( option, ( err, result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('json数据解析失败')
                logger.info(result)
                return callback(e)
            }
            let userInfo = result.data,
                user = {
                    platform: 18,
                    bid: userInfo.id,
                    fans_num: userInfo.fans_count
                }
            task.total = userInfo.tiezi_count
            async.series({
                user: (callback) => {
                    this.sendUser (user ,(err,result) => {
                        callback(null,'用户信息已找到')
                    })
                },
                media: (callback) => {
                    this.getList( task, userInfo.tiezi_count, (err) => {
                        if(err){
                            return callback(err)
                        }
                        callback(null,'视频信息已找到')
                    })
                }
            },(err,result) => {
                if(err){
                    return callback(err)
                }
                logger.debug('result : ',result)
                callback()
            })
        })
    }
    sendUser ( user,callback ){
        let option = {
            url: this.settings.sendToServer[0],
            data: user
        }
        request.post(option,(err,result) => {
            if(err){
                logger.error('occur error:',err)
                logger.info(`返回百思不得姐用户 ${user.bid} 连接服务器失败`)
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error(`百思不得姐用户 ${user.bid} json数据解析失败`)
                logger.info(result)
                return callback(e)
            }
            if(result.errno == 0){
                logger.debug("不得姐用户:",user.bid + ' back_end')
            }else{
                logger.error("不得姐用户:",user.bid + ' back_error')
                logger.info(result)
                logger.info(`user info: `,user)
            }
            callback()
        })
    }
    getList ( task, total, callback ) {
        let sign = 1,np = 0,
            page,
            option = {}
        if(total % 20 == 0 ){
            page = total / 20
        }else{
            page = Math.ceil(total / 20)
        }
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                logger.debug('开始获取第' + sign + '页视频列表')
                option.url = `${this.settings.medialist}${task.id}/1/desc/bs0315-iphone-4.3/${np}-20.json`
                request.get(option, (err,result) => {
                    if(err){
                        logger.error( 'occur error : ' + err )
                        sign++
                        return cb()
                    }
                    try {
                        result = JSON.parse(result.body)
                    } catch (e) {
                        logger.error('json数据解析失败')
                        logger.info(result)
                        sign++
                        return cb()
                    }
                    let data = result.list
                    np = result.info.np
                    this.deal( task, data, () => {
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
        let index = 0,video,media
        async.whilst(
            () => {
                return index < list.length
            },
            (cb) => {
                video = list[index]
                if(video.type != 'video') {
                    index++
                    return cb()
                }
                media = {
                    author: video.u.name,
                    platform: 18,
                    bid: task.id,
                    aid: video.id,
                    title: video.text,
                    desc: video.text,
                    play_num: video.video.playcount,
                    forward_num: video.forward,
                    comment_num: video.comment,
                    support: video.up,
                    step: video.down,
                    a_create_time: moment(video.passtime).unix()
                }
                this.sendCache( media )
                index++
                cb()
            },
            (err,result) => {
                callback()
            }
        )
    }
    sendCache ( media ){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`百思不得姐 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith