/**
 * Created by junhao on 16/6/21.
 */
const moment = require('moment')
const async = require( 'async' )
const cheerio = require('cheerio')
const request = require( '../../lib/request' )
const spiderUtils = require('../../lib/spiderUtils')
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
        task.total = 0;
        this.getVidList( task, ( err ) => {
            if(err){
                return callback( err )
            }
            callback( null, task.total )
        })
    }

    getppi(callback){
        let option = {
            url: 'http://tools.aplusapi.pptv.com/get_ppi?cb=jsonp'
        }
        request.get(logger, option, (err, result) => {
            if(err){
                logger.debug('获取cookie值出错')
                return callback(err)
            }
            try{
                result = eval(result.body)
            }catch(e){
                logger.debug('cookie数据解析失败')
                return callback(e)
            }
            if(!result.ppi){
                return callback('cookie数据获取有问题')
            }
            callback(null,result.ppi)
        })
    }

    getVidList( task, callback ){
        let option = {
            url : this.settings.spiderAPI.pptv.listVideo+"&pid="+task.id+"&cat_id="+task.encodeId,
            ua: 3,
            own_ua: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
            Cookie:  `ppi=${this.core.ppi}`
        }
        request.get( logger, option, ( err, result ) => {
            if (err) {
                logger.error( '接口请求错误 : ', err )
                return callback(err.message)
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.info(result)
                return callback(e.message)
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
                return index < Math.min(length,10000)
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
                task.isSkip = 0;
                this.getVideoInfo(task, video.url,(err,result) => {
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
                title: spiderUtils.stringHandling(video.title),
                comment_num: result[1],
                class: result[0].class,
                tag: result[0].tag,
                desc: spiderUtils.stringHandling(result[0].desc),
                long_t: result[0].time,
                v_img: video.capture,
                v_url: video.url,
                play_num: spiderUtils.numberHandling(video.pv)
            }
            spiderUtils.saveCache( this.core.cache_db, 'cache', media )
            callback()
        })
    }
    getVideoInfo(task, url, callback ){
        let vid    = url.match(/show\/\w*\.html/).toString().replace(/show\//,''),
            option = {
                url: url,
                referer: 'http://v.pptv.com/page/'+vid,
                ua: 1
            }
        request.get( logger, option, ( err, result ) => {
            if(err){
                logger.debug('单个视频请求失败 ', err);
                if(err.status === 404){
                    callback('next');
                    return;
                }
                setTimeout(() => {
                    task.isSkip += 1;
                    this.getVideoInfo( url, callback )
                },100);
                return;
            }
            task.isSkip = 0;
            let $ = cheerio.load(result.body),
                //script = $('script')[2].children[0].data,
                time = result.body.match(/"duration":\d+/) ? result.body.match(/"duration":\d+/).toString().replace('"duration":','') : '',
                tags = '',
                tag = $('div#video-info .bd .tabs a'),
                desc = $('div#video-info .bd ul>li').eq(2).find('span,a').empty()
            desc = $('div#video-info .bd ul>li').eq(2).text()
            for(let i=0;i<tag.length;i++){
                tags += ","+tag.eq(i).text()
            }
            tags.replace(',','')
            let res = {
                class: $('div#video-info .bd .crumbs a').text(),
                tag: tags,
                desc: desc,
                time: time
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
                logger.error( 'occur error : ', err );
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
}
module.exports = dealWith