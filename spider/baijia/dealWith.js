/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment')
const async = require( 'async' )
const cheerio = require('cheerio')
const request = require( '../lib/request' )
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
        this.getVidTotal( task, ( err ) => {
            if(err){
                return callback( err )
            }
            callback( null, task.total )
        })
    }

    getVidTotal( task, callback ){
        let option = {
            url: this.settings.videoList + task.id + "&_limit=100",
            referer: 'http://baijiahao.baidu.com/u?app_id='+task.id+'&fr=bjhvideo',
            ua: 1
        }
        //logger.debug(option)
        request.get( logger, option, ( err, result ) => {
            if (err) {
                logger.error( '总量接口请求错误 : ', err )
                return this.getVidTotal( task, callback )
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据总量解析失败')
                logger.info(result)
                return this.getVidTotal( task, callback )
            }
            let total = result.total
            //logger.debug(total)
            async.parallel(
                [
                    (cb) => {
                        this.getFan(task,result.items,() => {
                            logger.debug('用户粉丝数请求完成')
                            cb(null,null)
                        })
                    },
                    (cb) => {
                        this.getVidList(task,total,() => {
                            logger.debug('视频请求完成')
                            cb(null,null)
                        })
                    }
                ],
                (err,result) => {
                    callback()
                }
            )
                
                
        })
    }
    getFan( task, data, callback ){
        let arr = [],index = 0
        const Fan = ( vid ) => {
            if(vid == null){
                return callback()
            }
            let option = {
                url : 'https://baijiahao.baidu.com/po/feed/video?wfr=spider&for=pc&context=%7B%22sourceFrom%22%3A%22bjh%22%2C%22nid%22%3A%22'+vid[index]+'%22%7D'
            }
            request.get( logger, option, (err, result) => {
                if(err){
                    logger.debug('用户粉丝数请求失败')
                    return Fan( vid )
                }
                let $ = cheerio.load(result.body)
                if($('div.item p').eq(0).text() == '视频已失效，请观看其他视频'){
                    index++
                    return Fan( vid )
                }
                let script = $('script')[11].children[0] == undefined ? $('script')[12].children[0].data.replace(/[\s\n\r]/g,'') : $('script')[11].children[0].data.replace(/[\s\n\r]/g,''),
                    startIndex = script.indexOf('videoData={"id'),
                    endIndex = script.indexOf(';window.listInitData'),
                    dataJson = script.substring(startIndex+10,endIndex)
                try{
                    dataJson = JSON.parse(dataJson)
                }catch(e){
                    logger.debug('百家号用户数据解析失败')
                    logger.info(dataJson)
                    return Fan( vid )
                }
                let user = {
                    bid: task.id,
                    platform: task.p,
                    fans_num: dataJson.app.fans_cnt
                }
                this.sendStagingUser(user)
                callback()
            })
        }
        for (let i = 0; i < data.length; i++) {
            if(data[i].type == 'video' && data[i].feed_id != ''){
                arr.push(data[i].feed_id)
                if(arr.length > 3){
                    Fan(arr)
                    return
                }
            }
        }
        Fan(null)
    }
    sendUser (user){
        let option = {
            url: this.settings.sendFans,
            data: user
        }
        request.post( logger, option, (err,back) => {
            if(err){
                logger.error( 'occur error : ', err )
                logger.info(`返回百家号视频用户 ${user.bid} 连接服务器失败`)
                return
            }
            try{
                back = JSON.parse(back.body)
            }catch (e){
                logger.error(`百家号视频用户 ${user.bid} json数据解析失败`)
                logger.info(back)
                return
            }
            if(back.errno == 0){
                logger.debug("百家号视频用户:",user.bid + ' back_end')
            }else{
                logger.error("百家号视频用户:",user.bid + ' back_error')
                logger.info(back)
                logger.info(`user info: `,user)
            }
        })
    }
    sendStagingUser( user ){
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
    getVidList( task, total, callback ){
        let option = {
            url: this.settings.videoList + task.id + "&_limit=" + total,
            referer: 'http://baijiahao.baidu.com/u?app_id='+task.id+'&fr=bjhvideo',
            ua: 1
        }
        request.get( logger, option, ( err, result ) => {
            if (err) {
                logger.error( '总量接口请求错误 : ', err )
                return this.getVidList( task, total, callback )
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据总量解析失败')
                logger.info(result)
                return this.getVidList( task, total, callback )
            }

            this.deal(task,result.items,total,() => {
                callback()
            })
        })
    }
    deal( task, user, total, callback ){
        let index = 0
        async.whilst(
            () => {
                return index < total
            },
            (cb) => {
                this.getAllInfo( task, user[index], () => {
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
        let num = 0
        if(video.type != 'video'){
            return callback()
        }
        async.parallel([
            (cb) => {
                if(video.feed_id == ''){
                    this.getVideoInfo( null, video.url, num, (err, result) => {
                        cb(null,result)
                    })
                }else{
                    this.getVideoInfo( video.feed_id, null, num, (err, result) => {
                        cb(null,result)
                    })
                }
            }
        ],(err,result) => {
            let time  = new Date(video.publish_at),
                media = {
                author: task.name,
                platform: task.p,
                bid: task.id,
                aid: video.id,
                title: video.title.substring(0,100).replace(/"/g,''),
                desc: video.abstract.substring(0,100).replace(/"/g,''),
                class: video.domain,
                tag: video.tag,
                long_t: result[0].long_t,
                v_img: JSON.parse(video.cover_images)[0].src,
                v_url: video.url,
                comment_num: video.comment_amount,
                forward_num: video.push_amount,
                a_create_time: moment(time).format('X'),
                play_num: result[0].playNum
            }
            if(!media.play_num){
                return callback()
            }
            task.total++
            this.sendCache(media)
            callback()
            
        })
    }
    getVideoInfo( vid, url, num, callback ){
        let option = {}
        if(vid != null){
            option.url = 'https://baijiahao.baidu.com/po/feed/video?wfr=spider&for=pc&context=%7B%22sourceFrom%22%3A%22bjh%22%2C%22nid%22%3A%22'+vid+'%22%7D'
        }else{
            option.url = url
        }
        //logger.debug(option.url)
        request.get( logger, option, ( err, result ) => {
            if(err){
                logger.debug('单个视频请求失败 ', err)
                if(num <= 1){
                    return this.getVideoInfo( vid, url, num++, callback )
                }
                return callback(null,{long_t:'',a_create_time:'',playNum:''})
            }
            let $ = cheerio.load(result.body)
            
            if($('div.item p').eq(0).text() == '视频已失效，请观看其他视频'){
                return callback(null,{long_t:'',playNum:null})
            }
            if (!$('script')[11].children) {
                return callback(null,{long_t:'',playNum:null})
            }
            if($('script')[11].children[0] == undefined && $('script')[12].children[0] == undefined){
                return callback(null,{long_t:'',playNum:null})
            }
            logger.debug('---')
            let script = $('script')[11].children[0] == undefined ? $('script')[12].children[0].data.replace(/[\s\n\r]/g,'') : $('script')[11].children[0].data.replace(/[\s\n\r]/g,''),
                startIndex = script.indexOf('videoData={"id'),
                endIndex = script.indexOf(';window.listInitData'),
                dataJson = script.substring(startIndex+10,endIndex)
            try{
                dataJson = JSON.parse(dataJson)
            }catch(e){
                logger.debug('百家号用户数据解析失败')
                logger.info(dataJson)
                return callback(null,{long_t:'',a_create_time:'',playNum:''})
            }
            let res = {
                long_t: this.getVidTime(dataJson.video.time_length),
                playNum: dataJson.video.playcnt
            } 
            callback(null,res)
        })
    }
    getVidTime( time ){
        let timeArr = time.split(':'),
            long_t  = '';
        if(timeArr.length == 2){
            long_t = parseInt(timeArr[0]*60) + parseInt(timeArr[1])
        }else if(timeArr.length == 3){
            long_t = parseInt((timeArr[0]*60)*60) + parseInt(timeArr[1]*60) + parseInt(timeArr[2])
        }
        return long_t;
    }
    sendCache ( media ){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            //logger.debug(`百家号 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith