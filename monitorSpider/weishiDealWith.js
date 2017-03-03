const async = require( 'async' )
const request = require( '../spider/lib/req' )

let logger,api
class dealWith {
    constructor ( spiderCore ) {
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('./storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('weishiDealWith instantiation ...')
    }
    weishi ( task, callback ) {
        task.total = 0
        this.getUser( task, ( err, result ) => {
            if(err){
                return callback(err)
            }
            callback(err, result)
        })
    }
    getUser ( task, callback ) {
        let option = {
            url: api.weishi.userInfo + task.id,
            referer: `http://weishi.qq.com/u/${task.id}`
        }
        request.get(option, ( err, result ) => {
            this.storaging.totalStorage ("weishi",option.url,"user")
            this.storaging.judgeRes ("weishi",option.url,task.id,err,result,"user")
            if(!result){
                return 
            }
            if(!result.body){
                return 
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                this.storaging.errStoraging('weishi',option.url,task.id,"weishi获取user接口json数据解析失败","doWithResErr","user")
                // logger.info(result)
                return callback(e)
            }
            let data = result.data,
                user = {
                    platform: 16,
                    bid: data.uid,
                    fans_num: data.follower_num
                }
            task.total = data.tweet_num
            this.getList( task, data.tweet_num, (err,result) => {
                if(err){
                    return callback(err)
                }
                callback(null,result)
            })
        })
    }
    getList ( task, total, callback ) {
        let sign = 1,lastid,pagetime,
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
                if(!lastid){
                    option.url = api.weishi.list + `${task.id}&_=${new Date().getTime()}`
                }else{
                    option.url = api.weishi.list + `${task.id}&lastid=${lastid}&pagetime=${pagetime}&_=${new Date().getTime()}`
                }
                option.referer = `http://weishi.qq.com/u/${task.id}`
                request.get(option, (err,result) => {
                    this.storaging.totalStorage ("weishi",option.url,"list")
                    if(err){
                        // logger.error( 'occur error : ' + err )
                        // logger.error(err,err.code,err.Error)
                        let errType
                        if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                            errType = "timeoutErr"
                        } else{
                            errType = "responseErr"
                        }
                        // logger.error(errType)
                        this.storaging.errStoraging('weishi',option.url,task.id,err.code || err,errType,"list")
                        sign++
                        return cb()
                    }
                    if(result.statusCode != 200){
                        this.storaging.errStoraging('weishi',option.url,task.id,"weishi获取list接口状态码错误","responseErr","list")
                        sign++
                        return cb()
                    }
                    try {
                        result = JSON.parse(result.body)
                    } catch (e) {
                        logger.error('json数据解析失败')
                        this.storaging.errStoraging('weishi',option.url,task.id,"weishi获取list接口json数据解析失败","doWithResErr","list")
                        sign++
                        return cb()
                    }
                    if(result.errcode != 0){
                        sign++
                        return cb()
                    }
                    if(!result.data){
                        sign++
                        return cb()
                    }
                    let r_data = result.data,
                        data = r_data.info
                    if(Object.prototype.toString.call(data) !== '[object Array]'){
                        sign++
                        return cb()
                    }
                    lastid = data[data.length-1].id
                    pagetime = data[data.length-1].timestamp
                    this.deal( task, option.url, data, () => {
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
    deal ( task, url ,list, callback ) {
        let index = 0,video,media
        async.whilst(
            () => {
                return index < list.length
            },
            (cb) => {
                video = list[index]
                media = {
                    author: video.name,
                    platform: 16,
                    bid: task.id,
                    aid: video.id,
                    title: video.origtext ? video.origtext.substr(0,80).replace(/"/g,'') : 'btwk_caihongip',
                    desc: video.origtext ? video.origtext.substr(0,100).replace(/"/g,'') : '',
                    play_num: video.playCount,
                    forward_num: video.rtcount,
                    comment_num: video.mcount,
                    support: video.digcount,
                    a_create_time: video.timestamp,
                    long_t: video.newvideos ? this._long_t(video.newvideos) : null,
                    v_img: video.newvideos ? this._v_img(video) : null,
                    class: video.topic ? this._class(video.topic) : null,
                    tag: video.tags ? this._class(video.tags): null
                }
                if(!media.long_t){
                    delete media.long_t
                }
                if(!media.v_img){
                    delete media.v_img
                }
                if(!media.class){
                    delete media.class
                }
                if(!media.tag){
                    delete media.tag
                }
                this.core.MSDB.hget(`apiMonitor:${media.author}:play_num:${media.aid}`,"play_num",(err,result)=>{
                    if(err){
                        logger.debug("读取redis出错")
                        return
                    }
                    if(result > media.play_num){
                        this.storaging.errStoraging('weishi',`${url}`,task.id,`微视视频${media.aid}播放量减少`,"resultErr","list")
                        return
                    }
                })
                index++
                this.storaging.sendDb(media)
                cb()
            },
            (err,result) => {
                callback()
            }
        )
    }
    _long_t ( raw ){
        if( !raw ){
            return ''
        }
        if(raw.length != 0){
            return raw[0].duration
        }
        return ''
    }
    _v_img ( raw ){
        if( !raw.newvideos && !raw.videos ){
            return ''
        }
        if(raw.newvideos && raw.newvideos.length > 0){
            return raw.newvideos[0].picurl
        }
        if(raw.videos && raw.videos.length > 0){
            return raw.videos[0].picurl
        }
        return ''
    }
    _class ( raw ){
        if( !raw ){
            return ''
        }
        let _classArr = []
        if(Object.prototype.toString.call(raw) === '[object Array]' && raw.length == 0){
            return ''
        }
        if(Object.prototype.toString.call(raw) === '[object Array]' && raw.length != 0){
            for( let i in raw){
                _classArr.push(raw[i].name)
            }
            return _classArr.join(',')
        }
        return ''
    }
}
module.exports = dealWith