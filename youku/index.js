/**
 * Created by junhao on 16/4/8.
 */
var crypto = require('crypto')
var moment = require('moment')
var async = require( 'async' )
var logger
var spiderCore = function(settings){
    this.settings = settings
    this.api_request = new (require( './api_request.js' ))( this )
    logger = settings.logger
    this.access_token = settings.api.access_token
    this.refresh_token = settings.api.refresh_token
    this.videosList = []
}
spiderCore.prototype.start = function(){
    var spiderCore = this
    spiderCore.getToken(0,function () {
        spiderCore.getUserInfo(function (videos_count,backUser) {
            spiderCore.sendUserInfo(backUser)
            var page
            if(videos_count % 20 != 0){
                page = Math.ceil(videos_count / 20)
            }else{
                page = videos_count / 20
            }
            spiderCore.getVideos(page,function () {
                spiderCore.wait()
            })
        })
    })
}
spiderCore.prototype.wait = function () {
    var now = new Date(),spiderCore = this
    setInterval(function () {
        if(now.getHours() == 3){
            spiderCore.videosList = []
            spiderCore.getToken(0,function () {
                spiderCore.getUserInfo(function (videos_count,backUser) {
                    spiderCore.sendUserInfo(backUser)
                    var page
                    if(videos_count % 20 != 0){
                        page = Math.ceil(videos_count / 20)
                    }else{
                        page = videos_count / 20
                    }
                    spiderCore.getVideos(page,function () {
                        
                    })
                })
            })
        }else{
            logger.debug("now",now.getHours())
        }
    },this.settings.waitTime)
}
spiderCore.prototype.getToken = function (type,callback) {
    var spiderCore = this,url,data
    if(type == 0){
        url = spiderCore.settings.sendToServer[2] + spiderCore.settings.userID
        spiderCore.api_request.get(url,function (err,back) {
            if(err){
            }
            var backData = JSON.parse(back.body)
            if(backData.errno != 0){
                logger.error(backData.errmsg)
            }else{
                logger.debug(backData)
                spiderCore.access_token = backData.data.access_token
                spiderCore.refresh_token = backData.data.refresh_token
            }
            callback()
        })
    }
    if(type == 1){
        url = spiderCore.settings.api.tokenRefresh
        data = {
            client_id: spiderCore.settings.api.app_key,
            client_secret: spiderCore.settings.api.app_secret,
            grant_type: "refresh_token",
            refresh_token: spiderCore.refresh_token
        }
        spiderCore.api_request.post(url,data,function (err,back) {
            if(err){

            }
            spiderCore.sendToken(JSON.parse(back.body),function () {
                callback()
            })
        })
    }
}
spiderCore.prototype.sendToken = function (data,callback) {
    var spiderCore = this,
        url = spiderCore.settings.sendToServer[0]
    spiderCore.access_token = data.access_token
    spiderCore.refresh_token = data.refresh_token
    data = {
        name: '优酷',
        uid: spiderCore.settings.userID,
        access_token: data.access_token,
        refresh_token: data.refresh_token
    }
    spiderCore.api_request.post(url,data,function (err,back) {
        if(err){

        }
        logger.debug(back.body)
        callback()
    })
}
spiderCore.prototype.getUserInfo = function (callback) {
    var spiderCore = this,
        url = spiderCore.settings.api.userInfo
    data = {
        client_id: spiderCore.settings.api.app_key,
        access_token: spiderCore.access_token
    }
    spiderCore.api_request.post(url,data,function (err,back) {
        if(err){
            return
        }else if(back.statusCode == 401){
            var errMsg = JSON.parse(back.body)
            logger.debug("401")
            if(errMsg.error.code == 1008){
                spiderCore.getToken(1,function () {
                    spiderCore.getUserInfo()
                })
            }
            return
        }else if(back.statusCode == 200){
            var userInfo = back.body
            try {
                userInfo = JSON.parse(back.body)
            } catch (e) {
                logger.error( 'Server Back Data Occur Error' , e.message )
                return
            }
            var backUser = {
                name: '优酷',
                uid: userInfo.id,
                access_token: spiderCore.access_token,
                refresh_token: spiderCore.refresh_token,
                u_name: userInfo.name,
                fans_num: userInfo.followers_count,
                subscribe_count: userInfo.subscribe_count,
                vv_count: userInfo.vv_count
            }
            callback(userInfo.videos_count,backUser)
            //spiderCore.sendUserInfo(backUser)
        }
    })
}
spiderCore.prototype.sendUserInfo = function (data) {
    var spiderCore = this,
        url = spiderCore.settings.sendToServer[0]
    spiderCore.api_request.post(url,data,function (err,back) {
        if(err){

        }
        logger.debug(back.body)
    })
}
spiderCore.prototype.getVideos = function (page,callback) {
    var spiderCore = this,sign = 1,url
    async.whilst(
        function () {
            return sign <= page
        },
        function (cb) {
            url = spiderCore.settings.api.videos + "?client_id=" + spiderCore.settings.api.app_key + "&user_id=" + spiderCore.settings.userID + "&page=" + sign + "&count=20"
            spiderCore.api_request.get(url, function (err, back) {
                if (err) {

                }
                var dataBack = JSON.parse(back.body)
                dataBack = dataBack.videos
                logger.debug(dataBack)
                for(var i = 0;i<dataBack.length;i++){
                    var video = {
                        author: "一色神技能",
                        platform: 1,
                        aid: dataBack[i].id,
                        title: dataBack[i].title,
                        play_num: dataBack[i].view_count,
                        save_num: dataBack[i].favorite_count,
                        comment_num: dataBack[i].comment_count,
                        support: dataBack[i].up_count,
                        step: dataBack[i].down_count,
                        a_create_time: moment(dataBack[i].published).unix()
                    }
                    spiderCore.videosList.push(video)
                }
                sign++
                cb()
            })
        },
        function (err,result) {
            //logger.debug("length",spiderCore.videosList.length)
            spiderCore.sendVideos(function () {
                callback()
            })
        }
    )
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
spiderCore.prototype.getList = function () {
    var action = "youku.api.vod.getbcid.videoinfo",
        client_id = this.settings.api.app_key,
        access_token = this.access_token,
        format = "json",
        timestamp = moment().unix(),
        version = "3.0"
    var user_id = "854459409"
    var params = "access_token"+access_token+"action"+action+"client_id"+client_id+
            "format"+format+"timestamp"+timestamp+"user_id"+user_id+"version"+version
    var sign = this.createSign(params)
    logger.debug(sign)
    var opensysparams = {
        action:action,
        client_id:client_id,
        access_token:access_token,
        format:format,
        timestamp:timestamp,
        version:version,
        sign:sign
    }
    var open = JSON.stringify(opensysparams)
    logger.debug(open)
    var url = 'https://openapi.youku.com/router/rest.json?user_id='+user_id+'&opensysparams='+open
    this.api_request.get(url,function (err,back) {
        logger.debug(back)
    })

}
spiderCore.prototype.createSign = function (params) {
    var md5 = crypto.createHash('md5')
    md5.update(params)
    return md5.digest('hex')
}

module.exports = spiderCore