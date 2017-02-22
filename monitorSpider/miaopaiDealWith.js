/**
 * Created by junhao on 16/6/22.
 */
const async = require( 'async' )
const request = require( '../lib/req' )
const storaging = require('./storaging')
let logger,api
class miaopaiDealWith {
    constructor (spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('DealWith instantiation ...')
    }
    miaopai (task,callback) {
        task.total = 0
        async.parallel(
            {
                user: (callback) => {
                    this.getUser(task,(err,result)=>{
                        logger.debug(err,result)
                    })
                },
                media: (callback) => {
                    this.getTotal(task,(err,result)=>{
                        logger.debug(err,result)
                    })
                }
            },
            ( err, result ) => {
                if(err){
                    return callback(err)
                }
                logger.debug(task.id + "_result:",result)
                callback(null,task.total)
            }
        )
    }
    getUser (task,callback){
        let option = {
            url: api.miaopai.api + "1&per=20&suid=" + task.id
        }
        request.get(option,(err,result) => {
            // if(err){
            //     logger.error( 'occur error : ', err )
            //     storaging.errStoraging(this.core,'miaopai',option.url,task.id,err,"responseErr","user")
            //     return callback()
            // }
            // if(!result){
            //     storaging.errStoraging(this.core,'miaopai',option.url,task.id,"秒拍获取粉丝接口无返回内容","resultErr","user")
            //     return callback()
            // }
            // if( result.statusCode != 200){
            //     logger.error('获取粉丝code error：',result.statusCode)
            //     storaging.errStoraging(this.core,'miaopai',option.url,task.id,"秒拍获取粉丝code error","responseErr","user")
            //     return callback()
            // }
            storaging.judgeRes (this.core,"miaopai",option.url,task.id,err,result,callback,"user")
            if(!result){
                return 
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('json数据解析失败')
                storaging.errStoraging(this.core,'miaopai',option.url,task.id,"秒拍获取粉丝json数据解析失败","doWithResErr","user")
                return callback()
            }
            // let userInfo = result.header,
            //     user = {
            //         platform: 7,
            //         bid: userInfo.suid,
            //         fans_num: userInfo.eventCnt.fans
            //     }
            storaging.succStorage(this.core,"miaopai",option.url,"user")
        })
    }
    getTotal ( task, callback ) {
        let option = {
            url: api.miaopai.api + "1&per=20&suid=" +task.id
        }
        request.get( option, (err,result) => {
            if(err){
                storaging.errStoraging(this.core,'miaopai',option.url,task.id,err,"responseErr","total")
                if(task.id == 'mEpTsCBR3q2uyDUc'){
                    return callback()
                }
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            if(!result){
                storaging.errStoraging(this.core,'meipai',option.url,task.id,"秒拍获取total接口无返回内容","resultErr","total")
                return callback()
            }
            if(result.statusCode != 200){
                storaging.errStoraging(this.core,'miaopai',option.url,task.id,"秒拍获取total code error","responseErr","total")
                if(task.id == 'mEpTsCBR3q2uyDUc'){
                    return callback()
                }
                logger.error( 'http code error : ', result.statusCode )
                return callback(err)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('json数据解析失败')
                storaging.errStoraging(this.core,'miaopai',option.url,task.id,"秒拍获取total接口json数据解析失败","doWithResErr","total")
                return callback(e)
            }
            let videos_count = result.total,page
            task.total = videos_count
            if(videos_count%20 == 0){
                page = videos_count/20
            }else{
                page = Math.floor(videos_count/20)+1
            }
            this.getVideos(task,page, () => {
                callback()
            })
            storaging.succStorage(this.core,"miaopai",option.url,"total")
        })
    }
    getVideos ( task, page, callback ) {
        let sign = 1,option
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                option = {
                    url: api.miaopai.api + sign + "&per=20&suid=" + task.id
                }
                logger.debug(option.url)
                request.get(option, (err,result) => {
                    if(err){
                        logger.error( 'occur error : ', err )
                        storaging.errStoraging(this.core,'miaopai',option.url,task.id,err,"responseErr","videos")
                        return cb()
                    }
                    if(!result){
                        storaging.errStoraging(this.core,'miaopai',option.url,task.id,"秒拍获取videos接口无返回内容","resultErr","videos")
                        return cb()
                    }
                    if( result.statusCode != 200){
                        logger.error('获取videos code error：',result.statusCode)
                        storaging.errStoraging(this.core,'miaopai',option.url,task.id,"秒拍获取videos code error","responseErr","videos")
                        return cb()
                    }
                    try {
                        result = JSON.parse(result.body)
                    } catch (e){
                        logger.error('json数据解析失败')
                        storaging.errStoraging(this.core,'miaopai',option.url,task.id,"秒拍获取videos接口json数据解析失败","resultErr","videos")
                        return cb()
                    }
                    let videos = result.result
                    this.deal(task,videos, () => {
                        sign++
                        cb()
                    })
                    storaging.succStorage(this.core,"miaopai",option.url,"videos")
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    deal ( task, list, callback ) {
        let index = 0,
            length = list.length,
            video,data
        async.whilst(
            () => {
                return index < length
            },
            ( cb ) => {
                video = list[index]
                this.getInfo( task, video.channel.scid, (err, result) => {
                    data = {
                        author: video.channel.ext.owner.nick,
                        platform: 7,
                        bid: task.id,
                        aid:video.channel.scid,
                        title:video.channel.ext.ft ? video.channel.ext.ft.substr(0,100).replace(/"/g,'') : `btwk_caihongip`,
                        desc: video.channel.ext.t.substr(0,100).replace(/"/g,''),
                        play_num: video.channel.stat.vcnt,
                        comment_num: video.channel.stat.ccnt,
                        support: video.channel.stat.lcnt,
                        forward_num: video.channel.stat.scnt,
                        a_create_time: Math.ceil(video.channel.ext.finishTime / 1000)
                    }
                    if(!err && result){
                        data.v_img = result.v_img
                        data.long_t = result.long_t
                        data.class = result.class
                        data.tag = result.tag
                    }
                    // logger.debug(data.title+'标题')
                    // logger.debug(data.desc+'描述')
                    this.core.MSDB.hget(`${data.author}:${data.aid}`,"play_num",(err,result)=>{
                        if(err){
                            logger.debug("读取redis出错")
                            return
                        }
                        if(result > data.play_num){
                            storaging.errStoraging(this.core,'miaopai',`http://api.miaopai.com/m/v2_channel.json?fillType=259&scid="+${media.aid}+"&vend=miaopai`,task.bid,`秒拍${data.aid}播放量减少`,"resultErr","videos")
                        }
                    })
                    storaging.sendDb(this.core,data)
                    index++
                    cb()
                })
            },
            ( err, result ) => {
                callback()
            }
        )
    }
    getInfo( task, id, callback){
        let option = {
            url : "http://api.miaopai.com/m/v2_channel.json?fillType=259&scid="+id+"&vend=miaopai"
        }
        let dataJson = {}
        request.get( option, ( err, result ) => {
            // if(err){
            //     logger.error('秒拍getInfo error')
            //     storaging.errStoraging(this.core,'miaopai',option.url,task.id,err,"responseErr","info")
            //     return callback(err)
            // }
            // if(!result){
            //     storaging.errStoraging(this.core,'miaopai',option.url,task.id,"秒拍获取info接口无返回内容","resultErr","info")
            //     return callback()
            // }
            // if(result.statusCode != 200){
            //     logger.error(`秒拍getInfo code error: ${result.statusCode}`)
            //     storaging.errStoraging(this.core,'miaopai',option.url,task.id,"秒拍获取info code error","responseErr","info")
            //     return callback(true)
            // }
            storaging.judgeRes (this.core,"miaopai",option.url,task.id,err,result,callback,"info")
            if(!result){
                return
            }
            try{
                result = JSON.parse(result.body)
            } catch ( e ){
                logger.error(`秒拍getInfo json 解析: ${result.statusCode}`)
                storaging.errStoraging(this.core,'miaopai',option.url,task.id,`秒拍获取info接口json数据解析失败${result.statusCode}`,"doWithResErr","info")
                return callback(e)
            }
            if(result.status != 200){
                logger.error(result)
                return callback(true)
            }
            dataJson.long_t = result.result.ext.length
            dataJson.v_img  = result.result.pic.base+result.result.pic.m
            dataJson.class  = this._class(result.result.category_info)
            dataJson.tag    = this._tag(result.result.topicinfo)
            storaging.succStorage(this.core,"miaopai",option.url,"info")
            callback(null,dataJson)
        })
    }
    _tag ( raw ){
        if(typeof raw == 'string'){
            return raw
        }
        if(Object.prototype.toString.call(raw) === '[object Array]'){
            return raw.join(',')
        }
        return ''
    }
    _class ( raw ){
        let _classArr = []
        if(!raw){
            return ''
        }
        if(Object.prototype.toString.call(raw) === '[object Array]' && raw.length != 0){
            for( let i in raw){
                _classArr.push(raw[i].categoryName)
            }
            return _classArr.join(',')
        }
        if(Object.prototype.toString.call(raw) === '[object Array]' && raw.length == 0){
            return ''
        }
        if(typeof raw == 'object'){
            return raw.categoryName
        }
        return ''
    }
}
module.exports = miaopaiDealWith