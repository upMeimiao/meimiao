/**
 * Created by junhao on 16/6/22.
 */
const moment = require('moment')
const async = require( 'async' )
const request = require( 'request' )
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
        task.total = 0
        async.parallel(
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
                },
                // program: (callback) => {
                //     this.core.getProgram.start(task, (err)=>{
                //         if(err){
                //             return callback(err)
                //         }
                //         callback(null,"专辑信息已返回")
                //     })
                // }
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
    getUser ( task, callback) {
        let options = {
            method: 'GET',
            url: this.settings.user + task.encodeId
        }
        request(options,(err,res,body)=>{
            if(err){
                logger.error( 'occur error : ', err )
                return callback()
            }
            body = eval(body)
            let userInfo = body.data,
                user = {
                    platform: 1,
                    bid: task.id,
                    fans_num: userInfo.sumCount
                }
            this.sendUser ( user,(err,result) => {
                callback()
            })
            this.sendStagingUser(user)
        })
    }
    sendUser ( user,callback ){
        let options = {
            method: 'POST',
            url: this.settings.sendToServer[0],
            form: user
        }
        request(options,(err,res,body) => {
            if(err){
                logger.error( 'occur error : ', err )
                logger.info(`返回优酷用户 ${user.bid} 连接服务器失败`)
                return callback(err)
            }
            try{
                body = JSON.parse(body)
            }catch (e){
                logger.error(`优酷用户 ${user.bid} json数据解析失败`)
                logger.info(body)
                return callback(e)
            }
            if(body.errno == 0){
                logger.debug("优酷用户:",user.bid + ' back_end')
            }else{
                logger.error("优酷用户:",user.bid + ' back_error')
                logger.info(body)
                logger.info(`user info: `,user)
            }
            callback()
        })
    }
    sendStagingUser (user){
        let options = {
            method: 'POST',
            url: 'http://staging-dev.meimiaoip.com/index.php/Spider/Fans/postFans',
            form: user
        }
        request( options,(err,res,body) => {
            if(err){
                logger.error( 'occur error : ', err )
                return
            }
            try{
                body = JSON.parse(body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.info('send error:',body)
                return
            }
            if(body.errno == 0){
                logger.debug("用户:",user.bid + ' back_end')
            }else{
                logger.error("用户:",user.bid + ' back_error')
                logger.info(body)
            }
        })
    }
    getTotal ( task, callback ) {
        let page,
            options = {
                method: 'GET',
                url: this.settings.list,
                qs: { caller: '1', pg: '1', pl: '20', uid: task.encodeId },
                headers: {
                    'user-agent': 'Youku;6.1.0;iOS;10.2;iPhone8,2'
                },
                timeout: 5000
            }
        request(options, (error, response, body) => {
            if(error){
                logger.error( 'occur error : ', error )
                return callback(error)
            }
            if(response.statusCode != 200){
                logger.error(`total error code: ${response.statusCode}`)
                return callback(response.statusCode)
            }
            try {
                body = JSON.parse(body)
            } catch (e) {
                logger.error('json数据解析失败')
                logger.info('total error:',body)
                return callback(e)
            }
            let data = body.data
            if(!data){
                logger.error('未知错误')
                logger.error(body)
                return callback(true)
            }
            let total = data.total
            task.total = total
            if(total % 50 != 0){
                page = Math.ceil(total / 50)
            }else{
                page = total / 50
            }
            this.getVideos(task,page, () => {
                callback()
            })
        })
    }
    getVideos ( task, page, callback ) {
        let sign = 1,options
        async.whilst(
            () => {
                return sign <= Math.min(page, 25)
            },
            (cb) => {
                options = {
                    method: 'GET',
                    url: this.settings.list,
                    qs: { caller: '1', pg: sign, pl: '50', uid: task.encodeId },
                    headers: {
                        'user-agent': 'Youku;6.1.0;iOS;10.2;iPhone8,2'
                    },
                    timeout: 5000
                }
                request(options, (error, response, body) => {
                    if(error){
                        logger.error( 'occur error : ', error )
                        return cb()
                    }
                    if(response.statusCode != 200){
                        logger.error(`list error code: ${response.statusCode}`)
                        return cb()
                    }
                    try{
                        body = JSON.parse(body)
                    }catch (e){
                        logger.error('json数据解析失败')
                        logger.info('list error:',body)
                        return cb()
                    }
                    let data = body.data
                    if(!data){
                        // logger.error('body data : ',sign)
                        // logger.error(body)
                        sign++
                        return cb()
                    }
                    let videos = data.videos
                    this.info(task,videos, () => {
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
    info ( task, list, callback ) {
        const idList = []
        for( let index in list){
            idList.push(list[index].videoid)
        }
        const ids = idList.join(',')
        const options = {
            method: 'GET',
            url: 'https://openapi.youku.com/v2/videos/show_batch.json',
            qs: {
                client_id:this.settings.app_key,
                video_ids:ids
            },
            timeout: 5000
        }
        request( options, ( error, response, body ) => {
            if(error){
                logger.error( 'info occur error: ', error )
                return callback(error)
            }
            if(response.statusCode != 200){
                logger.error(`info error code: ${response.statusCode}`)
                return callback(response.statusCode)
            }
            try{
                body = JSON.parse(body)
            } catch (e) {
                logger.error('info json数据解析失败')
                logger.info('info error:',body)
                return callback(e)
            }
            if(body.total == 0){
                return callback()
            }
            this.deal( task, body.videos, list, () => {
                callback()
            })
        })
    }
    deal ( task, videos, list, callback ){
        let index = 0,
            length = videos.length
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                const video = list[index]
                const result = videos[index]
                const media = {
                    author: task.name,
                    platform: 1,
                    bid: task.id,
                    aid: video.videoid,
                    title: video.title.substr(0,100).replace(/"/g,''),
                    desc: result.description.substr(0,100).replace(/"/g,''),
                    class: result.category,
                    tag: result.tags,
                    v_img: result.bigThumbnail,
                    long_t: Math.round(result.duration),
                    play_num: video.total_vv,
                    save_num: result.favorite_count,
                    comment_num: result.comment_count,
                    support: result.up_count,
                    step: result.down_count,
                    a_create_time: video.publishtime
                }
                //logger.debug(media)
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
            logger.debug(`优酷视频 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith