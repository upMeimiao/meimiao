const URL = require('url')
const cheerio = require('cheerio')
const jsonp = function (data) {
    return data
}
let request,logger,settings,core,api
class deal{
    constructor (spiderCore) {
        core = spiderCore
        settings = core.settings
        logger = settings.logger
        api = settings.api
        request = new (require( '../lib/req.js' ))( core )
        logger.debug('任务处理模块 实例化...')
    }
    youku (data,callback) {
        let option = {
            url: api.youku.url + '?client_id=' + api.youku.key + "&video_url=" + encodeURIComponent(data)
        }
        request.get (option,(err,result) => {
            if(err){
                return callback(err)
            }
            if(result.statusCode != 200 ){
                logger.error('优酷状态码错误',result.statusCode)
                logger.info(result)
                return callback(true)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('优酷json数据解析失败')
                logger.info(result)
                return callback(e)
            }
            let user = result.user,
                res = {
                id: user.id,
                name: user.name,
                encode_id: user.link.substring(user.link.lastIndexOf('/')+1)
            }
            callback(null,res)
        })
    }
    bili (data,callback) {
        let start = data.indexOf('/av'),
            end = data.indexOf('/',start+1),
            id
        if(end == -1){
            id = data.substring(start+3)
        }else{
            id = data.substring(start+3,end)
        }
        let option = {
            url: api.bili.url + id
        }
        request.get ( option, ( err, result) => {
            if(err){
                return callback(err)
            }
            if(result.statusCode != 200 ){
                logger.error('哔哩哔哩状态码错误',result.statusCode)
                logger.info(result)
                return callback(true)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('哔哩哔哩json数据解析失败')
                logger.info(result)
                return callback(e)
            }
            let res = {
                id: result.data.owner.mid,
                name: result.data.owner.name
            }
            callback(null,res)
        })
    }
    meipai (data,callback) {
        let pathname = URL.parse(data,true).pathname
        let start = pathname.indexOf('/',1),
            id = pathname.substring(start+1)
        let option = {
            url: api.meipai.url + id
        }
        request.get ( option, ( err, result) => {
            if(err){
                return callback(err)
            }
            if(result.statusCode != 200 ){
                logger.error('美拍状态码错误',result.statusCode)
                logger.info(result)
                return callback(true)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('美拍json数据解析失败')
                logger.info(result)
                return callback(e)
            }
            let res = {
                id: result.user.id,
                name: result.user.screen_name
            }
            callback(null,res)
        })
    }
    miaopai (data,callback) {
        let pathname = URL.parse(data,true).pathname
        let start = pathname.lastIndexOf('/'),
            end = pathname.lastIndexOf('.'),
            id = pathname.substring(start+1,end)
        let option = {
            url: api.miaopai.url + id
        }
        request.get ( option, ( err, result) => {
            if(err){
                return callback(err)
            }
            if(result.statusCode != 200 ){
                logger.error('秒拍状态码错误',result.statusCode)
                logger.info(result)
                return callback(true)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('秒拍json数据解析失败')
                logger.info(result)
                return callback(e)
            }
            let res = {
                id: result.result.ext.owner.suid,
                name: result.result.ext.owner.nick
            }
            callback(null,res)
        })
    }
    souhu (data,callback) {
        let pathname = URL.parse(data,true).pathname
        let start = pathname.lastIndexOf('/'),
            end = pathname.lastIndexOf('.'),
            id = pathname.substring(start+1,end)
        let option = {
            url: api.souhu.url + id + '.json?site=2&api_key=695fe827ffeb7d74260a813025970bd5'
        }
        request.get ( option, ( err, result) => {
            if(err){
                return callback(err)
            }
            if(result.statusCode != 200 ){
                logger.error('搜狐状态码错误',result.statusCode)
                logger.info(result)
                return callback(true)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('搜狐json数据解析失败')
                logger.info(result)
                return callback(e)
            }
            let res = {
                id: result.data.user_id,
                name: result.data.director
            }
            callback(null,res)
        })
    }
    kuaibao (data,callback){
        let pathname = URL.parse(data,true).pathname
        let start = pathname.lastIndexOf('/'),
            id = pathname.substring(start+1)
        let option = {
            url: api.kuaibao.url,
            data: {
                ids:id
            },
            referer:'http://r.cnews.qq.com/inews/iphone/'
        }
        request.post( option, ( err, result ) => {
            if(err){
                return callback(err)
            }
            if(result.statusCode != 200 ){
                logger.error('天天快报状态码错误',result.statusCode)
                logger.info(result)
                return callback(true)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('天天快报json数据解析失败')
                logger.info(result)
                return callback(e)
            }
            if(result.newslist.length == 0){return callback(true)}
            let back = result.newslist[0],
                res = {
                    id: back.uin,
                    name: back.chlname
                }
            callback(null,res)
        })
    }
    iqiyi (data,callback){
        let option = {
            url:data,
            referer: 'http://www.iqiyi.com'+URL.parse(data).pathname
        }
        request.get(option,(err,result)=>{
            if(err){
                return callback(err)
            }
            if(result.statusCode != 200 ){
                logger.error('爱奇艺状态码错误1',result.statusCode)
                logger.info(result)
                return callback(true)
            }
            let $ = cheerio.load(result.body),
                id = $('#flashbox').attr('data-player-tvid'),
                option = {
                    url: api.iqiyi.url + id + "?callback=jsonp&status=1",
                    host: 'mixer.video.iqiyi.com',
                    referer: 'http://www.iqiyi.com'+URL.parse(data).pathname
                }
            request.get(option,(err,result)=>{
                if(err){
                    return callback(err)
                }
                if(result.statusCode != 200 ){
                    logger.error('爱奇艺状态码错误2',result.statusCode)
                    logger.info(result)
                    return callback(true)
                }
                let backData = result.body.replace(/try{/g,'').replace(/;}catch\(e\)\{\}/g,''),
                    back = eval(backData),
                    res = {
                        id: back.data.user.id,
                        name: back.data.user.name
                    }
                callback(err,res)
            })
        })
    }
    le (data,callback){
        let option = {
            url:data,
            referer: data
        }
        request.get(option,(err,result)=>{
            if(err){
                return callback(err)
            }
            if(result.statusCode != 200 ){
                logger.error('乐视状态码错误1',result.statusCode)
                logger.info(result)
                return callback(true)
            }
            let $ = cheerio.load(result.body,{
                ignoreWhitespace:true
            }),
                _info_ = $('head script').text(),
                reg = new RegExp('userId:"[0-9]+"'),
                _info = _info_.match(reg),info,id,type
            if(_info){
                info = _info[0]
            }else{
                return callback(true)
            }
            if($('.Info_hot_dl dd a').length == 0){
                type = 0
            }else{
                type = 1
            }
            id = info.substring(8,info.lastIndexOf('"'))
            let option = {
                url: 'http://chuang.le.com/u/' + id
            }
            request.get(option,(err,result) => {
                if(err){}
                let _$ = cheerio.load(result.body),
                    name = _$('.au_info').text()
                let res ={
                    id: id,
                    name: name,
                    type: type
                }
                callback(null,res)
            })
        })
    }
    tencent (data,callback){
        let option = {
            url: data
        }
        request.get(option,(err,result) => {
            if(err){
                return callback(err)
            }
            if(result.statusCode != 200 ){
                logger.error('腾讯状态码错误1',result.statusCode)
                logger.info(result)
                return callback(true)
            }
            let $ = cheerio.load(result.body),
                name = $('a.user_name').html(),
                h_url,
                id,u_tips,
                res,type
            if(name){
                h_url = $('a.user_name').attr('href')
                id = h_url.substring(h_url.lastIndexOf('/')+1)
                u_tips = $('.user_badge_tips')
                if(u_tips.length == 0){
                    type = 0
                }else{
                    type = 1
                }
                res = {
                    id: id,
                    name: new Tool().hexToString(name),
                    type: type
                }
                return callback(null,res)
            }
            let pathname = URL.parse(data,true).pathname
            let start = pathname.lastIndexOf('/'),
                end = pathname.indexOf('.html'),
                vid = pathname.substring(start+1,end)
            let option = {
                url: api.tencent.url + vid + "&_=" + new Date().getTime()
            }
            request.get(option,(err,result)=>{
                if(err){
                    return callback(err)
                }
                if(result.statusCode != 200 ){
                    logger.error('腾讯状态码错误2',result.statusCode)
                    logger.info(result)
                    return callback(true)
                }
                let back = eval(result.body)
                res = {
                    id: back.vppinfo.euin,
                    name: back.vppinfo.nick,
                    type: 0
                }
                return callback(null,res)
            })
        })
    }
    toutiao (data,callback) {
        let pathname = URL.parse(data,true).pathname,
            v_id = pathname.replace(/\//g,'').substring(1),
            option = {
                url: api.toutiao.url + v_id + "/info/"
            }
        request.get(option,(err,result)=>{
            if(err){
                return callback(err)
            }
            if(result.statusCode != 200 ){
                logger.error('头条状态码错误',result.statusCode)
                logger.info(result)
                return callback(true)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('头条json数据解析失败')
                logger.info(result)
                return callback(e)
            }
            let res = {
                id: result.data.media_user.id,
                name: result.data.media_user.screen_name
            }
            callback(null,res)
        })
    }
    kuaishou ( data, callback ) {
        let url_obj = URL.parse(data,true),
            pathname = url_obj.pathname,
            query = url_obj.query,
            id = query.userId
        request.get(option,(err,result)=>{
            
        })
        let res  = {
            id: id
        }
        callback(null,res)
    }
}
class Tool{
    hexToString(str){
        let val = ''
        let arr = str.split(';')
        for(let i = 0; i < arr.length-1; i++){
            val += String.fromCodePoint(arr[i].replace('&#','0'))
        }
        return val
    }
}
module.exports = deal