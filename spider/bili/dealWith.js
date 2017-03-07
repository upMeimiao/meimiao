/**
 * Created by ifable on 16/6/21.
 */
const moment = require('moment')
const async = require( 'async' )
const request = require( '../../lib/request' )
const spiderUtils = require('../../lib/spiderUtils')

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
            url: this.settings.spiderAPI.bili.userInfo,
            referer: `http://space.bilibili.com/${task.id}/`,
            data: {
                mid: task.id
            }
        }
        request.post (logger, option, (err, result)=>{
            if(err){
                logger.error( '用户信息 : ', err )
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
            url: this.settings.sendFans,
            data: user
        }
        request.post(logger, option, (err,back) => {
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
        request.post( logger, option, (err,result) => {
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
            url: this.settings.spiderAPI.bili.mediaList + task.id + "&pagesize=30"
        }
        request.get(logger, option, (err,result) => {
            if(err){
                logger.error( '获取视频总量 : ', err )
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
                return sign <= Math.min(pages, 334)
            },
            (cb) => {
                option = {
                    url: this.settings.spiderAPI.bili.mediaList + task.id + "&page=" + sign + "&pagesize=30"
                }
                request.get(logger, option, (err,result) => {
                    if(err){
                        logger.error( '视频列表 : ', err )
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
            url: this.settings.spiderAPI.bili.media + video.aid
        }
        request.get(logger, option, (err,back) => {
            if(err){
                logger.error( '单个视频详细信息 : ', err )
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
                title: spiderUtils.stringHandling(back.data.title,100),
                desc: spiderUtils.stringHandling(back.data.desc,100),
                play_num: back.data.stat.view,
                save_num: back.data.stat.favorite > 0 ? back.data.stat.favorite : null,
                comment_num: back.data.stat.reply,
                forward_num: back.data.stat.share,
                a_create_time: back.data.pubdate,
                long_t: spiderUtils.longTime(video.length),
                v_img:video.pic,
                class:back.data.tname,
                tag:tagStr
            }
            if(!media.save_num){
                delete media.save_num
            }
            spiderUtils.saveCache( this.core.cache_db, 'cache', media )
            callback()
        })
    }
    
}
module.exports = dealWith