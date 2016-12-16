/**
 * Created by qingyu on 16/12/2.
 */
const async = require( 'async' )
const request = require( '../lib/req' )
const moment = require('moment')

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
        async.parallel(
            {
                user: (callback) => {
                    this.getUser(task,(err)=>{
                        callback(null,"用户信息已返回")
                    })
                },
                media: (callback) => {
                    this.getList(task,(err)=>{
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
            url: this.settings.userInfo + task.id+".html"
        }
        request.get(option,(err,result) => {
            if(err){
                return callback()
            }
            if( result.statusCode != 200){
                logger.error('获取粉丝code error：',result.statusCode)
                return callback()
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('json数据解析失败')
                logger.info('json error:',result.body)
                return callback()
            }
            let user = {
                platform: task.p,
                bid: task.id,
                fans_num: result.topicSet.subnum
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
        request.post(option,(err,back) => {
            if(err){
                logger.error('occur error:',err)
                logger.info(`返回网易用户 ${user.bid} 连接服务器失败`)
                return callback(err)
            }
            try{
                back = JSON.parse(back.body)
            }catch (e){
                logger.error(`网易用户 ${user.bid} json数据解析失败`)
                logger.info(back)
                return callback(e)
            }
            if(back.errno == 0){
                logger.debug("网易用户：",user.bid + ' back_end')
            }else{
                logger.error("网易用户：",user.bid + ' back_error')
                logger.info(back)
                logger.info(`user info: `,back)
            }
            callback()
        })
    }
    sendStagingUser (user){
        let option = {
            url: 'http://staging-dev.caihongip.com/index.php/Spider/Fans/postFans',
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
                logger.debug("网易用户:",user.bid + ' back_end')
            }else{
                logger.error("网易用户:",user.bid + ' back_error')
                logger.info(result)
            }
        })
    }
    getList ( task,count,callback ) {
        let sign=1 ,
            page=0,
            countNum=1
        async.whilst(
            () => {
                return sign
            },
            (cb) => {
               let option = {
                    url: this.settings.videoInfo + task.id+"/all/"+page+"-20.html"
                }
                request.get(option,(err,result) => {
                    if(err){
                        logger.error( 'occur error : ', err )
                        return cb()
                    }
                    if( result.statusCode != 200){
                        logger.error('获取videos code error：',result.statusCode)
                        return cb()
                    }
                    try {
                        result = JSON.parse(result.body)
                    } catch (e) {
                        logger.error('json解析失败')
                        logger.info(result)
                        return cb()
                    }
                    if(!result || result.length == 0){
                        logger.error('数据解析异常失败')
                        logger.error(result)
                        countNum++
                        return cb()
                    }
                    task.total+=result.tab_list.length
                    //logger.debug(+"总共视频记录"+task.total)
                    if(result.tab_list.length<19){
                        sign=0
                    }
                    page+=20
                    this.deal(task,result.tab_list, () => {
                        countNum++
                        cb()
                    })
                })
            },
            function (err,result) {
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
                this.getVideo(task,list[index],function (err) {
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getVideo(task ,data ,callback ) {
        let time,a_create_time,media
        if(data.videoinfo){
                 time = data.ptime,
                a_create_time = moment(time).format('X'),
                media = {
                    author: task.name,
                    platform: 25,
                    bid: task.id,
                    aid: data.videoID,
                    title: data.title.substr(0,100),
                    desc: data.digest.substr(0,100),
                    play_num: data.videoinfo.playCount,
                    comment_num: data.videoinfo.replyCount,
                    a_create_time: a_create_time,
                    v_img:data.imgsrc,
                    long_t:data.videoinfo.length,
                    class:data.TAGS
                }
        }else{
             time = data.ptime,
                a_create_time = moment(time).format('X'),
                media = {
                    author: data.videoTopic.tname,
                    platform: task.p,
                    bid: task.id,
                    aid: data.videoID,
                    title: data.title.substr(0,100),
                    desc: data.digest.substr(0,100),
                    //play_num: data.playCount,
                    comment_num: data.replyCount,
                    a_create_time: a_create_time,
                    v_img:data.imgsrc,
                    long_t:data.length,
                    class:data.TAGS
                }
        }
        this.sendCache( media )
        callback()
    }
    sendCache ( media ){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`网易视频 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith