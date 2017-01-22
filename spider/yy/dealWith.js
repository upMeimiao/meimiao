/**
 * Created by yunsong on 16/8/5.
 */
const async = require( 'async' )
const request = require( '../lib/req' )
const cheerio = require( 'cheerio' )
const moment = require( 'moment' )

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
        this.getTotal (task,(err) => {
            if(err){
                return callback(err)
            }
            callback(null,task.total)
        })
    }
    getTotal (task,callback){
        logger.debug('开始获取视频总数')
        let option = {
            url: this.settings.userInfo + task.id
        }
        request.get(option,(err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            if(result.statusCode != 200){
                logger.error('yy状态码错误',result.statusCode)
                logger.info(result)
                return callback(true)
            }
            let $ = cheerio.load(result.body),
                fans_text = $('.fans-link').text(),
                live_num = $('.live-col .title-num').text().replace(/（/g,'').replace(/）/g,''),
                sq_num = $('.shenqu-col .title-num').text().replace(/（/g,'').replace(/）/g,''),
                dp_num = $('.duanpai-col .title-num').text().replace(/（/g,'').replace(/）/g,'')
            let user = {
                platform: 20,
                bid: task.id,
                fans_num: fans_text.replace(/,/g,'')
            }
            task.total = Number(live_num) + Number(sq_num) + Number(dp_num)
            async.parallel({
                user: (callback) => {
                    this.sendUser ( user,(err,result) => {
                        callback(null,'用户信息已返回')
                    })
                    this.sendStagingUser(user)
                },
                live: (callback) => {
                    this.getLive( task, live_num, (err) => {
                        if(err){
                            return callback(err)
                        }
                        callback(null,'直播回放信息已返回')
                    })
                },
                shenqu: (callback) => {
                    this.getSlist( task, sq_num, (err) => {
                        if(err){
                            return callback(err)
                        }
                        callback(null,'神曲视频信息已返回')
                    })
                },
                duanpai: (callback) => {
                    this.getDlist( task, dp_num, (err) => {
                        if(err){
                            return callback(err)
                        }
                        callback(null,'短拍视频信息已返回')
                    })
                }
            },(err,result) => {
                if(err){
                    return callback(err)
                }
                logger.debug('result : ',result)
                callback()
            })
        })
    }
    sendUser ( user,callback ){
        let option = {
            url: this.settings.sendToServer[0],
            data: user
        }
        request.post(option,(err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                logger.info(`返回YY用户 ${user.bid} 连接服务器失败`)
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error(`YY用户 ${user.bid} json数据解析失败`)
                logger.info(result)
                return callback(e)
            }
            if(result.errno == 0){
                logger.debug("yy用户:",user.bid + ' back_end')
            }else{
                logger.error("yy用户:",user.bid + ' back_error')
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
        request.post( option,(err,result) => {
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
    getLive ( task, total, callback ) {
        let sign = 1,
            option = {},
            page,list
        if(total % 20 == 0){
            page = total / 20
        }else{
            page = Math.ceil(total / 20)
        }
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                logger.debug('开始获取第' + sign + '页直播回放列表')
                option.url = this.settings.liveList + task.id + "&pageNum=" + sign
                request.get( option, (err,result) => {
                    if(err){
                        logger.error('occur error: ',err)
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e){
                        logger.error('json数据解析失败')
                        logger.info(result)
                        return cb()
                    }
                    list = result.data.list
                    if(list){
                        this.deal( task, list, '直播回放', () => {
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
    getSlist ( task, total, callback) {
        let sign = 1,
            option,
            page,
            list
        if(total % 20 == 0){
            page = total / 20
        }else{
            page = Math.ceil(total / 20)
        }
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                logger.debug('开始获取第' + sign + '页神曲视频列表')
                option = {
                    url: this.settings.shenquList + task.id + "&p=" + sign
                }
                request.get( option, (err,result) => {
                    if(err){
                        logger.error('occur error: ',err)
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e){
                        logger.error('json数据解析失败')
                        logger.info(result)
                        return cb()
                    }
                    list = result.data
                    if(list){
                        this.deal( task, list, '神曲', () => {
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
    getDlist( task, total, callback) {
        let sign = 1,
            option,
            page,
            list
        if(total % 20 == 0){
            page = total / 20
        }else{
            page = Math.ceil(total / 20)
        }
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                logger.debug('开始获取第' + sign + '页短拍视频列表')
                option = {
                    url: this.settings.duanpaiList + task.id + "&p=" + sign
                }
                request.get( option, (err,result) => {
                    if(err){
                        logger.error('occur error: ',err)
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e){
                        logger.error('json数据解析失败')
                        logger.info(result)
                        return cb()
                    }
                    list = result.data
                    if(list){
                        this.deal( task, list, '短片', () => {
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
    deal ( task, list, type, callback) {
        let index = 0,video
        async.whilst(
            () => {
                return index < list.length
            },
            (cb) => {
                video = list[index]
                if(video.pid){
                    this.getInfoL( task, type, video,(err) => {
                        index++
                        cb()
                    })
                }else{
                    this.getInfo( task, type, video,(err) => {
                        index++
                        cb()
                    })
                }
            },
            (err,result) => {
                callback()
            }
        )
    }
    getInfoL ( task, type, data, callback ) {
        let title = data.title
        if(title == ''){
            title = "btwk_caihongip"
        }
        let media = {
            author: task.name,
            platform: 20,
            bid: task.id,
            aid: data.pid,
            title: title,
            play_num: Number(data.viewer) + Number(data.recordViewer),
            a_create_time: data.beginTime,
            long_t: moment.duration(data.duration).asSeconds(),
            v_url: data.playUrl,
            v_img: data.imageUrl,
            class: type
        }
        this.sendCache( media )
        callback()
    }
    getInfo ( task, type, data, callback ) {
        let title,play = data.watchCount
        if(type == '神曲'){
            title = data.songname
        }
        if( type == '短片'){
            title = data.resdesc
        }
        if(title == ''){
            title = "btwk_caihongip"
        }
        if(play.indexOf('万') != -1 ){
            play = play.replace('万','') * 10000
        }else if(play.indexOf('亿') != -1){
            play = play.replace('亿','') * 100000000
        }
        let time = data.addtime,
            a_create_time = moment(time).format('X'),
            media = {
                author: data.ownername,
                platform: 20,
                bid: task.id,
                aid: data.resid,
                title: title.substr(0,100).replace(/"/g,''),
                desc: data.resdesc.substr(0,100).replace(/"/g,''),
                play_num: play,
                save_num: data.favorCount,
                forward_num: data.shareCount,
                comment_num: data.commentCount,
                support: data.likeCount,
                a_create_time: a_create_time,
                long_t: data.duration ? moment.duration(data.duration).asSeconds() : null,
                v_img: data.snapshoturl,
                class: type,
                v_url: data.playUrl
            }
        if(!media.long_t){
            delete media.long_t
        }
        this.sendCache( media )
        callback()
    }
    sendCache ( media ){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`yy ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith