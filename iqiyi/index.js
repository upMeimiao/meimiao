/**
 * Created by junhao on 16/4/20.
 */
var logger
var async = require( 'async' )
// var jsdom = require('jsdom')
// var fs = require("fs")
// var path = require('path')
// var jquery = fs.readFileSync(path.join(__dirname, "../lib/jquery.js"), "utf-8")
var cheerio = require('cheerio')
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
    this.getTotal(function (total) {
        spiderCore.getList(total,function () {
            spiderCore.wait()
        })
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
spiderCore.prototype.getTotal = function (callback) {
    var url = this.settings.list + 1
    this.api_request.get(url,function (err,back) {
        if(err){

        }
        var backData = JSON.parse(back.body),
            data = backData.total
        callback(data)
    })
}
spiderCore.prototype.getList = function (total,callback) {
    var spiderCore = this, url ,index = 1
    logger.debug('page',total)
    async.whilst(
        function () {
            return index <= total
        },
        function (cb) {
            url = spiderCore.settings.list + index
            spiderCore.api_request.get(url,function (err,back) {
                if(err){
                    //cb()
                }
                var backData = JSON.parse(back.body),
                    data = backData.data
                var $ = cheerio.load(data);
                var lis = $('li[tvid]'),ids = []
                for(var i = 0 ;i<lis.length;i++){
                    var id = lis[i].attribs.tvid.replace(/,/g,'')
                    ids.push(id)
                }
                //logger.debug(ids)
                var ats = $('a[data-title]'),titles = []
                for(var j = 0;j<ats.length;j++){
                    var title = ats[j].attribs['data-title']
                    titles.push(title)
                }
                //logger.debug(titles)
                spiderCore.deal(ids,titles,function () {
                    index++
                    cb()
                })
            })
        },
        function (err,result) {
            logger.debug('videos length',spiderCore.videosList.length)
            spiderCore.send(function () {
                callback()
            })
        }
    )
}
spiderCore.prototype.send = function (callback) {
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
spiderCore.prototype.deal = function (ids,titles,callback) {
    var spiderCore = this,index = 0,length = ids.length
    async.whilst(
        function () {
            return index < length
        },
        function (cb) {
            spiderCore.getInfo(ids[index],titles[index],function (err) {
                if(err){
                    setTimeout(cb,500)
                    return
                    //return cb()
                }
                index++
                setTimeout(cb,500)
                //cb()
            })
        },
        function () {
            callback()
        }
    )
}
spiderCore.prototype.getInfo = function(id,title,callback){
    var spiderCore = this,
        url = spiderCore.settings.info + id
    spiderCore.api_request.get(url,function (err,back) {
        if(err){

        }
        //logger.debug(back.body)
        if(back.body.indexOf('<html>') != -1){
            logger.debug("error",503)
            return callback(err)
        }
        var backData = back.body.replace(/try{/g,'').replace(/}catch\(e\)\{\}/g,'')
        //logger.debug(backData)
        var infoData = eval(backData),media
        //logger.debug(infoData)
        spiderCore.getCommentNum(id,function (commentsNum,playNum,creatTime) {
            media = {
                author: "一色神技能",
                platform: 2,
                aid: id,
                title: title,
                play_num: playNum,
                support: infoData.data.up,
                step: infoData.data.down,
                comment_num: commentsNum,
                a_create_time: creatTime
            }
            spiderCore.videosList.push(media)
            callback()
            //setTimeout(callback,1000)
        })
    })
    
}
spiderCore.prototype.getCommentNum = function (id,callback) {
    var url = this.settings.comment + id,spiderCore = this
    this.api_request.get(url,function (err,back) {
        if(err){
            // spiderCore.getPlayNum(id,function (playNum,creatTime) {
            //     return callback(0,playNum,creatTime)
            // })
        }
        var backData = JSON.parse(back.body),
            commentNum = backData.data.count
        logger.debug('commentNum',commentNum)
        spiderCore.getPlayNum(id,function (playNum,creatTime) {
            // if(commentNum){
            //     callback(0,playNum,creatTime)
            // }
            callback(commentNum,playNum,creatTime)
        })
    })
}
spiderCore.prototype.getPlayNum = function (id,callback) {
    var url = this.settings.playNum + id + "?callback=jsonp&status=1"
    this.api_request.get(url,function (err,back) {
        if(err){
            return callback(0)
        }
        var backData = back.body.replace(/try{/g,'').replace(/;}catch\(e\)\{\}/g,'')
        //logger.debug(backData)
        var playData = eval(backData),
            playNum = playData.data.playCount,
            creatTime = parseInt(playData.data.issueTime / 1000)
        logger.debug('play',playNum)
        logger.debug('time',creatTime)
        callback(playNum,creatTime)
    })
}
module.exports = spiderCore