const async = require( 'async' )
const request = require( '../lib/req' )

let logger
class dealWith {
    constructor ( spiderCore ) {
        this.core = spiderCore
        this.settings = spiderCore.settings
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    todo ( task, callback ) {
        task.total = 0
        this.getUser( task, ( err, result ) => {
            if(err){
                return callback(err)
            }
            callback(null,task.total)
        })
    }
    getUser ( task, callback ) {
        let option = {
            url: this.settings.userInfo + task.id,
            referer: `http://weishi.qq.com/u/${task.id}`
        }
        request.get( option, ( err, result ) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.info(result)
                return callback(e)
            }
            let data = result.data,
                user = {
                    platform: 16,
                    bid: data.uid,
                    fans_num: data.follower_num
                }
            task.total = data.tweet_num
            async.parallel({
                user: (callback) => {
                    this.sendUser (user,(err,result) => {
                        callback(null,'用户信息已找到')
                    })
                    this.sendStagingUser(user)
                },
                media: (callback) => {
                    this.getList( task, data.tweet_num, (err) => {
                        if(err){
                            return callback(err)
                        }
                        callback(null,'视频信息已找到')
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
    sendUser (user,callback){
        let option = {
            url: this.settings.sendToServer[0],
            data: user
        }
        request.post(option,(err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                logger.info(`返回微视用户 ${user.bid} 连接服务器失败`)
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error(`微视用户 ${user.bid} json数据解析失败`)
                logger.info(result)
                return callback(e)
            }
            if(result.errno == 0){
                logger.debug("微视用户:",user.bid + ' back_end')
            }else{
                logger.error("微视用户:",user.bid + ' back_error')
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
    getList ( task, total, callback ) {
        let sign = 1,lastid,pagetime,
            page,
            option = {}
        if(total % 20 == 0 ){
            page = total / 20
        }else{
            page = Math.ceil(total / 20)
        }
        async.whilst(
            () => {
                return sign <= page
            },
            (cb) => {
                logger.debug('开始获取第' + sign + '页视频列表')
                if(!lastid){
                    option.url = this.settings.list + `${task.id}&_=${new Date().getTime()}`
                }else{
                    option.url = this.settings.list + `${task.id}&lastid=${lastid}&pagetime=${pagetime}&_=${new Date().getTime()}`
                }
                option.referer = `http://weishi.qq.com/u/${task.id}`
                request.get(option, (err,result) => {
                    if(err){
                        logger.error( 'occur error : ' + err )
                        sign++
                        return cb()
                    }
                    if(result.statusCode != 200){
                        logger.error(`状态码错误${result.statusCode}`)
                        logger.info(result)
                        sign++
                        return cb()
                    }
                    try {
                        result = JSON.parse(result.body)
                    } catch (e) {
                        logger.error('json数据解析失败')
                        logger.info(result)
                        sign++
                        return cb()
                    }
                    logger.debug('info bug: ',result)
                    if(result.errcode != 0){
                        sign++
                        return cb()
                    }
                    let r_data = result.data,
                        data = r_data.info
                    if(Object.prototype.toString.call(data) !== '[object Array]'){
                        sign++
                        return cb()
                    }
                    lastid = data[data.length-1].id
                    pagetime = data[data.length-1].timestamp
                    this.deal( task, data, () => {
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
    deal ( task, list, callback ) {
        let index = 0,video,media
        async.whilst(
            () => {
                return index < list.length
            },
            (cb) => {
                video = list[index]
                media = {
                    author: video.name,
                    platform: 16,
                    bid: task.id,
                    aid: video.id,
                    title: video.origtext ? video.origtext.substr(0,80).replace(/"/g,'') : 'btwk_caihongip',
                    desc: video.origtext ? video.origtext.substr(0,100).replace(/"/g,'') : '',
                    play_num: video.playCount,
                    forward_num: video.rtcount,
                    comment_num: video.mcount,
                    support: video.digcount,
                    a_create_time: video.timestamp,
                    long_t: video.newvideos ? this._long_t(video.newvideos) : null,
                    v_img: video.newvideos ? this._v_img(video) : null,
                    class: video.topic ? this._class(video.topic) : null,
                    tag: video.tags ? this._class(video.tags): null
                }
                if(!media.long_t){
                    delete media.long_t
                }
                if(!media.v_img){
                    delete media.v_img
                }
                if(!media.class){
                    delete media.class
                }
                if(!media.tag){
                    delete media.tag
                }
                this.sendCache( media )
                index++
                cb()
            },
            (err,result) => {
                callback()
            }
        )
    }
    _long_t ( raw ){
        if( !raw ){
            return ''
        }
        if(raw.length != 0){
            return raw[0].duration
        }
        return ''
    }
    _v_img ( raw ){
        if( !raw.newvideos && !raw.videos ){
            return ''
        }
        if(raw.newvideos && raw.newvideos.length > 0){
            return raw.newvideos[0].picurl
        }
        if(raw.videos && raw.videos.length > 0){
            return raw.videos[0].picurl
        }
        return ''
    }
    _class ( raw ){
        if( !raw ){
            return ''
        }
        let _classArr = []
        if(Object.prototype.toString.call(raw) === '[object Array]' && raw.length == 0){
            return ''
        }
        if(Object.prototype.toString.call(raw) === '[object Array]' && raw.length != 0){
            for( let i in raw){
                _classArr.push(raw[i].name)
            }
            return _classArr.join(',')
        }
        return ''
    }
    sendCache ( media ){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`微视 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith