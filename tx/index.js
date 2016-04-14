/**
 * Created by junhao on 16/4/12.
 */
var moment = require('moment')
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
    setInterval(function () {
        if(now.getHours() == 3){
            spiderCore.getTotal(function () {
                spiderCore.sendVideos(function () {
                    //spiderCore.wait()
                })
            })
        }else{
            logger.debug("now",now.getHours())
        }
    },this.settings.waitTime)
}
spiderCore.prototype.sendVideos = function (callback) {
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
        url = this.settings.videoList + this.settings.euin + "&pagenum=1"
    this.api_request.get(url,function (err,back) {
        if(err){}
        var backData = eval(back.body)
        spiderCore.getList(backData.vtotal,function () {
            callback()
        })
    })
}
spiderCore.prototype.getList = function (total,callback) {
    var spiderCore = this,url,sign = 1,page
    if(total % 25 == 0){
        page = total / 25
    }else{
        page = Math.ceil(total / 25)
    }
    async.whilst(
        function () {
            return sign <= page
        },
        function (cb) {
            logger.debug("开始获取第"+ sign +"页视频列表")
            url  = spiderCore.settings.videoList + spiderCore.settings.euin + "&pagenum="+sign
            spiderCore.api_request.get(url,function (err,back) {
                if(err){}
                logger.debug(back.body)
                var backData = eval(back.body),
                    backList = backData.videolst
                spiderCore.getCommentID(backList,function () {
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
spiderCore.prototype.getCommentID = function (list,callback) {
    var spiderCore = this,url,sign = 0
    async.whilst(
        function () {
            return sign < list.length
        },
        function (cb) {
            url = spiderCore.settings.commentId + list[sign].vid
            spiderCore.api_request.get(url,function (err,back) {
                if(err){}
                var backData = eval(back.body),media
                if(backData.result.code == 0){
                    spiderCore.getCommentNum(backData.comment_id,function (num) {
                        //logger.debug(num)
                        spiderCore.getView(list[sign].vid,function (count) {
                            //logger.debug(count)
                            media = {
                                author: "一色神技能",
                                platform: 4,
                                aid: list[sign].vid,
                                title: list[sign].title,
                                play_num: count,
                                comment_num: num,
                                a_create_time: spiderCore.time(list[sign].uploadtime)
                            }
                            spiderCore.videosList.push(media)
                            sign++
                            cb()
                        })
                    })
                }else{
                    spiderCore.getView(list[sign].vid,function (count) {
                        //logger.debug(count)
                        media = {
                            author: "一色神技能",
                            platform: 4,
                            aid: list[sign].vid,
                            title: list[sign].title,
                            play_num: count,
                            comment_num: 0,
                            a_create_time: spiderCore.time(list[sign].uploadtime)
                        }
                        spiderCore.videosList.push(media)
                        sign++
                        cb()
                    })
                }
            })
        },
        function (err,result) {
            callback()
        }
    )
}
spiderCore.prototype.getCommentNum = function (id,callback) {
    //logger.debug("获取评论数")
    var url = this.settings.commentNum + id + "/commentnum"
    this.api_request.get(url,function (err,back) {
        if(err){
            callback(0)
        }else{
            var backData = JSON.parse(back.body)
            if(backData.errCode == 0){
                callback(backData.data.commentnum)
            }
        }
    })
}
spiderCore.prototype.getView = function (id,callback) {
    //logger.debug("获取播放数")
    var url = this.settings.view + id
    this.api_request.get(url,function (err,back) {
        if(err){}
        var backData = eval(back.body)
        callback(backData.results[0].fields.view_all_count)
    })
}
spiderCore.prototype.time = function (string) {
    if(string.indexOf("-") != -1){
        return moment(string).unix()
    }
    if(string.indexOf("小时") != -1){
        var string = string.substring(0, string.indexOf("小时"))
        return moment(moment().subtract(Number(string), 'h').format("YYYY-MM-DD")).unix()
    }
    if(string.indexOf("分钟") != -1){
        return moment(moment().format("YYYY-MM-DD")).unix()
    }
}
module.exports = spiderCore