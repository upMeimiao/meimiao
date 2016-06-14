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
        spiderCore.getInfo(info)
    })
}
spiderCore.prototype.getInfo = function (info) {
    var spiderCore = this, hot_time = info.hot_time
    async.whilst(
        function () {
            return info.group_ids.length > 0 ? true :false
        },
        function (cb) {
            var group_id = info.group_ids.shift(),id = info.ids.shift()
                url = spiderCore.settings.info + group_id + '&item_id=' + id
            spiderCore.api_request.get(url,function (err,back) {
                if(err){}
                var back = back.body
                try{
                    back = JSON.parse(back)
                }catch (e){
                    logger.error('返回JSON格式不正确')
                    return
                }
                //logger.debug(back)
                var backData = back.data,media,count = info.counts.shift()
                if(backData.video_watch_count){
                    media = {
                        author:"一色神技能",
                        platform: 6,
                        aid:id,
                        title:info.titles.shift(),
                        play_num: backData.video_watch_count,
                        comment_num: backData.comment_count || 0,
                        support: backData.digg_count || 0,
                        step:backData.bury_count || 0,
                        save_num: backData.repin_count || 0,
                        a_create_time: info.times.shift()
                    }
                }else{
                    media = {
                        author:"一色神技能",
                        platform: 6,
                        aid:id,
                        title:info.titles.shift(),
                        read_num: (count).replace(/阅读/g,''),
                        comment_num: backData.comment_count || 0,
                        support: backData.digg_count || 0,
                        step:backData.bury_count || 0,
                        save_num: backData.repin_count || 0,
                        a_create_time: info.times.shift()
                    }
                }
                //logger.debug(media)
                spiderCore.sendVideos(media,function () {
                    cb()
                })
            })
        },
        function (err,result) {
            if(err){}
            spiderCore.getList(hot_time)
        }
    )
}
spiderCore.prototype.sendVideos = function (data,callback) {
    logger.debug("开始向服务器发送数据")
    var url = this.settings.sendToServer[1]
    this.api_request.post(url,data,function (err,back) {
        if(err){}
        logger.debug(back.body)
        callback()
    })
}
module.exports = spiderCore