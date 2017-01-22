/**
 * Created by junhao on 16/6/21.
 */
const URL = require('url')
const moment = require('moment')
const async = require( 'async' )
const cheerio = require('cheerio')
const EventProxy = require( 'eventproxy' )
const request = require( '../lib/request' )
const md5 = require('js-md5')
const jsonp = function(data){
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
        task.event = new EventProxy()
        async.parallel(
            {
                user : (callback) => {
                    this.getFans(task,(err)=>{
                        callback(null,"用户信息已返回")
                    })
                },
                video : (callback) => {
                    this.getVidTotal(task,(err)=>{
                        if(err){
                            return callback(err)
                        }
                        callback(null,"视频信息已返回")
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
    
    getFans ( task, callback){
        let option = {
            url: this.settings.fans + task.id + "&_=" + new Date().getTime()
        }
        request.get( logger, option, (err, result)=>{
            if(err){
                return callback()
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error(`CCTV json数据解析失败`)
                logger.error(result)
                return callback(e)
            }
            let user = {
                platform: task.p,
                bid: task.id,
                fans_num: result.data.fans_count
            }
            //logger.debug(user)
            /*this.sendUser(user, () => {
                callback()
            })*/
            callback()
            this.sendStagingUser(user)
        })
    }
    sendUser (user,callback){
        let option = {
            url: this.settings.sendToServer[2],
            data: user
        }
        request.post(logger,option,(err,result) => {
            if(err){
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error(`CCTV ${user.bid} json数据解析失败`)
                logger.info(result)
                return callback(e)
            }
            if(result.errno == 0){
                logger.debug("CCTV:",user.bid + ' back_end')
            }else{
                logger.error("CCTV:",user.bid + ' back_error')
                logger.info(result)
                logger.info(`user info: `,user)
            }
            callback()
        })
    }
    sendStagingUser (user){
        let option = {
            url: 'http://staging-dev.meimiaoip.com/index.php/Spider/Fans/postFans',
            data: user
        }
        request.post( logger,option,(err,result) => {
            if(err){
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
    getVidTotal( task, callback ){
        let option = {
            url: 'http://my.xiyou.cntv.cn/'+task.id+'/video-2-1.html',
            ua: 1
        },
        sign       = 1
        request.get( logger, option, (err, result) => {
            if (err) {
                logger.error( '总量接口请求错误 : ', err )
                setTimeout(() => {
                    this.getVidTotal(task,callback)
                },3000)
                return
            }
            
            let $          = cheerio.load(result.body),
                total      = $('li.video strong').text(),
                page       = $('div.pagetotal span').eq(1).text().replace(/[\s]/g,'').replace('共','').replace('页','')
                task.total = total
            //logger.debug(total)
            if(total == 0){
                setTimeout(() => {
                    this.getVidTotal(task,callback)
                },100)
                return
            }
            this.getVidList(task,page,sign,callback)
        })
    }
    
    getVidList( task,  page, sign, callback ){
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                let option = {
                    url : 'http://my.xiyou.cntv.cn/'+task.id+'/video-2-'+sign+'.html'
                }
                request.get( logger, option, ( err, result ) => {
                    if (err) {
                        logger.error( '列表接口请求错误 : ', err )
                        setTimeout(() => {
                            this.getVidList(task,page,sign,callback)
                        },3000)
                        return
                    }
                    let $       = cheerio.load(result.body),
                        length  = $('div.shipin_list_boxs>ul>li').length,
                        content = $('div.shipin_list_boxs>ul')
                    if(length == 0){
                        setTimeout(() => {
                            this.getVidList(task,page,sign,callback)
                        },300)
                        return
                    }
                    //logger.debug(length+' | '+sign)
                    this.deal(task,content,length,() => {
                        sign++
                        cb()
                    })
                })
            },
            (err,result) => {
                logger.debug('当前用户数据请求完成')
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
                this.getAllInfo( task, user.find('li').eq(index), () => {
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
        let vid = video.find('div.images>a').attr('href')
            vid = URL.parse(vid,true).pathname
            vid = vid.replace('/v-','').replace('.html','')
        
        let option = {
            url: this.settings.videoInfo+vid
        }
        request.get( logger, option, (err, result) => {
            if(err){
                logger.debug('视频请求失败 ' + err)
                callback(err,null)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('数据解析失败')
                return
            }
            let time = new Date(result.data[0].uploadTime+ ' 00:00:00')
            let media = {
                author: task.name,
                platform: task.p,
                bid: task.id,
                aid: result.data[0].videoId,
                title: result.data[0].title.replace(/"/g,''),
                comment_num: result.data[0].commentCount,
                class: result.data[0].categoryName,
                tag: result.data[0].videoTags,
                desc: result.data[0].videoDetailInfo.replace(/<br\/>/g,'').substring(0,100).replace(/"/g,''),
                support: result.data[0].upCount,
                step: result.data[0].downCount,
                long_t: result.data[0].timeSpan,
                v_img: result.data[0].imagePath,
                play_num: result.data[0].playCount,
                save_num: result.data[0].favCount,
                // v_url: 'http://xiyou.cctv.com/v-'+result.data[0].videoId+'.html',
                a_create_time: moment(time).format('X')

            }
            this.sendCache( media )
            callback() 
        })
    }
    sendCache (media,callback){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`CCTV ${media.aid} 加入缓存队列`)
            //callback()
        } )
    }
}
module.exports = dealWith