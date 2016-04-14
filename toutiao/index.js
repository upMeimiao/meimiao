/**
 * Created by junhao on 16/4/7.
 */
var moment = require('moment')
var async = require( 'async' )
var request = require('request')
var mediaList = [],logger
var spiderCore = function (settings) {
    this.settings = settings;
    logger = settings.logger;
    this.downloader = new (require( './downloader.js' ))( this )
}
spiderCore.prototype.start = function () {
    var spiderCore = this, url = spiderCore.settings.contentUrl
    var date = new Date(),
        timestamp = date.getTime(),
        start = moment.unix(moment().format('X') - 360 * 24 * 60 * 60).format('YYYY-MM-DD'),
        end = moment().format('YYYY-MM-DD'),
        initUrl = url + "start_date=" + start + "&end_date=" + end + "&pagenum=1&_=" + timestamp
    spiderCore.initPage(initUrl, function (err, pageNum) {
        if (err) {
            return
        }
        spiderCore.down(pageNum, url, function () {
            var sign = 0
            async.whilst(
                function () {
                    return sign < mediaList.length
                },
                function (cb) {
                    spiderCore.send(mediaList[sign], function (err, back) {
                        if (err) {

                        }
                        //logger.debug(back.body)
                        sign++
                        cb(err, back.body)
                    })
                },
                function (err, result) {
                    if (err) {

                    }
                    spiderCore.wait()
                }
            )
        })
    })
}
spiderCore.prototype.wait = function () {
    var spiderCore = this, url = spiderCore.settings.contentUrl
    var date = new Date(),
        timestamp = date.getTime(),
        start = moment.unix(moment().format('X') - 360 * 24 * 60 * 60).format('YYYY-MM-DD'),
        end = moment().format('YYYY-MM-DD'),
        initUrl = url + "start_date=" + start + "&end_date=" + end + "&pagenum=1&_=" + timestamp
    setInterval(function () {
        mediaList = []
        if (date.getHours() == 3) {
            spiderCore.initPage(initUrl, function (err, pageNum) {
                if (err) {
                    return
                }
                spiderCore.down(pageNum, url, function () {
                    var sign = 0
                    async.whilst(
                        function () {
                            return sign < mediaList.length
                        },
                        function (cb) {
                            spiderCore.send(mediaList[sign], function (err, back) {
                                if (err) {

                                }
                                //logger.debug(back.body)
                                sign++
                                cb()
                            })
                        },
                        function (err, result) {
                            if (err) {

                            }
                        }
                    )
                })
            })
        }else{
            logger.debug("now",date.getHours())
        }
    },this.settings.waitTime)
}
spiderCore.prototype.down = function (pageNum,url,callback) {
    var spiderCore = this
    var date = new Date(),
        timestamp = date.getTime(),
        start = moment.unix(moment().format('X') - 360*24*60*60).format('YYYY-MM-DD'),
        end = moment().format('YYYY-MM-DD')
    var sign = 1
    async.whilst(
        function () {
            return sign <= pageNum
        },
        function (cb) {
            var downUrl = url + "start_date="+ start + "&end_date=" + end + "&pagenum=" + sign + "&_=" + timestamp
            spiderCore.downloader.download(downUrl,function (err,back) {
                if(err){
                    sign++
                    return cb()
                }
                try{
                    back = JSON.parse(back)
                }catch (e){
                    logger.error( 'Server Back Data Occur Error' , e.message );
                    sign++
                    return cb()
                }
                var backData = back.data.data_list
                for(var i= 0; i < backData.length;i++){
                    var media = {
                        author:"创意生活每一天",
                        platform: 6,
                        aid:backData[i].article_id,
                        title:backData[i].title,
                        play_num: backData[i].play_effective_count,
                        read_num: backData[i].go_detail_count,
                        comment_num: backData[i].comment_count,
                        recommend_num: backData[i].impression_count,
                        support: backData[i].digg_count,
                        step:backData[i].bury_count,
                        forward_num: backData[i].share_count,
                        save_num: backData[i].repin_count
                        //a_create_time: backData[i].create_time
                    }
                    logger.debug(media)
                    mediaList.push(media)
                }
                sign++
                cb()
            })
        },
        function (err,result) {
            logger.debug("length",mediaList.length)
            callback()
        }
    )
}
spiderCore.prototype.initPage = function (url,callback) {
    var spiderCore = this,total_pagenum
    spiderCore.downloader.download(url,function (err,back) {
        if(err){
            return
        }
        try{
            back = JSON.parse(back)
        }catch (e){
            logger.error( 'Server Back Data Occur Error' , e.message );
            return callback(err)
        }
        total_pagenum = back.data.total_pagenum
        return callback(null,total_pagenum)
    })
}
spiderCore.prototype.send = function (data,callback) {
    'use strict';
    var self = this;
    var options = {
        method : 'POST',
        form : data
    };
    var back = {}
    options.url = self.settings.sendToServer[1];
    //logger.info(options)
    request.post( options, function ( err, res, body ) {
        if ( err ) {
            logger.error( 'occur error : ', err );
        }
        back = {
            statusCode : res.statusCode,
            headers : JSON.stringify( res.headers ),
            body : body
        };
        return callback( err, back );
    } )
}
module.exports = spiderCore