/**
 * Created by junhao on 16/4/20.
 */
var logger
var async = require( 'async' )
var jsdom = require('jsdom')
var fs = require("fs")
var path = require('path')
var jquery = fs.readFileSync(path.join(__dirname, "../lib/jquery.js"), "utf-8")
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
    this.getList(function () {
        
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
spiderCore.prototype.getList = function (callback) {
    var spiderCore = this, url , sign = true,index = 0
    async.whilst(
        function () {
            return sign
        },
        function (cb) {
            url = spiderCore.settings.list + index
            spiderCore.api_request.get(url,function (err,back) {
                if(err){
                    cb()
                }
                var backData = JSON.parse(back.body),
                    data = backData.data
                jsdom.env({
                    html: data,
                    src: [jquery],
                    done: function (err, window) {
                        var $ = window.$;
                        var id = $('li[tvid]')
                        logger.debug(id)
                    }
                })
            })
        },
        function (err,result) {
            
        }
    )
}
module.exports = spiderCore