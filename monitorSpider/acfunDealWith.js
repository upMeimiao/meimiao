/**
 * Created by yunsong on 16/9/7.
 */
const async = require( 'async' )
const cheerio = require( 'cheerio' )
const request = require('../lib/request.js')
const channels = require('../spider/acfun/channels')

let logger,api
class dealWith {
    constructor (spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('./storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('acfunDealWith instantiation ...')
    }
    acfun (task,callback) {
        task.total = 0
        async.parallel({
            user: (callback) => {
                this.getUser( task, (err, result) => {
                    if(err){
                        return callback(err)
                    }
                    callback(err, result)
                })
            },
            media: (callback) => {
                this.getTotal( task, (err, result) => {
                    if(err){
                        return callback(err)
                    }
                    callback(err, result)
                })
            }
        },(err,result) => {
            if(err){
                return callback(err)
            }
            callback(err, result)
        })
    }
    getUser ( task, callback){
        let option = {
            url: api.acfun.userInfo + task.id,
            referer: `http://m.acfun.tv/details?upid=${task.id}`,
            deviceType: 2,
            ua: 2
        }
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("weishi",option.url,"user")
            this.storaging.judgeRes ("weishi",option.url,task.id,err,result,"user")
            if(!result){
                return 
            }
            if(!result.body){
                return 
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('acfun粉丝json数据解析失败')
                this.storaging.errStoraging('acfun',option.url,task.id,"acfun获取user接口json数据解析失败","doWithResErr","user")
                return callback(e)
            }
            // let data = result.data,
            //     user = {
            //         platform: task.p,
            //         bid: task.id,
            //         fans_num: data.followed
            //     }
        })
    }
    getTotal ( task, callback){
        // logger.debug('开始获取视频总数')
        let option = {
            url: api.acfun.media + `${task.id}&pageNo=1`,
            referer: `http://www.aixifan.com/u/${task.id}.aspx`,
            ua: 1
        }
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("acfun",option.url,"total")
            this.storaging.judgeRes ("acfun",option.url,task.id,err,result,"total")
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
                this.storaging.errStoraging('acfun',option.url,task.id,"acfun获取total接口json数据解析失败","doWithResErr","total")
                return callback(e)
            }
            task.total = result.totalcount
            let page = result.totalpage
            this.getList( task, page, (err,result) => {
                if(err){
                    return callback(err)
                }
                callback(err,result)
            })
        })
    }
    getList ( task, page, callback ) {
        let sign = 1,
            option
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                option = {
                    url: api.acfun.media + `${task.id}&pageNo=${sign}`,
                    referer: `http://www.aixifan.com/u/${task.id}.aspx`,
                    ua: 1
                }
                request.get(logger,option, (err,result) => {
                    this.storaging.totalStorage ("acfun",option.url,"list")
                    if(err){
                        let errType
                        if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                            errType = "timeoutErr"
                        } else{
                            errType = "responseErr"
                        }
                        this.storaging.errStoraging('acfun',option.url,task.id,err.code || err,errType,"list")
                        return cb()
                    }
                    if(!result){
                        this.storaging.errStoraging('acfun',option.url,task.id,"acfun获取list接口无返回数据","resultErr","list")
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e){
                        logger.error('json数据解析失败')
                        this.storaging.errStoraging('acfun',option.url,task.id,"acfun获取list接口json数据解析失败","doWithResErr","list")
                        return callback(e)
                    }
                    let list = result.contents
                    if(list){
                        this.deal( task,option.url,list, () => {
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
    deal ( task, url, list, callback) {
        let index = 0
        async.whilst(
            () => {
                return index < list.length
            },
            (cb) => {
                this.getInfo( task, url, list[index],(err) => {
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getInfo ( task, url, data, callback ) {
        if(!data.vid){
            return callback()
        }
        let time = data.releaseDate,
            a_create_time = time.toString().substring(0,10),
            media = {
                author: task.name,
                platform: 22,
                bid: task.id,
                aid: data.aid,
                title: data.title.substr(0,100).replace(/"/g,''),
                desc: data.description.substr(0,100).replace(/"/g,''),
                play_num: data.views,
                save_num: data.stows,
                comment_num: data.comments,
                a_create_time: a_create_time,
                long_t: data.time,
                v_img: data.titleImg,
                tag: this._tags(data.tags),
                class: channels.get(Number(data.channelId))
            }
        this.core.MSDB.hget(`apiMonitor:${media.author}:play_num:${media.aid}`,"play_num",(err,result)=>{
            if(err){
                logger.debug("读取redis出错")
                return
            }
            if(result > media.play_num){
                this.storaging.errStoraging('acfun',`${url}`,task.id,`acfun视频${media.aid}播放量减少`,"playNumErr","list")
                return
            }
        })
        this.storaging.sendDb(media)
        callback()
    }
    _tags( raw ){
        if(typeof raw == 'string'){
            return raw
        }
        if(Object.prototype.toString.call(raw) === '[object Array]'){
            return raw.join(',')
        }
        return ''
    }
}
module.exports = dealWith