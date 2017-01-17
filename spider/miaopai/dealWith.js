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
            this.sendStagingUser(user)
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
                logger.debug("用户:",user.bid + ' back_end')
            }else{
                logger.error("用户:",user.bid + ' back_error')
                logger.info(result)
            }
        })
    }
    getTotal ( task, callback ) {
        let option = {
            url: this.settings.api + "1&per=20&suid=" +task.id
        }
        request.get( option, (err,result) => {
            if(err){
                if(task.id == 'mEpTsCBR3q2uyDUc'){
                    return callback()
                }
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            if(result.statusCode != 200){
                if(task.id == 'mEpTsCBR3q2uyDUc'){
                    return callback()
                }
                logger.error( 'http code error : ', result.statusCode )
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
                logger.debug(option.url)
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
                this.getInfo( video.channel.scid, (err, result) => {
                    data = {
                        author: video.channel.ext.owner.nick,
                        platform: 7,
                        bid: task.id,
                        aid:video.channel.scid,
                        title:video.channel.ext.ft ? video.channel.ext.ft.substr(0,100).replace(/"/g,'') : `btwk_caihongip`,
                        desc: video.channel.ext.t.substr(0,100).replace(/"/g,''),
                        play_num: video.channel.stat.vcnt,
                        comment_num: video.channel.stat.ccnt,
                        support: video.channel.stat.lcnt,
                        forward_num: video.channel.stat.scnt,
                        a_create_time: Math.ceil(video.channel.ext.finishTime / 1000)
                    }
                    if(!err){
                        data.v_img = result.v_img
                        data.long_t = result.long_t
                        data.class = result.class
                        data.tag = result.tag
                    }
                    // logger.debug(data.title+'标题')
                    // logger.debug(data.desc+'描述')
                    this.sendCache( data )
                    index++
                    cb()
                })
            },
            ( err, result ) => {
                callback()
            }
        )
    }
    getInfo( id, callback){
        let option = {
            url : "http://api.miaopai.com/m/v2_channel.json?fillType=259&scid="+id+"&vend=miaopai"
        }
        let dataJson = {}
        request.get( option, ( err, result ) => {
            if(err){
                logger.error('秒拍getInfo error')
                return callback(err)
            }
            if(result.statusCode != 200){
                logger.error(`秒拍getInfo code error: ${result.statusCode}`)
                return callback(true)
            }
            try{
                result = JSON.parse(result.body)
            } catch ( e ){
                logger.error(`秒拍getInfo json 解析: ${result.statusCode}`)
                return callback(e)
            }
            if(result.status != 200){
                logger.error(result)
                return callback(true)
            }
            dataJson.long_t = result.result.ext.length
            dataJson.v_img  = result.result.pic.base+result.result.pic.m
            dataJson.class  = this._class(result.result.category_info)
            dataJson.tag    = this._tag(result.result.topicinfo)
            callback(null,dataJson)
        })
    }
    _tag ( raw ){
        if(typeof raw == 'string'){
            return raw
        }
        if(Object.prototype.toString.call(raw) === '[object Array]'){
            return raw.join(',')
        }
        return ''
    }
    _class ( raw ){
        let _classArr = []
        if(!raw){
            return ''
        }
        if(Object.prototype.toString.call(raw) === '[object Array]' && raw.length != 0){
            for( let i in raw){
                _classArr.push(raw[i].categoryName)
            }
            return _classArr.join(',')
        }
        if(Object.prototype.toString.call(raw) === '[object Array]' && raw.length == 0){
            return ''
        }
        if(typeof raw == 'object'){
            return raw.categoryName
        }
        return ''
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