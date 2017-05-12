const async = require( 'async' )
const request = require( '../../lib/request' )
let logger,api
const jsonp = function (data) {
    return data
}
const devArr = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z']
class kuaibaoDealWith {
    constructor ( spiderCore ){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
        api = this.settings.spiderAPI
        logger = this.settings.logger
        logger.trace('kuaibaoDealWith instantiation ...')
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
            callback(null,result)
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
        request.get ( logger, option, ( err, result )=>{
            this.storaging.totalStorage ("kuaibao",option.url,"user")
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
                this.storaging.errStoraging('kuaibao',option.url,task.id,err.code || "error",errType,"user")
                return callback()
            }
            if( result.statusCode != 200){
                this.storaging.errStoraging('kuaibao',option.url,task.id,`快报获取粉丝接口状态码错误${result.statusCode}`,"statusErr","user")
                return callback()
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                this.storaging.errStoraging('kuaibao',option.url,task.id,"快报获取粉丝json数据解析失败","doWithResErr","user")
                return callback(e)
            }
            let userInfo = result.channelInfo
            if(!userInfo){
                this.storaging.errStoraging('kuaibao',option.url,task.id,"快报获取粉丝接口异常错误","resultErr","user")
                return callback()
            }
            let user = {
                platform: 10,
                bid: task.id,
                fans_num: userInfo.subCount
            }
            callback(null,user)
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
        request.post( logger, option,  (err,result) => {
            this.storaging.totalStorage ("kuaibao",option.url,"videos")
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
                this.storaging.errStoraging('kuaibao',option.url,task.id,err.code || "error",errType,"videos")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('kuaibao',option.url,task.id,`快报获取videos接口状态码错误${result.statusCode}`,"statusErr","videos")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                this.storaging.errStoraging('kuaibao',option.url,task.id,"快报获取videos接口json数据解析失败","doWithResErr","videos")
                return callback(e)
            }
            if(!result.ids){
                this.storaging.errStoraging('kuaibao',option.url,task.id,"快报获取videos接口返回内容为空","resultErr","videos")
                return callback(result)
            }
            task.total = result.ids.length
            // this.storaging.succStorage("kuaibao",option.url,"videos")

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
        request.post( logger, option, (err,result) => {
            this.storaging.totalStorage ("kuaibao",option.url,"info")
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
                this.storaging.errStoraging('kuaibao',option.url,task.id,err.code || "error",errType,"info")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('kuaibao',option.url,task.id,`快报获取info接口状态码错误${result.statusCode}`,"statusErr","info")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                this.storaging.errStoraging('kuaibao',option.url,task.id,"快报获取info接口json数据解析失败","doWithResErr","info")
                return callback(e)
            }
            //logger.debug(result)
            if(result.newslist.length == 0){
                this.storaging.errStoraging('kuaibao',option.url,task.id,"快报获取info接口返回数据为空","resultErr","info")
                return callback()
            }
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
            // this.storaging.succStorage("kuaibao",option.url,"info")

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
                author: task.name,
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
            
            if(!media.play_num){
                return
            }
            // this.core.MSDB.hget(`apiMonitor:play_num`,`${media.author}_${media.aid}`,(err,result)=>{
            //     if(err){
            //         logger.debug("读取redis出错")
            //         return
            //     }
            //     if(result > media.play_num){
            //         this.storaging.errStoraging('kuaibao',`${api.kuaibao.play}&devid=${task.devId}`,task.id,`快报播放量减少`,"playNumErr","play",media.aid,`${result}/${media.play_num}`)
            //     }
            //     this.storaging.sendDb(media/*,task.id,"play"*/)
            // })
            this.storaging.playNumStorage(media,"play")
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
        request.post( logger, option, (err,result) => {
            this.storaging.totalStorage ("kuaibao",option.url,"commentNum")
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
                this.storaging.errStoraging('kuaibao',option.url,task.id,err.code || "error",errType,"commentNum")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('kuaibao',option.url,task.id,`快报获取commentNum接口状态码错误${result.statusCode}`,"statusErr","commentNum")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                this.storaging.errStoraging('kuaibao',option.url,task.id,"快报获取commentNum接口json数据解析失败","doWithResErr","commentNum")
                return callback(e)
            }
            if(result.comments){
                result.comments.count ? callback(null,result.comments.count) : callback(true)
            }else{
                this.storaging.errStoraging('kuaibao',option.url,task.id,"快报获取commentNum接口返回内容为空","doWithResErr","commentNum")
                callback(true)
            }
            // this.storaging.succStorage("kuaibao",option.url,"commentNum")

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
        request.post( logger, option, ( err, result ) => {
            // if(err){
            //     logger.error( 'occur error : ', err )
            //     return callback(err)
            // }
            this.storaging.totalStorage ("kuaibao",option.url,"Expr")
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
                this.storaging.errStoraging('kuaibao',option.url,task.id,err.code || "error",errType,"Expr")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('kuaibao',option.url,task.id,`快报获取Expr接口状态码错误${result.statusCode}`,"statusErr","Expr")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                this.storaging.errStoraging('kuaibao',option.url,task.id,"快报获取Expr接口json数据解析失败","doWithResErr","Expr")
                return callback(e)
            }
            let data = {
                like: result.like_info.count,
                up: result.expr_info.list[0].count || null,
                down: result.expr_info.list[1].count || null
            }
            // this.storaging.succStorage("kuaibao",option.url,"Expr")
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
        request.post( logger, option, (err,result) => {
            this.storaging.totalStorage ("kuaibao",option.url,"play")
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
                this.storaging.errStoraging('kuaibao',option.url,task.id,err.code || "error",errType,"play")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('kuaibao',option.url,task.id,`快报获取play接口状态码错误${result.statusCode}`,"statusErr","play")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                this.storaging.errStoraging('kuaibao',option.url,task.id,"快报获取playNum接口json数据解析失败","doWithResErr","play")
                return callback(e)
            }
            let backData
            if(result.kankaninfo){
                backData = result.kankaninfo
                backData.videoInfo ? callback(null,backData.videoInfo.playcount) : callback(true)
            } else {
                this.storaging.errStoraging('kuaibao',option.url,task.id,"快报获取playNum接口返回数据错误","resultErr","play")
                callback(true)
            }
            // this.storaging.succStorage("kuaibao",option.url,"play")

        })
    }
    getField ( task, info, callback ){
        let option = {
            url: "http://ncgi.video.qq.com/tvideo/fcgi-bin/vp_iphone?vid="+info.vid+"&plat=5&pver=0&otype=json&callback=jsonp",
            referer:'http://r.cnews.qq.com/inews/iphone/'
        }
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("kuaibao",option.url,"field")
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
                this.storaging.errStoraging('kuaibao',option.url,task.id,err.code || "error",errType,"field")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('kuaibao',option.url,task.id,`快报获取field接口状态码错误${result.statusCode}`,"statusErr","field")
                return callback(result.statusCode)
            }
            try{
                result = eval(result.body)
            }catch (e){
                this.storaging.errStoraging('kuaibao',option.url,task.id,"快报获取field接口json数据解析失败","doWithResErr","field")
                return callback(e)
            }
            if(!result.video){
                this.storaging.errStoraging('kuaibao',option.url,task.id,"快报获取field接口返回数据为空","resultErr","field")
                return callback(null, null)
            }
            const backData = {
                long_t: result.video.tot,
                v_img: result.video.pic,
                tag: this._tag(result.video.tags),
                class: this._class(result.video.ctypename)
            }
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