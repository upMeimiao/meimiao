/**
 * Created by junhao on 16/4/14.
 */
var logger
var async = require( 'async' )
var moment = require('moment')
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
spiderCore.prototype.getTotal = function () {
    logger.debug("开始获取视频总页数")
    var spiderCore = this,
        url = this.settings.newList + "1&_="+ (new Date()).getTime()
    this.api_request.get(url,function (err,back) {
        if(err){}
        var backData = eval(back.body)
        spiderCore.getList(backData.data.totalPage)
    })
}
// spiderCore.prototype.getTotal = function (callback) {
//     logger.debug("开始获取视频总数")
//     var spiderCore = this,
//         url = this.settings.list + this.settings.id + "&page=1&_=" + (new Date()).getTime()
//     this.api_request.get(url,function (err,back) {
//         if(err){}
//         var backData = eval(back.body)
//         if(backData.code != 200){
//             return callback()
//         }
//         spiderCore.getList(backData.data.total,function () {
//             callback()
//         })
//     })
// }
spiderCore.prototype.getList = function (page) {
    var spiderCore = this,url,sign = 1
    async.whilst(
        function () {
            return sign <= page
        },
        function (cb) {
            logger.debug("开始获取第"+ sign +"页视频列表")
            var url = spiderCore.settings.newList + sign + "&_="+ (new Date()).getTime()
            spiderCore.api_request.get(url,function (err,back) {
                if(err){}
                //logger.debug(back.body)
                var backData = eval(back.body),
                    backList = backData.data.list
                //logger.debug(backList)
                spiderCore.deal(backList,function () {
                    sign++
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
    var spiderCore = this
    async.whilst(
        function () {
            return list.length != 0
        },
        function (cb) {
            spiderCore.info(list.shift(),function(){
                cb()
            })
        },
        function (err,result) {
            callback()
        }
    )
}
spiderCore.prototype.info = function (video,callback) {
    var spiderCore = this
    async.series([
        function (cb) {
            spiderCore.getInfo(video.vid,function (data) {
                cb(null,data)
            })
        },
        function (cb) {
            spiderCore.getTime(video.vid,function (time) {
                cb(null,time)
            })
        },
        function (cb) {
            spiderCore.getDesc(video.vid,function (desc) {
                cb(null,desc)
            })
        }
    ],
    function (err,result) {
        var media = {
            author: "一色神技能",
            platform: 3,
            aid: video.vid,
            title: video.title,
            desc: result[2],
            play_num: result[0].play_count,
            comment_num: result[0].vcomm_count,
            support: result[0].up,
            step: result[0].down,
            a_create_time: result[1]
        }
        //logger.debug(media)
        spiderCore.sendVideo(media,function () {
            callback()
        })
    })
}
spiderCore.prototype.getInfo = function (id,callback) {
    var url = this.settings.info + id + "&_=" + (new Date()).getTime()
    this.api_request.get(url,function (err,back) {
        if(err){
            
        }
        var backData = eval(back.body),
            info = backData[0]
        callback(info)
    })

}
spiderCore.prototype.getTime = function (id,callback) {
    var url = this.settings.time + id
    this.api_request.get(url,function (err,back) {
        if(err){
            callback(0)
        }
        var backData = JSON.parse(back.body),
            time = backData.version_time
        callback(moment(time).unix())
    })
}
spiderCore.prototype.getDesc = function (id,callback) {
    var url = this.settings.desc + id
    this.api_request.gets(url,id,function (err,back) {
        if(err){}
        back = back.body
        try{
            back = JSON.parse(back)
        }catch (e){
            logger.error('json数据解析失败')
            return
        }
        var backData  = back.data.introduction
        backData ? callback(backData.video_description) : callback('')
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