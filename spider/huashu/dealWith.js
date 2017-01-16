/**
 * Created by junhao on 16/6/21.
 */
const async = require( 'async' )
const request = require( '../lib/request' )
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
        this.getVidList( task, ( err ) => {
            if(err){
                return callback( err )
            }
            callback( null, task.total )
        })
    }
    getVidList( task, callback ){
        let option   = {
            url : this.settings.videoList + task.id
        }
        request.get( logger, option, (err,result) => {
            if(err){
                logger.debug('视频列表请求失败')
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                logger.debug('视频列表解析失败')
                return callback(e)
            }
            let vidInfo     = result[1].aggData[0].aggRel,
                contents    = result[1].aggData[0].aggChild.data[0].tele_data,
                length      = contents.length
                task.listid = vidInfo.video_sid
            task.total     = length
            if(contents[0].vuid != null){
                this.getVideoList(task,callback)
            }else{
                this.deal(task,vidInfo,contents,length,() => {
                    logger.debug('当前用户数据请求完毕')
                    callback(null)
                })
            }
        })
    }
    getVideoList( task, callback ){
        let option   = {
                url: this.settings.videoList2 + task.listid
            }
        //logger.debug(option.url)
        request.get( logger, option, (err,result) => {
            if(err){
                logger.debug('视频列表请求失败')
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                logger.debug('视频列表解析失败')
                return callback(e)
            }
            let contents   = result.dramadatas,
                length     = contents.length
            task.type      = 'list2'
            this.deal(task,result,contents,length,() => {
                logger.debug('当前用户数据请求完毕')
                callback(null)
            })
        })
    }
    deal( task, vidInfo, video, length, callback ){
        let index = 0
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                this.getMedia( task, vidInfo, video[index], () => {
                    index++
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getMedia( task, vidInfo, video, callback ){
        async.series(
            [
                (cb) => {
                    if(task.type == 'list2'){
                        this.getVidInfo( video.episodeid, (err,result) => {
                            cb(err,result)
                        })
                    }else{
                        this.getVidInfo( video.assetid, (err,result) => {
                            cb(err,result)
                        })
                    }
                },
                (cb) => {
                    this.getComment(vidInfo.video_sid,(err,result) => {
                        cb(err,result)
                    })
                }
            ],
            (err,result) => {
                let media
                if(task.type == 'list2'){
                    media = {
                        author: task.name,
                        platform: task.p,
                        bid: task.id,
                        aid: video.episodeid,
                        title: video.episode_name.replace(/"/g,''),
                        v_img: video.episode_pic,
                        v_url: result[0].wap_url,
                        desc: vidInfo.abstract.substring(0,100).replace(/"/g,''),
                        class: vidInfo.class,
                        long_t: result[0].duration,
                        a_create_time: result[0].updatetime,
                        play_num: result[0].hits,
                        comment_num: result[1]
                    }
                }else{
                    media = {
                        author: task.name,
                        platform: task.p,
                        bid: task.id,
                        aid: video.assetid,
                        title: video.abs.replace(/"/g,''),
                        v_img: video.img,
                        v_url: video.url,
                        desc: vidInfo.video_abstract.substring(0,100).replace(/"/g,''),
                        class: result[0].class,
                        long_t: result[0].duration,
                        a_create_time: result[0].updatetime,
                        play_num: result[0].hits,
                        comment_num: result[1]
                    }
                }
                this.sendCache(media)
                callback()
            }
        )
    }
    getVidInfo( vid, callback ){
        let option = {
            url : 'http://clientapi.wasu.cn/Phone/vodinfo/id/'+vid
        }
        request.get( logger, option, (err,result) => {
            if(err){
                logger.debug('单个视频详情请求失败',err)
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                logger.debug('视频详情数据解析失败')
                return callback(e)
            }
            callback(null,result)
        })
    }
    getComment( vid, callback ){
        let option = {
            url : 'http://changyan.sohu.com/api/3/topic/liteload?client_id=cyrHNCs04&topic_category_id=37&page_size=10&hot_size=5&topic_source_id='+vid+'&_='+ new Date().getTime()
        }
        request.get( logger, option, (err,result) => {
            if(err){
                logger.debug('评论数请求失败',err)
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                logger.debug('评论数解析失败')
                return callback(e)
            }
            callback(null,result)
        })
    }
    sendCache (media,callback){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`华数TV ${media.aid} 加入缓存队列`)
            //callback()
        } )
    }
}
module.exports = dealWith