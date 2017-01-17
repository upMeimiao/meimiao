const async = require( 'async' )
const moment = require('moment')
const request = require( '../lib/req' )

let logger

class dealWith {
    constructor(spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    todo ( task, callback) {
        task.total = 0
        this.getUser( task, ( err, result ) => {
            if(err){
                return callback(err)
            }
            callback(null, task.total)
        })
    }
    getUser ( task, callback) {
        let option = {
            url : this.settings.userInfo + task.id
        }
        request.get( option, ( err, result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('json数据解析失败')
                logger.info(result)
                return callback(e)
            }
            let userInfo = result.data,
                user = {
                    platform: 18,
                    bid: userInfo.id,
                    fans_num: userInfo.fans_count
                }
            task.total = userInfo.tiezi_count
            async.parallel({
                user: (callback) => {
                    this.sendUser (user ,(err,result) => {
                        callback(null,'用户信息已找到')
                    })
                    this.sendStagingUser(user)
                },
                media: (callback) => {
                    this.getList( task, userInfo.tiezi_count, (err) => {
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
    sendUser ( user,callback ){
        let option = {
            url: this.settings.sendToServer[0],
            data: user
        }
        request.post(option,(err,result) => {
            if(err){
                logger.error('occur error:',err)
                logger.info(`返回百思不得姐用户 ${user.bid} 连接服务器失败`)
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error(`百思不得姐用户 ${user.bid} json数据解析失败`)
                logger.info(result)
                return callback(e)
            }
            if(result.errno == 0){
                logger.debug("不得姐用户:",user.bid + ' back_end')
            }else{
                logger.error("不得姐用户:",user.bid + ' back_error')
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
        let sign = 1,np = 0,
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
                option.url = `${this.settings.medialist}${task.id}/1/desc/bs0315-iphone-4.3/${np}-20.json`
                request.get(option, (err,result) => {
                    if(err){
                        logger.error( 'occur error : ' + err )
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
                    let data = result.list
                    np = result.info.np
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
                if(video.type != 'video') {
                    index++
                    return cb()
                }
                media = {
                    author: video.u.name,
                    platform: 18,
                    bid: task.id,
                    aid: video.id,
                    title: video.text ? video.text.substr(0,100).replace(/"/g,'') : 'btwk_caihongip',
                    desc: video.text.substr(0,100).replace(/"/g,''),
                    play_num: video.video.playcount,
                    forward_num: video.forward,
                    comment_num: video.comment,
                    support: video.up,
                    step: video.down,
                    a_create_time: moment(video.passtime).unix(),
                    long_t: video.video.duration,
                    v_img: this._v_img(video.video.thumbnail),
                    tag: this._tag(video.tags)
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
    _tag ( raw ) {
        let _tagArr = []
        if(!raw){
            return ''
        }
        if(Object.prototype.toString.call(raw) === '[object Array]' && raw.length == 0){
            return ''
        }
        if(Object.prototype.toString.call(raw) === '[object Array]' && raw.length != 0){
            for( let i in raw){
                _tagArr.push(raw[i].name)
            }
            return _tagArr.join(',')
        }
        return ''
    }
    _v_img ( raw ) {
        if(!raw){
            return ''
        }
        if(typeof raw == 'string'){
            return raw
        }
        if(Object.prototype.toString.call(raw) === '[object Array]' && raw.length == 0){
            return ''
        }
        if(Object.prototype.toString.call(raw) === '[object Array]' && raw.length != 0){
            return raw[0]
        }
        return ''
    }
    sendCache ( media ){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`百思不得姐 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith