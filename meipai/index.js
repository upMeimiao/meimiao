/**
 * Created by junhao on 16/4/5.
 */
var logger,userInfo,backUser,mediasInfo = [],mediaList=[]
var request = require('request')
var async = require( 'async' );
var spiderCore = function(settings){
    this.settings = settings;
    logger = settings.logger;
}
spiderCore.prototype.start = function(){
    var spiderCore = this
    logger.debug("start")
    spiderCore.download(function () {
        backUser = {
            name: '美拍',
            uid: userInfo.id,
            u_name: userInfo.screen_name,
            fans_num: userInfo.followers_count,
            support_num: userInfo.be_liked_count
        }
        spiderCore.send(backUser,0,function (err,back) {
            if(err){

            }
            logger.debug(back.body)
            spiderCore.save(mediasInfo,1,function (err,back) {
                if(err){

                }
                spiderCore.wait()
            })
        })
    })
}

spiderCore.prototype.wait = function () {
    var spiderCore = this
    setInterval(function () {
        mediasInfo = [],mediaList = []
        var now = new Date()
        if(now.getHours() == 3){
            spiderCore.download(function () {
                backUser = {
                    name: '美拍',
                    uid: userInfo.id,
                    u_name: userInfo.screen_name,
                    fans_num: userInfo.followers_count,
                    support_num: userInfo.be_liked_count
                }
                spiderCore.send(backUser,0,function (err,back) {
                    if(err){

                    }
                    logger.debug(back.body)
                    spiderCore.save(mediasInfo,1,function (err,back) {
                        if(err){

                        }
                    })
                })
            })
        }else{
            logger.debug("now",now.getHours())
        }
    },this.settings.waitTime)
}
spiderCore.prototype.download = function (callback) {
    var spiderCore = this
    spiderCore.userInfo(function (err , res , body) {
        userInfo = JSON.parse(body)
        var videos_count = userInfo.videos_count,page
        if(videos_count%20 == 0){
            page = videos_count/20
        }else{
            page = Math.floor(videos_count/20)+1
        }
        logger.debug("page",page)
        var maxId = '',
            sign = 1
        async.whilst(
            function () {
                return sign <= page
            },
            function (cb) {
                spiderCore.mediaList(maxId,function (err,res,body) {
                    //logger.debug(body)
                    var medias = JSON.parse(body)
                    //logger.debug(medias)
                    for(var i = 0; i<medias.length;i++){
                        mediaList[i] = medias[i].id
                    }
                    maxId = medias[medias.length-1].id
                    sign++
                    cb()
                })
            },
            function (err,result) {
                logger.debug("length",mediaList.length)
                spiderCore.getMedias(function () {
                    callback()
                })
            }
        )
    })
}
spiderCore.prototype.save = function (data,type,callback) {
    var sign = 0,spiderCore = this
    async.whilst(
        function () {
            return sign < data.length
        },
        function (cb) {
            spiderCore.send(data[sign],1,function (err,back) {
                if(err){
                    
                }
                logger.debug(back.body)
                sign++
                cb(err,back.body)
            })
        },
        function (err,result) {
            callback()
        }
    )
}
spiderCore.prototype.send = function (data,type,callback) {
    'use strict';
    var self = this;
    var options = {
        method : 'POST',
        form : data
    };
    var back = {};
    var route;
    if (type === 0) {
        route = 0;
    }else if(type === 1){
        route =1
    }
    else {
        logger.error('出现没有见过的任务类型：',type);
        logger.debug(data);
        route = 0;
    }
    options.url = self.settings.sendToServer[ route ];
    logger.info(options)
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
    } );
}
spiderCore.prototype.getMedias = function (callback) {
    var sign = 0,
        spiderCore = this
    async.whilst(
        function () {
            return sign < mediaList.length
        },
        function (cb) {
            spiderCore.media(mediaList[sign],function (err,res,body) {
                var media = JSON.parse(body),
                    mediaData = {
                        author:media.user.screen_name,
                        platform: 5,
                        aid:media.id,
                        title:media.caption,
                        play_num: media.plays_count,
                        comment_num: media.comments_count,
                        support: media.likes_count,
                        forward_num: media.reposts_count,
                        a_create_time: media.created_at
                    }
                mediasInfo.push(mediaData)
                sign++
                cb()
            })
        },
        function (err,result) {
            logger.debug("mediaList length",mediaList.length)
            callback()
        }
    )
}
spiderCore.prototype.userInfo = function (callback) {
    'use strict';
    var url = this.settings.userInfo;
    request.get(url,function(err,res,body){
        if(res.statusCode === 200){
            return callback(null,null,body);
        } else {
            return callback(err,res,body);
        }
    });
};
spiderCore.prototype.media = function (mediaId,callback) {
    'use strict';
    var url = this.settings.media + mediaId;
    request.get(url,function(err,res,body){
        if(res.statusCode === 200){
            return callback(null,null,body);
        } else {
            return callback(err,res,body);
        }
    });
}
spiderCore.prototype.mediaList = function (maxId,callback) {
    'use strict';
    var url = this.settings.mediaList + maxId;
    request.get(url,function(err,res,body){
        if(res.statusCode === 200){
            return callback(null,null,body);
        } else {
            return callback(err,res,body);
        }
    });
};

module.exports = spiderCore;