/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment')
const async = require( 'async' )
const request = require( '../lib/request' )
const cheerio = require('cheerio')
const _Callback = function(data){
    return data
}
let logger
class dealWith {
    constructor ( spiderCore ){
        this.core = spiderCore
        this.settings = spiderCore.settings
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    todo ( task, callback ) {
        task.total = 0
        async.parallel(
            [
                (cb) => {
                    this.getFan( task, ( err ) => {
                        logger.debug('用户粉丝数请求完成')
                        cb(null)
                    })
                },
                (cb) => {
                    this.getVidList( task, ( err ) => {
                        if(err){
                            cb( err )
                        }
                        logger.debug('用户视频数据请求完成')
                        cb( null )
                    })
                }
            ],
            (err, result) => {
                if(err){
                    return callback( err )
                }
                callback( null, task.total )
            }
        )
    }
    getFan( task, callback ) {
        let option = {
            url: 'https://h5.qzone.qq.com/proxy/domain/r.qzone.qq.com/cgi-bin/tfriend/cgi_like_check_and_getfansnum.cgi?uin='+task.id+'&mask=3&fupdate=1',
            ua: 1
        }
        request.get( logger, option, (err, result) => {
            if(err){
                logger.debug('用户粉丝数请求失败')
                return this.getFan( task, callback )
            }
            try{
                result = eval(result.body)
            }catch(e){
                logger.debug('用户粉丝数解析失败')
                logger.info(result)
                return this.getFan( task, callback )
            }
            let user = {
                platform: task.p,
                bid: task.id,
                fans_num: result.data.data.total
            }
            this.sendUser(user)
            this.sendStagingUser(user)
            callback()
        })
    }
    sendUser (user){
        let option = {
            url: this.settings.sendToServer[2],
            data: user
        }
        request.post( logger, option, (err,back) => {
            if(err){
                logger.error( 'occur error : ', err )
                logger.info(`返回QQ空间视频用户 ${user.bid} 连接服务器失败`)
                return
            }
            try{
                back = JSON.parse(back.body)
            }catch (e){
                logger.error(`QQ空间视频用户 ${user.bid} json数据解析失败`)
                logger.info(back)
                return
            }
            if(back.errno == 0){
                logger.debug("QQ空间视频用户:",user.bid + ' back_end')
            }else{
                logger.error("QQ空间视频用户:",user.bid + ' back_error')
                logger.info(back)
                logger.info(`user info: `,user)
            }
        })
    }
    sendStagingUser (user){
        let option = {
            url: 'http://staging-dev.meimiaoip.com/index.php/Spider/Fans/postFans',
            data: user
        }
        request.post( logger, option,(err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.info('send error:',result)
                return
            }
            if(result.errno == 0){
                logger.debug("用户:",user.bid + ' back_end')
            }else{
                logger.error("用户:",user.bid + ' back_error')
                logger.info(result)
            }
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
                return sign < page
            },
            (cb) => {
                let option = {
                    url : this.settings.listVideo+task.id+"&start="+start,
                    referer : 'https://h5.qzone.qq.com/proxy/domain/ic2.qzone.qq.com/cgi-bin/feeds/feeds_html_module?i_uin='+task.id+'&mode=4&previewV8=1&style=31&version=8&needDelOpr=true&transparence=true&hideExtend=false&showcount=10&MORE_FEEDS_CGI=http%3A%2F%2Fic2.qzone.qq.com%2Fcgi-bin%2Ffeeds%2Ffeeds_html_act_all&refer=2&paramstring=os-win7|100',
                    ua : 1
                }
                //logger.debug(option.url)
                request.get( logger, option, ( err, result ) => {
                    if (err) {
                        logger.error( '接口请求错误 : ', err )
                        if(num <= 1){
                            return setTimeout(() => {
                                num++
                                logger.debug('300毫秒之后重新请求一下当前列表')
                                cb()
                            },300)
                        }
                        return setTimeout(() => {
                            start += 10
                            num = 0
                            logger.debug('300毫秒之后重新请求下一页列表')
                            cb()
                        },300)
                    }
                    num = 0
                    try{
                        result = eval(result.body)
                    }catch (e){
                        logger.error('json数据解析失败')
                        logger.info(result)
                        return callback(e)
                    }
                    if(result.data == undefined){
                        if(num <= 1){
                            return setTimeout(() => {
                                num++
                                logger.debug('300毫秒之后重新请求一下')
                                cb()
                            },300)
                        }
                        return setTimeout(() => {
                            num = 0
                            start+=10
                            logger.debug('300毫秒之后重新请求下一页列表')
                            cb()
                        },300)
                    }
                    num = 0
                    if(result.data.friend_data == undefined){
                        if(num <= 1){
                            return setTimeout(() => {
                                num++
                                logger.debug('300毫秒之后重新请求一下')
                                cb()
                            },300)
                        }
                        return setTimeout(() => {
                            num = 0
                            start+=10
                            logger.debug('300毫秒之后重新请求下一页列表')
                            cb()
                        },300)
                    }
                    num = 0
                    let length = result.data.friend_data.length-1
                    task.total += length
                    if( length <= 0 ){
                        logger.debug('已经没有数据')
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

            if(result[0] == '抛掉当前的'){
                logger.debug('直接请求下一个视频')
                return callback()
            }
            if(result[0].singlefeed == undefined){
                return callback()
            }
            let media = {
                author: video.nickname,
                platform: task.p,
                bid: task.id,
                aid: result[0].singlefeed['7'].videoid,
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
            //logger.debug(media.title)
            /*logger.debug(media.play_num)*/
            this.sendCache(media)
            callback()
        })
    }

    getVideoInfo( task, video, callback ){
        let option = {
            url: this.settings.videoInfo+task.id+"&appid="+video.appid+"&tid="+video.key+"&ugckey="+task.id+"_"+video.appid+"_"+video.key+"_"
        }
        request.get( logger, option, ( err, result ) => {
            if(err){
                logger.debug('单个视频请求失败 ' , err)
                return callback(null,'抛掉当前的')
            }
            try{
                result = eval(result.body)
            } catch(e){
                logger.error('_Callback数据解析失败')
                logger.info(result)
                return callback(null,'抛掉当前的')
            }
            if(result.data == undefined){
                return callback(null,'抛掉当前的')
            }
            result = result.data.all_videolist_data[0]

            if(result.singlefeed['7'].coverurl['0'] == undefined){
                result.v_img = ''
            }else if(result.singlefeed['7'].coverurl['0'].url == undefined){
                result.v_img = ''
            }else{
                result.v_img = result.singlefeed['7'].coverurl['0'].url
            }
            //logger.debug(result)
            callback(null,result)
        })
    }
    getVidCom( task, vid, callback ){
        let option = {
            url : 'https://h5.qzone.qq.com/proxy/domain/taotao.qq.com/cgi-bin/emotion_cgi_msgdetail_v6?uin='+task.id+'&tid='+vid+'&t1_source=1&ftype=0&sort=0&pos=0&num=20&code_version=1&format=jsonp&need_private_comment=1'
        }
        //logger.debug(option.url)
        request.get( logger, option, (err,result) => {
            if(err){
                logger.debug('评论总量请求失败')
                return callback(null,'')
            }
            try{
                result = eval(result.body)
            }catch(e){
                logger.debug('评论量数据解析失败')
                return callback(null,'')
            }

            callback(null,result)
        })
    }
    sendCache ( media ){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`qzone ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith