/**
 * Created by ifable on 16/9/8.
 */
const moment = require('moment')
const async = require( 'async' )
const fetchUrl = require("fetch").fetchUrl
const jsonp = function(data){
    return data
}

let logger
let request
class dealWith {
    constructor(spiderCore) {
        this.core = spiderCore
        this.settings = spiderCore.settings
        request = spiderCore.request
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    todo( task, callback ) {
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
    getUser ( task, callback ) {
        let option = {
            url: this.settings.userInfo + `?uids=${task.id}&_=${new Date().getTime()}`,
            ua: 1
        }
        request.get( logger, option, (err, result)=>{
            if(err){
                return callback(err)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('56粉丝json数据解析失败')
                logger.error(result)
                return callback(e)
            }
            //logger.debug(result)
            let userInfo = result.data,user
            if(userInfo.length === 0){
                logger.error('异常')
                return callback(true)
            }
            user = {
                platform: task.p,
                bid: task.id,
                fans_num: userInfo[0].fansCount
            }
            /*this.sendUser ( user,(err,result) => {
             callback()
             })*/

            this.sendStagingUser(user)
            callback()
        })
    }
    sendUser ( user,callback ){
        let option = {
            url: this.settings.sendToServer[0],
            data: user
        }
        //logger.debug(option)
        request.post( logger, option,(err,result) => {
            if(err){
                logger.debug('发送失败')
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error(`56用户 ${user.bid} json数据解析失败`)
                logger.info(result)
                return callback(e)
            }
            if(result.errno == 0){
                logger.debug("56用户:",user.bid + ' back_end')
            }else{
                logger.error("56用户:",user.bid + ' back_error')
                logger.info(result)
                logger.info(`user info: `,user)
            }
            callback()
        })
    }
    sendStagingUser (user){
        let option = {
            url: 'http://staging-dev.meimiaoip.com/index.php/Spider/Fans/postFans',
            data: user
        }
        request.post( logger, option,(err,result) => {
            if(err){
                return
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.info('send error:',result)
                return
            }
            if(result.errno == 0){
                logger.debug("用户:",user.bid + ' back_end')
            }else{
                logger.error("用户:",user.bid + ' back_error')
                logger.info(result)
            }
        })
    }
    getTotal ( task, callback ) {
        let page = 1,
            option = {
                url: this.settings.list + `${task.id}&_=${new Date().getTime()}`+'&pg='+page,
                ua: 1
            }
        //logger.debug(option.url)
        request.get( logger, option, (err, result) => {
            if(err){
                return callback(err)
            }
            try {
                result = eval(result.body)
            } catch (e) {
                logger.error('json数据解析失败')
                logger.info('total error:',result)
                return callback(e)
            }
            //logger.debug(result)
            let data = result.data,
                total = data.count
            task.total = total
            if(total % 20 != 0){
                page = Math.ceil(total / 20)
            }else{
                page = total / 20
            }
            //logger.debug(page)
            this.getVideos(task,page, () => {
                callback()
            })
        })
    }
    getVideos ( task, page, callback ) {
        let sign = 1,option = {}
        option.ua = 1
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                option.url = this.settings.list + `${task.id}&pg=${sign}&_=${new Date().getTime()}`
                request.get( logger, option, (err, result) => {
                    if(err){
                        return callback(err)
                    }
                    try {
                        result = eval(result.body)
                    } catch (e) {
                        logger.error('json数据解析失败')
                        logger.info('list error:',result)
                        return callback(e)
                    }
                    let data = result.data,
                        videos = data.list
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
                this.info( task, video, (err) => {
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    info ( task, video, callback ){
        async.parallel(
            [
                ( callback ) => {
                    this.getInfo( video.id, ( err, data ) =>{
                        if(err){
                            return callback(err)
                        }
                        callback(null,data)
                    })
                },
                ( callback ) => {
                    this.getComment( video.id, ( err, num ) => {
                        if(err){
                            return callback(err)
                        }
                        callback(null,num)
                    })
                }
            ], (err,result) => {
                if(err){
                    return callback(err)
                }
                let media = {
                    author: task.name,
                    platform: task.p,
                    bid: task.id,
                    aid: video.id,
                    title: video.title.substr(0,100).replace(/"/g,''),
                    desc: result[0].video_desc.substr(0,100).replace(/"/g,''),
                    play_num: result[0].play_count,
                    long_t:video.videoLength,
                    v_url: 'http://www.56.com/u74/v_' + video.vid56Encode + '.html',
                    v_img: video.smallCover,
                    class: result[0].first_cate_name,
                    tag: video.tag,
                    comment_num: result[1],
                    a_create_time: video.uploadTime.toString().substr(0,10)
                }
                //logger.debug(media)
                this.sendCache(media)
                callback()
            }
        )
    }
    getInfo ( id, callback ){
        let options = {
            headers: {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1"
            }
        }
        fetchUrl(this.settings.video + `${id}&_=${new Date().getTime()}`, options, (error, meta, body) => {
            if(error){
                logger.error( 'getInfo occur error : ', error )
                return callback(error)
            }
            if(meta.status != 200){
                logger.error(`getInfo请求状态有误: ${meta.status}`)
                return callback(true)
            }
            try {
                body = JSON.parse(body)
            } catch (e) {
                logger.error('json数据解析失败')
                logger.info('info error:',body)
                return callback(e)
            }
            //logger.debug(body)
            callback(null,body.data)
        })
    }
    getComment ( id, callback ){
        let option = {
            url: this.settings.comment + `${id}&_=${new Date().getTime()}`,
        }
        request.get( logger, option, (err, result) => {
            if(err){
                return callback(err)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('json数据解析失败')
                logger.info('comment error:',result)
                return callback(e)
            }
            callback(null,result.cmt_sum)
        })
    }
    sendCache ( media ){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`56视频 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith