/**
 * Created by ifable on 16/6/22.
 */
const async = require( 'async' )
const request = require( '../lib/req' )
let logger,api
const classification = ['搞笑','明星名人','女神','舞蹈','音乐','美食','美妆','男神','宝宝','宠物','直播','热门']
class meipaiDealWith {
    constructor (spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('./storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('DealWith instantiation ...')
    }
    meipai (task,callback) {
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
    getUser (task,callback){
        let option = {
            url: api.meipai.userInfo + task.id
        }
        request.get(option,(err,result) => {
            // if(err){
            //     this.storaging.errStoraging('meipai',option.url,task.id,err,"responseErr","user")
            //     return callback()
            // }
            // if( result.statusCode != 200){
            //     logger.error('获取粉丝code error：',result.statusCode)
            //     this.storaging.errStoraging('meipai',option.url,task.id,"美拍获取粉丝code error","responseErr","user")
            //     return callback()
            // }
            // if(!result){
            //     this.storaging.errStoraging('meipai',option.url,task.id,"美拍获取粉丝接口无返回内容","resultErr","user")
            //     return callback()

            // }
            this.storaging.totalStorage ("meipai",option.url,"user")
            this.storaging.judgeRes ("meipai",option.url,task.id,err,result,"user")
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
                this.storaging.errStoraging('meipai',option.url,task.id,"美拍获取粉丝json数据解析失败","doWithResErr","user")
                return callback()
            }
            // let user = {
            //     platform: 5,
            //     bid: result.id,
            //     fans_num: result.followers_count
            // }
            // this.storaging.succStorage("meipai",option.url,"user")
        })
    }
    getTotal ( task,callback ) {
        let option = {
            url: api.meipai.userInfo + task.id
        }
        request.get(option, (err,result) => {
            // if(err){
            //     logger.error( 'occur error : ', err )
            //     this.storaging.errStoraging('meipai',option.url,task.id,err,"responseErr","total")
            //     return callback(err)
            // }
            // if(!result){
            //     this.storaging.errStoraging('meipai',option.url,task.id,"美拍获取total接口无返回内容","resultErr","total")
            //     return callback()
            // }
            // if( result.statusCode != 200){
            //     logger.error('获取total code error：',result.statusCode)
            //     this.storaging.errStoraging('meipai',option.url,task.id,"美拍获取total code error","responseErr","total")
            //     return callback(result.statusCode)
            // }
            this.storaging.totalStorage ("meipai",option.url,"total")
            this.storaging.judgeRes ("meipai",option.url,task.id,err,result,"total")
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
                this.storaging.errStoraging('meipai',option.url,task.id,"美拍获取total接口json数据解析失败","doWithResErr","total")
                return callback(e)
            }
            let videos_count = result.videos_count,page
            task.total = videos_count
            if(videos_count%20 == 0){
                page = videos_count/20
            }else{
                page = Math.floor(videos_count/20)+1
            }
            this.getVideos(task,page, () => {
                callback()
            })
            // this.storaging.succStorage("meipai",option.url,"total")
        })
    }
    getVideos ( task,page,callback ) {
        let maxId = '',sign = 1,option
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                option = {
                    url: api.meipai.mediaList + task.id + "&max_id=" + maxId
                }
                request.get(option,(err,result) => {
                    this.storaging.totalStorage ("meipai",option.url,"videos")
                    if(err){
                        logger.error(err,err.code,err.Error)
                        let errType
                        if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                            errType = "timeoutErr"
                        } else{
                            errType = "responseErr"
                        }
                        logger.error(errType)
                        this.storaging.errStoraging('meipai',option.url,task.id,err.code || "error",errType,"videos")
                        return cb()
                    }
                    if(!result.body){
                        this.storaging.errStoraging('meipai',option.url,task.id,"美拍获取videos接口返回内容为空","resultErr","videos")
                        return cb()
                    }
                    if( result.statusCode && result.statusCode != 200){
                        logger.error('获取videos code error：',result.statusCode)
                        this.storaging.errStoraging('meipai',option.url,task.id,"美拍获取videos code error","statusErr","videos")
                        return cb()
                    }
                    try {
                        result = JSON.parse(result.body)
                    } catch (e) {
                        logger.error('json数据解析失败')
                        this.storaging.errStoraging('meipai',option.url,task.id,"美拍获取videos接口json数据解析失败","doWithResErr","videos")
                        return cb()
                    }
                    if(!result || result.length == 0){
                        logger.error('数据解析异常失败')
                        this.storaging.errStoraging('meipai',option.url,task.id,"美拍获取videos接口无返回数据","resultErr","videos")
                        logger.error(result)
                        sign++
                        return cb()
                    }
                    maxId = result[result.length-1].id
                    this.deal(task,result, () => {
                        sign++
                        cb()
                    })
                    // this.storaging.succStorage("meipai",option.url,"videos")
                })
            },
            function (err,result) {
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
                this.getInfo(task,list[index].id,function (err) {
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getInfo ( task, id, callback ) {
        let option = {
            url: api.meipai.media + id
        }
        request.get(option, (err,result) => {
            // if(err){
            //     this.storaging.errStoraging('meipai',option.url,task.id,err,"responseErr","info")
            //     return callback(err)
            // }
            // if(!result){
            //     this.storaging.errStoraging('meipai',option.url,task.id,"美拍获取info接口无返回内容","resultErr","info")
            //     return callback()
            // }
            // if( result.statusCode != 200){
            //     logger.error('获取info code error：',result.statusCode)
            //     this.storaging.errStoraging('meipai',option.url,task.id,"美拍获取info code error","responseErr","info")
            //     return callback()
            // }
            this.storaging.totalStorage ("meipai",option.url,"info")
            this.storaging.judgeRes ("meipai",option.url,task.id,err,result,"info")
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
                this.storaging.errStoraging('meipai',option.url,task.id,"美拍获取info接口json数据解析失败","doWithResErr","info")
                return callback(e)
            }
            if(result.lives){
                return callback()
            }
            // this.storaging.succStorage("meipai",option.url,"info")
            let title,_tags = [],__tags = [],tags = '',tagArr
            if(result.caption && result.caption != ''){
                title = result.caption.substr(0,100)
                tagArr = result.caption.match(/#[^0-9a-zA-Z\x00-\xff]+#/ig)
                for( let i in tagArr){
                    _tags.push(tagArr[i].replace(/#/g,''))
                }
                for( let i in _tags){
                    if(classification.includes(_tags[i])){
                        __tags.push(_tags[i])
                    }
                }
                if(__tags.length != 0){
                    tags = __tags.join(',')
                }
            }else{
                title = 'btwk_caihongip'
            }
            let media = {
                author: task.name,
                platform: 5,
                bid: task.id,
                aid: result.id,
                title: title.replace(/"/g,''),
                desc: title.replace(/"/g,''),
                play_num: result.plays_count,
                comment_num: result.comments_count,
                support: result.likes_count,
                forward_num: result.reposts_count,
                a_create_time: result.created_at,
                long_t:result.time,
                v_img:result.cover_pic,
                tag: _tags.join(','),
                class: tags
            }
            this.core.MSDB.hget(`apiMonitor:play_num`,`${media.author}_${media.aid}`,(err,result)=>{
                if(err){
                    logger.debug("读取redis出错")
                    return
                }
                if(result > media.play_num){
                    this.storaging.errStoraging('meipai',`${api.meipai.media}${media.aid}`,task.id,`美拍播放量减少`,"playNumErr","videos",media.aid,`${result}/${media.play_num}`)
                    return
                }
                this.storaging.sendDb(media/*,task.id,"videos"*/)
            })
            callback()
        })
    }
}
module.exports = meipaiDealWith