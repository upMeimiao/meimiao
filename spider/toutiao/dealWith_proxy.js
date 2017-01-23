/**
 * Created by junhao on 2016/12/7.
 */
const URL = require('url')
const moment = require('moment')
const async = require( 'async' )
const request = require( '../../lib/request' )
const md5 = require('js-md5')

let logger
class dealWith {
    constructor(spiderCore) {
        this.core = spiderCore
        this.settings = spiderCore.settings
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    getHoney() {
        const t = Math.floor((new Date).getTime() / 1e3),
            e = t.toString(16).toUpperCase(),
            n = md5(t.toString()).toString().toUpperCase()
        if (8 != e.length) return {
            as: "479BB4B7254C150",
            cp: "7E0AC8874BB0985"
        }
        for (var o = n.slice(0, 5), i = n.slice(-5), a = "", r = 0; 5 > r; r++) a += o[r] + e[r]
        for (var l = "", s = 0; 5 > s; s++) l += e[s + 3] + i[s]
        return {
            as: "A1" + a + e.slice(-3),
            cp: e.slice(0, 3) + l + "E1"
        }
    }
    todo ( task, callback) {
        task.total = 0
        task.uid = ''
        async.parallel(
            {
                user: (callback) => {
                    this.getUser(task,(err)=>{
                        if(err){
                            return setTimeout(()=>{
                                this.getUser(task,()=>{
                                    return callback(null,"用户信息已返回")
                                }, 1000)
                            })
                        }
                        callback(null,"用户信息已返回")
                    })
                },
                media: (callback) => {
                    this.getList(task,(err)=>{
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
                if((!task.user_id || task.user_id == '0') && (task.uid != '0' || task.uid != '')){
                    task.user_id = task.uid
                }
                logger.debug(task.id + "_result:",result)
                callback(null,task.total,task.user_id || '')
            }
        )
    }
    getUser ( task, callback ){
        if(!task.user_id || task.user_id == '0'){
            this.getUserId(task)
            return callback()
        }
        const option = {
            url: this.settings.spiderAPI.toutiao.user + task.user_id,
            ua: 3,
            own_ua: 'News/5.9.5 (iPhone; iOS 10.2; Scale/3.00)'
        }
        request.get( logger, option, ( err, result ) => {
            if(err){
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                return callback(e)
            }
            if( result.message != 'success' || !result.data ){
                return callback('fail')
            }
            let fans = result.data.total_cnt
            if(Number(fans) === 0 && result.data.users.length !== 0 ){
                return callback('fail')
            }
            if( typeof fans == 'string' && fans.indexOf('万') != -1 ){
                fans = fans.replace('万','') * 10000
            }
            if(Number(fans) === 0){
                logger.info('粉丝数发生异常：', result)
            }
            let user = {
                platform: task.p,
                bid: task.id,
                fans_num: fans
            }
            logger.debug(user)
            if(task.id == '6204859881' || task.id == '4093808656' || task.id == '4161577335' || task.id == '50505877252'){
                this.core.fans_db.sadd(task.id, JSON.stringify({
                    num: fans,
                    time: new Date().getTime()
                }))
            }
            this.sendUser( user, (err) => {
                callback()
            })
            this.sendStagingUser(user)
        })
    }
    sendUser ( user,callback ){
        let options = {
            url: this.settings.sendFans,
            data: user
        }
        request.post(logger,options,(err,res) => {
            if(err){
                return callback(err)
            }
            try{
                res = JSON.parse(res.body)
            }catch (e){
                logger.error(`头条用户 ${user.bid} json数据解析失败`)
                logger.info(res)
                return callback(e)
            }
            if(res.errno == 0){
                logger.debug("头条用户:",user.bid + ' back_end')
            }else{
                logger.error("头条用户:",user.bid + ' back_error')
                logger.info(res)
                logger.info(`user info: `,user)
            }
            callback()
        })
    }
    sendStagingUser (user){
        let options = {
            url: 'http://staging-dev.meimiaoip.com/index.php/Spider/Fans/postFans',
            data: user
        }
        request.post( logger, options,(err,res) => {
            if(err){
                return
            }
            try{
                res = JSON.parse(res.body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.info('send error:',res)
                return
            }
            if(res.errno == 0){
                logger.debug("用户:",user.bid + ' back_end')
            }else{
                logger.error("用户:",user.bid + ' back_error')
                logger.info(res)
            }
        })
    }
    getUserId(task) {
        request.get(logger, {url: `http://lf.snssdk.com/2/user/profile/v3/?media_id=${task.id}`},(err, result)=>{
            if(err){
                return
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.info('send error:',res)
                return
            }
            if(result.message != 'success'){
                return
            }
            let userId = result.data.user_id,
                key = task.p + ':' + task.id
            logger.debug(`use id: ${userId}`)
            task.uid = userId
            this.core.taskDB.hmset( key, 'uid', userId ,(err, res)=>{
                logger.debug('uid ',res)
            })
        })
    }
    getList ( task, callback ) {
        let index = 0,times = 0,proxyStatus = false,proxy = '',
            sign = true,
            option = {
                ua: 3,
                own_ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_2 like Mac OS X) AppleWebKit/602.3.12 (KHTML, like Gecko) Mobile/14C92 NewsArticle/5.9.5.4 JsSdk/2.0 NetType/WIFI (News 5.9.5 10.200000)'
            },
            hot_time = null
        async.whilst(
            () => {
                return sign
            },
            (cb) => {
                const {as, cp} = this.getHoney()
                if(hot_time){
                    option.url = 'http://ic.snssdk.com' + this.settings.spiderAPI.toutiao.newList + task.id + '&cp=' + cp + "&as=" + as + "&max_behot_time=" + hot_time
                }else{
                    option.url = 'http://ic.snssdk.com' + this.settings.spiderAPI.toutiao.newList + task.id + '&cp=' + cp + "&as=" + as + "&max_behot_time="
                }
                if(proxyStatus && proxy){
                    option.proxy = proxy
                    request.get( logger, option, (err,result) => {
                        if(err){
                            times++
                            proxyStatus = false
                            this.core.proxy.back(proxy, false)
                            return cb()
                        }
                        times = 0
                        try{
                            result = JSON.parse(result.body)
                        }catch (e){
                            // logger.error('json数据解析失败')
                            // logger.error(result.body)
                            times++
                            proxyStatus = false
                            this.core.proxy.back(proxy, false)
                            return cb()
                        }
                        if(result.has_more === false){
                            times++
                            proxyStatus = false
                            this.core.proxy.back(proxy, false)
                            return cb()
                        }
                        times = 0
                        // if(index == 0 && result.data.length > 0){
                        //     if(result.data[0].creator_uid != '0'){
                        //         task.uid = result.data[0].creator_uid
                        //     }
                        // }
                        if(!result.data || result.data.length == 0){
                            task.total = 10 * index
                            sign = false
                            return cb()
                        }
                        hot_time = result.next.max_behot_time
                        this.deal( task, result.data,(err) => {
                            index++
                            cb()
                        })
                    })
                } else {
                    this.core.proxy.need(times, (err, _proxy) => {
                        if(err) {
                            if(err == 'timeout'){
                                return callback('Get proxy timesout!!')
                            }
                            logger.error('Get proxy occur error:' , err)
                            times++
                            proxyStatus = false
                            return cb()
                        }
                        times = 0
                        option.proxy = _proxy
                        request.get( logger, option, (err,result) => {
                            if(err){
                                times++
                                proxyStatus = false
                                this.core.proxy.back(_proxy, false)
                                return cb()
                            }
                            times = 0
                            try{
                                result = JSON.parse(result.body)
                            }catch (e){
                                // logger.error('json数据解析失败')
                                // logger.error(result.body)
                                times++
                                proxyStatus = false
                                this.core.proxy.back(_proxy, false)
                                return cb()
                            }
                            if(result.has_more === false){
                                times++
                                proxyStatus = false
                                this.core.proxy.back(_proxy, false)
                                return cb()
                            }
                            times = 0
                            proxyStatus = true
                            proxy = _proxy
                            // if(index == 0 && result.data.length > 0){
                            //     task.uid = result.data[0].creator_uid
                            // }
                            if(!result.data || result.data.length == 0){
                                task.total = 10 * index
                                sign = false
                                return cb()
                            }
                            hot_time = result.next.max_behot_time
                            this.deal( task, result.data,(err) => {
                                index++
                                cb()
                            })
                        })
                    })
                }
            },
            (err,result) => {
                this.core.proxy.back(proxy, true)
                callback()
            }
        )
    }
    deal( task, list, callback ){
        let index = 0,
            length = list.length
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                this.getInfo( task, list[index], (err) => {
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getInfo ( task, video, callback) {
        const media = {}
        let vid
        if(video.str_item_id){
            vid = video.str_item_id
        }else if(video.app_url){
            let query = URL.parse(video.app_url,true).query
            vid = query.item_id
        }else{
            logger.debug(video)
            return callback(video)
        }
        media.author = video.detail_source || video.source || task.name
        media.platform = 6
        media.bid = task.id
        media.aid = vid
        media.title = video.title.replace(/"/g,'') || 'btwk_caihongip'
        media.desc = video.abstract ? video.abstract.substr(0,100).replace(/"/g,'') : ''
        media.play_num = Number(video.list_play_effective_count) + Number(video.detail_play_effective_count)
        media.comment_num = video.comment_count
        media.support = video.digg_count || null
        media.step = video.bury_count || null
        media.save_num = video.repin_count || null
        media.a_create_time = video.publish_time
        media.v_img = this._v_img(video)
        media.long_t = this.long_t(video.video_duration_str)
        media.tag = this._tag(video.label)
        if(!media.support){
            delete media.support
        }
        if(!media.step){
            delete media.step
        }
        if(!media.save_num){
            delete media.save_num
        }
        if(!media.long_t){
            delete media.long_t
        }
        if(!media.v_img){
            delete media.v_img
        }
        //logger.debug('medis info: ',media)
        this.sendCache( media )
        callback()
    }
    getPlayNum ( vid, callback ) {
        let option = {
            url: `http://m.toutiao.com/i${vid}/info/`,
        }
        request.get( logger, option, ( err, result ) => {
            if(err){
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('返回JSON格式不正确')
                logger.error('info:',result)
                return callback(e)
            }
            let backData = result.data
            if(!backData){
                return callback(true)
            }
            callback(null,backData.video_play_count)
        })
    }
    _tag ( raw ){
        if(!raw){
            return ''
        }
        let _tagArr = []
        if(raw.length != 0){
            for(let i in raw){
                _tagArr.push(raw[i])
            }
            return _tagArr.join(',')
        }
        return ''
    }
    long_t( time ){
        if(!time){
            return null
        }
        let timeArr = time.split(':'),
            long_t  = ''
        if(timeArr.length == 2){
            long_t = moment.duration( `00:${time}`).asSeconds()
        }else if(timeArr.length == 3){
            long_t = moment.duration(time).asSeconds()
        }
        return long_t
    }
    _v_img(video){
        // if(video.cover_image_infos && video.cover_image_infos.length != 0 && video.cover_image_infos[0].width && video.cover_image_infos[0].height){
        //     return `http://p2.pstatp.com/list/${video.cover_image_infos[0].width}x${video.cover_image_infos[0].height}/${video.cover_image_infos[0].web_uri}`
        // }
        if(video.middle_image){
            return video.middle_image
        }
        return null
    }
    sendCache ( media ){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            //logger.debug(`今日头条 ${media.aid} 加入缓存队列`)
        })
    }
}

module.exports = dealWith