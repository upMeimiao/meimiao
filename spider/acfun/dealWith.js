/**
 * Created by yunsong on 16/9/7.
 */
const async = require( 'async' )
const cheerio = require( 'cheerio' )
const request = require('../lib/request.js')
const channels = require('./channels')

let logger
class dealWith {
    constructor (spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    todo (task,callback) {
        task.total = 0
        async.parallel({
            user: (callback) => {
                this.getUser( task, (err) => {
                    if(err){
                        return callback(err)
                    }
                    callback(null,'用户信息已返回')
                })
            },
            media: (callback) => {
                this.getTotal( task, (err) => {
                    if(err){
                        return callback(err)
                    }
                    callback(null,'视频信息已返回')
                })
            }
        },(err,result) => {
            if(err){
                return callback(err)
            }
            logger.debug('result : ',result)
            callback(null,task.total)
        })
    }
    getUser ( task, callback){
        let option = {
            url: this.settings.userInfo + task.id,
            referer: `http://m.acfun.tv/details?upid=${task.id}`,
            deviceType: 2,
            ua: 2
        }
        request.get( logger, option, (err,result) => {
            if(err){
                return callback(err)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('acfun粉丝json数据解析失败')
                logger.error(result)
                return callback(e)
            }
            let data = result.data,
                user = {
                    platform: task.p,
                    bid: task.id,
                    fans_num: data.followed
                }
            this.sendUser(user ,(err,result) => {
                callback()
            })
            this.sendStagingUser(user)
        })
    }
    sendUser (user,callback){
        let option = {
            url: this.settings.sendToServer[0],
            data: user
        }
        request.post( logger, option,(err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.info('send error:',result)
                return callback(e)
            }
            if(result.errno == 0){
                logger.debug("A站用户:",user.bid + ' back_end')
            }else{
                logger.error("A站用户:",user.bid + ' back_error')
                logger.info(result)
            }
            callback()
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
                logger.debug("A站用户:",user.bid + ' back_end')
            }else{
                logger.error("A站用户:",user.bid + ' back_error')
                logger.info(result)
            }
        })
    }
    getTotal ( task, callback){
        logger.debug('开始获取视频总数')
        let option = {
            url: this.settings.media + `${task.id}&pageNo=1`,
            referer: `http://www.aixifan.com/u/${task.id}.aspx`,
            ua: 1
        }
        request.get( logger, option, (err,result) => {
            if(err){
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('json数据解析失败')
                logger.info('json1 error :',result.body)
                return callback(e)
            }
            task.total = result.totalcount
            let page = result.totalpage
            this.getList( task, page, (err) => {
                if(err){
                    return callback(err)
                }
                callback(null,'视频信息已返回')
            })
        })
    }
    getList ( task, page, callback ) {
        let sign = 1,
            option
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                logger.debug('开始获取第' + sign + '页视频列表')
                option = {
                    url: this.settings.media + `${task.id}&pageNo=${sign}`,
                    referer: `http://www.aixifan.com/u/${task.id}.aspx`,
                    ua: 1
                }
                request.get(logger,option, (err,result) => {
                    if(err){
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e){
                        logger.error('json数据解析失败')
                        logger.info('json error: ', result.body)
                        return callback(e)
                    }
                    let list = result.contents
                    if(list){
                        this.deal( task,list, () => {
                            sign++
                            cb()
                        })
                    }else{
                        sign++
                        cb()
                    }
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    deal ( task, list, callback) {
        let index = 0
        async.whilst(
            () => {
                return index < list.length
            },
            (cb) => {
                this.getInfo( task, list[index],(err) => {
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getInfo ( task, data, callback ) {
        if(!data.vid){
            return callback()
        }
        let time = data.releaseDate,
            a_create_time = time.toString().substring(0,10),
            media = {
                author: task.name,
                platform: 22,
                bid: task.id,
                aid: data.aid,
                title: data.title.substr(0,100).replace(/"/g,''),
                desc: data.description.substr(0,100).replace(/"/g,''),
                play_num: data.views,
                save_num: data.stows,
                comment_num: data.comments,
                a_create_time: a_create_time,
                long_t: data.time,
                v_img: data.titleImg,
                tag: this._tags(data.tags),
                class: channels.get(Number(data.channelId))
            }
        this.sendCache( media )
        callback()
    }
    _tags( raw ){
        if(typeof raw == 'string'){
            return raw
        }
        if(Object.prototype.toString.call(raw) === '[object Array]'){
            return raw.join(',')
        }
        return ''
    }
    sendCache ( media ){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`A站视频 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith