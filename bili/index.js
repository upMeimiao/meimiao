/**
 * Created by junhao on 16/4/11.
 */
var async = require( 'async' )
var logger
var spiderCore = function(settings){
    this.settings = settings
    this.api_request = new (require( './api_request.js' ))( this )
    logger = settings.logger
    this.videosList = []
    this.videoInfo = []
}
spiderCore.prototype.start = function () {
    logger.info("start")
    var spiderCore = this
    this.getUserInfo()
    this.getTotal(function () {
        spiderCore.wait()
    })
}
spiderCore.prototype.wait = function () {
    var spiderCore = this
    setInterval(function () {
        var now = new Date()
        if(now.getHours() == 3){
            spiderCore.getUserInfo()
            spiderCore.getTotal(function () {
                
            })
        }else{
            logger.debug("now",now.getHours())
        }
    },this.settings.waitTime)
}
spiderCore.prototype.getTotal = function (callback) {
    var spiderCore = this,
        url = this.settings.mediaList + this.settings.id + "&pagesize=30"
    this.api_request.get(url,function (err,back) {
        if(err){}
        var backData  = JSON.parse(back.body)
        spiderCore.getVideos(backData.data.pages,function () {
            callback()
        })
    })
}
spiderCore.prototype.getVideos = function (pages,callback) {
    var spiderCore = this,url,sign = 1
    logger.debug(pages)
    async.whilst(
        function () {
            return sign <= pages
        },
        function (cb) {
            url = spiderCore.settings.mediaList + spiderCore.settings.id + "&page=" + sign + "&pagesize=30"
            spiderCore.api_request.get(url,function (err,back) {
                if(err){}
                var backData = JSON.parse(back.body),
                    list = backData.data.vlist
                for(var i=0;i<list.length;i++){
                    spiderCore.videosList.push(list[i].aid)
                }
                //logger.debug(spiderCore.videosList)
                sign++
                cb()
            })
        },
        function (err,result) {
            spiderCore.getVideo(spiderCore.videosList,function () {
                callback()
            })
        }
    )
}
spiderCore.prototype.getVideo = function (data,callback) {
    var spiderCore = this
    async.whilst(
        function () {
            if(data.length == 0){
                return false
            }else{
                return true
            }
        },
        function (cb) {
            var url = spiderCore.settings.media + data.shift()
            spiderCore.api_request.get(url,function (err,back) {
                if(err){

                }
                var backData = JSON.parse(back.body),
                    media = {
                        author: backData.data.owner.name,
                        platform: 8,
                        aid: backData.data.aid,
                        title: backData.data.title,
                        desc: backData.data.desc,
                        play_num: backData.data.stat.view,
                        save_num: backData.data.stat.favorite,
                        comment_num: backData.data.stat.reply,
                        forward_num: backData.data.stat.share,
                        a_create_time: backData.data.pubdate
                    }
                spiderCore.videoInfo.push(media)
                cb()
            })
        },
        function (err,result) {
            //logger.debug(spiderCore.videoInfo)
            spiderCore.sendVideos(spiderCore.videoInfo,function () {
                callback()
            })
        }
    )
}
spiderCore.prototype.sendVideos = function (data,callback) {
    var spiderCore = this,
        url = this.settings.sendToServer[1]
    async.whilst(
        function () {
            if(data.length == 0){
                return false
            }else{
                return true
            }
        },
        function (cb) {
            spiderCore.api_request.post(url,data.shift(),function (err,back) {
                if(err){}
                logger.debug(back.body)
                cb()
            })
        },
        function (err,result) {
            callback()
        }
    )
}
spiderCore.prototype.getUserInfo = function () {
    var spiderCore = this,
        url = this.settings.userInfo + this.settings.id
    this.api_request.get(url,function (err,back) {
        if(err){}
        var backData = JSON.parse(back.body),
            user = {
                name: 'bilibili',
                uid: backData.data.mid,
                u_name: backData.data.name,
                fans_num: backData.data.fans
            }
        spiderCore.sendUserInfo(user)
    })
}
spiderCore.prototype.sendUserInfo = function (data) {
    var url = this.settings.sendToServer[0]
    this.api_request.post(url,data,function (err,back) {
        if(err){}
        logger.debug(back.body)
    })
}
module.exports = spiderCore