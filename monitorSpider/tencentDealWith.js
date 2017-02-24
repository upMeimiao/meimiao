/**
 * Created by junhao on 16/6/20.
 */
const moment = require('moment')
const async = require( 'async' )
const request = require( '../lib/req' )
const storaging = require('./storaging')
const jsonp = function (data) {
    return data
}
let logger,api
class tencentDealWith {
    constructor (spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        api = this.settings.spiderAPI
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    tencent (task,callback) {
        task.total = 0
        async.parallel(
            {
                user: (callback) => {
                    this.getUser(task,(err,res)=>{
                        callback(err,res)
                    })
                },
                media: (callback) => {
                    this.getTotal(task,(err,res)=>{
                        callback(err,res)
                    })
                }
            },
            ( err, result ) => {
                if(err){
                    return callback(err)
                }
                callback(err,result)
            }
        )
    }
    getTotal (task,callback) {
        logger.debug("开始获取视频总数")
        let option = {
            url: api.tencent.videoList + task.id + "&pagenum=1"
        }
        request.get( option, (err,result) => {

            // if(err){
            //     logger.error( 'occur error : ', err )
            //     storaging.errStoraging(this.core,'tencent',option.url,task.id,err,"responseErr","total")
            //     return callback(err)
            // }
            // if(!result){
            //     storaging.errStoraging(this.core,'tencent',option.url,task.id,"腾讯视频获取视频总数接口无返回内容","resultErr","total")
            //     return
            // }
            // if(result.statusCode != 200){
            //     logger.error('tencent code error: ',result.statusCode)
            //     storaging.errStoraging(this.core,'tencent',option.url,task.id,"腾讯视频获取用户信息接口状态码错误","responseErr","total")
            //     return callback()
            // }
            storaging.judgeRes (this.core,"tencent",option.url,task.id,err,result,callback,"total")
            if(!result || !result.body){
                return 
            }
            try {
                result = JSON.parse(result.body.substring(6, result.body.length - 1))
            } catch (e){
                logger.error(result.body.substring(6, result.body.length - 1))
                storaging.errStoraging(this.core,'tencent',option.url,task.id,"腾讯视频获取视频总数接口JSON数据解析错误","doWithResErr","total")
                return callback(e)
            }
            //logger.debug(result)
            if(result.s != 'o'){
                logger.error(`异常错误${result.em}`)
                storaging.errStoraging(this.core,'tencent',option.url,task.id,`腾讯视频获取视频总数接口发生异常错误${result.em}`,"doWithResErr","total")
                return callback(result.em)
            }
            if(!result.vtotal){
                logger.error(`异常错误`)
                storaging.errStoraging(this.core,'tencent',option.url,task.id,`腾讯视频获取视频总数接口发生异常错误${result.em}`,"doWithResErr","total")
                return callback(true)
            }
            task.total = result.vtotal
            this.getList(task,result.vtotal, (err) => {
                if(err){
                    return callback(err)
                }
                callback()
            })
            storaging.succStorage(this.core,"tencent",option.url,"total")
        })
    }
    getUser (task,callback) {

        let option = {
            url: api.tencent.user + task.id + "&_=" + new Date().getTime()
        }
        request.get( option, (err,result)=>{
            // if(err){
            //     logger.error( 'occur error : ', err )
            //     storaging.errStoraging(this.core,'tencent',option.url,task.id,err,"responseErr","user")
            //     return callback()
            // }
            // if(result.statusCode != 200){
            //     logger.error('tencent code error: ',result.statusCode)
            //     storaging.errStoraging(this.core,'tencent',option.url,task.id,"腾讯视频获取用户信息接口状态码错误","responseErr","user")
            //     return callback()
            // }
            storaging.judgeRes (this.core,"tencent",option.url,task.id,err,result,callback,"user")
            if(!result || !result.body){
                return 
            }
            try {
                result = eval(result.body)
            } catch (e){
                logger.error('tencent jsonp error: ',result)
                storaging.errStoraging(this.core,'tencent',option.url,task.id,"腾讯视频获取用户信息接口返回数据错误","resultErr","user")
                return callback()
            }
            //let user = {
                //platform: 4,
                //bid: task.id,
                //fans_num: result.followcount.indexOf('万') == -1 ? result.followcount : Number(result.followcount.replace(/万/g,'')) * 10000
            //}
            storaging.succStorage(this.core,"tencent",option.url,"user")
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
                logger.debug("开始获取第"+ sign +"页tencent视频列表")
                option = {
                    url: api.tencent.videoList + task.id + "&pagenum="+sign
                }
                request.get( option, (err,result) => {
                    if(err){
                        logger.error( 'occur error : ', err )
                        storaging.errStoraging(this.core,'tencent',option.url,task.id,err,"responseErr","list")
                        return cb()
                    }
                    //logger.debug(back.body)
                    if(!result || !result.body){
                        storaging.errStoraging(this.core,'tencent',option.url,task.id,"腾讯视频list接口无返回数据","responseErr","list")
                        return cb()
                    }
                    try {
                        result = JSON.parse(result.body.substring(6, result.body.length - 1))
                    } catch (e){
                        logger.error(result.body.substring(6, result.body.length - 1))
                        sign++
                        return cb()
                    }
                    let list = result.videolst
                    // logger.debug('videolst:', data)
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
                storaging.succStorage(this.core,"tencent",option.url,"list")
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
                this.core.MSDB.hget(`${media.author}:${media.aid}`,"play_num",(err,result)=>{
                    if(err){
                        logger.debug("读取redis出错")
                        return
                    }
                    if(result > media.play_num){
                        storaging.errStoraging(this.core,'tencent',`${api.tencent.view}${media.aid}`,task.id,`腾讯视频${media.aid}播放量减少`,"resultErr","view")
                        return
                    }
                })
                storaging.sendDb(this.core,media)
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
        request.get( option, ( err, result ) => {
            // if(err){
            //     logger.error( 'occur error : ', err )
            //     storaging.errStoraging(this.core,'tencent',option.url,task.id,err,"responseErr","view")
            //     return callback(err)
            // }
            // if(result.statusCode != 200){
            //     logger.error(`状态码错误,${result.statusCode}`)
            //     storaging.errStoraging(this.core,'tencent',option.url,task.id,"腾讯视频获取视频播放量接口状态码错误","responseErr","view")
            //     return callback(true)
            // }
            storaging.judgeRes (this.core,"tencent",option.url,task.id,err,result,callback,"view")
            if(!result){
                return
            }
            let backData =eval(result.body),
                back = backData.results
            if(!back){
                storaging.errStoraging(this.core,'tencent',option.url,task.id,"腾讯视频获取视频播放量接口返回数据错误","responseErr","view")
                return
            }
            if(back[0].fields){
                callback(null,back[0].fields.view_all_count)
            }else{
                callback(null,0)
            }
            storaging.succStorage(this.core,"tencent",option.url,"view")
        })
    }
    getComment ( task, id, callback ) {
        let option = {
            url: api.tencent.commentId + id
        }
        request.get( option, ( err, result ) => {
            // if(err){
            //     logger.error( 'occur error : ', err )
            //     storaging.errStoraging(this.core,'tencent',option.url,task.id,err,"responseErr","comment")
            //     return callback(err)
            // }
            // if( result.statusCode != 200){
            //     logger.error( '腾讯获取评论数code错误 : ', result.statusCode )
            //     storaging.errStoraging(this.core,'tencent',option.url,task.id,"腾讯视频获取评论接口状态码错误","responseErr","comment")
            //     return callback(true)
            // }
            storaging.judgeRes (this.core,"tencent",option.url,task.id,err,result,callback,"comment")
            if(!result){
                return 
            }
            let backData
            try {
                backData = eval(result.body)
            } catch (e) {
                logger.error('腾讯获取评论数jsonp解析失败')
                storaging.errStoraging(this.core,'tencent',option.url,task.id,"腾讯获取评论jsonp解析失败","doWithResErr","comment")
                logger.error(result.body)
                return callback(e)
            }
            if(!backData.result){
                logger.error( '腾讯获取评论数异常错误' )
                storaging.errStoraging(this.core,'tencent',option.url,task.id,"腾讯获取评论异常错误","resultErr","comment")
                logger.error(backData)
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
                callback(true)
            }
            storaging.succStorage(this.core,"tencent",option.url,"comment")
        })
    }
    getCommentNum ( task, id, callback ) {
        let option = {
            url: api.tencent.commentNum + id + "/commentnum?_=" + new Date().getTime(),
            referer: 'https://v.qq.com/txyp/coralComment_yp_1.0.htm',
            ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36'
        }
        request.get(option, (err,result) => {
            // if(err){
            //     logger.error( 'occur error : ', err )
            //     storaging.errStoraging(this.core,'tencent',option.url,task.id,err,"responseErr","commentNum")
            //     return callback(err)
            // }
            storaging.judgeRes (this.core,"tencent",option.url,task.id,err,result,callback,"commentNum")
            if(!result){
                return 
            }
            try {
                result = JSON.parse(result.body)
            } catch ( e ) {
                logger.error(`获取视频${id}评论解析JSON错误`)
                storaging.errStoraging(this.core,'tencent',option.url,task.id,`获取视频${id}评论解析JSON错误`,"doWithResErr","commentNum")
                logger.info(result)
                return callback(null,null)
            }
            if(result.errCode == 0){
                callback(null,result.data.commentnum)
            } else {
                callback(null,null)
            }
            storaging.succStorage(this.core,"tencent",option.url,"commentNum")
        })
    }
    getVidTag( task, vid, callback ){
        const option = {
            url : "http://c.v.qq.com/videoinfo?otype=json&callback=jsonp&low_login=1&vid="+vid+"&fields=recommend%7Cedit%7Cdesc%7Cnick%7Cplaycount"
        }
        request.get( option, ( err, result ) => {
            // if(err){
            //     storaging.errStoraging(this.core,'tencent',option.url,task.id,err,"responseErr","vidTag")
            //     return callback(err)
            // }
            storaging.judgeRes (this.core,"tencent",option.url,task.id,err,result,callback,"vidTag")
            if(!result){
                return 
            }
            try{
                result = eval(result.body)
            } catch (e){
                storaging.errStoraging(this.core,'tencent',option.url,task.id,"腾讯视频获取视频信息接口eval错误","doWithResErr","vidTag")
                return callback(null,null)
            }
            if(!result.v || result.v.length == 0){
                storaging.errStoraging(this.core,'tencent',option.url,task.id,"腾讯视频获取视频信息接口返回数据错误","resultErr","vidTag")
                return callback(null,null)
            }
            storaging.succStorage(this.core,"tencent",option.url,"vidTag")
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