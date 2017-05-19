const async = require( 'async' )
const request = require( '../../lib/request' )
const cheerio = require('cheerio')
const moment = require('moment')
let logger,api
class dealWith {
    constructor (spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('tudouDealWith instantiation ...')
    }
    tudou (task,callback) {
        task.total = 0
        async.parallel(
            {
                user: (callback) => {
                    this.getUser(task,(err,result)=>{
                        callback(err,result)
                    })
                },
                media: (callback) => {
                    this.getTotal(task,(err,result)=>{
                        if(err){
                            return callback(err,result)
                        }
                        callback(err,result)
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
    getUser ( task, callback){
        const option = {
            url: `http://www.tudou.com/home/_${task.id}/`,
            ua:2
        }
        // logger.debug("tudou getUser option",option)
        request.get(logger,option,(err,result)=>{
            this.storaging.totalStorage ("tudou",option.url,"user")
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
                this.storaging.errStoraging('tudou',option.url,task.id,err.code || "error",errType,"user")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('tudou',option.url,task.id,`土豆获取user接口状态码错误${result.statusCode}`,"statusErr","user")
                return callback(result.statusCode)
            }
            let $ = cheerio.load(result.body),
                script = $('script')[0].children[0].data
            script = script.slice(script.indexOf('var CONFIG')+13)
            script = script.replace(/;/g,'')
            let user_conf
            try {
                user_conf = eval("(" + script + ")")
            } catch (e){
                this.storaging.errStoraging("tudou",option.url,task.id,"土豆user接口解析jsonp数据失败","doWithResErr","user")
                return callback(e)
            }
            let uidCode = user_conf.uidCode
            this.getFans( task, uidCode, (err)=>{
                callback()
            })
        })
    }
    getFans ( task, uidCode, callback){
        let option = {
            url: api.tudou.fans + uidCode
        }
        request.get( logger, option, (err, result)=>{
            this.storaging.totalStorage ("tudou",option.url,"fans")
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
                this.storaging.errStoraging('tudou',option.url,task.id,err.code || "error",errType,"fans")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('tudou',option.url,task.id,`土豆获取fans接口状态码错误${result.statusCode}`,"statusErr","fans")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                this.storaging.errStoraging("tudou",option.url,task.id,"土豆粉丝 json数据解析失败","doWithResErr","fans")
                return callback(e)
            }
            // let user = {
            //     platform: task.p,
            //     bid: task.id,
            //     fans_num: result.data.subedNum
            // }
            callback()
        })
    }
    getTotal (task,callback){
        // logger.debug('开始获取视频总数')
        let option = {
            url: api.tudou.userInfo + task.id
        }
        // logger.debug("tudou getTotal option",option)
        request.get( logger, option,(err,result) => {
            this.storaging.totalStorage ("tudou",option.url,"total")
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
                this.storaging.errStoraging('tudou',option.url,task.id,err.code || "error",errType,"total")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('tudou',option.url,task.id,`土豆获取total接口状态码错误${result.statusCode}`,"statusErr","total")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('json数据解析失败')
                this.storaging.errStoraging("tudou",option.url,task.id,"土豆total接口json数据解析失败","doWithResErr","total")
                return callback(e)
            }
            task.total = result.video_count
            this.getList( task, result.video_count, (err) => {
                if(err){
                    return callback(err)
                }
                callback()
            })
        })
    }
    getList ( task, total, callback ) {
        let sign = 1,
            page,
            option
        if(total % 40 == 0 ){
            page = total / 40
        }else{
            page = Math.ceil(total / 40)
        }
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                // logger.debug('开始获取第' + sign + '页视频列表')
                option = {
                    url: api.tudou.newList + `&uid=${task.id}&page=${sign}`
                }
                request.get(logger,option, (err,result) => {
                    this.storaging.totalStorage ("tudou",option.url,"list")
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
                        this.storaging.errStoraging('tudou',option.url,task.id,err.code || "error",errType,"list")
                        return cb()
                    }
                    if(result.statusCode && result.statusCode != 200){
                        this.storaging.errStoraging('tudou',option.url,task.id,"土豆获取list接口状态码错误","statusErr","list")
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e) {
                        logger.error('土豆列表json解析失败')
                        this.storaging.errStoraging("tudou",option.url,task.id,"土豆list接口json数据解析失败","doWithResErr","list")
                        sign++
                        return cb()
                    }
                    if(!result.data){
                        this.storaging.errStoraging("tudou",option.url,task.id,"土豆list接口返回数据为空","resultErr","list")
                        sign++
                        return cb()
                    }
                    let list = result.data.data
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
            },
            (err,result) => {
                callback()
            }
        )
    }
    deal ( task, list, callback) {
        let index = 0
        async.whilst(
            () => {
                return index < list.length
            },
            (cb) => {
                this.getInfo(task,index,list[index],(err) => {
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getInfo ( task, index, data, callback ) {
        async.parallel([
            (cb) => {
                this.getExpr( task,data.code,(err,result) => {
                    if(err){
                        return cb(err)
                    }
                    cb(null,result)
                })
            },
            (cb) => {
                this.getVideoTime(task,data.code,(err,backData) => {
                    if(err){
                        return cb(err)
                    }
                    cb(null,backData)
                })
            }
        ],(err,result) => {
            if(err){
                return callback(err)
            }
            let media = {
                author: task.name,
                platform: 12,
                bid: task.id,
                aid: data.code,
                title: data.title ? data.title.replace(/"/g,'') : 'btwk_caihongip',
                desc: data.comments ? data.comments.replace(/"/g,'') : '',
                play_num: data.playNum,
                save_num: result[0].favorNum,
                comment_num: result[0].commentNum,
                support: result[0].digNum,
                step: result[0].buryNum,
                v_img: data.picurl,
                long_t: this.long_t(data.formatTotalTime),
                class: result[1].class,
                tag: result[1].tag,
                a_create_time: data.pubDate.toString().substring(0,10)
            }
            if(!media.class){
                delete media.class
            }
            if(!media.tag){
                delete media.tag
            }
            if(!media.play_num){
                return
            }
            // this.core.MSDB.hget(`apiMonitor:play_num`,`tudou_${media.aid}`,(err,result)=>{
            //     if(err){
            //         logger.debug("读取redis出错")
            //         return
            //     }
            //     if(result > media.play_num){
            //         this.storaging.errStoraging("tudou","",task.id,`土豆播放量减少`,"playNumErr","list",media.aid,`${result}/${media.play_num}`)
            //     }
            //     this.storaging.sendDb(media/*,task.id,"list"*/)
            // })
            this.storaging.playNumStorage(media,"list")
            callback()
        })
    }
    getVideoTime ( task,id, callback){
        let option = {
            url: api.tudou.mediaTime + id
        }
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("tudou",option.url,"videoTime")
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
                this.storaging.errStoraging('tudou',option.url,task.id,err.code || "error",errType,"videoTime")
                return callback(err)
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('tudou',option.url,task.id,"土豆获取videoTime接口状态码错误","statusErr","videoTime")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                this.storaging.errStoraging("tudou",option.url,task.id,"土豆videoTime接口json数据解析失败","doWithResErr","videoTime")
                return callback(e)
            }
            // if(!result.tag||!result.cname){
            //     this.storaging.errStoraging("tudou",option.url,task.id,"土豆videoTime接口返回数据错误","resultErr","videoTime")
            //     return callback(result)
            // }
            const data = {
                tag: result.tag,
                class: result.cname
            }
            callback(null,data)
        })
    }
    getExpr ( task,code,callback) {
        let option = {
            url: api.tudou.expr + code
        }
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("tudou",option.url,"Expr")
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
                this.storaging.errStoraging('tudou',option.url,task.id,err.code || "error",errType,"Expr")
                return callback(err)
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('tudou',option.url,task.id,"土豆获取Expr接口状态码错误","statusErr","Expr")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                this.storaging.errStoraging("tudou",option.url,task.id,"土豆Expr接口json数据解析失败","doWithResErr","Expr")
                return callback(e)
            }
            if(result.error != 0){
                this.storaging.errStoraging("tudou",option.url,task.id,"土豆Expr接口返回信息状态码错误","responseErr","Expr")
                return callback(true)
            }
            if(!result.data){
                this.storaging.errStoraging("tudou",option.url,task.id,"土豆Expr接口返回数据为空","resultErr","Expr")
                return callback(true)
            }
            callback(null,result.data)
        })

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
}
module.exports = dealWith