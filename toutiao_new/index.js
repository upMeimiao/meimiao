/**
 * Created by ifable on 16/6/2.
 */
var moment = require('moment')
var async = require( 'async' )
var cheerio = require('cheerio')
var logger
var spiderCore = function (settings) {
    this.settings = settings
    logger = settings.logger
    this.api_request = new (require( './api_request.js' ))( this )
}
spiderCore.prototype.start = function () {
    logger.debug('start')
    this.getList()
}
spiderCore.prototype.wait = function () {
    logger.debug("开始等待下次执行时间")
    var spiderCore = this
    setTimeout(function () {
        var now = new Date()
        if(now.getHours() == 3){
            spiderCore.start()
        }else{
            logger.debug("now",now.getHours())
            spiderCore.wait()
        }
    },this.settings.waitTime)
}
spiderCore.prototype.getList = function (hot_time) {
    var spiderCore = this,url
    if(hot_time){
        url = this.settings.list + this.settings.userId + "&max_behot_time=" + hot_time
    }else{
        url = this.settings.list + this.settings.userId + "&max_behot_time="
    }
    this.api_request.get(url,function (err,back) {
        if(err){}
        var back = back.body
        try{
            back = JSON.parse(back)
        }catch (e){
            logger.error('json数据解析失败')
            return
        }
        logger.debug(back)
        if(back.return_count == 0){
            return spiderCore.wait()
        }
        var max_behot_time = back.max_behot_time,
            html = back.html.replace(/\n/ig,'').replace(/\t/ig,'').replace(/\r/ig,''),
            $ = cheerio.load(html),
            section = $('section'),group_ids = [],hot_times = [],
            h = $('h3'),titles = [],
            span = $('.time'),times = [],
            count_span = $('.label-count'),counts = [],
            href = $('a'),ids = []
        href.each(function (i,elem) {
            var a_href = $(this).attr('href')
            ids[i] = a_href.slice(24,a_href.length-1)
        })
        h.each(function(i, elem) {
            titles[i] = $(this).text()
        })
        span.each(function (i,elem) {
            times[i] = moment($(this).attr('title')).unix()
        })
        section.each(function(i, elem) {
            group_ids[i] = $(this).attr('data-id')
            hot_times[i] = $(this).attr('hot-time')
        })
        count_span.each(function (i, elem) {
            counts[i] = $(this).text()
        })
        // logger.debug(ids)
        // logger.debug('group_ids',group_ids)
        // logger.debug('hot_times',hot_times)
        var info = {
            ids:ids,
            group_ids:group_ids,
            titles:titles,
            counts:counts,
            times:times,
            hot_time:max_behot_time
        }
        spiderCore.deal(info)
    })
}
spiderCore.prototype.deal = function (info) {
    var spiderCore = this, hot_time = info.hot_time
    async.whilst(
        function () {
            return info.group_ids.length > 0 ? true :false
        },
        function (cb) {
            var data = {
                id: info.ids.shift(),
                g_id: info.group_ids.shift(),
                title: info.titles.shift(),
                count: info.counts.shift(),
                time: info.times.shift()
            }
            spiderCore.info(data,function () {
                cb()
            })
        },
        function (err,result) {
            spiderCore.getList(hot_time)
        }
    )
}
spiderCore.prototype.info = function (info,callback) {
    var spiderCore = this,
        id = info.id,title = info.title,time = info.time,count = info.count
    async.series([
        function (cb) {
            spiderCore.getInfo(info,function (data) {
                cb(null,data)
            })
        },
        function (cb) {
            spiderCore.getDesc(info,function (data) {
                cb(null,data)
            })
        }
    ],
    function (err,result) {
        var type = result[0].type,
            desc = result[1],
            media
        if(type == 0){
            media = {
                author:"一色神技能",
                platform: 6,
                aid: id,
                title: title,
                desc: desc,
                play_num: result[0].play_num,
                comment_num: result[0].comment_num,
                support: result[0].support,
                step:result[0].step,
                save_num: result[0].save_num,
                a_create_time: time
            }
            spiderCore.sendVideo(media,function () {
                callback()
            })
        }else{
            callback()
        }
    })
}
spiderCore.prototype.getInfo = function (info,callback) {
    var group_id = info.g_id,id = info.id,
        url = this.settings.info + group_id + '&item_id=' + id
    this.api_request.get(url,function (err,back) {
        if(err){}
        var back = back.body
        try{
            back = JSON.parse(back)
        }catch (e){
            logger.error('返回JSON格式不正确')
            return
        }
        //logger.debug(back)
        var backData = back.data,data
        if(backData.video_watch_count){
            data = {
                type: 0,
                play_num: backData.video_watch_count,
                comment_num: backData.comment_count || 0,
                support: backData.digg_count || 0,
                step:backData.bury_count || 0,
                save_num: backData.repin_count || 0
            }
        }else{
            data = {
                type: 1,
                comment_num: backData.comment_count || 0,
                support: backData.digg_count || 0,
                step:backData.bury_count || 0,
                save_num: backData.repin_count || 0
            }
        }
        callback(data)
    })
}
spiderCore.prototype.getDesc = function (info,callback) {
    var group_id = info.g_id,id = info.id,
        url = this.settings.desc + group_id + "/" + id + "/2/0/"
    this.api_request.get(url,function (err,back) {
        if(err){}
        back = back.body
        try{
            back = JSON.parse(back)
        }catch (e){
            logger.error('json数据解析失败')
            return
        }
        var backData = back.data
        callback(backData.abstract)
    })
}
spiderCore.prototype.sendVideo = function (data,callback) {
    logger.debug("开始向服务器发送数据")
    var url = this.settings.sendToServer[1]
    this.api_request.post(url,data,function (err,back) {
        if(err){}
        logger.debug(back.body)
        callback()
    })
}
module.exports = spiderCore