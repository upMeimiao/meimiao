/**
 * Created by yunsong on 16/7/28.
 */
const async = require( 'async' )
const request = require( '../../lib/request' )

let logger,api
class dealWith {
    constructor (spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
    }
    ku6 (task,callback) {
        task.total = 0
        async.parallel({
            user: (callback) => {
                this.getUser( task, task.id, (err,result) => {
                    if(err){
                        return callback(err,result)
                    }
                    callback(err,result)
                })
            },
            media: (callback) => {
                this.getTotal( task, task.id, (err,result) => {
                    if(err){
                        return callback(err)
                    }
                    callback(err,result)
                })
            }
        },(err,result) => {
            if(err){
                return callback(err)
            }
            callback(err,result)
        })
    }
    getUser ( task, id, callback){
        let option = {
            url: api.ku6.fansNum + id
        }
        request.get(logger, option, (err,result) => {
            this.storaging.totalStorage ("ku6",option.url,"user")
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
                this.storaging.errStoraging('ku6',option.url,task.id,err.code || "error",errType,"user")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('ku6',option.url,task.id,`酷6获取user接口状态码错误${result.statusCode}`,"statusErr","user")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                this.storaging.errStoraging('ku6',option.url,task.id,"酷6获取user接口json数据解析失败","doWithResErr","user")
                return callback(e)
            }
            let fans = result.data.subscriptions ? result.data.subscriptions : ''
            callback()
                // ,
                // user = {
                //     platform: 14,
                //     bid: task.id,
                //     fans_num: num
                // }
        })
    }
    getTotal ( task, id, callback){
        // logger.debug('开始获取视频总数')
        let option = {
            url: api.ku6.listNum + id,
            referer: `http://v.ku6.com/u /${task.id}/profile.html`,
            ua: 1
        }
        request.get(logger, option, (err,result) => {
            this.storaging.totalStorage ("ku6",option.url,"total")
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
                this.storaging.errStoraging('ku6',option.url,task.id,err.code || "error",errType,"total")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('ku6',option.url,task.id,`酷6获取全部视频接口状态码错误${result.statusCode}`,"statusErr","total")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                this.storaging.errStoraging('ku6',option.url,task.id,"酷6获取全部视频接口json数据解析失败","doWithResErr","total")
                return callback(e)
            }
            let total = result.data.videoCount
            task.total = total
            if(!total){
                this.storaging.errStoraging('ku6',option.url,task.id,"酷6获取全部视频接口返回数据错误","resultErr","total")
                return callback(result)
            }
            this.getList( task, total, (err,result) => {
                if(err){
                    return callback(err)
                }
                callback(err,result)
            })
        })
    }
    getList ( task, total, callback ) {
        let sign = 1,
            newSign = 0,
            page,
            option
        if(total % 20 == 0 ){
            page = total / 20
        }else{
            page = Math.ceil(total / 20)
        }
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                // logger.debug('开始获取第' + sign + '页视频列表')
                option = {
                    url: api.ku6.allInfo + task.id + "&pn=" + newSign
                }
                request.get(logger, option, (err,result) => {
                    this.storaging.totalStorage ("ku6",option.url,"list")
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
                        this.storaging.errStoraging('ku6',option.url,task.id,err.code || "error",errType,"list")
                        return cb()
                    }
                    if(result.statusCode && result.statusCode != 200){
                        this.storaging.errStoraging('ku6',option.url,task.id,"酷6获取list接口状态码错误","statusErr","list")
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e){
                        logger.error('json数据解析失败')
                        this.storaging.errStoraging('ku6',option.url,task.id,"酷6获取全部视频接口json数据解析失败","doWithResErr","list")
                        sign++
                        newSign++
                        return cb()
                    }
                    let list = result.data
                    if(list){
                        this.deal( task,list, () => {
                            sign++
                            newSign++
                            cb()
                        })
                    }else{
                        sign++
                        newSign++
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
                this.getInfo( task, index, list[index],(err) => {
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
        //logger.debug(data)
        let time = data.uploadtime,
            a_create_time = time.substring(0,10),
            media = {
                author: task.name,
                platform: 14,
                bid: task.id,
                aid: data.vid,
                title: data.title ? data.title.substr(0,100).replace(/"/g,'') : 'btwk_caihongip',
                desc: data.desc.substr(0,100).replace(/"/g,''),
                play_num: data.viewed,
                support: data.liked,
                step: data.disliked,
                a_create_time: a_create_time,
                long_t: data.videotime,
                v_img: this._v_img(data.picpath),
                tag: this._tag(data.tag),
                class: this._class(data.catename)
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
        //         this.storaging.errStoraging('ku6',`${api.ku6.allInfo}${task.id}&pn=${index}`,task.id,`酷6视频播放量减少`,"playNumErr","info",media.aid,`${result}/${media.play_num}`)
        //     }
        //     this.storaging.sendDb(media/*,task.id,"info"*/)
        // })
        this.storaging.playNumStorage(media,"info")
        callback()
    }
    _tag ( raw ){
        if(!raw){
            return ''
        }
        raw = raw.split(' ')
        let _tagArr = []
        if(raw.length != 0){
            for(let i in raw){
                _tagArr.push(raw[i])
            }
            return _tagArr.join(',')
        }
        return ''
    }
    _class ( raw ){
        if(typeof raw == 'string'){
            return raw
        }
        if(Object.prototype.toString.call(raw) === '[object Array]'){
            return raw.join(',')
        }
        return ''
    }
    _v_img ( raw ){
        if(!raw){
            return ''
        }
        if(!raw.startsWith('http://') || !raw.startsWith('https://')){
            return 'http://'+raw
        }
        return raw
    }
}
module.exports = dealWith