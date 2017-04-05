/**
 * Created by yunsong on 16/7/29.
 */
const async = require( 'async' )
const request = require( '../../lib/request' )
const moment = require('moment')

let logger,api
class dealWith {
    constructor (spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('yidianDealWith instantiation ...')
    }
    yidian (task,callback) {
        task.total = 0
        async.parallel(
            {
                user: (callback) => {
                    this.getUser(task,(err,result)=>{
                        callback(err,result)
                    })
                },
                media: (callback) => {
                    this.getInterestId(task,(err,result)=>{
                        if(err){
                            return callback(err,result)
                        }
                        callback(err,result)
                    })
                }
            },
            ( err, result ) => {
                if(err){
                    return callback(err,result)
                }
                callback(err,result)
            }
        )
    }
    getUser (task,callback){
        let option = {
            url: api.yidian.userInfo + task.id,
            ua: 3,
            own_ua: "yidian/4.3.4.4 (iPhone; iOS 10.1.1; Scale/3.00)"
        }
        request.get( logger,option,(err,result) => {
            this.storaging.totalStorage ("yidian",option.url,"user")
            if(err){
                let errType
                if(err.code){
                    if(err.code == "ESOCKETTIMEDOUT" || "ETIMEDOUT"){
                        errType = "timeoutErr"
                    } else{
                        errType = "responseErr"
                    }
                } else{
                    errType = "responseErr"
                }
                this.storaging.errStoraging('yidian',option.url,task.id,err.code || "error",errType,"user")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('yidian',option.url,task.id,`一点资讯获取user接口状态码错误${result.statusCode}`,"statusErr","user")
                return callback(result.statusCode)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e){
                this.storaging.errStoraging('yidian',option.url,task.id,"一点资讯获取user接口json数据解析失败","doWithResErr","user")
                return callback(e)
            }
            if( result.status != 'success'){
                this.storaging.errStoraging('yidian',option.url,task.id,"一点资讯获取user接口返回信息状态码错误","statusErr","user")
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
            // user = {
            //     platform: 11,
            //     bid: task.id,
            //     fans_num: fans_num
            // }
            callback()
        })
    }
    getInterestId ( task, callback ) {
        const option = {
            url: `${api.yidian.list}&path=channel|news-list-for-channel&channel_id=${task.id}&cstart=0&cend=10`,
            referer: `http://www.yidianzixun.com/home?page=channel&id=${task.id}`,
            ua: 1
        }
        request.get( logger, option, (  err, result ) => {
            this.storaging.totalStorage ("yidian",option.url,"interestId")
            if(err){
                let errType
                if(err.code){
                    if(err.code == "ESOCKETTIMEDOUT" || "ETIMEDOUT"){
                        errType = "timeoutErr"
                    } else{
                        errType = "responseErr"
                    }
                } else{
                    errType = "responseErr"
                }
                this.storaging.errStoraging('yidian',option.url,task.id,err.code || "error",errType,"interestId")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('yidian',option.url,task.id,`一点资讯获取interestId接口状态码错误${result.statusCode}`,"statusErr","interestId")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse( result.body )
            } catch (e){
                this.storaging.errStoraging('yidian',option.url,task.id,"一点资讯获取interestId接口json数据解析失败","doWithResErr","interestId")
                return callback(e)
            }
            if( result.status != 'success' ){
                this.storaging.errStoraging('yidian',option.url,task.id,"一点资讯获取interestId接口返回信息状态码错误","statusErr","interestId")
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
                    option.url = `${api.yidian.list}&path=channel|news-list-for-vertical&interest_id=${task.interest_id}&channel_id=${task.id}&cstart=${cstart}&cend=${cend}`
                }else{
                    option.url = `${api.yidian.list}&path=channel|news-list-for-channel&channel_id=${task.id}&cstart=${cstart}&cend=${cend}`
                }
                option.referer = `http://www.yidianzixun.com/home?page=channel&id=${task.id}`
                request.get( logger, option, ( err, result ) => {
                    this.storaging.totalStorage ("yidian",option.url,"list")
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
                    this.deal( task, option.url, result.result ,( err, result ) => {
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
    deal ( task, url, list, callback ) {
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
                    platform: task.platform,
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
}
module.exports = dealWith