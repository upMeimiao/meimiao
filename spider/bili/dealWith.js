/**
 * Created by ifable on 16/6/21.
 */
const moment = require('moment')
const async = require( 'async' )
const request = require( '../lib/req' )

let logger
class dealWith {
    constructor ( spiderCore ) {
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
                    this.getTotal( task, (err) => {
                        if(err){
                            return callback(err)
                        }
                        callback(null,'视频信息已返回')
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
        let option = {
            url: this.settings.userInfo,
            referer: `http://space.bilibili.com/${task.id}/`,
            data: {
                mid: task.id
            }
        }
        request.post (option,(err,result)=>{
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('json数据解析失败')
                logger.info('json error:',result.body)
                return callback(e)
            }
            let userInfo = result.data,
                user = {
                    platform: 8,
                    bid: userInfo.mid,
                    fans_num: userInfo.fans
                }
            this.sendUser( user,(err,result) => {
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
        request.post(option,(err,back) => {
            if(err){
                logger.error( 'occur error : ', err )
                logger.info(`返回哔哩哔哩用户 ${user.bid} 连接服务器失败`)
                return callback(err)
            }
            try{
                back = JSON.parse(back.body)
            }catch (e){
                logger.error(`哔哩哔哩用户 ${user.bid} json数据解析失败`)
                logger.info(back)
                return callback(e)
            }
            if(back.errno == 0){
                logger.debug("哔哩哔哩用户:",user.bid + ' back_end')
            }else{
                logger.error("哔哩哔哩用户:",user.bid + ' back_error')
                logger.info(back)
                logger.info('user info: ',user)
            }
            callback()
        })
    }
    sendStagingUser (user){
        let option = {
            url: 'http://staging-dev.meimiaoip.com/index.php/Spider/Fans/postFans',
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
                logger.debug("bili用户:",user.bid + ' back_end')
            }else{
                logger.error("bili用户:",user.bid + ' back_error')
                logger.info(result)
            }
        })
    }
    getTotal ( task, callback) {
        let option = {
            url: this.settings.mediaList + task.id + "&pagesize=30"
        }
        request.get(option, (err,result) => {
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
            task.total = result.data.count
            this.getVideos( task, result.data.pages, () => {
                callback()
            })
        })
    }
    getVideos ( task,pages,callback) {
        let option,sign = 1
        async.whilst(
            () => {
                return sign <= pages
            },
            (cb) => {
                option = {
                    url: this.settings.mediaList + task.id + "&page=" + sign + "&pagesize=30"
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
                        logger.info('list error:',result.body)
                        return cb()
                    }
                    if(!result.data){
                        logger.debug(result)
                        sign++
                        return cb()
                    }
                    if(!result.data.vlist || result.data.vlist == 'null'){
                        logger.debug(result)
                        sign++
                        return cb()
                    }
                    this.deal(task,result.data.vlist,() => {
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
    deal ( task,list,callback) {
        let index = 0,
            length = list.length
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                this.getInfo(task,list[index], (err) => {
                    if(err){
                        index++
                        return cb()
                    }
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getInfo ( task,video,callback ) {
        let option = {
            url: this.settings.media + video.aid
        }
        request.get(option, (err,back) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            try {
                back = JSON.parse(back.body)
            } catch (e){
                logger.error('json数据解析失败')
                logger.info('info error:',back.body)
                return callback(e)
            }
            if(back.code != 0){
                return callback()
            }
            let tagStr = ''
            if(back.data.tags && back.data.tags.length != 0){
                tagStr = back.data.tags.join(',')
            }
            let media = {
                author: back.data.owner.name,
                platform: 8,
                bid: task.id,
                aid: back.data.aid,
                title: back.data.title.substr(0,100).replace(/"/g,''),
                desc: back.data.desc.substr(0,100).replace(/"/g,''),
                play_num: back.data.stat.view,
                save_num: back.data.stat.favorite > 0 ? back.data.stat.favorite : null,
                comment_num: back.data.stat.reply,
                forward_num: back.data.stat.share,
                a_create_time: back.data.pubdate,
                long_t:this.long_t(video.length),
                v_img:video.pic,
                class:back.data.tname,
                tag:tagStr
            }
            if(!media.save_num){
                delete media.save_num
            }
            this.sendCache( media )
            callback()
        })
    }
    sendCache ( media ){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`哔哩哔哩 ${media.aid} 加入缓存队列`)
        } )
    }
    long_t( time ){
        let timeArr = time.split(':'),
            long_t  = ''
        if(timeArr.length == 2){
            long_t = moment.duration( `00:${time}`).asSeconds()
        }else if(timeArr.length == 3){
            long_t = moment.duration(time).asSeconds()
        }
        return long_t
    }
}
module.exports = dealWith