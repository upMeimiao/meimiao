/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment')
const async = require( 'async' )
const request = require('../lib/request.js')
const cheerio = require('cheerio')

let logger,api
class dealWith {
    constructor ( spiderCore ){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('./storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('mgtvDealWith instantiation ...')
    }
    mgtv ( task, callback ) {
        task.total = 0
        this.getVidList( task, ( err,result ) => {
            if(err){
                return callback( err )
            }
            callback( err,result )
        })
    }

    getVidList( task, callback ){
        let sign   = 0,
            page   = 1,
            month  = ''
        async.whilst(
            () => {
                return sign < page
            },
            (cb) => {
                let option = {
                    url : api.mgtv.listVideo + task.id + "&month="+ month + "&_=" + (new Date()).getTime()
                }
                request.get( logger, option, ( err, result ) => {
                    this.storaging.totalStorage ("mgtv",option.url,"list")
                    this.storaging.judgeRes ("mgtv",option.url,task.id,err,result,"list")
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
                        this.storaging.errStoraging('mgtv',option.url,task.id,"mgtv获取list接口json数据解析失败","doWithResErr","list")
                        sign++
                        page++
                        return cb()
                    }
                    let length = result.data.list.length
                    task.total += length
                    if( sign >= result.data.tab_m.length ){
                        logger.debug('已经没有数据')
                        page = 0
                        sign++
                        return cb()
                    }
                    month = result.data.tab_m[sign].m
                    this.deal(task,result.data.list,length,() => {
                        sign++
                        page++
                        cb()
                    })

                })
            },
            (err,result) => {
                callback()
            }
        )

    }
    deal( task, user, length, callback ){
        let index = 0
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                this.getAllInfo( task, user[index], () => {
                    index++
                    cb()
                })
            },
            (err,data) => {
                callback()
            }
        )
    }
    getAllInfo( task, video, callback ){
        async.parallel([
            (cb) => {
                this.getVideoInfo(task,video,(err,result) => {
                    if(err){
                        return cb(err)
                    }
                    cb(null,result)
                })
            },
            (cb) => {
                this.getPlayNum(task,video,(err,result) => {
                    if(err){
                        return cb(err)
                    }
                    cb(null,result)
                })
            },
            (cb) => {
                this.getClass(task,video,(err,result) => {
                    if(err){
                        return cb(err)
                    }
                    cb(null,result)
                })
            },
            (cb) => {
                this.getDesc(task,video,(err,result) => {
                    if(err){
                        return cb(err)
                    }
                    cb(null,result)
                })
            },
            (cb) => {
                this.getLike(task,video,(err,result) => {
                    if(err){
                        return cb(err)
                    }
                    cb(null,result)
                })
            },
            (cb) => {
                this.getComNum(task,video,(err,result) => {
                    if(err){
                        return cb(err)
                    }
                    cb(null,result)
                })
            }
        ],(err,result) => {
            if(err){
                return callback(err)
            }
            let media = {
                author: task.name,
                platform: task.p,
                bid: task.id,
                aid: video.video_id,
                title: video.t1.replace(/"/g,''),
                long_t: result[0].info.duration,
                v_img: video.img,
                v_url: "http://www.mgtv.com"+video.url,
                play_num: result[1].all,
                class: result[2].fstlvlName,
                support: result[4].data.like,
                step: result[4].data.unlike,
                desc: result[3] ? result[3].substring(0,100).replace(/"/g,'') : '',
                comment_num: result[5].total_number
            }
            
            callback()
        })
    }
    getComNum( task, video, callback ){
        let option  = {
            url:'http://comment.mgtv.com/video_comment/list/?subject_id='+ video.video_id +'&page=1&_='+ new Date().getTime()
        }
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("mgtv",option.url,"commentNum")
            this.storaging.judgeRes ("mgtv",option.url,task.id,err,result,"commentNum")
            if(!result){
                return 
            }
            if(!result.body){
                return 
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('数据解析失败')
                this.storaging.errStoraging('mgtv',option.url,task.id,"mgtv获取commentNum接口json数据解析失败","doWithResErr","commentNum")
                return callback(e,null)
            }
            if(!result.total_number){
                result.total_number = ''
            }
            callback(null,result)
        })
    }
    getLike( task, video, callback ){
        let option  = {
            url:'http://vc.mgtv.com/v2/dynamicinfo?vid=' + video.video_id
        }
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("mgtv",option.url,"like")
            this.storaging.judgeRes ("mgtv",option.url,task.id,err,result,"like")
            if(!result){
                return 
            }
            if(!result.body){
                return 
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('数据解析失败')
                this.storaging.errStoraging('mgtv',option.url,task.id,"mgtv获取like接口json数据解析失败","doWithResErr","like")
                return callback(e,null)
            }
            if(!result.data){
                result.data = {
                    like: '',
                    unlike: ''
                }
            }
            callback(null,result)
        })
    }
    getDesc( task, video, callback ){
        let option  = {
                url:'http://www.mgtv.com/b/'+ task.id +'/'+ video.video_id +'.html'
            },
            desc = ''
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("mgtv",option.url,"desc")
            this.storaging.judgeRes ("mgtv",option.url,task.id,err,result,"desc")
            if(!result){
                return 
            }
            if(!result.body){
                return 
            }
            let $ = cheerio.load(result.body)
            desc = $('span.details').text()
            if(!desc){
                this.storaging.errStoraging('mgtv',option.url,task.id,"mgtv获取desc接口从返回的dom中获取数据失败","domBasedErr","desc")
                return callback(err,result)
            }
            callback(null,desc)
        })
    }
    getClass( task, video, callback ){
        let option = {
            url: 'http://mobile.api.hunantv.com/v7/video/info?device=iPhone&videoId=' + video.video_id
        }
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("mgtv",option.url,"desc")
            this.storaging.judgeRes ("mgtv",option.url,task.id,err,result,"desc")
            if(!result){
                return 
            }
            if(!result.body){
                return 
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('数据解析失败')
                this.storaging.errStoraging('mgtv',option.url,task.id,"mgtv获取class接口json数据解析失败","doWithResErr","class")
                return callback(e,null)
            }
            if(!result.data.fstlvlName){
                result.data = {
                    fstlvlName: ''
                }
            }
            callback(null,result.data)
        })
    }
    getPlayNum( task, video, callback ){
        let option = {
            //用户的信息后边参数是cid,播放量是vid
            url: api.mgtv.userInfo + "vid=" + video.video_id
        }
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("mgtv",option.url,"play")
            this.storaging.judgeRes ("mgtv",option.url,task.id,err,result,"play")
            if(!result){
                return 
            }
            if(!result.body){
                return 
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('数据解析失败')
                this.storaging.errStoraging('mgtv',option.url,task.id,"mgtv获取play接口json数据解析失败","doWithResErr","play")
                return callback(e,null)
            }
            if(!result.data.all){
                result.data.all = ''
            }
            let media = {
                "author": "mgtv",
                "aid": video.video_id,
                "play_num": result.data.all
            }
            this.core.MSDB.hget(`apiMonitor:${media.author}:play_num:${media.aid}`,"play_num",(err,result)=>{
                if(err){
                    logger.debug("读取redis出错")
                    return
                }
                if(result > media.play_num){
                    this.storaging.errStoraging('mgtv',`${option.url}`,task.id,`mgtv视频${media.aid}播放量减少${result}(纪录)/${media.play_num}(本次)`,"playNumErr","paly")
                    return
                }
            })
            // logger.debug("mgtv media==============",media)
            this.storaging.sendDb(media)
            callback(null,result.data)
        })
    }
    getVideoInfo( task, video, callback ){
        let option = {
            url: api.mgtv.videoInfo + video.video_id
        }
        //logger.debug(option.url)
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("mgtv",option.url,"info")
            this.storaging.judgeRes ("mgtv",option.url,task.id,err,result,"info")
            if(!result){
                return
            }
            if(!result.body){
                return
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('数据解析失败')
                this.storaging.errStoraging('mgtv',option.url,task.id,"mgtv获取info接口json数据解析失败","doWithResErr","info")
                return callback(e,null)
            }
            if(!result.info){
                result.info = {
                    duration: ''
                }
            }else if(!result.info.duration){
                result.info = {
                    duration: ''
                }
            }
            callback(null,result.data)
        })
    }
}
module.exports = dealWith