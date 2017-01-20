/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment')
const async = require( 'async' )
const cheerio = require('cheerio')
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
        let option = {
            url : this.settings.listVideo+"&pid="+task.id+"&cat_id="+task.encodeId
        }
        request.get( logger, option, ( err, result ) => {
            if (err) {
                logger.error( '接口请求错误 : ', err )
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.info(result)
                return
            }
            let length = result.data.list.length
            task.total = result.data.total
            this.deal(task,result.data,length,() => {
                callback()
            })
        })
    }
    deal( task, user, length, callback ){
        let index = 0
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                this.getAllInfo( task, user.list[index], () => {
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
        async.parallel([
            (cb) => {
                this.getVideoInfo(video.url,(err,result) => {
                    if(err){
                        return cb(err)
                    }
                    cb(null,result)
                })
            },
            (cb) => {
                this.getTotal(video.id,(err,result) => {
                    if(err){
                        return cb(err)
                    }
                    cb(null,result)
                })
            }
        ],(err,result) => {
            if(err){
                return callback()
            }
            let media = {
                author: task.name,
                platform: task.p,
                bid: task.id,
                aid: video.id,
                title: video.title.replace(/"/g,''),
                comment_num: result[1],
                class: result[0].class,
                tag: result[0].tag,
                desc: result[0].desc.replace(/"/g,''),
                long_t: result[0].data.duration,
                v_img: video.capture,
                v_url: video.url,
                play_num: video.pv.replace('万','0000')
            }
            //logger.debug(media)
            this.sendCache(media)
            callback()
        })
    }
    getVideoInfo( url, callback ){
        let vid    = url.match(/show\/\w*\.html/).toString().replace(/show\//,''),
            option = {
                url: url,
                referer: 'http://v.pptv.com/page/'+vid,
                ua: 1
            }
        request.get( logger, option, ( err, result ) => {
            if(err){
                logger.debug('单个视频请求失败 ' + err)
                setTimeout(() => {
                    this.getVideoInfo( url, callback )
                },100)
                return
            }
            let $ = cheerio.load(result.body),
                script = $('script')[2].children[0].data,
                data = script.replace(/[\s\n]/g,'').replace(/varwebcfg=/,'').replace(/;/,''),
                tags = '',
                tag = $('div#video-info .bd .tabs a'),
                desc = $('div#video-info .bd ul>li').eq(2).find('span,a').empty()
            desc = $('div#video-info .bd ul>li').eq(2).text()
            for(let i=0;i<tag.length;i++){
                tags += tag.eq(i).text()+","
            }
            try{
                data = JSON.parse(data)
            } catch(e){
                logger.error('data数据解析失败')
                return callback(e)
            }
            let res = {
                data: data,
                class: $('div#video-info .bd .crumbs a').text(),
                tag: tags,
                desc: desc
            }
            callback(null,res)
        })
    }
    getTotal( id, callback ){
        let option = {
            url : 'http://apicdn.sc.pptv.com/sc/v3/pplive/ref/vod_'+id+'/feed/list?appplt=web&action=1&pn=0&ps=20'
        }
        request.get( logger, option, (err, result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            try {
                result = JSON.parse( result.body )
            } catch (e) {
                logger.info( '不符合JSON格式' )
                return callback(e)
            }
            callback(null,result.data.total)
        })
    }

    sendCache (media){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`PPTV ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith