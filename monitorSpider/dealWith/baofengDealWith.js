const async = require( 'async' )
const cheerio = require('cheerio')
const request = require('../../lib/request.js')
const spiderUtils = require('../../lib/spiderUtils')
let logger,api
class dealWith {
    constructor ( spiderCore ){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('../storaging'))(this)
        this.aidUrl = ''
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('baofengDealWith instantiation ...')
    }
    baofeng ( task, callback ) {
        task.total = 0
        this.getTheAlbum(task,(err,result) => {
            if(err){
                return callback(err)
            }
            callback(null,result)
        })
    }
    
    getTheAlbum( task, callback ){
        let bidstr = task.id.toString(),
            bid = bidstr.substring(bidstr.length-2,bidstr.length),
            option = {
            url : 'http://www.baofeng.com/detail/'+bid+'/detail-'+task.id+'.html'
        }
        task.bid = bid
        request.get( logger, option, (err,result) => {
            this.storaging.totalStorage ("baofeng",option.url,"TheAlbum")
            if(err){
                let errType
                if(err.code){
                    if(err.code == "ESOCKETTIMEDOUT" || "ETIMEDOUT"){
                        errType = "timeoutErr"
                    } else{
                        errType = "responseErr"
                    }
                } else{
                    errType = "responseErr"
                }
                this.storaging.errStoraging('baofeng',option.url,task.id,err.code || "error",errType,"TheAlbum")
                return callback(err)
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('baofeng',option.url,task.id,`暴风影音获取TheAlbum接口状态码错误${result.statusCode}`,"statusErr","TheAlbum")
                return callback(result.statusCode)
            }
            let $ = cheerio.load(result.body),
                aid = $('div.episodes.clearfix').attr('m_aid')
            if(!aid){
                aid = $('div.enc-episodes-detail').attr('m_aid')
            }
            if(!aid){
                this.aidUrl = $('ul.hot-pic-list li').eq(0).find('a').attr('href')
                return this.getAid( task,(err) => {
                    if(err){
                        return callback(err)
                    }
                    callback()
                })
            }
            if(!aid){
                this.storaging.errStoraging('baofeng',option.url,task.id,`暴风影音获取TheAlbum接口返回数据错误`,"resultErr","TheAlbum")
                return callback()
            }
            this.getVidList( task, aid, (err) => {
                if(err){
                    return callback(err)
                }
                callback()
            })
        })
    }
    getAid( task, callback ){
        if(!this.aidUrl)
            return callback('结构出错，没有获取到播放详情页地址')
        let option = {
            url: 'http://www.baofeng.com/'+ this.aidUrl
        }
        request.get(logger, option, (err, result) => {
            this.storaging.totalStorage ("baofeng",option.url,"aid")
            if(err){
                let errType
                if(err.code){
                    if(err.code == "ESOCKETTIMEDOUT" || "ETIMEDOUT"){
                        errType = "timeoutErr"
                    } else{
                        errType = "responseErr"
                    }
                } else{
                    errType = "responseErr"
                }
                this.storaging.errStoraging('baofeng',option.url,task.id,err.code || "error",errType,"aid")
                return this.getAid( task, callback )
            }
            result = result.body
            let aid = result.match(/"aid":"\d+/).toString().replace(/"aid":"/,'')
            this.getVidList( task, aid, (err) => {
                callback()
            })
        })
    }
    getVidList( task, aid, callback ){
        let option = {
            url: 'http://minfo.baofeng.net/asp_c/13/124/'+aid+'-n-100-r-50-s-1-p-1.json?_random=false'
        }
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("baofeng",option.url,"list")
            if(err){
                let errType
                if(err.code){
                    if(err.code == "ESOCKETTIMEDOUT" || "ETIMEDOUT"){
                        errType = "timeoutErr"
                    } else{
                        errType = "responseErr"
                    }
                } else{
                    errType = "responseErr"
                }
                this.storaging.errStoraging('baofeng',option.url,task.id,err.code || "error",errType,"list")
                return callback(err)
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('baofeng',option.url,task.id,`暴风影音获取list接口状态码错误${result.statusCode}`,"statusErr","list")
                return callback(result.statusCode)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                this.storaging.errStoraging('baofeng',option.url,task.id,"暴风影音获取list接口json数据解析失败","doWithResErr","list")
                return callback(e)
            }
            task.total = result.album_info.videos_num
            let videoList = result.video_list,
                length = videoList.length
            this.deal( task, videoList, length, () => {
                callback()
            })
        })
    }
    deal( task, user, length, callback ){
        let index = 0
        async.whilst(
            () => {
                return index < length
            },
            (cb) => {
                this.getAllInfo( task, index, user[index], () => {
                    index++
                    cb()
                })
            },
            (err,data) => {
                callback()
            }
        )
    }
    getAllInfo( task, index, video, callback ){
        async.parallel(
            [
                (cb) => {
                    this.support( task, video.vid, (err, result) => {
                        cb(err,result)
                    })
                },
                (cb) => {
                    this.getDesc( task, index, (err, result) => {
                        cb(err,result)
                    })
                },
                (cb) => {
                    this.getComment( task, video.vid, (err, result) => {
                        cb(err,result)
                    })
                }
            ],
            (err,result) => {
                let media = {
                    author: task.name,
                    platform: task.p,
                    bid: task.id,
                    aid: video.vid,
                    title: spiderUtils.stringHandling(video.v_sub_title,100),
                    a_create_time: video.update_time.substring(0,10),
                    long_t: video.video_time/1000,
                    support: result[0].u,
                    step: result[0].d,
                    desc: result[1].desc.substr(0,100).replace(/"/g,''),
                    type: result[1].types,
                    v_url: 'http://www.baofeng.com/play/'+ task.bid +'/play-'+ task.id +'-drama-'+ video.location +'.html',
                    comment_num: result[2]
                }
                callback()
            }
        )
    }
    getDesc( task, index, callback ){
        index++
        let option = {
            url : 'http://m.baofeng.com/play/73/play-786073-drama-'+ index +'.html'
        }
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("baofeng",option.url,"desc")
            if(err) {
                let errType
                if(err.code){
                    if(err.code == "ESOCKETTIMEDOUT" || "ETIMEDOUT"){
                        errType = "timeoutErr"
                    } else{
                        errType = "responseErr"
                    }
                } else{
                    errType = "responseErr"
                }
                //logger.error(errType)
                this.storaging.errStoraging("baofeng",option.url,task.id,err.code || "error",errType,"desc")
                return callback(null,{type:'',desc:''})
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('baofeng',option.url,task.id,"暴风影音获取desc接口状态码错误","statusErr","desc")
                return callback(null,{type:'',desc:''})
            }
            let $ = cheerio.load(result.body),
                type = $('.details-info-right a').text(),
                desc = $('div.play-details-words').text().replace('简介：','').substring(0,100),
                res = {
                    type: type ? type : '',
                    desc: desc ? desc : ''
                }
            callback(null,res)
        })
    }
    support( task, vid, callback ){
        let option = {
            url : 'http://hd.baofeng.com/api/getud?wid=13&vid='+vid
        }
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("baofeng",option.url,"support")
            if(err) {
                let errType
                if(err.code){
                    if(err.code == "ESOCKETTIMEDOUT" || "ETIMEDOUT"){
                        errType = "timeoutErr"
                    } else{
                        errType = "responseErr"
                    }
                } else{
                    errType = "responseErr"
                }
                //logger.error(errType)
                this.storaging.errStoraging("baofeng",option.url,task.id,err.code || "error",errType,"support")
                return callback(null,{u:'',d:''})
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('baofeng',option.url,task.id,"暴风影音获取support接口状态码错误","statusErr","support")
                return callback(null,{u:'',d:''})
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                this.storaging.errStoraging('baofeng',option.url,task.id,"暴风影音获取support接口json数据解析失败","doWithResErr","support")
                return callback(null,{u:'',d:''})
            }
            if(!result.data){
                this.storaging.errStoraging('baofeng',option.url,task.id,"暴风影音获取support接口json数据解析失败","resultErr","support")
                return callback(null,result)
            }
            callback(null,result.data)
        })
    }
    getComment( task, vid, callback ){
        let option = {
            url: 'http://comments.baofeng.com/pull?type=movie&from=2&sort=hot&xid='+ vid +'&page=1&pagesize=6'
        }
        request.get( logger, option, (err, result) => {
            this.storaging.totalStorage ("baofeng",option.url,"comment")
            if(err){
                let errType
                if(err.code){
                    if(err.code == "ESOCKETTIMEDOUT" || "ETIMEDOUT"){
                        errType = "timeoutErr"
                    } else{
                        errType = "responseErr"
                    }
                } else{
                    errType = "responseErr"
                }
                //logger.error(errType)
                this.storaging.errStoraging("baofeng",option.url,task.id,err.code || "error",errType,"comment")
                return callback(null,'0')
            }
            if(result.statusCode && result.statusCode != 200){
                this.storaging.errStoraging('baofeng',option.url,task.id,"暴风影音获取comment接口状态码错误","statusErr","comment")
                return callback(null,'0')
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                this.storaging.errStoraging('baofeng',option.url,task.id,"暴风影音获取comment接口json数据解析失败","doWithResErr","comment")
                return callback(null,'1')
            }
            return callback(null,result.total)
        })
    }
}
module.exports = dealWith