const async = require( 'async' )
const moment = require('moment')
const request = require( '../lib/req' )

let logger,api

class dealWith {
    constructor(spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('./storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('budejieDealWith instantiation ...')
    }
    budejie ( task, callback) {
        task.total = 0
        this.getUser( task, ( err, result ) => {
            if(err){
                return callback(err)
            }
            callback(null, result)
        })
    }
    getUser ( task, callback) {
        let option = {
            url : api.budejie.userInfo + task.id
        }
        request.get( option, ( err, result) => {
            this.storaging.totalStorage ("budejie",option.url,"user")
            this.storaging.judgeRes ("budejie",option.url,task.id,err,result,"user")
            if(!result){
                return 
            }
            if(!result.body){
                return 
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('json数据解析失败')
                this.storaging.errStoraging('budejie',option.url,task.id,"budejie获取user接口json数据解析失败","doWithResErr","user")
                return callback(e)
            }
            let userInfo = result.data,
                user = {
                    platform: 18,
                    bid: userInfo.id,
                    fans_num: userInfo.fans_count
                }
            task.total = userInfo.tiezi_count
            this.getList( task, userInfo.tiezi_count, (err) => {
                if(err){
                    return callback(err)
                }
                callback(null,'视频信息已找到')
            })
        })
    }
    getList ( task, total, callback ) {
        let sign = 1,np = 0,
            page,
            option = {}
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
                option.url = `${api.budejie.medialist}${task.id}/1/desc/bs0315-iphone-4.3/${np}-20.json`
                request.get(option, (err,result) => {
                    this.storaging.totalStorage ("budejie",option.url,"list")
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
                        this.storaging.errStoraging('budejie',option.url,task.id,err.code || "error",errType,"list")
                        sign++
                        return cb()
                    }
                    if(result.statusCode && result.statusCode != 200){
                        this.storaging.errStoraging('budejie',option.url,task.id,"budejie  list接口状态码错误","statusErr","list")
                        return callback(true)
                    }
                    try {
                        result = JSON.parse(result.body)
                    } catch (e) {
                        logger.error('json数据解析失败')
                        this.storaging.errStoraging('budejie',option.url,task.id,"budejie获取user接口json数据解析失败","doWithResErr","list")
                        sign++
                        return cb()
                    }
                    let data = result.list
                    np = result.info.np
                    this.deal( task, data, np,() => {
                        sign++
                        cb()
                    })
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    deal ( task, list, np, callback ) {
        let index = 0,video,media
        async.whilst(
            () => {
                return index < list.length
            },
            (cb) => {
                video = list[index]
                if(video.type != 'video') {
                    index++
                    return cb()
                }
                media = {
                    author: task.name,
                    platform: 18,
                    bid: task.id,
                    aid: video.id,
                    title: video.text ? video.text.substr(0,100).replace(/"/g,'') : 'btwk_caihongip',
                    desc: video.text.substr(0,100).replace(/"/g,''),
                    play_num: video.video.playcount,
                    forward_num: video.forward,
                    comment_num: video.comment,
                    support: video.up,
                    step: video.down,
                    a_create_time: moment(video.passtime).unix(),
                    long_t: video.video.duration,
                    v_img: this._v_img(video.video.thumbnail),
                    tag: this._tag(video.tags)
                }
                this.core.MSDB.hget(`apiMonitor:play_num`,`${media.author}_${media.aid}`,(err,result)=>{
                    if(err){
                        logger.debug("读取redis出错")
                        return
                    }
                    if(result > media.play_num){
                        this.storaging.errStoraging('budejie',`${api.budejie.medialist}${task.id}/1/desc/bs0315-iphone-4.3/${np}-20.json`,task.id,`budejie视频播放量减少`,"playNumErr","list",media.aid,`${result}/${media.play_num}`)
                        return
                    }
                    this.storaging.sendDb(media/*,task.id,"list"*/)
                })
                index++
                cb()
            },
            (err,result) => {
                callback()
            }
        )
    }
    _tag ( raw ) {
        let _tagArr = []
        if(!raw){
            return ''
        }
        if(Object.prototype.toString.call(raw) === '[object Array]' && raw.length == 0){
            return ''
        }
        if(Object.prototype.toString.call(raw) === '[object Array]' && raw.length != 0){
            for( let i in raw){
                _tagArr.push(raw[i].name)
            }
            return _tagArr.join(',')
        }
        return ''
    }
    _v_img ( raw ) {
        if(!raw){
            return ''
        }
        if(typeof raw == 'string'){
            return raw
        }
        if(Object.prototype.toString.call(raw) === '[object Array]' && raw.length == 0){
            return ''
        }
        if(Object.prototype.toString.call(raw) === '[object Array]' && raw.length != 0){
            return raw[0]
        }
        return ''
    }
}
module.exports = dealWith