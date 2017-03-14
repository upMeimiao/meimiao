/**
 * Created by yunsong on 16/8/4.
 */
const async = require( 'async' )
const request = require( '../lib/req' )
let logger,api
class dealWith {
    constructor (spiderCore){
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.storaging = new (require('./storaging'))(this)
        logger = this.settings.logger
        api = this.settings.spiderAPI
        logger.trace('neihanDealWith instantiation ...')
    }
    neihan (task,callback) {
        task.total = 0
        async.parallel({
            user: (callback) => {
                this.getUser (task,(err,result)=>{
                    callback(err,result)
                })
            },
            media: (callback) => {
                this.getList( task, (err,result) => {
                    if(err){
                        return callback(err)
                    }
                    callback(err,result)
                })
            }
        },(err,result) => {
            if(err){
                return callback(err)
            }
            callback(null,result)
        })
    }
    getUser (task,callback){
        let option = {
            url: api.neihan.userInfo + task.id
        }
        request.get(option,(err,result) => {
            this.storaging.totalStorage ("neihan",option.url,"user")
            this.storaging.judgeRes ("neihan",option.url,task.id,err,result,"user")
            if(!result){
                return 
            }
            if(!result.body){
                return 
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('json数据解析失败')
                this.storaging.errStoraging('neihan',option.url,task.id,"neihan获取user接口json数据解析失败","doWithResErr","user")
                return callback()
            }
            // let user = {
            //     platform: 19,
            //     bid: task.id,
            //     fans_num: result.data.followers
            // }
        })
    }
    getList ( task, callback ) {
        let sign = 1,
            isSign = true,
            option,
            time
        async.whilst(
            () => {
                return isSign
            },
            (cb) => {
                if(!time){
                    option = {
                        url: api.neihan.medialist + task.id + '&min_time=0'
                    }
                }else{
                    option = {
                        url: api.neihan.medialist + task.id + "&max_time=" + time
                    }
                }
                request.get(option, (err,result) => {
                    this.storaging.totalStorage ("neihan",option.url,"list")
                    if(err){
                        let errType
                        if(err.code && err.code == "ETIMEOUT" || "ESOCKETTIMEOUT"){
                            errType = "timeoutErr"
                        } else{
                            errType = "responseErr"
                        }
                        // logger.error(errType)
                        this.storaging.errStoraging('neihan',option.url,task.id,err.code || "error",errType,"list")
                        return cb()
                    }
                    if(!result.body){
                        this.storaging.errStoraging('neihan',option.url,task.id,"内涵段子获取list接口无返回内容","responseErr","list")
                        return cb()
                    }
                    if(result.statusCode && result.statusCode != 200){
                        this.storaging.errStoraging('neihan',option.url,task.id,"内涵段子list接口状态码错误","list")
                        return cb()
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch(e){
                        logger.error('json数据解析失败')
                        this.storaging.errStoraging('neihan',option.url,task.id,"内涵段子list接口json数据解析失败","list")
                        sign++
                        return cb()
                    }
                    let list = result.data.data
                    if(list.length != 0){
                        this.deal(task,option.url,list, () => {
                            time = list[list.length-1].group ? list[list.length-1].group.online_time : list[list.length-1].online_time
                            sign++
                            cb()
                        })
                    }else{
                        task.total = sign * 20
                        isSign = false
                        cb()
                    }
                })
            },
            (err,result) => {
                callback()
            }
        )
    }
    deal ( task, url, list, callback) {
        let index = 0
        async.whilst(
            () => {
                return index < list.length
            },
            (cb) => {
                if(!list[index].group){
                    index++
                    return cb()
                }
                let group = list[index].group
                if(!group){
                    index++
                    return cb()
                }
                let type = group.media_type
                if(type == 3){
                    this.getInfo(task,url,list[index],(err) => {
                        index++
                        cb()
                    })
                }else{
                    index++
                    cb()
                }
            },
            (err,result) => {
                callback()
            }
        )
    }
    getInfo ( task, url, data, callback ) {
        let group = data.group,
            title
        if(group.title != ''){
            title = group.title
        }else{
            title = 'btwk_caihongip'
        }
        let media = {
            author: task.name,
            platform: 19,
            bid: task.id,
            aid: group.id_str,
            title: title.substr(0,100).replace(/"/g,''),
            desc: group.text.substr(0,100).replace(/"/g,''),
            play_num: group.play_count,
            save_num: group.favorite_count,
            forward_num: group.share_count,
            comment_num: group.comment_count,
            support: group.digg_count,
            step: group.bury_count,
            a_create_time: group.create_time,
            v_img: this._v_img( group ),
            long_t: group.duration ? this.long_t(group.duration) : null,
            class: group.category_name
        }
        if(!media.long_t){
            delete media.long_t
        }
        if(!media.v_img){
            delete media.v_img
        }
        // this.core.MSDB.hget(`apiMonitor:play_num`,`${media.author}_${media.aid}`,(err,result)=>{
        //     if(err){
        //         logger.debug("读取redis出错")
        //         return
        //     }
        //     if(result > media.play_num){
        //         this.storaging.errStoraging('neihan',`${url}`,task.id,`内涵段子${media.aid}播放量减少`,"playNumErr","list")
        //         return
        //     }
        // })
        this.storaging.sendDb(media,task.id,"list")
        callback()
    }
    long_t ( raw ){
        if(!raw){
            return ''
        }
        return Math.round(raw)
    }
    _v_img ( raw ){
        if( !raw ){
            return ''
        }
        if(!raw.large_cover && !raw.medium_cover){
            return ''
        }
        if(raw.large_cover.url_list && raw.large_cover.url_list.length > 0){
            return raw.large_cover.url_list[0].url
        }
        if(raw.medium_cover.url_list && raw.medium_cover.url_list.length > 0){
            return raw.medium_cover.url_list[0].url
        }
        return ''
    }
}
module.exports = dealWith