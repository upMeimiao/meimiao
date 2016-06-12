/**
 * Created by ifable on 16/6/7.
 */
var async = require( 'async' )
var logger
var newsList = [],videoList = []
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
    async.series([
        function (callback) {
            spiderCore.getUser(function (err) {
                if(err){callback(err)}
                callback(null,"用户信息已返回")
            })
        },
        // function (callback) {
        //     spiderCore.getSubItem(function (err) {
        //         if(err){callback(err)}
        //         callback(null,"subItem信息已返回")
        //     })
        // },
        function (callback) {
            spiderCore.getVideos(function (err) {
                if(err){callback(err)}
                callback(null,"video信息已返回")
            })
        }
    ],
    function (err,result) {
        logger.debug("result:",result)
        spiderCore.wait()
    })
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
spiderCore.prototype.getSubItem = function (callback) {
    var spiderCore = this,
        url = this.settings.news,
        data = {
            chlid: this.settings.id
        }
    this.api_request.posts(url,data,function (err,back) {
        if(err){}
        back = back.body
        try{
            back = JSON.parse(back)
        }catch (e){
            logger.error('json数据解析失败')
            return
        }
        //logger.debug(back.ids)
        spiderCore.newsDeal(back.ids,function () {
            callback()
        })
    })
}
spiderCore.prototype.newsDeal = function (list,callback){
    var spiderCore = this
    async.whilst(
        function () {
            return list.length != 0
        },
        function (cb) {
            //logger.debug()
            spiderCore.getNewsInfo(list.shift().id,function(){
                cb()
            })
        },
        function (err,result) {
            callback()
        }
    )
}
spiderCore.prototype.getNewsInfo = function (id,callback) {
    var spiderCore = this,
        url = this.settings.list,
        data = {
            ids:id
        }
    this.api_request.posts(url,data,function (err,back) {
        if(err){}
        back = back.body
        try{
            back = JSON.parse(back)
        }catch (e){
            logger.error('json数据解析失败')
            return
        }
        if(back.newslist.length == 0){return callback()}
        var backData = back.newslist[0],
            info = {
                id: backData.id,
                author:backData.chlname,
                type: backData.articletype,
                commentId: backData.commentid,
                title: backData.title,
                time: backData.timestamp
            }
            spiderCore.getDetail(info,function () {
                callback()
            })
    })
}
spiderCore.prototype.getDetail = function (info,cb) {
    var spiderCore = this
    async.series({
        comment: function (callback) {
            spiderCore.getCommentNum(info,function (num) {
                callback(null,num)
            })
        },
        expr: function (callback) {
            spiderCore.getExpr(info,function (err,back) {
                if(err){return callback()}
                callback(null,back)
            })
        },
        play: function (callback) {
            spiderCore.getPlayNum(info,function (num) {
                callback(null,num)
            })
        }
    },
    function (err, results) {
        var media = {
            author: info.author,
            platform: 10,
            aid: info.id,
            title: info.title,
            play_num: results.play,
            comment_num: Number(results.comment),
            support: results.expr.up,
            step: results.expr.down,
            save_num: results.expr.like,
            a_create_time: info.time
        }
        spiderCore.sendVideo(media,function () {
            cb()
        })
    })
}
spiderCore.prototype.getCommentNum = function (info,callback) {
    var spiderCore = this,
        url = this.settings.comment,
        data = {
            chlid: "media_article",
            comment_id: info.commentId,
            c_type: "comment",
            article_id: info.id,
            page: 1
        }
    this.api_request.posts(url,data,function (err,back) {
        if(err){return callback(0)}
        back = back.body
        try{
            back = JSON.parse(back)
        }catch (e){
            logger.error('json数据解析失败')
            callback(0)
            return
        }
        if(back.comments){
            back.comments.count ? callback(back.comments.count) : callback(0)
        }else{
            callback(0)
        }
    })
}
spiderCore.prototype.getExpr = function (info,callback) {
    var spiderCore = this,
        url = this.settings.expr,
        data = {
            id: info.id,
            chlid: "media_article"
        }
    this.api_request.posts(url,data,function (err,back) {
        if(err){return callback(err)}
        back = back.body
        try{
            back = JSON.parse(back)
        }catch (e){
            logger.error('json数据解析失败')
            callback(0)
            return
        }
        var backData = {
            like: back.like_info ? back.like_info.count : 0,
            up: back.expr_info ? back.expr_info.list[0].count : 0,
            down: back.expr_info ? back.expr_info.list[1].count : 0
        }
        callback(null,backData)
    })
}
spiderCore.prototype.getPlayNum = function (info,callback) {
    var spiderCore = this,
        url = this.settings.play,
        data = {
            id: info.id,
            chlid: "media_video",
            articletype: info.type
        }
    this.api_request.posts(url,data,function (err,back) {
        if(err){return callback(err)}
        back = back.body
        try{
            back = JSON.parse(back)
        }catch (e){
            logger.error('json数据解析失败')
            callback(0)
            return
        }
        var backData
        if(back.kankaninfo){
            backData = back.kankaninfo
            backData.videoInfo ? callback(backData.videoInfo.playcount) : callback(0)
        } else {
            callback(null)
        }
    })
}
spiderCore.prototype.getVideos = function (callback) {
    var spiderCore = this,
        url = this.settings.video,
        data = {
            chlid: this.settings.id,
            is_video: 1
        }
    this.api_request.posts(url,data,function (err,back) {
        if(err){}
        back = back.body
        try{
            back = JSON.parse(back)
        }catch (e){
            logger.error('json数据解析失败')
            return
        }
        spiderCore.newsDeal(back.ids,function () {
            callback()
        })
    })
}
spiderCore.prototype.getUser = function (callback) {
    var spiderCore = this,
        url = this.settings.user + this.settings.id
    this.api_request.get(url,function (err,back) {
        if(err){callback(err)}
        back = back.body
        try{
            back = JSON.parse(back)
        }catch (e){
            logger.error('json数据解析失败')
            return
        }
        var backData = back.channelInfo,
            info = {
                name: "天天快报",
                uid: backData.chlid,
                u_name: backData.chlname,
                fans_num: backData.subCount,
                read_num: backData.readCount
            }
        spiderCore.sendUser(info,function () {
            callback()
        })
    })
}
spiderCore.prototype.sendUser = function (info,callback) {
    var url = this.settings.sendToServer[0]
    this.api_request.post(url,info,function (err,back) {
        if(err){}
        logger.debug(back.body)
        callback()
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