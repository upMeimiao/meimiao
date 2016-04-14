/**
 * Created by junhao on 16/4/8.
 */
var async = require( 'async' )
var logger
var spiderCore = function(settings){
    this.settings = settings
    this.api_request = new (require( './api_request.js' ))( this )
    logger = settings.logger
    this.videosList = []
}
spiderCore.prototype.start = function(){
    logger.info("start")
    var spiderCore = this
    this.getUserInfo(function (total) {
        spiderCore.getVideos(total,function () {
            spiderCore.wait()
        })
    })
}
spiderCore.prototype.wait = function () {
    var spiderCore = this
    setInterval(function () {
        var now = new Date()
        if(now.getHours() == 2){
            spiderCore.videosList = []
            spiderCore.getUserInfo(function (total) {
                spiderCore.getVideos(total,function () {
                    //spiderCore.wait()
                })
            })
        }else{
            logger.debug("now",now.getHours())
        }
    },this.settings.waitTime)
}
spiderCore.prototype.getUserInfo = function (callback) {
    var spiderCore = this
    var url = this.settings.api + "1&per=20&suid=" +this.settings.suid
    this.api_request.get(url,function (err,back) {
        if(err){

        }
        var backData = JSON.parse(back.body),
            user = backData.header,
            backUser = {
                name: '秒拍',
                uid: user.suid,
                u_name: user.nick,
                fans_num: user.eventCnt.fans
            }
        callback(backData.total)
        spiderCore.sendUserInfo(backUser)
    })
}
spiderCore.prototype.getVideos = function (total,callback) {
    var spiderCore = this,
        sign = 1,url
    async.whilst(
        function () {
            return sign <= total
        },
        function (cb) {
            url = spiderCore.settings.api + sign + "&per=20&suid=" +spiderCore.settings.suid
            spiderCore.api_request.get(url,function (err,back) {
                if(err){}
                var backData = JSON.parse(back.body),
                    videos = backData.result
                for(var i=0;i<videos.length;i++){
                    var video = {
                        author: videos[i].channel.ext.owner.nick,
                        platform: 7,
                        aid:videos[i].channel.scid,
                        title:videos[i].channel.ext.t,
                        play_num: videos[i].channel.stat.vcnt,
                        comment_num: videos[i].channel.stat.ccnt,
                        support: videos[i].channel.stat.lcnt,
                        forward_num: videos[i].channel.stat.scnt,
                        a_create_time: Math.ceil(videos[i].channel.ext.finishTime / 1000)
                    }
                    spiderCore.videosList.push(video)
                }
                sign++
                cb()
            })
        },
        function (err,result) {
            logger.debug("length",spiderCore.videosList.length)
            spiderCore.sendVideos(function () {
                callback()
            })
        }
    )
}
spiderCore.prototype.sendUserInfo = function (data) {
    var url = this.settings.sendToServer[0]
    this.api_request.post(url,data,function (err,back) {
        if(err){

        }
        logger.debug(back.body)
    })
}
spiderCore.prototype.sendVideos = function (callback) {
    var spiderCore = this
    async.whilst(
        function () {
            if(spiderCore.videosList.length == 0){
                return false
            }else{
                return true
            }
        },
        function (cb) {
            spiderCore.api_request.post(spiderCore.settings.sendToServer[1],spiderCore.videosList.shift(),function (err,back) {
                if(err){

                }
                logger.debug(back.body)
                cb()
            })
        },
        function (err,result) {
            callback()
        }
    )
}
module.exports = spiderCore