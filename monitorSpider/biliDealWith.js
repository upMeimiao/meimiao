/**
 * Created by ifable on 16/6/21.
 */
const moment = require('moment')
const async = require( 'async' )
const request = require( '../lib/req' )
let logger,api
class billDealWith {
    constructor ( spiderCore ) {
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('./storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('DealWith instantiation ...')
    }
    bili ( task, callback) {
        task.total = 0
        async.parallel(
            {
                user: (callback) => {
                    this.getUser(task,(err,result)=>{
                        callback(err,result)
                    })
                },
                media: (callback) => {
                    this.getTotal( task, (err,result) => {
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
    getUser ( task, callback) {
        let option = {
            url: api.bili.userInfo,
            referer: `http://space.bilibili.com/${task.id}/`,
            data: {
                mid: task.id
            }
        }
        request.post (option,(err,result)=>{
            // if(err){
            //     logger.error( 'occur error : ', err )
            //     this.storaging.errStoraging('bili',option.url,task.id,err,"responseErr","user")
            //     return callback(err)
            // }
            // if(!result){
            //     this.storaging.errStoraging('bili',option.url,task.id,"哔哩哔哩获取粉丝接口无返回内容","resultErr","user")
            //     return callback()
            // }
            // if( result.statusCode != 200){
            //     logger.error('获取粉丝code error：',result.statusCode)
            //     this.storaging.errStoraging('bili',option.url,task.id,"哔哩哔哩获取粉丝code error","responseErr","user")
            //     return callback()
            // }
            this.storaging.judgeRes ("bili",option.url,task.id,err,result,"user")
            if(!result){
                return 
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('json数据解析失败')
                this.storaging.errStoraging('bili',option.url,task.id,"哔哩哔哩获取粉丝json数据解析失败","doWithResErr","user")
                return callback(e)
            }
            // let userInfo = result.data,
            //     user = {
            //         platform: 8,
            //         bid: userInfo.mid,
            //         fans_num: userInfo.fans
            //     }
            this.storaging.succStorage("bili",option.url,"user")
        })
    }
    getTotal ( task, callback) {
        let option = {
            url: api.bili.mediaList + task.id + "&pagesize=30"
        }
        request.get(option, (err,result) => {
            // if(err){
            //     logger.error( 'occur error : ', err )
            //     this.storaging.errStoraging('bili',option.url,task.id,err,"responseErr","total")
            //     return callback(err)
            // }
            // if(!result){
            //     this.storaging.errStoraging('bili',option.url,task.id,"哔哩哔哩获取total接口无返回内容","resultErr","total")
            //     return callback()
            // }
            // if( result.statusCode != 200){
            //     logger.error('获取total接口code error：',result.statusCode)
            //     this.storaging.errStoraging('bili',option.url,task.id,"哔哩哔哩获取total接口code error","responseErr","total")
            //     return callback()
            // }
            this.storaging.judgeRes ("bili",option.url,task.id,err,result,"total")
            if(!result){
                return 
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('json数据解析失败')
                this.storaging.errStoraging('bili',option.url,task.id,"哔哩哔哩获取total接口json数据解析失败","doWithResErr","total")
                return callback(e)
            }
            task.total = result.data.count
            this.storaging.succStorage("bili",option.url,"total")
            this.getVideos( task, result.data.pages, () => {
                callback()
            })
        })
    }
    getVideos ( task,pages,callback) {
        let option,sign = 1
        async.whilst(
            () => {
                return sign <= pages
            },
            (cb) => {
                option = {
                    url: api.bili.mediaList + task.id + "&page=" + sign + "&pagesize=30"
                }
                request.get(option, (err,result) => {
                    if(err){
                        logger.error( 'occur error : ', err )
                        this.storaging.errStoraging('bili',option.url,task.id,err,"responseErr","videos")
                        return cb()
                    }
                    if(!result){
                        this.storaging.errStoraging('bili',option.url,task.id,"哔哩哔哩获取videos接口无返回内容","resultErr","videos")
                        return cb()
                    }
                    if( result.statusCode != 200){
                        logger.error('获取total接口code error：',result.statusCode)
                        this.storaging.errStoraging('bili',option.url,task.id,"哔哩哔哩获取videos接口code error","responseErr","videos")
                        return cb()
                    }
                    try {
                        result = JSON.parse(result.body)
                    } catch (e){
                        logger.error('json数据解析失败')
                        this.storaging.errStoraging('bili',option.url,task.id,"哔哩哔哩获取videos接口json数据解析失败","doWithResErr","videos")
                        return cb()
                    }
                    if(!result.data){
                        logger.debug(result)
                        sign++
                        return cb()
                    }
                    if(!result.data.vlist || result.data.vlist == 'null'){
                        logger.debug(result)
                        sign++
                        return cb()
                    }
                    this.storaging.succStorage("bili",option.url,"videos")
                    this.deal(task,result.data.vlist,() => {
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
    deal ( task,list,callback) {
        let index = 0,
            length = list.length
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                this.getInfo(task,list[index], (err) => {
                    if(err){
                        index++
                        return cb()
                    }
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getInfo ( task,video,callback ) {
        let option = {
            url: api.bili.media + video.aid
        }
        request.get(option, (err,back) => {
            // if(err){
            //     logger.error( 'occur error : ', err )
            //     this.storaging.errStoraging('bili',option.url,task.id,err,"responseErr","info")
            //     return callback(err)
            // }
            // if(!back){
            //     this.storaging.errStoraging('bili',option.url,task.id,"哔哩哔哩获取info接口无返回内容","resultErr","info")
            //     return callback()
            // }
            // if(back.statusCode != 200){
            //     logger.error(`秒拍getInfo code error: ${result.statusCode}`)
            //     this.storaging.errStoraging('bili',option.url,task.id,"哔哩哔哩获取info code error","responseErr","info")
            //     return callback(true)
            // }
            this.storaging.judgeRes ("bili",option.url,task.id,err,back,"info")
            if(!back){
                return 
            }
            try {
                back = JSON.parse(back.body)
            } catch (e){
                logger.error('哔哩哔哩获取info接口json数据解析失败')
                this.storaging.errStoraging('bili',option.url,task.id,`哔哩哔哩获取info接口json数据解析失败`,"doWithResErr","info")
                return callback(e)
            }
            if(back.code != 0){
                return
            }
            let tagStr = ''
            if(back.data.tags && back.data.tags.length != 0){
                tagStr = back.data.tags.join(',')
            }
            this.storaging.succStorage("bili",option.url,"info")
            let media = {
                author: back.data.owner.name,
                platform: 8,
                bid: task.id,
                aid: back.data.aid,
                title: back.data.title.substr(0,100).replace(/"/g,''),
                desc: back.data.desc.substr(0,100).replace(/"/g,''),
                play_num: back.data.stat.view,
                save_num: back.data.stat.favorite > 0 ? back.data.stat.favorite : null,
                comment_num: back.data.stat.reply,
                forward_num: back.data.stat.share,
                a_create_time: back.data.pubdate,
                long_t:this.long_t(video.length),
                v_img:video.pic,
                class:back.data.tname,
                tag:tagStr
            }
            if(!media.save_num){
                delete media.save_num
            }
            this.core.MSDB.hget(`apiMonitor:${media.author}:${media.aid}`,"play_num",(err,result)=>{
                if(err){
                    logger.debug("读取redis出错")
                    return
                }
                if(result > media.play_num){
                    this.storaging.errStoraging('miaopai',`${api.miaopai.media}${media.aid}`,task.bid,`秒拍${media.aid}播放量减少`,"resultErr","videos")
                }
            })
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
module.exports = billDealWith