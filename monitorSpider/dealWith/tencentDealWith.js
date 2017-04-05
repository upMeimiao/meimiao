const moment = require('moment')
const async = require( 'async' )
const request = require( '../../lib/request' )
const jsonp = function (data) {
    return data
}
let logger,api
class tencentDealWith {
    constructor (spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
        api = this.settings.spiderAPI
        logger = this.settings.logger
        logger.trace('tencentDealWith instantiation ...')
    }
    tencent (task,callback) {
        task.total = 0
        async.parallel(
            {
                user: (callback) => {
                    this.getUser(task,(err,res)=>{
                        if(err){
                            return callback(err)
                        }
                        callback(null,res)
                    })
                },
                media: (callback) => {
                    this.getTotal(task,(err,res)=>{
                        if(err){
                            return callback(err)
                        }
                        callback(null,res)
                    })
                }
            },
            ( err, result ) => {
                if(err){
                    return callback(err)
                }
                callback(null,result)
            }
        )
    }
    getTotal (task,callback) {
        // logger.debug("开始获取视频总数")
        let option = {
            url: api.tencent.videoList + task.id + "&pagenum=1"
        }
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("tencent",option.url,"total")
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
                this.storaging.errStoraging('tencent',option.url,task.id,err.code || "error",errType,"total")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('tencent',option.url,task.id,`腾讯视频获取total接口状态码错误${result.statusCode}`,"statusErr","total")
                return callback(result.statusCode)
            }
            try {
                result = JSON.parse(result.body.substring(6, result.body.length - 1))
            } catch (e){
                this.storaging.errStoraging('tencent',option.url,task.id,"腾讯视频获取total接口JSON数据解析错误","doWithResErr","total")
                return callback(e)
            }
            //logger.debug(result)
            if(result.s != 'o'){
                this.storaging.errStoraging('tencent',option.url,task.id,`腾讯视频获取total接口发生异常错误${result.em}`,"doWithResErr","total")
                return callback(result.em)
            }
            if(!result.vtotal){
                this.storaging.errStoraging('tencent',option.url,task.id,`腾讯视频获取total接口发生异常错误${result.em}`,"doWithResErr","total")
                return callback(true)
            }
            task.total = result.vtotal
            this.getList(task,result.vtotal, (err) => {
                if(err){
                    return callback(err)
                }
                callback()
            })
            // this.storaging.succStorage("tencent",option.url,"total")
        })
    }
    getUser (task,callback) {
        let option = {
            url: api.tencent.user + task.id + "&_=" + new Date().getTime()
        }
        request.get( logger, option, (err,result)=>{
            this.storaging.totalStorage ("tencent",option.url,"user")
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
                this.storaging.errStoraging('tencent',option.url,task.id,err.code || "error",errType,"user")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('tencent',option.url,task.id,`腾讯视频获取user接口状态码错误${result.statusCode}`,"statusErr","user")
                return callback(result.statusCode)
            }
            try {
                result = eval(result.body)
            } catch (e){
                this.storaging.errStoraging('tencent',option.url,task.id,"腾讯视频获取user接口jsonp解析错误","resultErr","user")
                return callback(e)
            }
            let user = {
                platform: 4,
                bid: task.id,
                fans_num: result.followcount.indexOf('万') == -1 ? result.followcount : Number(result.followcount.replace(/万/g,'')) * 10000
            }
            callback()
        })
    }
    getList ( task, total, callback ) {
        let sign = 1,
            page,
            option
        if(total % 25 == 0){
            page = total / 25
        }else{
            page = Math.ceil(total / 25)
        }
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                // logger.debug("开始获取第"+ sign +"页tencent视频列表")
                option = {
                    url: api.tencent.videoList + task.id + "&pagenum="+sign
                }
                request.get( logger, option, (err,result) => {
                    this.storaging.totalStorage ("tencent",option.url,"list")
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
                        this.storaging.errStoraging('tencent',option.url,task.id,err.code || "error",errType,"list")
                        return cb()
                    }
                    //logger.debug(back.body)
                    if(result.statusCode && result.statusCode != 200){
                        this.storaging.errStoraging('tencent',option.url,task.id,`腾讯视频获取list接口状态码错误${result.statusCode}`,"statusErr","list")
                        return cb()
                    }
                    try {
                        result = JSON.parse(result.body.substring(6, result.body.length - 1))
                    } catch (e){
                        this.storaging.errStoraging('tencent',option.url,task.id,"腾讯视频获取list接口json解析错误","doWithResErr","list")
                        sign++
                        return cb()
                    }
                    let list = result.videolst
                    if(list){
                        this.deal(task,list, () => {
                            sign++
                            cb()
                        })
                    }else{
                        sign++
                        cb()
                    }

                })
                // this.storaging.succStorage("tencent",option.url,"list")
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
            ( cb ) => {
                this.getInfo( task, list[index], () => {
                    index++
                    cb()
                })
            },
            ( err, result ) => {
                callback()
            }
        )
    }
    getInfo ( task, data, callback ) {
        async.parallel([
                (cb) => {
                    this.getView(task,data.vid, (err,num) => {
                        if(err){
                            cb(err)
                        }else {
                            cb(null,num)
                        }
                    })
                },
                (cb) => {
                    this.getComment(task,data.vid, (err,num) => {
                        if(err){
                            cb(err)
                        }else {
                            cb(null,num)
                        }
                    })
                },
                (cb) => {
                    this.getVidTag(task,data.vid, (err,tags) => {
                        if(err){
                            cb(err)
                        }else {
                            cb(null,tags)
                        }
                    })
                }
            ],
            (err,result) => {
                if(err){
                    return callback(err)
                }
                let media = {
                    author: task.name,
                    platform: 4,
                    bid: task.id,
                    aid: data.vid,
                    title: data.title.substr(0,100).replace(/"/g,''),
                    desc: data.desc.substr(0,100).replace(/"/g,''),
                    play_num: result[0],
                    comment_num: result[1],
                    a_create_time: this.time(data.uploadtime),
                    // 新加字段
                    v_img: data.pic,
                    long_t: this.long_t(data.duration),
                    tag: this.tags(result[2])
                }
                if(!media.play_num){
                    return
                }
                this.storaging.playNumStorage(media,"view")
                if(!media.comment_num){
                    delete media.comment_num
                }
                if(!media.tag){
                    delete media.tag
                }
                callback()
            })
    }
    getView ( task, id, callback ) {
        let option = {
            url: api.tencent.view + id
        }
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("tencent",option.url,"view")
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
                this.storaging.errStoraging('tencent',option.url,task.id,err.code || "error",errType,"view")
                return callback(err)
            }
            //logger.debug(back.body)
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('tencent',option.url,task.id,`腾讯视频获取view接口状态码错误${result.statusCode}`,"statusErr","view")
                return callback(null, result)
            }
            try {
                result = eval(result.body)
            } catch (e){
                this.storaging.errStoraging('tencent',option.url,task.id,"腾讯视频获取view接口jsonp解析错误","doWithResErr","view")
                return callback(e)
            }
            let back = result.results
            if(!back){
                this.storaging.errStoraging('tencent',option.url,task.id,"腾讯视频获取view接口返回数据错误","resultErr","view")
                return
            }
            if(back[0].fields){
                callback(null,back[0].fields.view_all_count)
            }else{
                callback(null,0)
            }
            // this.storaging.succStorage("tencent",option.url,"view")
        })
    }
    getComment ( task, id, callback ) {
        let option = {
            url: api.tencent.commentId + id
        }
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("tencent",option.url,"comment")
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
                this.storaging.errStoraging('tencent',option.url,task.id,err.code || "error",errType,"comment")
                return callback(err)
            }
            if( result.statusCode != 200){
                this.storaging.errStoraging('tencent',option.url,task.id,`腾讯视频获取评论接口状态码错误${result.statusCode}`,"statusErr","comment")
                return callback(true)
            }
            let backData
            try {
                backData = eval(result.body)
            } catch (e) {
                this.storaging.errStoraging('tencent',option.url,task.id,"腾讯获取评论jsonp解析失败","doWithResErr","comment")
                return callback(e)
            }
            if(!backData.result){
                this.storaging.errStoraging('tencent',option.url,task.id,"腾讯获取评论异常错误","resultErr","comment")
                return callback(true)
            }
            if(backData.result.code == 0){
                this.getCommentNum(task,backData.comment_id, (err,num) => {
                    if(err){
                        return callback(err)
                    }
                    callback(null,num)
                })
            }else{
                this.storaging.errStoraging('tencent',option.url,task.id,`腾讯获取评论结果code错误${backData.result.code}`,"resultErr","comment")
                callback(true)
            }
            // this.storaging.succStorage("tencent",option.url,"comment")
        })
    }
    getCommentNum ( task, id, callback ) {
        let option = {
            url: api.tencent.commentNum + id + "/commentnum?_=" + new Date().getTime(),
            referer: 'https://v.qq.com/txyp/coralComment_yp_1.0.htm',
            ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36'
        }
        request.get(logger, option, (err,result) => {
            this.storaging.totalStorage ("tencent",option.url,"commentNum")
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
                this.storaging.errStoraging('tencent',option.url,task.id,err.code || "error",errType,"commentNum")
                return callback(err)
            }
            if( result.statusCode != 200){
                this.storaging.errStoraging('tencent',option.url,task.id,`腾讯视频获取commentNum接口状态码错误${result.statusCode}`,"statusErr","comment")
                return callback(true)
            }
            try {
                result = JSON.parse(result.body)
            } catch ( e ) {
                this.storaging.errStoraging('tencent',option.url,task.id,`腾讯获取视频${id}评论解析JSON错误`,"doWithResErr","commentNum")
                return callback(null,null)
            }
            if(result.errCode == 0){
                if(!result.data.commentnum && 0 !== result.data.commentnum){
                    this.storaging.errStoraging('tencent',option.url,task.id,`腾讯获取commentNum失败${result.data.commentnum}`,"resultErr","commentNum")
                    return callback(null,result.data)
                }
                callback(null,result.data.commentnum)
            } else {
                this.storaging.errStoraging('tencent',option.url,task.id,`腾讯获取commentNum  code错误${result.errCode}`,"resultErr","commentNum")
                callback(null,null)
            }
            // this.storaging.succStorage("tencent",option.url,"commentNum")
        })
    }
    getVidTag( task, vid, callback ){
        const option = {
            url : "http://c.v.qq.com/videoinfo?otype=json&callback=jsonp&low_login=1&vid="+vid+"&fields=recommend%7Cedit%7Cdesc%7Cnick%7Cplaycount"
        }
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("tencent",option.url,"vidTag")
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
                this.storaging.errStoraging('tencent',option.url,task.id,err.code || "error",errType,"vidTag")
                return callback(err)
            }
            if( result.statusCode != 200){
                this.storaging.errStoraging('tencent',option.url,task.id,`腾讯视频获取vidTag接口状态码错误${result.statusCode}`,"statusErr","vidTag")
                return callback(true)
            }
            try{
                result = eval(result.body)
            } catch (e){
                this.storaging.errStoraging('tencent',option.url,task.id,"腾讯视频获取视频信息接口eval错误","doWithResErr","vidTag")
                return callback(null,null)
            }
            if(!result.v || result.v.length == 0){
                this.storaging.errStoraging('tencent',option.url,task.id,"腾讯视频获取视频信息接口返回数据错误","resultErr","vidTag")
                return callback(null,null)
            }
            // this.storaging.succStorage("tencent",option.url,"vidTag")
            const tagStr = result.v[0].tags_video
            callback(null,tagStr)
        })
    }
    time ( string ) {
        if(string.indexOf("-") != -1){
            return moment(string).unix()
        }
        if(string.indexOf("小时") != -1){
            string = string.substring(0, string.indexOf("小时"))
            return moment(moment().subtract(Number(string), 'h').format("YYYY-MM-DD")).unix()
        }
        if(string.indexOf("分钟") != -1){
            return moment(moment().format("YYYY-MM-DD")).unix()
        }
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
    tags( raw ){
        if(typeof raw == 'string'){
            return raw.replace(/\s+/g,',').replace(/"/g,'').replace(/\[/g,'').replace(/\]/g,'')
        }
        if(Object.prototype.toString.call(raw) === '[object Array]'){
            return raw.join(',')
        }
        return ''
    }
}
module.exports = tencentDealWith