/**
 * Created by yunsong on 16/7/29.
 */
const async = require( 'async' )
const request = require( '../../lib/request' )
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
                    this.getInterestId(task,(err)=>{
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
            url: this.settings.userInfo + task.id,
            ua: 3,
            own_ua: "yidian/4.3.4.4 (iPhone; iOS 10.1.1; Scale/3.00)"
        }
        request.get( logger,option,(err,result) => {
            if(err){
                return callback(err)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e){
                return callback(e)
            }
            if( result.status != 'success'){
                return callback(true)
            }
            let fans_str = result.result.channels[task.id].replace('人订阅',''),
                fans_num,user
            if(fans_str.indexOf('万') != -1 ){
                fans_num = fans_str.replace('万','') * 10000
            }else if(fans_str.indexOf('亿') != -1 ){
                fans_num = fans_str.replace('亿','') * 100000000
            }else{
                fans_num = Number(fans_str)
            }
            if( isNaN(fans_num) ){
                return callback( true )
            }
            user = {
                platform: 11,
                bid: task.id,
                fans_num: fans_num
            }
            this.sendUser ( user,(err,result) => {
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
        request.post(logger,option,(err,back) => {
            if(err){
                return callback(err)
            }
            try{
                back = JSON.parse(back.body)
            }catch (e){
                logger.error(`一点资讯用户 ${user.bid} json数据解析失败`)
                logger.error(back)
                return callback(e)
            }
            if(back.errno == 0){
                logger.debug("一点资讯用户:",user.bid + ' back_end')
            }else{
                logger.error("一点资讯用户:",user.bid + ' back_error')
                logger.error(back)
                logger.error(`user info: `,user)
            }
            callback()
        })
    }
    sendStagingUser (user){
        let option = {
            url: 'http://staging-dev.meimiaoip.com/index.php/Spider/Fans/postFans',
            data: user
        }
        request.post( logger,option,(err,result) => {
            if(err){
                return
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.error('send error:',result)
                return
            }
            if(result.errno == 0){
                logger.debug("用户:",user.bid + ' back_end')
            }else{
                logger.error("用户:",user.bid + ' back_error')
                logger.error(result)
            }
        })
    }
    getInterestId ( task, callback ) {
        const option = {
            url: `${this.settings.list}&path=channel|news-list-for-channel&channel_id=${task.id}&cstart=0&cend=10`,
            referer: `http://www.yidianzixun.com/home?page=channel&id=${task.id}`,
            ua: 1
        }
        request.get( logger, option, (  err, result ) => {
            if(err){
                return callback(err)
            }
            try{
                result = JSON.parse( result.body )
            } catch (e){
                return callback(e)
            }
            if( result.status != 'success' ){
                return callback(result.status)
            }
            if( result.result.length == 0){
                return callback( true )
            }
            if(result.result[0].ctype == 'interest_navigation'){
                if( !result.result[0].columns || result.result[0].columns.length < 2){
                    return callback( true )
                }
                task.interest_id = result.result[0].columns[1].interest_id
                this.getList( task, 'video', ( err, result ) => {
                    return callback()
                })
            } else {
                this.getList( task, 'all', ( err, result ) => {
                    return callback()
                })
            }
        })
    }
    getList ( task, type, callback ){
        let sign = true, cstart = 0 ,cend = 50,
            option = {
                ua:1
            }
        async.whilst(
            () => {
                return sign
            },
            ( cb ) => {
                if(type == 'video'){
                    option.url = `${this.settings.list}&path=channel|news-list-for-vertical&interest_id=${task.interest_id}&channel_id=${task.id}&cstart=${cstart}&cend=${cend}`
                }else{
                    option.url = `${this.settings.list}&path=channel|news-list-for-channel&channel_id=${task.id}&cstart=${cstart}&cend=${cend}`
                }
                option.referer = `http://www.yidianzixun.com/home?page=channel&id=${task.id}`
                request.get( logger, option, ( err, result ) => {
                    if(err){
                        cstart = cstart + 50
                        cend = cend + 50
                        return cb()
                    }
                    try {
                        result = JSON.parse(result.body)
                    } catch ( e ) {
                        return cb()
                    }
                    if (!result.result) {
                        return cb()
                    }
                    if( result.result.length == 0 ){
                        sign = false
                        task.total = cstart
                        return cb()
                    }
                    if( result.code != 0 ){
                        return cb()
                    }
                    this.deal( task, result.result ,( err, result ) => {
                        cstart = cstart + 50
                        cend = cend + 50
                        cb()
                    })
                })
            },
            ( err, result ) => {
                callback()
            }
        )
    }
    deal ( task, list, callback ) {
        let index = 0, length = list.length,video,media
        async.whilst(
            () => {
                return index < length
            },
            ( cb ) => {
                video = list[index]
                if(video.ctype != 'video_live'){
                    index++
                    return cb()
                }
                media = {
                    author: task.name,
                    platform: task.p,
                    bid: task.id,
                    aid: video.itemid,
                    title: video.title ? video.title.substr(0,100).replace(/"/g,'') : 'btwk_caihongip',
                    desc: video.summary ? video.summary.substr(0,100).replace(/"/g,'') : '',
                    class: this._class(video),
                    tag: this._tag(video),
                    v_img: this._v_img(video),
                    long_t: video.duration ? Math.round(video.duration) : null,
                    save_num: video.like ? video.like : 0,
                    comment_num: video.comment_count ? video.comment_count : 0,
                    support: video.up ? video.up : 0,
                    step: video.down ? video.down: 0,
                    a_create_time: moment(video.date).unix()
                }
                if(!media.long_t){
                    delete media.long_t
                }
                if(!media.tag){
                    delete media.tag
                }
                if(!media.class){
                    delete media.class
                }
                if(!media.v_img){
                    delete media.v_img
                }
                this.sendCache( media )
                index++
                cb()
            },
            ( err, result ) => {
                callback()
            }
        )
    }
    _v_img ( raw ){
        if( !raw ){
            return null
        }
        if( raw.image ){
            return raw.image
        }
        if( raw.image_urls && raw.image_urls.length != 0 ){
            return raw.image_urls[0]
        }
        return null
    }
    _tag ( raw ){
        if( !raw ){
            return null
        }
        if( raw.keywords && raw.keywords.length != 0 ) {
            return raw.keywords.join(',')
        }
        return null
    }
    _class ( raw ){
        if( !raw ){
            return null
        }
        if( !raw.vsct ){
            return null
        }
        let vsctStr
        if( typeof raw.vsct == 'string' ){
            vsctStr = raw.vsct.replace(/\//g,',')
        }
        if( Object.prototype.toString.call(raw.vsct) === '[object Array]' && raw.length != 0 ){
            vsctStr = raw.vsct[0].replace(/vsct\/\//g,'').replace(/\//g,',')
        }
        return vsctStr
    }
    sendCache ( media ){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`一点资讯视频 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith