const moment = require('moment')
const async = require( 'async' )
const request = require('../../lib/request.js')
const cheerio = require('cheerio')
const _Callback = function(data){
    return data
}
let logger,api
class dealWith {
    constructor ( spiderCore ){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('qzoneDealWith instantiation ...')
    }
    qzone ( task, callback ) {
        task.total = 0
        async.parallel(
            [
                (cb) => {
                    this.getFan( task, ( err,result ) => {
                        cb(err,result)
                    })
                },
                (cb) => {
                    this.getVidList( task, ( err,result ) => {
                        if(err){
                            return cb( err )
                        }
                        cb( err,result )
                    })
                }
            ],
            (err, result) => {
                if(err){
                    return callback( err )
                }
                callback( err,result )
            }
        )
    }
    getFan( task, callback ) {
        let option = {
            url: 'https://h5.qzone.qq.com/proxy/domain/r.qzone.qq.com/cgi-bin/tfriend/cgi_like_check_and_getfansnum.cgi?uin='+task.id+'&mask=3&fupdate=1',
            ua: 1
        }
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("qzone",option.url,"fan")
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
                //logger.error(errType)
                this.storaging.errStoraging("qzone",option.url,task.id,err.code || "error",errType,"fan")
                return this.getFan( task, callback )
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('qzone',option.url,task.id,"QQ空间获取info接口状态码错误","statusErr","info")
                return this.getFan( task, callback )
            }
            try{
                result = eval(result.body)
            }catch(e){
                this.storaging.errStoraging('qzone',option.url,task.id,"QQ空间获取list接口json数据解析失败","doWithResErr","fan")
                return this.getFan( task, callback )
            }
            if(!result.data.data.total && result.data.data.total !== 0){
                this.storaging.errStoraging('qzone',option.url,task.id,"QQ空间获取list接口返回数据错误","resultErr","fan")
                return this.getFan( task, callback )
            }
            let user = {
                platform: task.p,
                bid: task.id,
                fans_num: result.data.data.total
            }
            callback(null,user)
        })
    }
    getVidList( task, callback ){
        let sign   = 0,
            start  = 0,
            page   = 1,
            num    = 0,
            Retry  = 0
        async.whilst(
            () => {
                return sign < Math.min(page,500)
            },
            (cb) => {
                let option = {
                    url : api.qzone.listVideo+task.id+"&start="+start,
                    referer : 'https://h5.qzone.qq.com/proxy/domain/ic2.qzone.qq.com/cgi-bin/feeds/feeds_html_module?i_uin='+task.id+'&mode=4&previewV8=1&style=31&version=8&needDelOpr=true&transparence=true&hideExtend=false&showcount=10&MORE_FEEDS_CGI=http%3A%2F%2Fic2.qzone.qq.com%2Fcgi-bin%2Ffeeds%2Ffeeds_html_act_all&refer=2&paramstring=os-win7|100',
                    ua : 1
                }
                //logger.debug(option.url)
                request.get( logger, option, ( err, result ) => {
                    this.storaging.totalStorage ("qzone",option.url,"list")
                    if (err) {
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
                        //logger.error(errType)
                        this.storaging.errStoraging("qzone",option.url,task.id,err.code || "error",errType,"list")
                        if(num <= 1){
                            return setTimeout(() => {
                                num++
                                // logger.debug('300毫秒之后重新请求一下当前列表')
                                cb()
                            },300)
                        }
                        return setTimeout(() => {
                            start += 10
                            num = 0
                            // logger.debug('300毫秒之后重新请求下一页列表')
                            cb()
                        },300)
                    }
                    if(result.statusCode && result.statusCode != 200){
                        this.storaging.errStoraging('qzone',option.url,task.id,`QQ空间获取list接口状态码错误${result.statusCode}`,"statusErr","list")
                        return callback( task, callback )
                    }
                    num = 0
                    try{
                        result = eval(result.body)
                    }catch (e){
                        // logger.error('json数据解析失败')
                        this.storaging.errStoraging('qzone',option.url,task.id,"QQ空间获取list接口json数据解析失败","doWithResErr","list")
                        return callback(e)
                    }
                    if(result.data == undefined){
                        if(num <= 1){
                            return setTimeout(() => {
                                num++
                                // logger.debug('300毫秒之后重新请求一下')
                                cb()
                            },300)
                        }
                        return setTimeout(() => {
                            num = 0
                            start+=10
                            // logger.debug('300毫秒之后重新请求下一页列表')
                            cb()
                        },300)
                    }
                    num = 0
                    if(result.data.friend_data == undefined){
                        if(num <= 1){
                            return setTimeout(() => {
                                num++
                                // logger.debug('300毫秒之后重新请求一下')
                                cb()
                            },300)
                        }
                        return setTimeout(() => {
                            num = 0
                            start+=10
                            // logger.debug('300毫秒之后重新请求下一页列表')
                            cb()
                        },300)
                    }
                    num = 0
                    let length = result.data.friend_data.length-1
                    task.total += length
                    if( length <= 0 ){
                        // logger.debug('已经没有数据')
                        page = 0
                        sign++
                        return cb()
                    }
                    this.deal(task,result.data,length,() => {
                        sign++
                        page++
                        start+=20
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
                this.getAllInfo( task, user.friend_data[index], () => {
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
        let $ = cheerio.load(video.html)
        if(!$('div').hasClass('f-ct-video')){
            //logger.debug('当前的不是视频 ~ next')
            return callback()
        }
        let num = 0
        async.parallel([
            (cb) => {
                this.getVideoInfo(task,video,(err,result) => {
                    cb(null,result)
                })
            },
            (cb) => {
                this.getVidCom(task,video.key,(err,data) => {
                    cb(null,data)
                })
            }
        ],(err,result) => {

            if(result[0] == '抛掉当前的'||!result[0]){
                return callback()
            }
            if(result[0].singlefeed == undefined){
                return callback()
            }
            if(!result[1]){
                return callback()
            }
            let media = {
                author: task.name,
                platform: task.p,
                bid: task.id,
                aid: video.key,
                title: result[0].singlefeed['4'].summary.substring(0,100).replace(/"/g,''),
                support: result[0].singlefeed['11'].num,
                long_t: result[0].singlefeed['7'].videotime/1000,
                v_img: result[0].v_img,
                read_num: result[0].singlefeed['20'].view_count,
                v_url: result[0].singlefeed['0'].curlikekey,
                a_create_time: video.abstime,
                comment_num: result[1].cmtnum,
                forward_num: result[1].fwdnum,
                play_num: result[0].singlefeed['7'].videoplaycnt
            }
            if(!media.play_num){
                return callback()
            }
            // this.core.MSDB.hget(`apiMonitor:play_num`,`${media.author}_${media.aid}`,(err,result)=>{
            //     if(err){
            //         logger.debug("读取redis出错")
            //         return callback()
            //     }
            //     if(result > media.play_num){
            //         this.storaging.errStoraging('qzone',"",task.id,`QQ空间播放量减少`,"playNumErr","info",media.aid,`${result}/${media.play_num}`)
            //     }
            //     this.storaging.sendDb(media/*,task.id,"info"*/)
            // })
            this.storaging.playNumStorage(media,"info")
            callback()
        })
    }

    getVideoInfo( task, video, callback ){
        let option = {
            url: api.qzone.videoInfo+task.id+"&appid="+video.appid+"&tid="+video.key+"&ugckey="+task.id+"_"+video.appid+"_"+video.key+"_&qua=V1_PC_QZ_1.0.0_0_IDC_B"
        }
        //logger.debug(option.url)
        request.get( logger, option, ( err, result ) => {
            this.storaging.totalStorage ("qzone",option.url,"info")
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
                this.storaging.errStoraging('qzone',option.url,task.id,err.code || "error",errType,"info")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('qzone',option.url,task.id,`QQ空间获取info接口状态码错误${result.statusCode}`,"statusErr","info")
                return callback(result.statusCode)
            }
            try{
                result = eval(result.body)
            } catch(e){
                logger.error('_Callback数据解析失败')
                this.storaging.errStoraging('qzone',option.url,task.id,"QQ空间获取info接口json数据解析失败","doWithResErr","info")
                return callback(null,'抛掉当前的')
            }
            if(result.data == undefined){
                return callback(null,'抛掉当前的')
            }
            result = result.data.all_videolist_data[0]
            if(!result || result && !result.singlefeed['7']){
                this.storaging.errStoraging('qzone',option.url,task.id,"QQ空间获取info接口返回数据错误","resultErr","info")
                return callback(null,'抛掉当前的')
            }
            if(result.singlefeed['7'].coverurl['0'] == undefined){
                result.v_img = ''
            }else if(result.singlefeed['7'].coverurl['0'].url == undefined){
                result.v_img = ''
            }else{
                result.v_img = result.singlefeed['7'].coverurl['0'].url
            }
            // logger.debug("qzone media==============",media)
            callback(null,result)
        })
    }
    getVidCom( task, vid, callback ){
        let option = {
            url : 'https://h5.qzone.qq.com/proxy/domain/taotao.qq.com/cgi-bin/emotion_cgi_msgdetail_v6?uin='+task.id+'&tid='+vid+'&t1_source=1&ftype=0&sort=0&pos=0&num=20&code_version=1&format=jsonp&need_private_comment=1'
        }
        //logger.debug(option.url)
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("qzone",option.url,"comment")
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
                this.storaging.errStoraging('qzone',option.url,task.id,err.code || "error",errType,"comment")
                return callback(err)
            }
            if(result.statusCode != 200){
                this.storaging.errStoraging('qzone',option.url,task.id,`QQ空间获取comment接口状态码错误${result.statusCode}`,"statusErr","comment")
                return callback(result.statusCode)
            }
            try{
                result = eval(result.body)
            }catch(e){
                this.storaging.errStoraging('qzone',option.url,task.id,"QQ空间获取comment接口json数据解析失败","doWithResErr","comment")
                return callback(null,'')
            }
            callback(null,result)
        })
    }
}
module.exports = dealWith