/**
 * Created by yunsong on 16/8/1.
 */
const async = require('async')
const request = require( '../lib/req' )
const moment = require('moment')

let logger,api
class dealWith {
    constructor (spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('./storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('btimeDealWith instantiation ...')
    }
    btime( task, callback) {
        task.total = 0
        async.parallel({
            user: (callback) => {
                this.getUser(task , task.id, (err,result) => {
                    callback(err,result)
                })
            },
            media: (callback) => {
                this.getList( task, task.id, (err,result) => {
                    callback(err,result)
                })
            }
        },(err,result) => {
            callback(err,result)
        })
    }
    getUser(task, id, callback){
        let option = {
            url: api.btime.userInfo + id
        }
        request.get(option, (err,result) => {
            this.storaging.totalStorage ("btime",option.url,"user")
            if(err){
                // logger.error(err,err.code,err.Error)
                let errType 
                if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                    errType = "timeoutErr"
                } else{
                    errType = "responseErr"
                }
                // logger.error(errType)
                this.storaging.errStoraging('btime',option.url,task.id,err.code || "error",errType,"user")
                return callback(err.message)
            }
            if(!result){
                this.storaging.errStoraging('btime',option.url,task.id,"北京时间user接口无返回结果","resultErr","user")
                return callback()
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('btime',option.url,task.id,"北京时间user接口状态码错误","statusErr","user")
                return callback(`200 ${result.body}`)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('json数据解析失败')
                this.storaging.errStoraging('btime',option.url,task.id,"北京时间user接口json数据解析失败","doWithResErr","user")
                return callback(e)
            }
            if(!result.data){
                return callback(JSON.stringify(result))
            }
            // let user = {
            //     platform: 15,
            //     bid: task.id,
            //     fans_num: result.data.fans
            // }
        })
    }
    getList(task ,id ,callback ){
        let sign = 1,
            isSign = true,
            lastTime = ''
        async.whilst(
            () => {
                return isSign
            },
            (cb) => {
                // logger.debug('开始获取第' + sign + '页视频列表')
                let option = {
                    url: api.btime.medialist + id + '&pageNo=' + sign + "&lastTime=" + lastTime
                }
                request.get(option, (err,result) => {
                    this.storaging.totalStorage ("btime",option.url,"list")
                    if(err){
                        // logger.error(err,err.code,err.Error)
                        let errType 
                        if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                            errType = "timeoutErr"
                        } else{
                            errType = "responseErr"
                        }
                        // logger.error(errType)
                        this.storaging.errStoraging('btime',option.url,task.id,err.code || "error",errType,"list")
                        return callback(err)
                    }
                    if(!result){
                        this.storaging.errStoraging('btime',option.url,task.id,"北京时间list接口无返回数据","resultErr","list")
                        return callback()
                    }
                    if(!result.body){
                        this.storaging.errStoraging('btime',option.url,task.id,"北京时间list接口无返回数据","resultErr","list")
                        return callback()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e){
                        logger.error('json数据解析失败')
                        this.storaging.errStoraging('btime',option.url,task.id,"北京时间list接口json数据解析失败","doWithResErr","list")
                        return callback(e)
                    }
                    let list = result.data
                    if(list.length !=0){
                        lastTime = list[list.length -1].pdate
                    }
                    if(list.length >= 20){
                        this.deal(task,id,list,() => {
                            sign++
                            cb()
                        })
                    }else{
                        this.deal(task,id,list,() => {
                            task.total = (sign - 1) * 20 + (list.length)
                            isSign = false
                            cb()
                        })
                    }
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    deal(task ,id , list ,callback ) {
        let index = 0
        async.whilst(
            () => {
                return index < list.length
            },
            (cb) => {
                this.getVideo(task,index,id,list[index],(err) => {
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getVideo(task , id , index, data ,callback ) {
        let media = {}
        async.parallel([
            (cb) => {
                this.getComment(task,data, (err, result) => {
                    if(err){
                        return cb(err)
                    }
                    return cb(null, result)
                })
            },
            (cb) => {
                this.getInfo(task,data, (err, result) => {
                    if(err){
                        return cb(err)
                    }
                    return cb(null, result)
                })
            }
        ],(err, result) => {
            if(err){
                return callback()
            }
            media.author = task.name
            media.platform = 15
            media.bid = task.id
            media.aid = data.gid
            media.title = data.title.substr(0,100).replace(/"/g,'')
            media.desc = data.description.substr(0,100).replace(/"/g,'')
            media.play_num = data.click_count
            media.comment_num = result[0]
            media.a_create_time = moment(data.ctime).format('X')
            media.support = result[1].ding
            media.v_url = data.gid
            media.v_img = data.image_url
            media.long_t = this._long_t(data.duration)
            //logger.debug(media)
            this.core.MSDB.hget(`apiMonitor:play_num`,`:${media.author}_${media.aid}`,(err,result)=>{
                if(err){
                    logger.debug("读取redis出错")
                    return
                }
                if(result > media.play_num){
                    this.storaging.errStoraging('btime',`${api.btime.medialist}&pageNo=${index}&lastTime=`,task.id,`北京时间视频${media.aid}播放量减少`,"playNumErr","list")
                    return
                }
            })
            // logger.debug("btime media==============",media)
            this.storaging,sendDb(media)
            callback()
        })
    }
    getInfo(task, info, callback) {
        const option = {
            url: api.btime.info + info.gid + "&timestamp=" + Math.round(new Date().getTime() / 1000)
        }
        request.get(option, (err, result) => {
            this.storaging.totalStorage ("btime",option.url,"info")
            if(err){
                logger.error(err,err.code,err.Error)
                let errType 
                if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                    errType = "timeoutErr"
                } else{
                    errType = "responseErr"
                }
                logger.error(errType)
                this.storaging.errStoraging('btime',option.url,task.id,err.code || "error",errType,"info")
                return callback(err)
            }
            if(!result){
                this.storaging.errStoraging('btime',option.url,task.id,"北京时间info接口无返回数据","resultErr","info")
                return callback()
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('btime',option.url,task.id,"北京时间info接口状态码错误","statusErr","info")
                return callback(true)
            }
            if(!result.body){
                this.storaging.errStoraging('btime',option.url,task.id,"北京时间info接口无返回数据","resultErr","info")
                return callback()
            }
            if(result.errno != 0){
                return callback(true)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e){
                this.storaging.errStoraging('btime',option.url,task.id,"北京时间info接口json数据解析失败","doWithResErr","info")
                return callback(e)
            }
            let data = {
                play: result.data.watches,
                comment: result.data.comment,
                ding: result.data.ding
            }
            callback(null, data)
        })
    }
    getComment( task, info, callback ){
        let option={
            url: `http://api.app.btime.com/api/commentList?protocol=1&timestamp=${Math.round(new Date().getTime() / 1000)}&url=http%253A%252F%252Frecord.btime.com%252Fnews%253Fid%253D${info.gid}&ver=2.3.0`
        }
        request.get(option, ( err, result ) => {
            this.storaging.totalStorage ("btime",option.url,"comment")
            if(err){
                logger.error(err,err.code,err.Error)
                let errType 
                if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                    errType = "timeoutErr"
                } else{
                    errType = "responseErr"
                }
                logger.error(errType)
                this.storaging.errStoraging('btime',option.url,task.id,err.code || "error",errType,"comment")
                return callback(err)
            }
            if(!result){
                this.storaging.errStoraging('btime',option.url,task.id,"北京时间comment接口无返回结果","resultErr","comment")
                return callback()
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('btime',option.url,task.id,"北京时间comment接口状态码错误","statusErr","comment")
                return callback(true)
            }
            if(!result.body){
                this.storaging.errStoraging('btime',option.url,task.id,"北京时间comment接口无返回数据","resultErr","comment")
                return callback()
            }
            try {
                result = JSON.parse(result.body)
            } catch (e){
                this.storaging.errStoraging('btime',option.url,task.id,"北京时间comment接口json数据解析失败","doWithResErr","comment")
                return callback(e)
            }
            if(result.errno != 0 ){
                return callback(true)
            }
            callback(null,result.data.total)
        })
    }
    _long_t ( time ){
        if( !time ){
            return ''
        }
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