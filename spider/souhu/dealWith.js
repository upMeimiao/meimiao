/**
 * Created by junhao on 16/6/21.
 */
const async = require( 'async' )
const request = require( '../lib/req' )
const jsonp = function (data) {
    return data
}
let logger
class dealWith {
    constructor ( spiderCore ) {
        this.core = spiderCore
        this.settings = spiderCore.settings
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    todo ( task, callback ) {
        task.total = 0
        async.series({
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
        }, ( err, result ) => {
            if ( err ) {
                return callback(err)
            }
            logger.debug("result:",result)
            callback(null,task.total)
        })
    }
    getUser ( task, callback) {
        let option ={
            url: this.settings.userInfo + this.settings.key + "&user_id=" + task.id + "&_=" + (new Date()).getTime()
        }
        request.get ( option,(err,result)=>{
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
            let userInfo = result.data,
                user = {
                    platform: 9,
                    bid: userInfo.user_id,
                    fans_num: userInfo.total_fans_count
                }
            this.sendUser (user,(err,result)=>{
                callback()
            })
            this.sendStagingUser(user)
        })
    }
    sendUser (user,callback){
        let option = {
            url: this.settings.sendToServer[0],
            data: user
        }
        request.post( option, (err,back) => {
            if(err){
                logger.error( 'occur error : ', err )
                logger.info(`返回搜狐视频用户 ${user.bid} 连接服务器失败`)
                return callback(err)
            }
            try{
                back = JSON.parse(back.body)
            }catch (e){
                logger.error(`搜狐视频用户 ${user.bid} json数据解析失败`)
                logger.info(back)
                return callback(e)
            }
            if(back.errno == 0){
                logger.debug("搜狐视频用户:",user.bid + ' back_end')
            }else{
                logger.error("搜狐视频用户:",user.bid + ' back_error')
                logger.info(back)
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
        request.post( option,(err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
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
        let option = {
            url: this.settings.videoList + 1 +"&user_id=" + task.id + "&api_key=" + this.settings.key
        }
        request.get(option, (err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.debug('getTotal:',result)
                return callback(e)
            }
            //logger.debug(back)
            let total  = result.data.count
            task.total = total
            this.getList(task,total, () => {
                callback()
            })
        })
    }
    getList ( task, total, callback ) {
        let index = 1, page, option
        if(total % 20 != 0){
            page = Math.ceil(total / 20)
        }else{
            page = total / 20
        }
        async.whilst(
            () => {
                return index <= page
            },
            (cb) => {
                option = {
                    url: this.settings.videoList + index +"&user_id=" + task.id + "&api_key=" + this.settings.key
                }
                request.get(option, (err,result) => {
                    if(err){
                        logger.error( 'occur error : ', err )
                        return cb()
                    }
                    if(result.statusCode != 200){
                        logger.error(`${index}状态码错误`)
                        logger.debug('code:',result.statusCode)
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    }catch (e){
                        logger.error('json数据解析失败')
                        logger.debug('list:',result)
                        return cb()
                    }
                    let data = result.data.videos
                    this.deal(task,data, () => {
                        index++
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
                video = {
                    aid: video.aid,
                    id: video.vid
                }
                this.info(task,video, (err) => {
                    if(err){
                        index++
                        return cb()
                    }
                    index++
                    cb()
                })
            },
            function (err,result) {
                callback()
            }
        )
    }
    info ( task, video, callback ) {
        async.series([
            (cb) => {
                this.getInfo(video, (err,data) => {
                    if(err){
                        cb(err)
                    }else {
                        cb(null,data)
                    }
                })
            },
            (cb) => {
                this.getDigg(video, (err,data) => {
                    if(err){
                        cb(err)
                    }else {
                        cb(null,data)
                    }
                })
            },
            (cb) => {
                this.getCommentNum(video,(err,num) => {
                    if(err){
                        cb(err)
                    }else {
                        cb(null,num)
                    }
                })
            }
        ],
        (err,result) => {
            //logger.debug(result)
            if(err){
                return callback(err)
            }
            let media = {
                author: result[0].director,
                platform: 9,
                bid: task.id,
                aid: video.id,
                title: result[0].title.substr(0,100),
                desc: result[0].desc.substr(0,100),
                play_num: result[0].play,
                comment_num: result[2],
                support:result[1].up,
                step:result[1].down,
                a_create_time: result[0].time
            }
            this.sendCache( media )
            callback()
        })
    }
    getInfo ( video, callback ) {
        let option = {
            url: this.settings.videoInfo + video.id + ".json?site=2&api_key=695fe827ffeb7d74260a813025970bd5&aid=" + video.aid
        }
        request.get( option, (err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            if(result.statusCode != 200){
                logger.error(`${video.id}状态码错误`)
                logger.debug('code:',result.statusCode)
                return callback(true)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.debug('info',result)
                return callback(e)
            }
            if(result.status != 200){
                logger.error(`${result.statusText},${result.request}`)
                return callback(result.status)
            }
            //logger.debug('debug info message:',result)
            let backData  = result.data
            let data = {
                director: backData.director,
                title: backData.video_name,
                desc: backData.video_desc,
                time: Math.round(backData.create_time / 1000),
                play: backData.play_count
            }
            callback(null,data)
        })
    }
    getDigg ( video, callback ) {
        let id = video.id,
            option = {
                url: this.settings.digg + id + "&_=" + (new Date()).getTime()
            }
        request.get(option, (err,back) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            if(back.statusCode != 200){
                logger.error(`${video.id} getDigg状态码错误`)
                logger.debug('code:',back.statusCode)
                return callback(true)
            }
            let backInfo = eval(back.body),
                data = {
                    up: backInfo.upCount,
                    down: backInfo.downCount
                }
            callback(null,data)
        })
    }
    getCommentNum ( video, callback ) {
        let option = {
            url: this.settings.comment + video.id
        }
        request.get( option, (err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
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
            logger.debug(`搜狐视频 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith