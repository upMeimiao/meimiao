/**
 * Created by junhao on 16/6/22.
 */
const moment = require('moment')
const async = require( 'async' )
const request = require( 'request' )
const storaging = require('./storaging')
const jsonp = function (data) {
    return data
}
let logger,api,errDb

class youkuDealWith {
    constructor(core){
        this.core = core
        this.settings = core.settings
        errDb = this.core.errDb
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.debug('处理器实例化...')
    }
    youku (task,callback) {
        task.total = 0
        async.parallel(
            {
                user: (callback) => {
                    this.youkuGetUser(task,(err,result)=>{
                        logger.debug(err,result)
                    })
                },
                media: (callback) => {
                    this.youkuGetTotal(task,(err,result)=>{
                        logger.debug(err,result)
                    })
                }
            },
            ( err, result ) => {
                if(err){
                    return callback(err)
                }
                callback(null,task.total)
            }
        )
    }
    youkuGetUser ( task, callback) {
        let options = {
            method: 'GET',
            url: api.youku.user + task.encodeId
        }
        request(options,(err,res,body)=>{
            if(err){
                storaging.errStoraging(this.core,"youku",options.url,task.id,err,"responseErr","user")
                return callback(err)
            }
            if(res && res.statusCode != 200){
                storaging.errStoraging(this.core,"youku",options.url,task.id,"优酷获取用户信息接口状态码错误","responseErr","user")
                return callback()
            }
            try{
                body = eval(body)
            }catch(e){
                logger.info(body)
                storaging.errStoraging(this.core,"youku",options.url,task.id,"优酷获取用户信息接口返回内容格式错误","resultErr","user")
                return
            }
            if(!body){
                logger.error('youku获取用户信息接口发生未知错误')
                logger.debug('total error:',body)
                storaging.errStoraging(this.core,"youku",options.url,task.id,"优酷获取用户信息接口返回内容为空","resultErr","user")
                return callback()
            }
            let userInfo = body.data,
                fans_num = userInfo.sumCount
            if(!userInfo || !fans_num){
                storaging.errStoraging(this.core,"youku",options.url,task.id,"优酷获取用户信息接口返回内容为空","resultErr","user")
                return callback()
            }
            storaging.succStorage(this.core,"youku",options.url,"user")
        })
    }
    youkuGetTotal( task, callback ) {
        let page,
            options = {
                method: 'GET',
                url: api.youku.list,
                qs: { caller: '1', pg: '1', pl: '20', uid: task.encodeId },
                headers: {
                    'user-agent': 'Youku;6.1.0;iOS;10.2;iPhone8,2'
                },
                timeout: 5000
            }
        request(options, (error, response, body) => {
            storaging.judgeRes (this.core,"youku",options.url,task.id,error,response,callback,"total")
            try {
                body = JSON.parse(body)
            } catch (e) {
                logger.error('优酷获取全部视频接口json数据解析失败')
                storaging.errStoraging(this.core,"youku",options.url,task.id,"优酷获取全部视频接口json数据解析失败","resultErr","total")
                logger.debug('total error:',body)
                return callback(e)
            }
            let data = body.data
            if(!data){
                logger.error((body.code+body.desc)||"优酷获取全部视频接口返回内容为空")
                storaging.errStoraging(this.core,'youku',options.url,task.id,body.desc,"resultErr","total")
                return callback(true)
            }
            let total = data.total
            task.total = total
            if(total % 20 != 0){
                page = Math.ceil(total / 20)
            }else{
                page = total / 20
            }
            storaging.succStorage(this.core,"youku",options.url,"total")
            this.youkuGetVideos(task,page, (err,result) => {
                logger.debug(err,result)
            })
            //根据已存redis内容判断body内容是否正确
            
        })
    }
    youkuGetVideos ( task, page, callback ) {
        let sign = 1,options
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                options = {
                    method: 'GET',
                    url: api.youku.list,
                    qs: { caller: '1', pg: sign, pl: '50', uid: task.encodeId },
                    headers: {
                        'user-agent': 'Youku;6.1.0;iOS;10.2;iPhone8,2'
                    },
                    timeout: 5000
                }
                //logger.debug("++++++++++++++++++",options)
                request(options, (error, response, body) => {
                    if(error){
                        logger.error( 'occur error : ', error )
                        return cb()
                    }
                    if(response.statusCode != 200){
                        logger.error(`list error code: ${response.statusCode}`)
                        return cb()
                    }
                    try{
                        body = JSON.parse(body)
                    }catch (e){
                        logger.error('优酷获取单页视频列表接口json数据解析失败')
                        storaging.errStoraging(this.core,'youku',options.url,task.id,"优酷获取单页视频列表接口json数据解析失败","doWithResErr","videos")
                        logger.debug('list error:',body)
                        return cb()
                    }
                    
                    let data = body.data
                    if(!data){
                        sign++
                        return cb()
                    }
                    //根据已存redis内容判断body内容是否正确
                    let videos = data.videos
                    for(let index in videos){
                        this.core.MSDB.hget(`youku${videos[index].videoid}`,"play_num",(err,result)=>{
                            if(result > videos[index].total_vv){
                                logger.debug("~~~~~~~~~result="+result+"total_vv="+videos[index].total_vv)
                                storaging.errStoraging(this.core,"youku",options.url,task.id,`优酷视频${videos[index].videoid}播放量减少`,"resultErr","videos")
                            }
                        })
                    }
                    storaging.succStorage(this.core,"youku",options.url,"videos")
                    this.youkuInfo(task,videos, () => {
                        sign++
                    })
                })
            },
            (err,result) => {
                logger.debug(err,result)
            }
        )
    }
    youkuInfo ( task, list, callback ) {
        const idList = []
        for( let index in list){
            idList.push(list[index].videoid)
        }
        const ids = idList.join(',')
        const options = {
            method: 'GET',
            url: 'https://openapi.youku.com/v2/videos/show_batch.json',
            qs: {
                client_id:api.youku.app_key,
                video_ids:ids
            },
            timeout: 5000
        }
        request( options, ( error, response, body ) => {
            storaging.judgeRes (this.core,"youku",options.url,task.id,error,response,callback,"info")
            try{
                body = JSON.parse(body)
            } catch (e) {
                logger.error('优酷获取视频详情接口json数据解析失败')
                storaging.errStoraging(this.core,'youku',options.url,task.id,"优酷获取视频详情接口json数据解析失败","doWithResErr","info")
                logger.debug('info error:',body)
                return callback(e)
            }
            if(body.total == 0){
                return callback()
            }
            //根据已存redis内容判断body内容是否正确,正确则存入数据库，错误则记录错误
            let videos = body.videos
            if(!body.videos){
                storaging.errStoraging(this.core,'youku',options.url,task.id,"优酷获取视频详情接口返回数据为空","doWithResErr","info")
                return callback()
            }
            storaging.succStorage(this.core,"youku",options.url,"info")
            this.youkuDeal( task, videos, list, () => {
                logger.debug(err,result)
            })
        })
    }
    //将接口返回的数据进行处理，存入数据库
    youkuDeal ( task, videos, list, callback ){
        let index = 0,
            length = videos.length
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                const video = list[index]
                const result = videos[index]
                const media = {
                    author: task.name,
                    platform: 1,
                    bid: task.id,
                    aid: video.videoid,
                    title: video.title.substr(0,100),
                    desc: result.description.substr(0,100),
                    class: result.category,
                    tag: result.tags,
                    v_img: result.bigThumbnail,
                    long_t: Math.round(result.duration),
                    play_num: video.total_vv,
                    save_num: result.favorite_count,
                    comment_num: result.comment_count,
                    support: result.up_count,
                    step: result.down_count,
                    a_create_time: video.publishtime
                }
                storaging.sendDb(this.core,media)
                index++
                cb()
            },
            (err,result) => {
                logger.debug(err,result)
            }
        )
    }
}
module.exports = youkuDealWith