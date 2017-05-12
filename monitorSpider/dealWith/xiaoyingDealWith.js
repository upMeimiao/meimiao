/**
 * Created by yunsong on 16/8/3.
 */
const async = require( 'async' )
const request = require( '../../lib/request' )
const moment = require( 'moment' )
const newRequest = require( 'request' )

let logger,api
class dealWith {
    constructor (spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('xiaoyingDealWith instantiation ...')
    }
    xiaoying (task,callback) {
        task.total = 0
        this.getTotal (task,(err,result) => {
            if(err){
                return callback(err)
            }
            callback(null,result)
        })
    }
    getH (callback) {
        const options = { method: 'POST',
            url: 'http://viva.api.xiaoying.co/api/rest/d/dg',
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'User-Agent':'XiaoYing/5.3.5 (iPhone; iOS 10.1.1; Scale/3.00)'
            },
            form: {
                a: 'dg',
                b: '1.0',
                c: '20007700',
                e: 'DIqmr4fb',
                i: '{"a":"[I]a8675492c8816a22c28a1b97f890ae144a8a4fa3","b":"zh_CN"}',
                j: '6a0ea6a13e76e627121ee75c2b371ef2',
                k: 'xysdkios20130711'
            }
        }
        newRequest(options, (error, response, body) => {
            if (error) {
                return callback(error)
            }
            try {
                body = JSON.parse(body)
            } catch (e){
                return callback(e)
            }
            let h = body.a
            callback(null,h.a)
        })
    }
    getTotal (task,callback){
        let option = {
            url: api.xiaoying.userInfo + task.id
        }
        request.get(logger,option,(err,result) => {
            this.storaging.totalStorage ("xiaoying",option.url,"total")
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
                this.storaging.errStoraging('xiaoying',option.url,task.id,err.code || "error",errType,"total")
                return callback(err)
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('xiaoying',option.url,task.id,`小影获取total接口状态码错误${result.statusCode}`,"statusErr","total")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                this.storaging.errStoraging('xiaoying',option.url,task.id,"小影获取total接口json数据解析失败","doWithResErr","total")
                return callback(e)
            }
            if(!result.user||result.user && (!result.user.fanscount||!result.user.videocount)){
                this.storaging.errStoraging('xiaoying',option.url,task.id,"小影获取total接口返回数据错误","resultErr","total")
                return callback(result)
            }
            let user = {
                platform: 17,
                bid: task.id,
                fans_num: result.user.fanscount
            }
            task.total = result.user.videocount
            this.getList( task, result.user.videocount, (err,result) => {
                if(err){
                    return callback(err)
                }
                callback(null,result)
            })
        })
    }
    getList( task, total, callback) {
        let sign = 1,
            page
        if(total%20 == 0){
            page = total / 20
        }else{
            page = Math.ceil(total/20)
        }
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                // logger.debug('开始获取xiaoying第' + sign + '页视频列表')
                let options = {
                    method: 'POST',
                    url: api.xiaoying.List,
                    headers:{
                        'content-type': 'application/x-www-form-urlencoded',
                        'user-agent': 'XiaoYing/5.0.5 (iPhone; iOS 9.3.3; Scale/3.00)'
                    },
                    form:{
                        a: 'vq',
                        b: '1.0',
                        c: 20006700,
                        e: 'DIqmr4fb',
                        h: this.core.h,
                        i: `{"a":"${task.id}","b":20,"c":${sign}}`,
                        j: '21f1acbe43a8d2adaa5137312c44301e' ,
                        k: 'xysdkios20130711'
                    }
                }
                newRequest(options, (err, response, body) => {
                    this.storaging.totalStorage ("xiaoying",options.url,"list")
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
                        // logger.error(errType)
                        this.storaging.errStoraging('xiaoying',options.url,task.id,err.code || "error",errType,"list")
                        return callback(err);
                    }
                    if(response.statusCode && response.statusCode != 200){
                        logger.debug(`xiaoying获取list接口状态码错误${response.statusCode}`)
                        this.storaging.errStoraging('xiaoying',options.url,task.id,`小影获取list接口状态码错误${response.statusCode}`,"statusErr","list")
                        return callback(response.statusCode)
                    }
                    try{
                        body = JSON.parse(body);
                    } catch (e){
                        this.storaging.errStoraging('xiaoying',options.url,task.id,"小影获取list接口json数据解析失败","doWithResErr","list")
                        return callback(e);
                    }
                    let list = body.f;
                    if(list){
                        this.deal(task,list,() => {
                            sign++;
                            cb();
                        })
                    }else{
                        sign++;
                        cb();
                    }
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    deal(task, list,callback) {
        let index = 0
        async.whilst(
            () => {
                return index < list.length
            },
            (cb) => {
                this.getInfo( task, list[index],(err) => {
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getInfo ( task, data, callback ) {
        let option = {
            url: api.xiaoying.videoInfo + data.l
        }
        request.get(logger, option, (err,result) => {
            this.storaging.totalStorage ("xiaoying",option.url,"info")
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
                this.storaging.errStoraging('xiaoying',option.url,task.id,err.code || "error",errType,"info")
                return callback(err)
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('xiaoying',option.url,task.id,`小影获取info接口状态码错误${result.statusCode}`,"statusErr","info")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                this.storaging.errStoraging('xiaoying',option.url,task.id,"小影获取info接口json数据解析失败","doWithResErr","info")
                return callback(e)
            }
            if(!result.videoinfo){
                this.storaging.errStoraging('xiaoying',option.url,task.id,"小影获取info接口异常错误","resultErr","info")
                return callback('异常错误')
            }
            let time = result.videoinfo.publishtime,
                a_create_time = moment(time, ["YYYYMMDDHHmmss"], true).unix(),
                media = {
                    author: task.name,
                    platform: 17,
                    bid: task.id,
                    aid: result.videoinfo.puid,
                    title: result.videoinfo.title.substr(0,100).replace(/"/g,''),
                    desc: result.videoinfo.desc.substr(0,100).replace(/"/g,''),
                    tag: result.videoinfo.tags,
                    v_img: result.videoinfo.coverurl,
                    long_t: this.long_t(result.videoinfo.duration),
                    play_num: result.videoinfo.playcount,
                    forward_num: result.videoinfo.forwardcount,
                    comment_num: result.videoinfo.commentCount,
                    support: result.videoinfo.likecount,
                    a_create_time: a_create_time
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
            //         this.storaging.errStoraging('xiaoying',`${option.url}`,task.id,`小影播放量减少`,"playNumErr","info",media.aid,`${result}/${media.play_num}`)
            //     }
            //     this.storaging.sendDb(media/*,task.id,"info"*/)
            // })
            this.storaging.playNumStorage(media,"info")
            // logger.debug("xiaoying media==============",media)
            callback()
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