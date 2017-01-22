/**
 * Created by yunsong on 16/8/4.
 */
const async = require( 'async' )
const request = require( '../lib/req' )
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
                this.getUser (task,(err)=>{
                    callback(null,'用户信息已返回')
                })
            },
            media: (callback) => {
                this.getList( task, (err) => {
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
    getUser (task,callback){
        let option = {
            url: this.settings.userInfo + task.id
        }
        request.get(option,(err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback()
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('json数据解析失败')
                logger.info('json error :',result.body)
                return callback()
            }
            let user = {
                platform: 19,
                bid: task.id,
                fans_num: result.data.followers
            }
            this.sendUser (user,(err)=>{
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
        request.post(option,(err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                logger.info(`返回内涵段子用户 ${user.bid} 连接服务器失败`)
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error(`内涵段子用户 ${user.bid} json数据解析失败`)
                logger.info(result)
                return callback(e)
            }
            if(result.errno == 0){
                logger.debug("内涵段子用户:",user.bid + ' back_end')
            }else{
                logger.error("内涵段子用户:",user.bid + ' back_error')
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
    getList ( task, callback ) {
        let sign = 1,
            isSign = true,
            option,
            time
        async.whilst(
            () => {
                return isSign
            },
            (cb) => {
                logger.debug('开始获取第' + sign + '页视频列表')
                if(!time){
                    option = {
                        url: this.settings.medialist + task.id + '&min_time=0'
                    }
                }else{
                    option = {
                        url: this.settings.medialist + task.id + "&max_time=" + time
                    }
                }
                request.get(option, (err,result) => {
                    if(err){
                        logger.error( 'occur error : ' + err )
                        return cb()
                    }
                    if(result.statusCode != 200){
                        logger.error('code error: ',result.statusCode)
                        logger.error(sign)
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e){
                        logger.error('json数据解析失败')
                        logger.error('json error: ',result.body)
                        logger.error(sign)
                        sign++
                        return cb()
                    }
                    let list = result.data.data
                    if(list.length != 0){
                        this.deal( task, list, () => {
                            time = list[list.length-1].group.online_time
                            sign++
                            cb()
                        })
                    }else{
                        task.total = sign * 20
                        isSign = false
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
                if(!list[index].group){
                    index++
                    return cb()
                }
                let group = list[index].group
                if(!group){
                    index++
                    return cb()
                }
                let type = group.media_type
                if(type == 3){
                    this.getInfo(task,list[index],(err) => {
                        index++
                        cb()
                    })
                }else{
                    index++
                    cb()
                }
            },
            (err,result) => {
                callback()
            }
        )
    }
    getInfo ( task, data, callback ) {
        let group = data.group,
            title
        if(group.title != ''){
            title = group.title
        }else{
            title = 'btwk_caihongip'
        }
        let media = {
            author: group.user.name,
            platform: 19,
            bid: task.id,
            aid: group.id_str,
            title: title.substr(0,100).replace(/"/g,''),
            desc: group.text.substr(0,100).replace(/"/g,''),
            play_num: group.play_count,
            save_num: group.favorite_count,
            forward_num: group.share_count,
            comment_num: group.comment_count,
            support: group.digg_count,
            step: group.bury_count,
            a_create_time: group.create_time,
            v_img: this._v_img( group ),
            long_t: group.duration ? this.long_t(group.duration) : null,
            class: group.category_name
        }
        if(!media.long_t){
            delete media.long_t
        }
        if(!media.v_img){
            delete media.v_img
        }
        this.sendCache( media )
        callback()
    }
    long_t ( raw ){
        if(!raw){
            return ''
        }
        return Math.round(raw)
    }
    _v_img ( raw ){
        if( !raw ){
            return ''
        }
        if(!raw.large_cover && !raw.medium_cover){
            return ''
        }
        if(raw.large_cover.url_list && raw.large_cover.url_list.length > 0){
            return raw.large_cover.url_list[0].url
        }
        if(raw.medium_cover.url_list && raw.medium_cover.url_list.length > 0){
            return raw.medium_cover.url_list[0].url
        }
        return ''
    }
    sendCache ( media ){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`内涵段子 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith