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
    async.whilst(
        function () {
            return index <= total
        },
        function (cb) {
            url = spiderCore.settings.list + index
            spiderCore.api_request.get(url,function (err,back) {
                if(err){
                    cb()
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
                spiderCore.getInfo(ids,titles,function () {
                    index++
                    cb()
                })
            })
        },
        function (err,result) {
            logger.debug(spiderCore.videoInfo.length)
        }
    )
}
spiderCore.prototype.getInfo = function(ids,titles,callback){
    var spiderCore = this, url ,index = 0,length = ids.length
    logger.debug(length)
    async.whilst(
        function () {
            return index < length
        },
        function (cb) {
            url = spiderCore.settings.info + ids[index]
            logger.debug('index',index)
            spiderCore.api_request.get(url,function (err,back) {
                if(err){
                    
                }
                //logger.debug(back.body)
                var backData = back.body.replace(/try{/g,'').replace(/}catch\(e\)\{\}/g,'')
                var infoData = eval(backData),media
                logger.debug(infoData)
                spiderCore.getCommentNum(ids[index],function (commentsNum,playNum,creatTime) {
                    media = {
                        author: "一色神技能",
                        platform: 2,
                        aid: ids[index],
                        title: titles[index],
                        play_num: playNum,
                        support: infoData.data.up,
                        step: infoData.data.down,
                        comment_num: commentsNum,
                        a_create_time: creatTime
                    }
                    spiderCore.videosList.push(media)
                    cb()
                })
            })
        },
        function (err,result) {
            callback()
        }
    )
}
spiderCore.prototype.getCommentNum = function (id,callback) {
    var url = this.settings.comment + id,spiderCore = this
    this.api_request.get(url,function (err,back) {
        if(err){
            spiderCore.getPlayNum(id,function (playNum,creatTime) {
                return callback(0,playNum,creatTime)
            })
        }
        var backData = JSON.parse(back.body),
            commentNum = backData.data.count
        logger.debug(commentNum)
        spiderCore.getPlayNum(id,function (playNum,creatTime) {
            if(commentNum){
                callback(0,playNum,creatTime)
            }
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
        logger.debug(playNum)
        logger.debug(creatTime)
        callback(playNum,creatTime)
    })
}
module.exports = spiderCore