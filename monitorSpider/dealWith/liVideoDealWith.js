const moment = require('moment')
const async = require( 'async' )
const request = require( 'request' )
const spiderUtils = require('../../lib/spiderUtils')

let logger,api
class dealWith {
    constructor ( spiderCore ){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('liVideoDealWith instantiation ...')
    }
    liVideo ( task, callback ) {
        task.total = 0
        this.getListInfo(task,(err) => {
            if(err){
                return callback(err)
            }
            callback(null,task.total)
        })
        
    }
    getListInfo( task, callback ){
        let options = {
            method:'GET',
            headers:
                {
                    'cache-control': 'no-cache',
                    'x-platform-version': '10.2.1',
                    'x-client-hash': 'b90e74ec3b4e9511e9cf87e96438e461',
                    connection: 'c',
                    'x-client-version': '2.2.1',
                    'x-client-agent': 'APPLE_iPhone8,2_iOS10.2.1',
                    'user-agent': 'LiVideoIOS/2.2.1 (iPhone; iOS 10.2.1; Scale/3.00)',
                    'X-Platform-Type': '1',
                    'X-Client-ID': '2C2DECE9-B2CD-4B8B-A044-6D904ACFB5E7'
                }
            },
            start = 0,
            cycle = true;
        async.whilst(
            () => {
                return cycle
            },
            (cb) => {
                options.url = `${api.liVideo.list}${task.id}&start=${start}`;
                request(options, (error, response, body) => {
                    this.storaging.totalStorage ("liVideo",options.url,"list")
                    if(error){
                        let errType
                        if(error.code){
                            if(error.code == "ESOCKETTIMEDOUT" || "ETIMEDOUT"){
                                errType = "timeoutErr"
                            } else{
                                errType = "responseErr"
                            }
                        } else{
                            errType = "responseErr"
                        }
                        //logger.error(errType)
                        this.storaging.errStoraging("liVideo",options.url,task.id,error.code || "error",errType,"list")
                        return this.getListInfo(task,callback)
                    }
                    if(response.statusCode != 200){
                        this.storaging.errStoraging("liVideo",options.url,task.id,`梨视频list接口状态码错误${response.statusCode}`,"statusErr","list")
                        return this.getListInfo(task,callback)
                    }
                    try{
                        body = JSON.parse(body)
                    }catch (e){
                        this.storaging.errStoraging("liVideo",options.url,task.id,`梨视频list接口json数据解析错误`,"doWithResErr","list")
                        return this.getListInfo(task,callback)
                    }
                    task.total += body.contList.length;
                    if(body.contList.length <= 0){
                        cycle = false;
                        return cb()
                    }
                    this.deal(task, body.contList, () => {
                        start += 11;
                        cb()
                    })
                })
            },
            (err, result) => {
                callback()
            }
        )
    }
    deal( task, list, callback ){
        let index = 0
        async.whilst(
            () => {
                return index < list.length
            },
            (cb) => {
                this.getMedia( task, list[index], (err) => {
                    index++;
                    cb()
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    getMedia( task, video, callback ){
        async.series(
            [
                (cb) => {
                    this.getVidInfo( task, video.contId, (err,result) => {
                        cb(err,result)
                    })
                }
            ],
            (err, result) => {
                let media = {
                    author: task.name,
                    platform: task.p,
                    bid: task.id,
                    aid: video.contId,
                    title: spiderUtils.stringHandling(video.name,100),
                    tag: result[0].tags,
                    a_create_time: result[0].content.pubTime,
                    long_t: result[0].content.videos[0].duration,
                    v_img: video.pic,
                    support: video.praiseTimes,
                    desc: spiderUtils.stringHandling(result[0].content.summary,100),
                    v_url: result[0].content.shareUrl,
                    comment_num: result[0].content.commentTimes
                };
                callback()
            }
        )
    }
    getVidInfo( task,vid, callback ){
        let options = {
            method:'GET',
            url: 'http://app.pearvideo.com/clt/jsp/v2/content.jsp?contId='+vid,
            headers:
                {
                    'cache-control': 'no-cache',
                    'x-platform-version': '10.2.1',
                    'x-client-hash': 'b90e74ec3b4e9511e9cf87e96438e461',
                    connection: 'keep-alive',
                    'x-client-version': '2.2.1',
                    'x-client-agent': 'APPLE_iPhone8,2_iOS10.2.1',
                    'user-agent': 'LiVideoIOS/2.2.1 (iPhone; iOS 10.2.1; Scale/3.00)',
                    'X-Platform-Type': '1',
                    'X-Client-ID': '2C2DECE9-B2CD-4B8B-A044-6D904ACFB5E7'
                }
            },
            tags = [];
        request( options, (error, response, body) => {
            this.storaging.totalStorage ("liVideo",options.url,"info")
            if(error){
                let errType
                if(error.code){
                    if(error.code == "ESOCKETTIMEDOUT" || "ETIMEDOUT"){
                        errType = "timeoutErr"
                    } else{
                        errType = "responseErr"
                    }
                } else{
                    errType = "responseErr"
                }
                //logger.error(errType)
                this.storaging.errStoraging("liVideo",options.url,task.id,error.code || "error",errType,"info")
                return this.getVidInfo(task,vid,callback)
            }
            if(response.statusCode != 200){
                this.storaging.errStoraging("liVideo",options.url,task.id,`梨视频info接口状态码错误${response.statusCode}`,"statusErr","info")
                return this.getVidInfo(task,vid,callback)
            }
            try{
                body = JSON.parse(body)
            }catch (e){
                this.storaging.errStoraging("liVideo",options.url,task.id,`梨视频info接口json数据解析错误`,"doWithResErr","info")
                return this.getVidInfo(task,vid,callback)
            }
            if(!body.content){
                return logger.debug('暂停')
            }
            for (let i=0; i<body.content.tags.length; i++){
                tags.push(body.content.tags[i].name);
            }
            body.tags = tags.join(',');
            body.content.pubTime = moment(new Date('body.content.pubTime'+':00')).format('X');
            callback(null,body)
        })
    }
}
module.exports = dealWith