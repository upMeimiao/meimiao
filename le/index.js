/**
 * Created by junhao on 16/4/14.
 */
var logger
var async = require( 'async' )
var jsonp = function (data) {
    return data
}
var spiderCore = function(settings){
    this.settings = settings
    this.api_request = new (require( './api_request.js' ))( this )
    logger = settings.logger
    this.videosList = []
}
spiderCore.prototype.start = function () {
    logger.debug("start")
    var spiderCore = this
    this.getTotal(function () {
        spiderCore.sendVideos(function () {
            spiderCore.wait()
        })
    })
}
spiderCore.prototype.wait = function () {
    logger.debug("开始等待下次执行时间")
    var now = new Date(),spiderCore = this
    setTimeout(function () {
        if(now.getHours() == 3){
            spiderCore.start()
        }else{
            logger.debug("now",now.getHours())
            spiderCore.wait()
        }
    },this.settings.waitTime)
}
spiderCore.prototype.sendVideos = function (callback){
    logger.debug("开始向服务器发送数据")
    var spiderCore = this,
        url = this.settings.sendToServer[1]
    async.whilst(
        function () {
            if(spiderCore.videosList.length == 0){
                return false
            }else{
                return true
            }
        },
        function (cb) {
            spiderCore.api_request.post(url,spiderCore.videosList.shift(),function (err,back) {
                if(err){}
                logger.debug(back.body)
                cb()
            })
        },
        function (err,result) {
            if(err){}
            logger.debug("向服务器返回数据完毕")
            callback()
        }
    )
}
spiderCore.prototype.getTotal = function (callback) {
    logger.debug("开始获取视频总数")
    var spiderCore = this,
        url = this.settings.list + this.settings.id + "&page=1&_=" + (new Date()).getTime()
    this.api_request.get(url,function (err,back) {
        if(err){}
        var backData = eval(back.body)
        if(backData.code != 200){
            return callback()
        }
        spiderCore.getList(backData.data.total,function () {
            callback()
        })
    })
}
spiderCore.prototype.getList = function (total,callback) {
    var spiderCore = this,url,sign = 1,page
    if(total % 30 == 0){
        page = total / 30
    }else{
        page = Math.ceil(total / 30)
    }
    async.whilst(
        function () {
            return sign <= page
        },
        function (cb) {
            logger.debug("开始获取第"+ sign +"页视频列表")
            url  = spiderCore.settings.list + spiderCore.settings.id + "&page=" + sign + "&_=" + (new Date()).getTime()
            spiderCore.api_request.get(url,function (err,back) {
                if(err){}
                //logger.debug(back.body)
                var backData = eval(back.body),
                    backList = backData.data.items
                //logger.debug(backList)
                spiderCore.getInfo(backList,function () {
                    sign++
                    cb()
                })
            })
        },
        function (err,result) {
            callback()
        }
    )
}
spiderCore.prototype.getInfo = function (list,callback) {
    var spiderCore = this,url,sign = 0
    async.whilst(
        function () {
            return sign < list.length
        },
        function (cb) {
            url = spiderCore.settings.info + list[sign].video_id + "&_=" + (new Date()).getTime()
            spiderCore.api_request.get(url,function (err,back) {
                if(err){}
                var backData = eval(back.body),
                    info = backData[0],
                    media = {
                        author: "一色神技能",
                        platform: 3,
                        aid: list[sign].video_id,
                        title: list[sign].title,
                        play_num: info.play_count,
                        comment_num: info.vcomm_count,
                        support: info.up,
                        step: info.down,
                        a_create_time: list[sign].create_time
                    }
                spiderCore.videosList.push(media)
                sign++
                cb()
            })
        },
        function (err,result) {
            //logger.debug(spiderCore.videosList)
            callback()
        }
    )
}
module.exports = spiderCore