/**
 * Created by junhao on 16/6/21.
 */
const async = require( 'async' )
const request = require( '../../lib/request' )
let logger,api
const jsonp = function (data) {
    return data
}
class souhuDealWith {
    constructor ( spiderCore ) {
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
        api = this.settings.spiderAPI
        logger = this.settings.logger
        logger.trace('souhuDealWith instantiation ...')
    }
    souhu ( task, callback ) {
        task.total = 0
        async.parallel({
            user: (callback) => {
                this.getUser(task,(err,result)=>{
                    callback(err,result)
                })
            },
            media: (callback) => {
                this.getTotal(task,(err,result)=>{
                    callback(err,result)
                })
            }
        }, ( err, result ) => {
            if ( err ) {
                return callback(err)
            }
            callback(err,result)
        })
    }
    getUser ( task, callback) {
        let option ={
            url: api.souhu.newUser + task.id + ".json?api_key=" + api.souhu.key +  "&_=" + (new Date()).getTime()
        }
        request.get ( logger,option,(err,result)=>{
            this.storaging.totalStorage ("souhu",option.url,"user")
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
                this.storaging.errStoraging('souhu',option.url,task.id,err.code || "error",errType,"user")
                return callback(err)
            }
            if( result.statusCode != 200){
                this.storaging.errStoraging('souhu',option.url,task.id,`搜狐获取粉丝接口状态码错误${result.statusCode}`,"statusErr","user")
                return callback(result.statusCode)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                this.storaging.errStoraging('souhu',option.url,task.id,"搜狐获取粉丝json数据解析失败","doWithResErr","user")
                return callback(e)
            }
            if(!result.data){
                this.storaging.errStoraging('souhu',option.url,task.id,"搜狐获取粉丝返回数据错误","resultErr","user")
                return callback(result)
            }
            let userInfo = result.data,
                user = {
                    platform: 9,
                    bid: userInfo.user_id,
                    fans_num: userInfo.total_fans_count
                }
            callback()
        })
    }
    getTotal ( task, callback ) {
        let option = {
            url: api.souhu.newList + task.id + "&page=1&_=" + new Date().getTime()
        }
        request.get(logger,option, (err,result) => {
            this.storaging.totalStorage ("souhu",option.url,"total")
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
                this.storaging.errStoraging('souhu',option.url,task.id,err.code || "error",errType,"total")
                return callback(err)
            }
            if( result.statusCode != 200){
                this.storaging.errStoraging('souhu',option.url,task.id,`搜狐获取total接口状态码错误${result.statusCode}`,"statusErr","total")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                this.storaging.errStoraging('souhu',option.url,task.id,"搜狐获取total接口json数据解析失败","doWithResErr","total")
                return callback(e)
            }
            if(!result.data.totalCount){
                this.storaging.errStoraging('souhu',option.url,task.id,"搜狐获取total接口返回数据错误","resultErr","total")
                return callback()
            }
            let total  = result.data.totalCount
            task.total = total
            this.getList(task,total, () => {
                callback()
            })
        })
    }
    getList ( task, total, callback ) {
        let index = 1, page, option
        if(total % 20 != 0){
            page = Math.ceil(total / 20)
        }else{
            page = total / 20
        }
        async.whilst(
            () => {
                return index <= page
            },
            (cb) => {
                option = {
                    url: api.souhu.newList + task.id + "&page=" + index + "&_=" + new Date().getTime()
                }
                request.get(logger,option, (err,result) => {
                    this.storaging.totalStorage ("souhu",option.url,"list")
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
                        this.storaging.errStoraging('souhu',option.url,task.id,err.code || "error",errType,"list")
                        return cb()
                    }
                    if(result.statusCode && result.statusCode != 200){
                        this.storaging.errStoraging('souhu',option.url,task.id,`搜狐获取list接口状态码错误${result.statusCode}`,"statusErr","list")
                        return cb(result.statusCode)
                    }
                    try{
                        result = JSON.parse(result.body)
                    }catch (e){
                        this.storaging.errStoraging('souhu',option.url,task.id,"搜狐获取list接口json数据解析失败","doWithResErr","list")
                        return cb()
                    }
                    let data = result.data.videos
                    if(!data){
                        index++
                        return cb()
                    }
                    this.deal(task,data, () => {
                        index++
                        cb()
                    })
                })
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
            (cb) => {
                // let video = list[index]
                // video = {
                //     aid: video.aid,
                //     id: video.vid
                // }
                this.info(task,list[index].id, (err) => {
                    if(err){
                        index++
                        return cb()
                    }
                    index++
                    cb()
                })
            },
            function (err,result) {
                callback()
            }
        )
    }
    info ( task, id, callback ) {
        async.parallel([
            (cb) => {
                this.getInfo(task, id, (err,data) => {
                    if(err){
                        cb(err)
                    }else {
                        cb(null,data)
                    }
                })
            },
            (cb) => {
                this.getDigg(task, id, (err,data) => {
                    if(err){
                        cb(err)
                    }else {
                        cb(null,data)
                    }
                })
            },
            (cb) => {
                this.getCommentNum(task, id,(err,num) => {
                    if(err){
                        cb(err)
                    }else {
                        cb(null,num)
                     }
                })
            }
        ],
        (err,result) => {
            //logger.debug(result)
            if(err){
                return callback(err)
            }
            let media = {
                author: task.name,
                platform: 9,
                bid: task.id,
                aid: id,
                title: result[0].title.substr(0,100).replace(/"/g,''),
                desc: result[0].desc.substr(0,100).replace(/"/g,''),
                play_num: result[0].play,
                comment_num: result[2],
                support:result[1].up,
                step:result[1].down,
                a_create_time: result[0].time,
                long_t: result[0].seconds,
                tag: result[0].tag,
                class: result[0].type,
                v_img: result[0].picurl
            }
            if(!media.class){
                delete media.class
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
            //         this.storaging.errStoraging('souhu',"",task.id,`搜狐播放量减少`,"playNumErr","info",media.aid,`${result}/${media.play_num}`)
            //     }
            //     this.storaging.sendDb(media/*,task.id,"info"*/)
            // })
            this.storaging.playNumStorage(media,"info")
            callback()
        })
    }
    getInfo ( task, id, callback ) {
        let option = {
            url: api.souhu.videoInfo + id + ".json?site=2&api_key=695fe827ffeb7d74260a813025970bd5&aid=0"
        }
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("souhu",option.url,"info")
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
                this.storaging.errStoraging('souhu',option.url,task.id,err.code || "error",errType,"info")
                return callback(err)
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('souhu',option.url,task.id,`搜狐获取info接口状态码错误${result.statusCode}`,"statusErr","info")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                this.storaging.errStoraging('souhu',option.url,task.id,"搜狐获取info接口json数据解析失败","doWithResErr","info")
                return callback(e)
            }
            if(!result.data){
                this.storaging.errStoraging('souhu',option.url,task.id,"搜狐获取info接口返回结果错误","resultErr","info")
                return callback(result)
            }
            let backData  = result.data
            let data = {
                title: backData.video_name,
                desc: backData.video_desc,
                time: Math.round(backData.create_time / 1000),
                play: backData.play_count,
                type : backData.first_cate_name || null,
                tag : this._tag(backData.keyword),
                seconds : backData.total_duration,
                picurl : this._picUrl(backData)
            }
            // this.storaging.succStorage("souhu",option.url,"info")
            callback(null,data)
        })
    }
    getDigg ( task, id, callback ) {
        let option = {
                url: api.souhu.digg + id + "&_=" + (new Date()).getTime()
            }
        request.get(logger, option, (err,back) => {
            this.storaging.totalStorage ("souhu",option.url,"digg")
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
                this.storaging.errStoraging('souhu',option.url,task.id,err.code || "error",errType,"digg")
                return callback(err)
            }
            if(back.statusCode && back.statusCode != 200){
                this.storaging.errStoraging('souhu',option.url,task.id,`搜狐获取digg接口状态码错误${back.statusCode}`,"statusErr","digg")
                return callback(back.statusCode)
            }
            try{
                back = eval(back.body)
            }catch (e){
                logger.debug(back.body)
                this.storaging.errStoraging('souhu',option.url,task.id,"搜狐获取digg接口json数据解析失败","doWithResErr","digg")
                return callback(e)
            }
            let data = {
                up: back.upCount,
                down: back.downCount
            }
            callback(null,data)
        })
    }
    getCommentNum ( task, id, callback ) {
        let option = {
            url: api.souhu.comment + id
        }
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("souhu",option.url,"commentNum")
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
                this.storaging.errStoraging('souhu',option.url,task.id,err.code || "error",errType,"commentNum")
                return callback(err)
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('souhu',option.url,task.id,`搜狐获取commentNum接口状态码错误${result.statusCode}`,"statusErr","commentNum")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                this.storaging.errStoraging('souhu',option.url,task.id,"搜狐获取commentNum接口json数据解析失败","doWithResErr","commentNum")
                return callback(e)
            }
            callback(null,result.cmt_sum)
        })
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
    _picUrl ( raw ){
        if(raw.hor_w16_pic){
            return raw.hor_w16_pic
        }
        if(raw.hor_w8_pic){
            return raw.hor_w8_pic
        }
        if(raw.hor_high_pic){
            return raw.hor_high_pic
        }
        if(raw.bgCover169){
            return raw.bgCover169
        }
        if(raw.hor_big_pic){
            return raw.hor_big_pic
        }
    }
}
module.exports = souhuDealWith