/**
 * Created by junhao on 16/6/20.
 */
const async = require( 'async' )
const storaging = require('./storaging')
const request = require( '../lib/req' )
let logger,api
const jsonp = function (data) {
    return data
}
const devArr = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z']
class kuaibaoDealWith {
    constructor ( spiderCore ){
        this.core = spiderCore
        this.settings = spiderCore.settings
        api = this.settings.spiderAPI
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    kuaibao ( task, callback ) {
        task.total = 0
        task.devId = this.getDevId()
        async.parallel({
            user: (callback) => {
                this.getUser(task,(err,result)=>{
                    callback(err,result)
                })
            },
            media: (callback) => {
                this.getVideos(task,(err,result)=>{
                    callback(err,result)
                })
            }
        }, ( err, result ) => {
            if ( err ) {
                return callback(err)
            }
            callback(err,result)
        })
    }
    getDevId() {
        let devId = ''
        for(let i=0; i < 32; i++){
            if(i < 7){
                devId += devArr[Math.floor(Math.random()*10)]
            }else{
                devId += devArr[Math.floor(Math.random()*36)]
            }
            if(i == 7 || i == 11 || i == 15 || i== 19){
                devId += '-'
            }
        }
        return devId
    }
    getUser ( task, callback) {
        let option = {
            url: api.kuaibao.user + task.id
        }
        request.get ( option, ( err, result )=>{
            // if(err){
            //     return callback()
            // }
            // if( result.statusCode != 200){
            //     logger.error('获取粉丝code error：',result.statusCode)
            //     return callback()
            // }
            storaging.judgeRes (this.core,"kuaibao",option.url,task.id,err,result,callback,"user")
            if(!result){
                return
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('json数据解析失败')
                storaging.errStoraging(this.core,'kuaibao',option.url,task.id,"快报获取粉丝json数据解析失败","doWithResErr","user")
                return callback(e)
            }
            let userInfo = result.channelInfo
            if(!userInfo){
                logger.error('userInfo异常错误')
                storaging.errStoraging(this.core,'kuaibao',option.url,task.id,"快报获取粉丝userInfo异常错误","doWithResErr","user")
                logger.error(result)
                return callback()
            }
            // let user = {
            //     platform: 10,
            //     bid: task.id,
            //     fans_num: userInfo.subCount
            // }
            storaging.succStorage(this.core,"kuaibao",option.url,"user")
        })
    }
    getVideos ( task, callback ) {
        let option = {
            url: api.kuaibao.video,
            referer:'http://r.cnews.qq.com/inews/iphone/',
            data: {
                chlid: task.id,
                is_video: 1
            }
        }
        request.post( option,  (err,result) => {
            // if(err){
            //     logger.error( 'occur error : ', err )
            //     return callback(err)
            // }
            // if(result.statusCode != 200){
            //     return callback(result.statusCode)
            // }
            storaging.judgeRes (this.core,"kuaibao",option.url,task.id,err,result,callback,"videos")
            if(!result){
                return 
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                storaging.errStoraging(this.core,'kuaibao',option.url,task.id,"快报获取videos接口json数据解析失败","doWithResErr","videos")
                return callback(e)
            }
            task.total = result.ids.length
            storaging.succStorage(this.core,"kuaibao",option.url,"videos")

            this.deal(task,result.ids, () => {
                callback()
            })
        })
    }
    deal ( task, list, callback ) {
        let index = 0,
            length = list.length
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                this.getInfo(task,list[index].id,(err) => {
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
    getInfo ( task, id, callback ) {
        let option = {
            referer:'http://r.cnews.qq.com/inews/iphone/',
            url: api.kuaibao.list,
            data: {
                ids: id
            }
        }
        request.post( option, (err,result) => {
            storaging.judgeRes (this.core,"kuaibao",option.url,task.id,err,result,callback,"info")
            // // if(err){
            // //     logger.error( 'occur error : ', err )
            // //     return callback(err)
            // // }
            if(!result){
                return 
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                storaging.errStoraging(this.core,'kuaibao',option.url,task.id,"快报获取info接口json数据解析失败","doWithResErr","info")
                return callback(e)
            }
            //logger.debug(result)
            if(result.newslist.length == 0){return callback()}
            let backData = result.newslist[0],
                info = {
                    id: backData.id,
                    author:backData.chlname,
                    type: backData.articletype,
                    commentId: backData.commentid,
                    title: backData.title,
                    time: backData.timestamp,
                    vid: backData.video_channel.video.vid
                }
            storaging.succStorage(this.core,"kuaibao",option.url,"info")

            this.getDetail(task,info, (err) => {
                if(err){
                    return callback(err)
                }
                callback()
            })
        })
    }
    getDetail ( task, info, callback ) {
        async.parallel({
            comment:  (callback) => {
                this.getCommentNum(task, info, (err,num) => {
                    // if(err){
                    //     return callback(err)
                    // }
                    callback(null,num)
                })
            },
            expr: (callback) => {
                this.getExpr(task, info, (err,data) => {
                    // if(err){
                    //     return callback(err)
                    // }
                    callback(null,data)
                })
            },
            play: (callback) => {
                this.getPlayNum(task,info, (err,num) => {
                    // if(err){
                    //     return callback(err)
                    // }
                    callback(null,num)
                })
            },
            newField: ( callback ) => {
                this.getField(task, info,(err, data) => {
                    // if(err){
                    //     return callback(err)
                    // }
                    callback(null,data)
                })
            }
        }, (err, results) => {
            if(err){
                return callback(err)
            }
            let media = {
                author: info.author,
                platform: 10,
                bid: task.id,
                aid: info.id,
                title: info.title.substr(0,100).replace(/"/g,''),
                play_num: results.play,
                comment_num: Number(results.comment),
                support: results.expr ? results.expr.up : null,
                step: results.expr ? results.expr.down : null,
                save_num:  results.expr ? results.expr.like : null,
                a_create_time: info.time,
                long_t: results.newField ? results.newField.long_t : null,
                v_img: results.newField ? results.newField.v_img : null,
                tag: results.newField ? results.newField.tag : null,
                class: results.newField ? results.newField.class : null
            }
            if(!media.class){
                delete media.class
            }
            if(!media.tag){
                delete media.tag
            }
            if(!media.v_img){
                delete media.v_img
            }
            if(!media.long_t){
                delete media.long_t
            }
            this.core.MSDB.hget(`${media.author}:${media.aid}`,"play_num",(err,result)=>{
                if(err){
                    logger.debug("读取redis出错")
                    return
                }
                if(result > media.play_num){
                    storaging.errStoraging(this.core,'kuaibao',`${api.kuaibao.play}&devid=${task.devId}`,task.id,`快报${media.aid}播放量减少`,"resultErr","play")
                }
            })
            storaging.sendDb(this.core,media)
            callback()
        })
    }
    getCommentNum ( task, info, callback ) {
        let option = {
            url: api.kuaibao.comment,
            referer:'http://r.cnews.qq.com/inews/iphone/',
            data: {
                chlid: "media_article",
                comment_id: info.commentId,
                c_type: "comment",
                article_id: info.id,
                page: 1
            }
        }
        request.post( option, (err,result) => {
            // if(err){
            //     logger.error( 'occur error : ', err )
            //     return callback(err)
            // }
            storaging.judgeRes (this.core,"kuaibao",option.url,task.id,err,result,callback,"commentNum")
            if(!result){
                return
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                storaging.errStoraging(this.core,'kuaibao',option.url,task.id,"快报获取commentNum接口json数据解析失败","doWithResErr","commentNum")
                return callback(e)
            }
            if(result.comments){
                result.comments.count ? callback(null,result.comments.count) : callback(true)
            }else{
                callback(true)
            }
            storaging.succStorage(this.core,"kuaibao",option.url,"commentNum")

        })
    }
    getExpr ( task, info, callback ) {
        let option = {
            url: api.kuaibao.expr,
            referer:'http://r.cnews.qq.com/inews/iphone/',
            data: {
                id: info.id,
                chlid: "media_article"
            }
        }
        request.post( option, ( err, result ) => {
            // if(err){
            //     logger.error( 'occur error : ', err )
            //     return callback(err)
            // }
            storaging.judgeRes (this.core,"kuaibao",option.url,task.id,err,result,callback,"Expr")
            if(!result){
                return
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                storaging.errStoraging(this.core,'kuaibao',option.url,task.id,"快报获取Expr接口json数据解析失败","doWithResErr","Expr")
                return callback(e)
            }
            let data = {
                like: result.like_info.count,
                up: result.expr_info.list[0].count || null,
                down: result.expr_info.list[1].count || null
            }
            storaging.succStorage(this.core,"kuaibao",option.url,"Expr")

            callback(null,data)
        })
    }
    getPlayNum (task, info, callback ) {
        let option = {
            url: api.kuaibao.play + '&devid=' + task.devId,
            referer:'http://r.cnews.qq.com/inews/iphone/',
            data: {
                id: info.id,
                chlid: "media_video",
                articletype: info.type
            }
        }
        request.post( option, (err,result) => {
            // if(err){
            //     logger.error( 'occur error : ', err )
            //     return callback(err)
            // }
            storaging.judgeRes (this.core,"kuaibao",option.url,task.id,err,result,callback,"play")
            if(!result){
                return 
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                storaging.errStoraging(this.core,'kuaibao',option.url,task.id,"快报获取playNum接口json数据解析失败","doWithResErr","play")
                return callback(e)
            }
            //logger.debug(result)
            let backData
            if(result.kankaninfo){
                backData = result.kankaninfo
                backData.videoInfo ? callback(null,backData.videoInfo.playcount) : callback(true)
            } else {
                callback(true)
            }
            storaging.succStorage(this.core,"kuaibao",option.url,"play")

        })
    }
    getField ( task, info, callback ){
        let option = {
            url: "http://ncgi.video.qq.com/tvideo/fcgi-bin/vp_iphone?vid="+info.vid+"&plat=5&pver=0&otype=json&callback=jsonp",
            referer:'http://r.cnews.qq.com/inews/iphone/'
        }
        request.get( option, (err,result) => {
            // if(err){
            //     logger.error( 'occur error : ', err )
            //     return callback(err)
            // }
            storaging.judgeRes (this.core,"kuaibao",option.url,task.id,err,result,callback,"field")
            if(!result){
                return 
            }
            try{
                result = eval(result.body)
            }catch (e){
                logger.error('jsonp数据解析失败')
                storaging.errStoraging(this.core,'kuaibao',option.url,task.id,"快报获取field接口json数据解析失败","doWithResErr","field")
                logger.error(result)
                return callback(e)
            }
            if(result && !result.video){
                return callback(null, null)
            }
            const backData = {
                long_t: result.video.tot,
                v_img: result.video.pic,
                tag: this._tag(result.video.tags),
                class: this._class(result.video.ctypename)
            }
            storaging.succStorage(this.core,"kuaibao",option.url,"field")
            callback(null,backData)
        })
    }
    _class( raw ){
        if(typeof raw == 'string'){
            return raw
        }
        if(Object.prototype.toString.call(raw) === '[object Array]'){
            return raw.join(',')
        }
        return ''
    }
    _tag( raw ){
        let _tagArr = []
        if(!raw){
            return ''
        }
        if(Object.prototype.toString.call(raw) === '[object Array]' && raw.length != 0){
            for( let i in raw){
                _tagArr.push(raw[i].tag)
            }
            return _tagArr.join(',')
        }
        if(Object.prototype.toString.call(raw) === '[object Array]' && raw.length == 0){
            return ''
        }
        if(typeof raw == 'object'){
            return raw.tag
        }
        return ''
    }
}
module.exports = kuaibaoDealWith