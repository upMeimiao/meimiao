/**
 * Created by yunsong on 16/8/3.
 */
const async = require( 'async' )
const request = require( '../lib/req' )
const moment = require( 'moment' )
const newRequest = require( 'request' )

let logger,api
class dealWith {
    constructor (spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('./storaging'))(this)
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
    getTotal (task,callback){
        // logger.debug('开始获取视频总数')
        let option = {
            url: api.xiaoying.userInfo + task.id
        }
        request.get(option,(err,result) => {
            this.storaging.totalStorage ("xiaoying",option.url,"total")
            this.storaging.judgeRes ("xiaoying",option.url,task.id,err,result,"total")
            if(!result){
                return 
            }
            if(!result.body){
                return 
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('json数据解析失败')
                this.storaging.errStoraging('xiaoying',option.url,task.id,"xiaoying获取全部视频接口json数据解析失败","doWithResErr","total")
                return callback(e)
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
                    if(err){
                        let errType
                        if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                            errType = "timeoutErr"
                        } else{
                            errType = "responseErr"
                        }
                        // logger.error(errType)
                        this.storaging.errStoraging('xiaoying',options.url,task.id,err.code || "error",errType,"list")
                        return callback(err);
                    }
                    if(!response || !body){
                        this.storaging.errStoraging('xiaoying',option.url,task.id,"xiaoying获取list接口无返回数据","responseErr","list")
                        return callback()
                    }
                    try{
                        body = JSON.parse(body);
                    } catch (e){
                        logger.error('json数据解析失败');
                        this.storaging.errStoraging('xiaoying',options.url,task.id,"xiaoying获取视频列表接口json数据解析失败","doWithResErr","list")
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
        request.get(option, (err,result) => {
            this.storaging.totalStorage ("xiaoying",option.url,"info")
            this.storaging.judgeRes ("xiaoying",option.url,task.id,err,result,"info")
            if(!result){
                return 
            }
            if(!result.body){
                return
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('json数据解析失败')
                this.storaging.errStoraging('xiaoying',option.url,task.id,"xiaoying获取视频信息接口json数据解析失败","doWithResErr","info")
                return callback(e)
            }
            if(!result.videoinfo){
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
            this.core.MSDB.hget(`apiMonitor:play_num`,`${media.author}_${media.aid}`,(err,result)=>{
                if(err){
                    logger.debug("读取redis出错")
                    return
                }
                if(result > media.play_num){
                    this.storaging.errStoraging('xiaoying',`${option.url}`,task.id,`爱奇艺视频${media.aid}播放量减少${result}(纪录)/${media.play_num}(本次)`,"playNumErr","info")
                    return
                }
            })
            // logger.debug("xiaoying media==============",media)
            this.storaging.sendDb(media)
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