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
        let option = {
            url: 'http://staging.caihongip.com/index.php/Spider/Fans/postFans',
            data: user
        }
        request.post( option,(err,res,body) => {
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
                    'user-agent': 'Youku;5.8;iPhone OS;9.3.5;iPhone8,2'
                }
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
        let sign = 1,options
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                options = {
                    method: 'GET',
                    url: this.settings.list,
                    qs: { caller: '1', pg: sign, pl: '20', uid: task.encodeId },
                    headers: {
                        'user-agent': 'Youku;5.8;iPhone OS;9.3.5;iPhone8,2'
                    }
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
                        logger.error('body data : ',sign)
                        logger.error(body)
                        sign++
                        return cb()
                    }
                    let videos = data.videos
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
        let options = {
            method: 'GET',
            url: this.settings.newInfo,
            qs: {
                client_id:this.settings.app_key,
                video_id:video.videoid
            }
            // qs: { area_code: '1',
            //     guid: '7066707c5bdc38af1621eaf94a6fe779',
            //     id: video.videoid,
            //     pid: '69b81504767483cf',
            //     scale: '3',
            //     ver: '5.8'
            // },
            // headers: {
            //     'user-agent': 'Youku;5.8;iPhone OS;9.3.5;iPhone8,2'
            // }
        }
        request(options, (error, response, body) => {
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
            let result  = body
            let data = {
                author: task.name,
                platform: 1,
                bid: task.id,
                aid: video.videoid,
                title: video.title.substr(0,100),
                desc: result.description.substr(0,100),
                play_num: video.total_vv,
                save_num: result.favorite_count,
                comment_num: result.comment_count,
                support: result.up_count,
                step: result.down_count,
                a_create_time: video.publishtime
            }
            logger.debug(data)
            this.sendCache( data )
            callback()
        })
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