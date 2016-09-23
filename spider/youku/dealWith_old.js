/**
 * Created by junhao on 16/6/22.
 */
const moment = require('moment')
const async = require( 'async' )
const request = require( '../lib/req' )
const jsonp = function (data) {
    return data
}
let logger

class dealWith {
    constructor(spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    todo ( task, callback) {
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
                callback()
            }
        )
    }
    getUser ( task, callback) {
        let option = {
            url : this.settings.user + task.encodeId
        }
        request.get (option,(err,result)=>{
            if(err){
                logger.error( 'occur error : ', err )
                return callback()
            }
            result = eval(result.body)
            let userInfo = result.data,
                user = {
                    name: "优酷",
                    uid: task.id,
                    u_name: task.name,
                    fans_num: userInfo.sumCount
                }
            this.sendUser ( user,(err,result) => {
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
                logger.error( 'occur error : ', err )
                logger.info(`返回优酷用户 ${user.uid} 连接服务器失败`)
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error(`优酷用户 ${user.uid} json数据解析失败`)
                logger.info(result)
                return callback(e)
            }
            if(result.errno == 0){
                logger.debug("优酷用户:",user.uid + ' back_end')
            }else{
                logger.error("优酷用户:",user.uid + ' back_error')
                logger.info(result)
                logger.info(`user info: `,user)
            }
            callback()
        })
    }
    getTotal ( task, callback ) {
        let page,
            option = {
                url: this.settings.videos + "?client_id=" + this.settings.app_key + "&user_id=" + task.id
            }
        request.get(option, (err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            logger.debug('105 : ',result)
            let backData = JSON.parse(result.body),
                total = backData.total
            if(total % 20 != 0){
                page = Math.ceil(total / 20)
            }else{
                page = total / 20
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
                    url: this.settings.videos + "?client_id=" + this.settings.app_key + "&user_id=" + task.id + "&page=" + sign + "&count=20"
                }
                request.get(option, (err,result) => {
                    if(err){
                        logger.error( 'occur error : ', err )
                        return cb()
                    }
                    logger.debug('133 : ',result)
                    try{
                        result = JSON.parse(result.body)
                    }catch (e){
                        logger.error('json数据解析失败')
                        logger.info('desc error:',result.body)
                        return cb()
                    }
                    let videos = result.videos
                    if(!videos){
                        return cb()
                    }
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
            length = list.length
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                let video = list[index]
                this.getInfo( task, video, (err) => {
                    if(err){
                        cb()
                    }else{
                        index++
                        cb()
                    }
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getInfo ( task, video, callback ){
        let option = {
            url: `${this.settings.info}${new Date().getTime()}&vid=${video.id}`,
            referer: `http://v.youku.com/v_show/id_${video.id}.html?beta&`
        }
        request.get( option, ( err, result ) => {
            if(err){
                logger.error( 'occur error 184 : ', err )
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('190 json数据解析失败')
                logger.info('desc error:',result.body)
                return callback(e)
            }
            let data = {
                author: task.name,
                platform: 1,
                bid: task.id,
                aid: video.id,
                title: video.title,
                desc: video.desc,
                play_num: result.data.stat.vv.replace(/,/g,''),
                save_num: video.favorite_count,
                comment_num: video.comment_count,
                support: video.up_count,
                step: video.down_count,
                a_create_time: moment(video.published).unix()
            }
            this.sendCache( data )
            callback()
        } )
    }
    sendCache ( media ){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`优酷视频 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith