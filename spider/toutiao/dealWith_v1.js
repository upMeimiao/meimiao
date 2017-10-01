/**
 * Created by junhao on 16/6/21.
 */
const URL = require('url')
const moment = require('moment')
const async = require( 'async' )
const cheerio = require('cheerio')
const EventProxy = require( 'eventproxy' )
const request = require( '../lib/req' )
const r = require('request')
const md5 = require('js-md5')
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
        task.page = 0
        task.event = new EventProxy()
        task.event.once('end', () => {
            callback(null,task.total)
        })
        this.getList(task,null)
    }
    getHoney () {
        var t = Math.floor((new Date).getTime() / 1e3),
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
    getList ( task, hot_time ) {
        const {as, cp} = this.getHoney()
        task.page++
        let option
        if(hot_time){
            option = {
                url: this.settings.list + task.id + '&cp=' + cp + "&as=" + as + "&max_behot_time=" + hot_time
            }
        }else{
            option = {
                url: this.settings.list + task.id + '&cp=' + cp + "&as=" + as + "&max_behot_time=0"
            }
        }
        request.get( option, (err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
            }
            try{
                result = JSON.parse(result.body)
            }catch (e){
                logger.error('json数据解析失败')
                logger.info(result)
                return
            }
            if(result.return_count == 0){
                logger.debug('已经没有数据')
                task.total = (task.page - 1) * 10
                return task.event.emit('end')
            }
            let max_behot_time = result.max_behot_time,
                html = result.html.replace(/\n/ig,'').replace(/\t/ig,'').replace(/\r/ig,''),
                $ = cheerio.load(html),
                section = $('section'),group_ids = [],hot_times = [],
                // h = $('h3'),titles = [],
                // span = $('.time'),times = [],
                // count_span = $('.label-count'),counts = [],
                href = $('a'),ids = []
            href.each(function (i,elem) {
                let a_href = $(this).attr('href'),
                    urlObj = URL.parse(a_href,true),
                    path = urlObj.pathname
                if(path.startsWith('/item/')){
                    ids[i] = a_href.slice(24,a_href.length-1)
                }else if(path.startsWith('/group/')){
                    ids[i] = 'a'+a_href.slice(25,a_href.length-1)
                }else if(path.startsWith('/i')){
                    ids[i] = a_href.slice(20,a_href.length-1)
                }
            })
            // h.each(function(i, elem) {
            //     titles[i] = $(this).text()
            // })
            // span.each(function (i,elem) {
            //     times[i] = moment($(this).attr('title')).unix()
            // })
            section.each(function(i, elem) {
                group_ids[i] = $(this).attr('data-id')
                hot_times[i] = $(this).attr('hot-time')
            })
            // count_span.each(function (i, elem) {
            //     counts[i] = $(this).text()
            // })
            // let info = {
            //     ids:ids,
            //     group_ids:group_ids,
            //     titles:titles,
            //     counts:counts,
            //     times:times,
            //     hot_time:max_behot_time
            // }
            let info = {
                ids:ids,
                group_ids:group_ids,
                hot_time:max_behot_time
            }
            this.deal(task,info)
        })
    }
    deal ( task, info ) {
        let index = 0,
            length = info.group_ids.length,
            hot_time = info.hot_time,
            data
        async.whilst(
            () => {
                return index < length
            },
            ( cb ) => {
                data = {
                    id: info.ids[index],
                    g_id: info.group_ids[index]
                    // title: info.titles[index],
                    // count: info.counts[index],
                    // time: info.times[index]
                }
                if(data.id.startsWith('a')){
                    this.getVId(data.id,(err,vid)=>{
                        if(err){
                            index++
                            return cb()
                        }
                        data.id = vid
                        this.info(task,data, () => {
                            index++
                            cb()
                        })
                    })
                }else{
                    this.info(task,data, () => {
                        index++
                        cb()
                    })
                }
            },
            ( err, result ) => {
                this.getList( task, hot_time )
            }
        )
    }
    getVId (g_id, callback){
        r.head(`http://toutiao.com/${g_id}/`,{headers:{'User-Agent':':Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'}},(err,res,body)=>{
            if(!res){
                return callback(true)
            }
            let v_id = (res.request.path).replace(/\//g,'').substring(1)
            callback(null,v_id)
        })
    }
    info ( task, info, callback ) {
        let id = info.id
        //title = info.title,time = info.time,count = info.count
        async.series([
            ( cb ) => {
                this.getInfo( info, ( err, data ) => {
                    if(err){
                        cb(err)
                    }else {
                        cb(null,data)
                    }
                })
            },
            ( cb ) => {
                this.getPlayNum( info, ( err, num ) => {
                    if(err){
                        cb(err)
                    }else {
                        cb(null,num)
                    }
                })
            }
        ], ( err, result ) => {
            if(err){
                return callback()
            }
            let title
            if(!result[0].title || result[0].title == ''){
                title = 'btwk_caihongip'
            }else{
                title = result[0].title.substr(0,100)
            }
            let media = {
                author:result[0].name,
                platform: 6,
                bid: task.id,
                aid: id,
                title: title,
                desc: result[0].desc.substr(0,100),
                play_num: result[1],
                comment_num: result[0].comment_num,
                support: result[0].support,
                step:result[0].step,
                save_num: result[0].save_num,
                a_create_time: result[0].time
            }
            //logger.debug('medis info: ',media)
            this.sendCache( media )
            callback()
        })
    }
    getInfo ( info, callback ) {
        let group_id = info.g_id,id = info.id,
            option = {
                url: this.settings.info + group_id + "/" + id + "/2/0/"
            }
        request.get( option, ( err, result ) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('返回JSON格式不正确')
                logger.info('info:',result)
                return callback(e)
            }
            //logger.debug(result.data)
            let backData = result.data,data
            if(!backData){
                return callback(true)
            }
            data = {
                title: backData.title || 'btwk_caihongip',
                desc: backData.abstract,
                name: backData.media_name,
                comment_num: backData.comment_count >= 0 ?  backData.comment_count : 0,
                support: backData.digg_count || 0,
                step:backData.bury_count || 0,
                save_num: backData.repin_count || 0,
                time: backData.publish_time
            }
            // if(backData.has_video && backData.video_detail_info){
            //     data = {
            //         type: 0,
            //         title: backData.title,
            //         desc: backData.abstract,
            //         name: backData.media_name,
            //         play_num: backData.video_detail_info.video_watch_count,
            //         comment_num: backData.comment_count >= 0 ?  backData.comment_count : 0,
            //         support: backData.digg_count || 0,
            //         step:backData.bury_count || 0,
            //         save_num: backData.repin_count || 0,
            //         time: backData.publish_time
            //     }
            // }else{
            //     data = {
            //         type: 1,
            //         title: backData.title,
            //         desc: backData.abstract,
            //         name: backData.media_name,
            //         comment_num: backData.comment_count || 0,
            //         support: backData.digg_count || 0,
            //         step:backData.bury_count || 0,
            //         save_num: backData.repin_count || 0,
            //         time: backData.publish_time
            //     }
            // }
            callback(null,data)
        })
    }
    getPlayNum ( info, callback ) {
        let option = {
            url: `http://m.toutiao.com/i${info.id}/info/`
        }
        request.get( option, ( err, result ) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('返回JSON格式不正确')
                logger.info('info:',result)
                return callback(e)
            }
            let backData = result.data
            if(!backData){
                return callback(true)
            }
            callback(null,backData.video_play_count)
        })
    }
    sendCache (media,callback){
        this.core.cache_db.rpush( 'cache', JSON.stringify( media ),  ( err, result ) => {
            if ( err ) {
                logger.error( '加入缓存队列出现错误：', err )
                return
            }
            logger.debug(`今日头条 ${media.aid} 加入缓存队列`)
        } )
    }
}
module.exports = dealWith