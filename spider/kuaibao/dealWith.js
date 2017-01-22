/**
 * Created by junhao on 16/6/20.
 */
const async = require( 'async' )
const request = require( '../lib/req' )
let logger
const jsonp = function (data) {
    return data
}
const devArr = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z']
class dealWith {
    constructor ( spiderCore ){
        this.core = spiderCore
        this.settings = spiderCore.settings
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    todo ( task, callback ) {
        task.total = 0
        task.devId = this.getDevId()
        async.parallel({
            user: (callback) => {
                this.getUser(task,(err)=>{
                    callback(null,"用户信息已返回")
                })
            },
            media: (callback) => {
                this.getVideos(task,(err)=>{
                    if(err){
                        return callback(err)
                    }
                    callback(null,"视频信息已返回")
                })
            }
        }, ( err, result ) => {
            if ( err ) {
                return callback(err)
            }
            logger.debug("result:",result)
            callback(null,task.total)
        })
    }
    getDevId() {
        let devId = ''
        for(let i=0; i < 32; i++){
            if(i < 7){
                devId += devArr[Math.floor(Math.random()*10)]
            }else{
                devId += devArr[Math.floor(Math.random()*36)]
            }
            if(i == 7 || i == 11 || i == 15 || i== 19){
                devId += '-'
            }
        }
        return devId
    }
    getUser ( task, callback) {
        let option = {
            url: this.settings.user + task.id
        }
        request.get ( option, ( err, result )=>{
            if(err){
                return callback()
            }
            if( result.statusCode != 200){
                logger.error('获取粉丝code error：',result.statusCode)
                return callback()
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('json数据解析失败')
                logger.info('json error:',result.body)
                return callback()
            }
            let userInfo = result.channelInfo
            if(!userInfo){
                logger.error('userInfo异常错误')
                logger.error(result)
                return callback()
            }
            let user = {
                platform: 10,
                bid: task.id,
                fans_num: userInfo.subCount
            }
            this.sendUser (user,(err,result)=>{
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
        request.post( option, (err,result) => {
            if(err){
                logger.error('occur error:',err)
                logger.info(`返回天天快报用户 ${user.bid} 连接服务器失败`)
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error(`天天快报用户 ${user.bid} json数据解析失败`)
                logger.info(result)
                return callback(e)
            }
            if(result.errno == 0){
                logger.debug("天天快报用户:",user.bid + ' back_end')
            }else{
                logger.error("天天快报用户:",user.bid + ' back_error')
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
    getVideos ( task, callback ) {
        let option = {
            url: this.settings.video,
            referer:'http://r.cnews.qq.com/inews/iphone/',
            data: {
                chlid: task.id,
                is_video: 1
            }
        }
        request.post( option,  (err,result) => {
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
            task.total = result.ids.length
            this.deal(task,result.ids, () => {
                callback()
            })
        })
    }
    deal ( task, list, callback ) {
        let index = 0,
            length = list.length
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                this.getInfo(task,list[index].id,(err) => {
                    if(err){
                        index++
                        return cb()
                    }
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getInfo ( task, id, callback ) {
        let option = {
            referer:'http://r.cnews.qq.com/inews/iphone/',
            url: this.settings.list,
            data: {
                ids: id
            }
        }
        request.post( option, (err,result) => {
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
            //logger.debug(result)
            if(result.newslist.length == 0){return callback()}
            let backData = result.newslist[0],
                info = {
                    id: backData.id,
                    author:backData.chlname,
                    type: backData.articletype,
                    commentId: backData.commentid,
                    title: backData.title,
                    time: backData.timestamp,
                    vid: backData.video_channel.video.vid
                }
            this.getDetail(task,info, (err) => {
                if(err){
                    return callback(err)
                }
                callback()
            })
        })
    }
    getDetail ( task, info, callback ) {
        async.parallel({
            comment:  (callback) => {
                this.getCommentNum(info, (err,num) => {
                    if(err){
                        return callback(err)
                    }
                    callback(null,num)
                })
            },
            expr: (callback) => {
                this.getExpr(info, (err,data) => {
                    if(err){
                        return callback(err)
                    }
                    callback(null,data)
                })
            },
            play: (callback) => {
                this.getPlayNum(task,info, (err,num) => {
                    if(err){
                        return callback(err)
                    }
                    callback(null,num)
                })
            },
            newField: ( callback ) => {
                this.getField(info,(err, data) => {
                    if(err){
                        return callback(err)
                    }
                    callback(null,data)
                })
            }
        }, (err, results) => {
            if(err){
                return callback(err)
            }
            let media = {
                author: info.author,
                platform: 10,
                bid: task.id,
                aid: info.id,
                title: info.title.substr(0,100).replace(/"/g,''),
                play_num: results.play,
                comment_num: Number(results.comment),
                support: results.expr.up,
                step: results.expr.down,
                save_num: results.expr.like,
                a_create_time: info.time,
                long_t: results.newField ? results.newField.long_t : null,
                v_img: results.newField ? results.newField.v_img : null,
                tag: results.newField ? results.newField.tag : null,
                class: results.newField ? results.newField.class : null
            }
            if(!media.class){
                delete media.class
            }
            if(!media.tag){
                delete media.tag
            }
            if(!media.v_img){
                delete media.v_img
            }
            if(!media.long_t){
                delete media.long_t
            }
            this.sendCache( media )
            callback()
        })
    }
    getCommentNum ( info, callback ) {
        let option = {
            url: this.settings.comment,
            referer:'http://r.cnews.qq.com/inews/iphone/',
            data: {
                chlid: "media_article",
                comment_id: info.commentId,
                c_type: "comment",
                article_id: info.id,
                page: 1
            }
        }
        request.post( option, (err,result) => {
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
            if(result.comments){
                result.comments.count ? callback(null,result.comments.count) : callback(true)
            }else{
                callback(true)
            }
        })
    }
    getExpr ( info, callback ) {
        let option = {
            url: this.settings.expr,
            referer:'http://r.cnews.qq.com/inews/iphone/',
            data: {
                id: info.id,
                chlid: "media_article"
            }
        }
        request.post( option, ( err, result ) => {
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
            let data = {
                like: result.like_info.count,
                up: result.expr_info.list[0].count || null,
                down: result.expr_info.list[1].count || null
            }
            callback(null,data)
        })
    }
    getPlayNum (task, info, callback ) {
        let option = {
            url: this.settings.play + '&devid=' + task.devId,
            referer:'http://r.cnews.qq.com/inews/iphone/',
            data: {
                id: info.id,
                chlid: "media_video",
                articletype: info.type
            }
        }
        request.post( option, (err,result) => {
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
            //logger.debug(result)
            let backData
            if(result.kankaninfo){
                backData = result.kankaninfo
                backData.videoInfo ? callback(null,backData.videoInfo.playcount) : callback(true)
            } else {
                callback(true)
            }
        })
    }
    getField ( info, callback ){
        let option = {
            url: "http://ncgi.video.qq.com/tvideo/fcgi-bin/vp_iphone?vid="+info.vid+"&plat=5&pver=0&otype=json&callback=jsonp",
            referer:'http://r.cnews.qq.com/inews/iphone/'
        }
        request.get( option, (err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            try{
                result = eval(result.body)
            }catch (e){
                logger.error('jsonp数据解析失败')
                logger.error(result)
                return callback(e)
            }
            if(!result.video){
                return callback(null, null)
            }
            const backData = {
                long_t: result.video.tot,
                v_img: result.video.pic,
                tag: this._tag(result.video.tags),
                class: this._class(result.video.ctypename)
            }
            callback(null,backData)
        })
    }
    _class( raw ){
        if(typeof raw == 'string'){
            return raw
        }
        if(Object.prototype.toString.call(raw) === '[object Array]'){
            return raw.join(',')
        }
        return ''
    }
    _tag( raw ){
        let _tagArr = []
        if(!raw){
            return ''
        }
        if(Object.prototype.toString.call(raw) === '[object Array]' && raw.length != 0){
            for( let i in raw){
                _tagArr.push(raw[i].tag)
            }
            return _tagArr.join(',')
        }
        if(Object.prototype.toString.call(raw) === '[object Array]' && raw.length == 0){
            return ''
        }
        if(typeof raw == 'object'){
            return raw.tag
        }
        return ''
    }
    sendCache ( media ){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`天天快报 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith