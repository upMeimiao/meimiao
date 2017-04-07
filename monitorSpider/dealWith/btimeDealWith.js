const async = require('async')
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
        request.get(logger, option, (err,result) => {
            this.storaging.totalStorage ("btime",option.url,"user")
            if(err){
                // logger.error(err,err.code,err.Error)
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
                // logger.error(errType)
                this.storaging.errStoraging('btime',option.url,task.id,err.code || "error",errType,"user")
                return callback(err.message)
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('btime',option.url,task.id,`北京时间user接口状态码错误${result.statusCode}`,"statusErr","user")
                return callback(`200 ${result.body}`)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                this.storaging.errStoraging('btime',option.url,task.id,"北京时间user接口json数据解析失败","doWithResErr","user")
                return callback(e)
            }
            if(!result.data){
                this.storaging.errStoraging('btime',option.url,task.id,"北京时间user接口返回数据为空","resultErr","user")
                return callback(JSON.stringify(result))
            }
            if(!result.data.fans&&result.data.fans!==0){
                this.storaging.errStoraging('btime',option.url,task.id,"北京时间user接口返回数据为空","resultErr","user")
                return callback(JSON.stringify(result))
            }
            let user = {
                platform: 15,
                bid: task.id,
                fans_num: result.data.fans
            }
            callback()
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
                request.get(logger, option, (err,result) => {
                    this.storaging.totalStorage ("btime",option.url,"list")
                    if(err){
                        // logger.error(err,err.code,err.Error)
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
                        // logger.error(errType)
                        this.storaging.errStoraging('btime',option.url,task.id,err.code || "error",errType,"list")
                        return callback(err)
                    }
                    if(result.statusCode && result.statusCode != 200){
                        this.storaging.errStoraging('btime',option.url,task.id,`北京时间list接口状态码错误${result.statusCode}`,"statusErr","user")
                        return callback(`200 ${result.body}`)
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e){
                        this.storaging.errStoraging('btime',option.url,task.id,"北京时间list接口json数据解析失败","doWithResErr","list")
                        return callback(e)
                    }
                    if(!result.data){
                        this.storaging.errStoraging('btime',option.url,task.id,"北京时间list接口返回数据错误","resultErr","list")
                        return callback()
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
            if(!media.play_num){
                return callback()
            }
            // this.core.MSDB.hget(`apiMonitor:play_num`,`:${media.author}_${media.aid}`,(err,result)=>{
            //     if(err){
            //         logger.debug("读取redis出错")
            //         return
            //     }
            //     if(result > media.play_num){
            //         this.storaging.errStoraging('btime',"",task.id,`北京时间视频播放量减少`,"playNumErr","list",media.aid,`${result}/${media.play_num}`)
            //     }
            //     this.storaging,sendDb(media/*,task.id,"list"*/)
            // })
            this.storaging.playNumStorage(media,"list")
            // logger.debug("btime media==============",media)
            callback()
        })
    }
    getInfo(task, info, callback) {
        const option = {
            url: api.btime.info + info.gid + "&timestamp=" + Math.round(new Date().getTime() / 1000)
        }
        request.get(logger, option, (err, result) => {
            this.storaging.totalStorage ("btime",option.url,"info")
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
                this.storaging.errStoraging('btime',option.url,task.id,err.code || "error",errType,"info")
                return callback(err)
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('btime',option.url,task.id,`北京时间info接口状态码错误${result.statusCode}`,"statusErr","info")
                return callback(true)
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
            if(!result.data){
                this.storaging.errStoraging('btime',option.url,task.id,"北京时间info接口返回数据为空","resultErr","info")
                return callback()
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
        request.get(logger, option, ( err, result ) => {
            this.storaging.totalStorage ("btime",option.url,"comment")
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
                this.storaging.errStoraging('btime',option.url,task.id,err.code || "error",errType,"comment")
                return callback(err)
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('btime',option.url,task.id,`北京时间comment接口状态码错误${result.statusCode}`,"statusErr","comment")
                return callback(true)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e){
                this.storaging.errStoraging('btime',option.url,task.id,"北京时间comment接口json数据解析失败","doWithResErr","comment")
                return callback(e)
            }
            if(!result.data){
                this.storaging.errStoraging('btime',option.url,task.id,`北京时间comment接口返回结果为空`,"resultErr","comment")
                return callback()
            }   
            if(result.errno != 0 ){
                this.storaging.errStoraging('btime',option.url,task.id,`北京时间comment接口返回结果errno：${result.errno}`,"resultErr","comment")
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