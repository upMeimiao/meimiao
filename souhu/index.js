/**
 * Created by ifable on 16/6/7.
 */
var async = require( 'async' )
var logger
var jsonp = function (data) {
    return data
}
var spiderCore = function (settings) {
    this.settings = settings
    logger = settings.logger
    this.api_request = new (require( './api_request.js' ))( this )
}
spiderCore.prototype.start = function () {
    logger.debug('start')
    var spiderCore = this
    this.getUserInfo()
    this.getTotal()
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
spiderCore.prototype.getUserInfo = function () {
    var spiderCore = this,
        url = this.settings.userInfo + this.settings.key + "&user_id=" + this.settings.id + "&_=" + (new Date()).getTime()
    this.api_request.get(url,function (err,back) {
        if(err){}
        back = back.body
        try{
            back = JSON.parse(back)
        }catch (e){
            logger.error('json数据解析失败')
            return
        }
        var backData = back.data,
            user = {
            name: "搜狐视频",
            uid: backData.user_id,
            u_name: backData.nickname,
            fans_num: backData.total_fans_count,
            read_num: backData.total_play_count
        }
        spiderCore.sendUser(user)
    })
}
spiderCore.prototype.sendUser = function (user) {
    var url = this.settings.sendToServer[0]
    this.api_request.post(url,user,function (err,back) {
        if(err){}
        logger.debug(back.body)
    })
}
spiderCore.prototype.getTotal = function () {
    var spiderCore = this,
        url = this.settings.videoList + 1 +"&user_id=" + this.settings.id + "&api_key=" + this.settings.key
    this.api_request.get(url,function (err,back) {
        if(err){}
        back = back.body
        try{
            back = JSON.parse(back)
        }catch (e){
            logger.error('json数据解析失败')
            return
        }
        //logger.debug(back)
        var total  = back.data.count
        spiderCore.getList(total)
    })
}
spiderCore.prototype.getList = function (total) {
    var spiderCore = this,page,index = 1,url
    if(total % 20 != 0){
        page = Math.ceil(total / 20)
    }else{
        page = total / 20
    }
    async.whilst(
        function () {
            return index <= page
        },
        function (cb) {
            url = spiderCore.settings.videoList + index +"&user_id=" + spiderCore.settings.id + "&api_key=" + spiderCore.settings.key
            spiderCore.api_request.get(url,function (err,back) {
                if(err){}
                back = back.body
                try{
                    back = JSON.parse(back)
                }catch (e){
                    logger.error('json数据解析失败')
                    return
                }
                var backData = back.data.videos
                //logger.debug(backData)
                spiderCore.deal(backData,function () {
                    index++
                    cb()
                })
            })
        },
        function (err,result) {
            spiderCore.wait()
        }
    )
}
spiderCore.prototype.deal = function (list,callback) {
    var spiderCore = this,sign = 0
    async.whilst(
        function () {
            return list.length != 0
        },
        function (cb) {
            var video = list.shift()
            video = {
                id: video.vid,
                title: video.video_name,
                time: Math.round(video.create_date / 1000),
                play: video.play_count
            }
            spiderCore.getInfo(video,function () {
                cb()
            })
        },
        function (err,result) {
            callback()
        }
    )
}
spiderCore.prototype.getInfo = function (video,callback) {
    var spiderCore = this,id = video.id,
        url = this.settings.digg + id + "&_=" + (new Date()).getTime()
    this.api_request.get(url,function (err,back) {
        if(err){}
        var backInfo = eval(back.body)
        //logger.debug(back)
        spiderCore.getCommentNum(id,function (num) {
            var media = {
                author: "一色神技能",
                platform: 9,
                aid: id,
                title: video.title,
                play_num: video.play,
                comment_num: num,
                support:backInfo.upCount,
                step:backInfo.downCount,
                a_create_time: video.time
            }
            spiderCore.sendVideo(media,function () {
                callback()
            })
        })
    })
}
spiderCore.prototype.getCommentNum = function (id,callback) {
    var spiderCore = this,
        url = this.settings.comment + id
    this.api_request.get(url,function (err,back) {
        if(err){}
        back = back.body
        try{
            back = JSON.parse(back)
        }catch (e){
            logger.error('json数据解析失败')
            return callback(0)
        }
        callback(back.cmt_sum ? back.cmt_sum : 0)
    })
}
spiderCore.prototype.sendVideo = function (media,callback) {
    var url = this.settings.sendToServer[1]
    this.api_request.post(url,media,function (err,back) {
        if(err){}
        logger.debug(back.body)
        callback()
    })
}
module.exports = spiderCore