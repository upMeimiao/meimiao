/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment')
const async = require( 'async' )
const cheerio = require('cheerio')
const request = require( '../../lib/request' )
const spiderUtils = require('../../lib/spiderUtils')

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
        this.getVidTotal(task,(err) => {
            if(err){
                return callback(err)
            }
            callback(null,task.total)
        })
        
    }
    getVidTotal( task, callback ){
        let option = {
            url : this.settings.spiderAPI.baidu.videoAlbum + task.id
        }
        request.get( logger, option, (err, result) => {
            if(err){
                logger.debug('专辑请求失败',err)
                return callback(err)
            }
            let $ = cheerio.load(result.body),
                script = $('script')[14].children[0].data.replace(/[\s\n\r]/g,''),
                startIndex = script.indexOf('[{"album":'),
                endIndex = script.indexOf(',frp:\'\','),
                listData = script.substring(startIndex,endIndex)
                listData = JSON.parse(listData)
            let length = listData.length,
                fan    = $('div.num-sec').eq(0).find('p.num').text(),
                user = {
                    platform: task.p,
                    bid: task.id,
                    fans_num: fan
                }
            task.total = $('div.num-sec').eq(1).find('p.num').text()
            async.parallel(
                [
                    (cb) => {
                        this.sendUser(user)
                        this.sendStagingUser(user,(err) => {
                            logger.debug('粉丝数发送成功')
                            cb()
                        })
                    },
                    (cb) => {
                        this.getVidList(task,listData,length,(err) => {
                            logger.debug('视频数据请求完成')
                            cb(null)
                        })
                    }
                ],
                (err, result) => {
                    callback()
                }
            )        
        })
    }
    sendUser (user){
        let option = {
            url: this.settings.sendFans,
            data: user
        }
        request.post( logger, option, (err,back) => {
            if(err){
                logger.error( 'occur error : ', err )
                logger.info(`返回百度视频用户 ${user.bid} 连接服务器失败`)
                return
            }
            try{
                back = JSON.parse(back.body)
            }catch (e){
                logger.error(`百度视频用户 ${user.bid} json数据解析失败`)
                logger.info(back)
                return
            }
            if(back.errno == 0){
                logger.debug("百度视频用户:",user.bid + ' back_end')
            }else{
                logger.error("百度视频用户:",user.bid + ' back_error')
                logger.info(back)
                logger.info(`user info: `,user)
            }
        })
    }
    sendStagingUser ( user, callback ){
        let option = {
            url: 'http://staging-dev.meimiaoip.com/index.php/Spider/Fans/postFans',
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
                logger.debug("用户:",user.bid + ' back_end')
            }else{
                logger.error("用户:",user.bid + ' back_error')
                logger.info(result)
            }
            callback()
        })
    }
    getVidList( task,  listData, length, callback ){
        let index = 0
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                this.getListInfo(task,listData[index].album.id,(err) => {
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
        
    }
    getListInfo( task, listVid, callback ){
        let option = {},
            index  = 0,
            length = 2,
            page   = 1,
            num    = 0
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                option.url = this.settings.spiderAPI.baidu.videoList + listVid + '&page=' + page + '&_=' + new Date().getTime()
                request.get( logger, option, (err, result) => {
                    if(err){
                        logger.debug('当前的视频列表请求失败',err)
                        if(num <= 1){
                            return cb()
                        }
                        num = 0
                        return callback(err)
                    }
                    try{
                        result = JSON.parse(result.body)
                    }catch(e){
                        logger.debug('视频列表数据解析失败')
                        logger.info(result)
                        if(num <= 1){
                            return cb()
                        }
                        num = 0
                        return callback(e)
                    }
                    length = result.data.length
                    this.deal( task, result.data, length, (err) => {
                        index++
                        page++
                        cb()
                    })
                })
            },
            (err, result) => {
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
                this.getMedia( task, user[index], (err) => {
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getMedia( task, video, callback ){
        let timeout = 0
        async.series(
            [
                (cb) => {
                    this.getVidInfo( video.play_link, timeout, (err,result) => {
                        cb(null,result)
                    })
                }
            ],
            (err, result) => {
                let media = {
                    author: task.name,
                    platform: task.p,
                    bid: task.id,
                    aid: video.id,
                    title: spiderUtils.stringHandling(video.title,100),
                    tag: video.tag.replace(/\$/g,',').replace(/,,/g,','),
                    a_create_time: video.pub_time,
                    long_t: spiderUtils.longTime(video.duration),
                    v_img: video.image_link,
                    desc: spiderUtils.stringHandling(video.sub_title,100),
                    play_num: result[0],
                    v_url: video.play_link
                }
                spiderUtils.saveCache( this.core.cache_db, 'cache', media )
                callback()
            }
        )
    }
    getVidInfo( url, timeout, callback ){
        if(!url){
            return callback(null,'')
        }
        let option = {
            url : url
        }
        request.get( logger, option, (err, result) => {
            if(err){
                logger.debug('单个视频Dom请求失败',err)
                if(timeout < 1){
                    timeout++
                    return this.getVidInfo( url, timeout, callback )
                }
                timeout = 0
                return callback(null,'')
            }
            let $ = cheerio.load(result.body),
                playNum = $('p.title-info .play').text().replace('次','')
            if(!playNum){
                return callback(null,'')
            }
            callback(null,playNum)
        })
    }
}
module.exports = dealWith