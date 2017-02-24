/**
 * Created by ifable on 16/6/22.
 */
const async = require( 'async' )
const request = require( '../lib/req' )
const storaging = require('./storaging')
let logger,api
const classification = ['搞笑','明星名人','女神','舞蹈','音乐','美食','美妆','男神','宝宝','宠物','直播','热门']
class meipaiDealWith {
    constructor (spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
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
            url: api.meipai.userInfo + task.id
        }
        request.get(option,(err,result) => {
            // if(err){
            //     storaging.errStoraging(this.core,'meipai',option.url,task.id,err,"responseErr","user")
            //     return callback()
            // }
            // if( result.statusCode != 200){
            //     logger.error('获取粉丝code error：',result.statusCode)
            //     storaging.errStoraging(this.core,'meipai',option.url,task.id,"美拍获取粉丝code error","responseErr","user")
            //     return callback()
            // }
            // if(!result){
            //     storaging.errStoraging(this.core,'meipai',option.url,task.id,"美拍获取粉丝接口无返回内容","resultErr","user")
            //     return callback()

            // }
            storaging.judgeRes (this.core,"meipai",option.url,task.id,err,result,callback,"user")
            if(!result){
                return
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('json数据解析失败')
                storaging.errStoraging(this.core,'meipai',option.url,task.id,"美拍获取粉丝json数据解析失败","doWithResErr","user")
                return callback()
            }
            // let user = {
            //     platform: 5,
            //     bid: result.id,
            //     fans_num: result.followers_count
            // }
            storaging.succStorage(this.core,"meipai",option.url,"user")
        })
    }
    getTotal ( task,callback ) {
        let option = {
            url: api.meipai.userInfo + task.id
        }
        request.get(option, (err,result) => {
            // if(err){
            //     logger.error( 'occur error : ', err )
            //     storaging.errStoraging(this.core,'meipai',option.url,task.id,err,"responseErr","total")
            //     return callback(err)
            // }
            // if(!result){
            //     storaging.errStoraging(this.core,'meipai',option.url,task.id,"美拍获取total接口无返回内容","resultErr","total")
            //     return callback()
            // }
            // if( result.statusCode != 200){
            //     logger.error('获取total code error：',result.statusCode)
            //     storaging.errStoraging(this.core,'meipai',option.url,task.id,"美拍获取total code error","responseErr","total")
            //     return callback(result.statusCode)
            // }
            storaging.judgeRes (this.core,"meipai",option.url,task.id,err,result,callback,"total")
            if(!result){
                return 
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('json数据解析失败')
                storaging.errStoraging(this.core,'meipai',option.url,task.id,"美拍获取total接口json数据解析失败","doWithResErr","total")
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
            storaging.succStorage(this.core,"meipai",option.url,"total")
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
                    if(err){
                        logger.error( 'occur error : ', err )
                        storaging.errStoraging(this.core,'meipai',option.url,task.id,err,"responseErr","videos")
                        return cb()
                    }
                    if(!result){
                        storaging.errStoraging(this.core,'meipai',option.url,task.id,"美拍获取videos接口无返回内容","resultErr","videos")
                        return cb()
                    }
                    if( result.statusCode != 200){
                        logger.error('获取videos code error：',result.statusCode)
                        storaging.errStoraging(this.core,'meipai',option.url,task.id,"美拍获取videos code error","responseErr","videos")
                        return cb()
                    }
                    try {
                        result = JSON.parse(result.body)
                    } catch (e) {
                        logger.error('json数据解析失败')
                        storaging.errStoraging(this.core,'meipai',option.url,task.id,"美拍获取videos接口json数据解析失败","doWithResErr","videos")
                        return cb()
                    }
                    if(!result || result.length == 0){
                        logger.error('数据解析异常失败')
                        storaging.errStoraging(this.core,'meipai',option.url,task.id,"美拍获取videos接口无返回数据","resultErr","videos")
                        logger.error(result)
                        sign++
                        return cb()
                    }
                    maxId = result[result.length-1].id
                    this.deal(task,result, () => {
                        sign++
                        cb()
                    })
                    storaging.succStorage(this.core,"meipai",option.url,"videos")
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
            //     storaging.errStoraging(this.core,'meipai',option.url,task.id,err,"responseErr","info")
            //     return callback(err)
            // }
            // if(!result){
            //     storaging.errStoraging(this.core,'meipai',option.url,task.id,"美拍获取info接口无返回内容","resultErr","info")
            //     return callback()
            // }
            // if( result.statusCode != 200){
            //     logger.error('获取info code error：',result.statusCode)
            //     storaging.errStoraging(this.core,'meipai',option.url,task.id,"美拍获取info code error","responseErr","info")
            //     return callback()
            // }
            storaging.judgeRes (this.core,"meipai",option.url,task.id,err,result,callback,"info")
            if(!result){
                return 
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('json数据解析失败')
                storaging.errStoraging(this.core,'meipai',option.url,task.id,"美拍获取info接口json数据解析失败","doWithResErr","info")
                return callback(e)
            }
            if(result.lives){
                return callback()
            }
            storaging.succStorage(this.core,"meipai",option.url,"info")
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
                author: result.user.screen_name,
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
            this.core.MSDB.hget(`${media.author}:${media.aid}`,"play_num",(err,result)=>{
                if(err){
                    logger.debug("读取redis出错")
                    return
                }
                if(result > media.play_num){
                    storaging.errStoraging(this.core,'meipai',`${api.meipai.media}${media.aid}`,task.id,`美拍${media.aid}播放量减少`,"resultErr","videos")
                    return
                }
            })
            storaging.sendDb(this.core,media)
            callback()
        })
    }
}
module.exports = meipaiDealWith