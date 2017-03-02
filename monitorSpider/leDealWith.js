/**
 * Created by ifable on 16/6/21.
 */
const async = require( 'async' )
const moment = require('moment')
const cheerio = require('cheerio')
const request = require( '../lib/request' )
let logger,api
const jsonp = function (data) {
    return data
}
class leDealWith {
    constructor ( spiderCore ) {
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('./storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('DealWith instantiation ...')
    }
    le ( task, callback ) {
        task.total = 0
        this.getTotal( task, ( err,result ) => {
            callback(err,result)
        })
    }
    getTotal ( task, callback ) {
        logger.debug("开始获取视频总页数")
        let option = {}
        option.url = api.le.newList + task.id + "/queryvideolist?callback=jsonp&orderType=0&pageSize=48&searchTitleString=&currentPage=1&_="+ (new Date()).getTime()
        option.referer = `http://chuang.le.com/u/${task.id}/videolist`
        option.ua = 1
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("le",option.url,"total")
            if(err){
                logger.error(err,err.code,err.Error)
                let errType
                if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                    errType = "timeoutErr"
                } else{
                    errType = "responseErr"
                }
                logger.error(errType)

                this.storaging.errStoraging('le',option.url,task.id,err,errType,"total")
                return callback(err)
            }
            try {
                result = eval("("+result.body+")")
            } catch (e){
                logger.error('jsonp解析错误:',e)
                this.storaging.errStoraging('le',option.url,task.id,"le获取视频总数接口jsonp解析错误","doWithResErr","total")
                logger.info(result)
                return callback(e)
            }
            let page = result.data.totalPage
            task.total = page * 48
            // this.storaging.succStorage("le",option.url,"total")
            this.getList(task,page, () => {
                callback()
            })
        })
    }
    getList ( task, page, callback ) {
        let sign = 1,
            option = {}
        option.referer = `http://chuang.le.com/u/${task.id}/videolist`
        option.ua = 1
        async.whilst(
            () => {
                return sign <= page
            },
            ( cb ) => {
                logger.debug("开始获取第"+ sign +"页le视频列表")
                option.url = api.le.newList + task.id + "/queryvideolist?callback=jsonp&orderType=0&pageSize=48&searchTitleString=&currentPage=" + sign + "&_="+ (new Date()).getTime()
                request.get( logger, option, (err,result) => {
                    this.storaging.totalStorage ("le",option.url,"list")
                    if(err){
                        logger.error(err,err.code,err.Error)
                        let errType
                        if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                    errType = "timeoutErr"
                } else{
                    errType = "responseErr"
                }
                        logger.error(errType)
                        this.storaging.errStoraging('le',option.url,task.id,err,errType,"list")
                        return cb()
                    }
                    if(!result || !result.body){
                        this.storaging.errStoraging('le',option.url,task.id,"le获取视频列表接口无返回数据","responseErr","list")
                        return
                    }
                    try {
                        result = eval("("+result.body+")")
                    } catch (e){
                        logger.error(`jsonp解析错误`)
                        this.storaging.errStoraging('le',option.url,task.id,"le获取视频列表接口jsonp解析错误","doWithResErr","list")
                        logger.info(result)
                        return cb()
                    }
                    let backList = result.data.list
                    //logger.debug(backList)
                    // this.storaging.succStorage("le",option.url,"list")
                    this.deal(task,backList, () => {
                        sign++
                        cb()
                    })
                })
            },
            ( err, result ) => {
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
            ( cb ) => {
                this.info( task, list[index], () => {
                    index++
                    cb()
                })
            },
            ( err, result ) => {
                callback()
            }
        )
    }
    info ( task, video, callback ) {
        let id = video.vid
        async.parallel(
            [
                ( callback ) => {
                    this.getInfo( id, ( err, data ) =>{
                        if(err){
                            return callback(err)
                        }
                        callback(null,data)
                    })
                },
                ( callback ) => {
                    this.getExpr( id, ( err, time ) => {
                        if(err){
                            return callback(err)
                        }
                        callback(null,time)
                    })
                },
                ( callback ) => {
                    this.getDesc( id, ( err, data ) => {
                        if(err){
                            return callback(err)
                        }
                        callback(null,data)
                    })
                }
            ], (err,result) => {
                if(err){
                    return callback(err)
                }
                let media = {
                    author: task.name,
                    platform: 3,
                    bid: task.id,
                    aid: id,
                    title: video.title.substr(0,100).replace(/"/g,''),
                    desc: result[2] ? result[2].desc.substr(0,100).replace(/"/g,'') : null,
                    play_num: result[0] ? result[0].play_count : null,
                    comment_num: result[0] ? result[0].vcomm_count : null,
                    support: result[0] ? result[0].up : null,
                    step: result[0] ? result[0].down : null,
                    a_create_time: moment(result[1] ? result[1].time : null).unix(),
                    long_t: this.long_t(video.duration),
                    v_img: video.videoPic,
                    class: result[2] ? result[2].class : null
                }

                if(!media.desc){
                    delete media.desc
                }
                if(!media.class){
                    delete media.class
                }

                this.core.MSDB.hget(`apiMonitor:${media.author}:play_num:${media.aid}`,"play_num",(err,result)=>{
                    if(err){
                        logger.debug("读取redis出错")
                        return
                    }
                    if(result > media.play_num){
                        this.storaging.errStoraging('le',`${api.le.info}${media.aid}?callback=jsonp`,task.id,`乐视视频${media.aid}播放量减少`,"resultErr","info")
                        return
                    }
                })
                this.storaging.sendDb(media )
                callback()
            }
        )
    }
    getInfo ( id, callback ) {
        let option = {
            url: api.le.info + id + "&_=" + (new Date()).getTime(),
            referer:`http://www.le.com/ptv/vplay/${id}.html`,
            ua: 1
        }
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("le",option.url,"info")
            if(err){
                logger.error(err,err.code,err.Error)
                let errType 
                if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                    errType = "timeoutErr"
                } else{
                    errType = "responseErr"
                }
                logger.error(errType)

                this.storaging.errStoraging('le',option.url,id,err,errType,"info")
                return callback(err)
            }
            //logger.debug(result.body)
            let backData
            try {
                backData = JSON.parse(result.body)
            } catch (e){
                logger.error(`getInfo json error: `,e)
                this.storaging.errStoraging('le',option.url,task.id,"le获取视频信息接口json解析错误","doWithResErr","info")
                logger.error(result.body)
                return callback(e)
            }
            if(!backData || backData.length === 0){
                logger.error(`getInfo 异常`)
                this.storaging.errStoraging('le',option.url,task.id,"le获取视频信息接口返回数据为空","resultErr","info")
                return callback(true)
            }
            //logger.debug('188: ',backData)
            let info = backData[0]
            // this.storaging.succStorage("le",option.url,"info")
            callback(null,info)
        })
    }
    getExpr ( id, callback ) {
        const option = {
            url: `http://www.le.com/ptv/vplay/${id}.html`,
            ua: 1
        }
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("le",option.url,"Expr")
            if(err){
                logger.error(err,err.code,err.Error)
                let errType 
                if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                    errType = "timeoutErr"
                } else{
                    errType = "responseErr"
                }
                logger.error(errType)
                this.storaging.errStoraging('le',option.url,id,err,errType,"Expr")
                return callback( err )
            }
            const $ = cheerio.load(result.body),
                timeDom = $('p.p_02 b.b_02'),
                descDom = $('p.p_03'),
                timeDom2 = $('#video_time'),
                descDom2 = $('li.li_04 p'),
                timeDom3 = $('li.li_04 em'),
                descDom3 = $('li_08 em p')
            if(timeDom.length === 0 && timeDom2.length === 0 && timeDom3.length === 0){
                this.storaging.errStoraging('le',option.url,id,"从dom中获取视频的expr信息失败","domBasedErr","Expr")
                return callback(true)
            }
            let time,desc
            if(timeDom.length !== 0){
                time = timeDom.text()
                desc = descDom.attr('title') || ''
            }else if(timeDom2.length !== 0){
                time = timeDom2.text()
                desc = descDom2.attr('title') || ''
            }else{
                time = timeDom3.text()
                desc = descDom3.attr('title') || ''
            }
            // this.storaging.succStorage("le",option.url,"Expr")
            // logger.debug(timeDom.text())
            // logger.debug(descDom.attr('title'))
            callback(null,{time:time,desc:desc})
        })
    }
    // getTime ( id, callback ) {
    //     let option = {
    //         url: this.settings.time + id
    //     }
    //     request.get( option, ( err, result) => {
    //         if(err){
    //             logger.error( 'occur error : ', err )
    //             return callback(err)
    //         }
    //         try {
    //             result = JSON.parse(result.body)
    //         } catch (e) {
    //             logger.error('json数据解析失败')
    //             logger.info(result)
    //             return callback(e)
    //         }
    //         let time = result.version_time
    //         callback(null,moment(time).unix())
    //     })
    // }
    getDesc ( id, callback ) {
        let option = {
            url: api.le.desc + id,
            referer: 'http://m.le.com/vplay_' + id +'.html'
        }
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("le",option.url,"Desc")
            if(err){
                logger.error(err,err.code,err.Error)
                let errType
                if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                    errType = "timeoutErr"
                } else{
                    errType = "responseErr"
                }
                logger.error(errType)
                this.storaging.errStoraging('le',option.url,id,err,errType,"Desc")
                return callback(null,null)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                this.storaging.errStoraging('le',option.url,task.id,"le获取视频描述信息json解析错误","doWithResErr","Desc")
                logger.info(result)
                return callback(null,null)
            }
            result = result.data.introduction
            if(!result){
                this.storaging.errStoraging('le',option.url,task.id,"le获取视频描述信息接口返回结果为空","resultErr","Desc")
                return callback(null,null)
            }
            let backData = {
                desc: result.video_description || '',
                class: result.style
            }
            // this.storaging.succStorage("le",option.url,"Desc")
            callback(null,backData)
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
module.exports = leDealWith