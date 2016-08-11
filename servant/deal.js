const URL = require('url')
const cheerio = require('cheerio')
const request = require( '../lib/req' )
const jsonp = function (data) {
    return data
}
let logger,settings,core,api
class deal{
    constructor (spiderCore) {
        core = spiderCore
        settings = core.settings
        logger = settings.logger
        api = settings.api
        logger.debug('任务处理模块 实例化...')
    }
    youku (data,callback) {
        let option = {
            url: api.youku.url + '?client_id=' + api.youku.key + "&video_url=" + encodeURIComponent(data)
        }
        request.get (option,(err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
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
                p: 1,
                encode_id: user.link.substring(user.link.lastIndexOf('/')+1),
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
                logger.error( 'occur error : ', err )
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
                logger.error( 'occur error : ', err )
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
                logger.error( 'occur error : ', err )
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
                logger.error( 'occur error : ', err )
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
                logger.error( 'occur error : ', err )
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
                logger.error( 'occur error : ', err )
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
                    logger.error( 'occur error : ', err )
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
                logger.error( 'occur error : ', err )
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
                type = 2
            }else{
                type = 1
            }
            id = info.substring(8,info.lastIndexOf('"'))
            let option = {
                url: 'http://chuang.le.com/u/' + id
            }
            request.get(option,(err,result) => {
                if(err){
                    logger.error( 'occur error : ', err )
                }
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
                logger.error( 'occur error : ', err )
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
                    type = 1
                }else{
                    type = 2
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
                    logger.error( 'occur error : ', err )
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
                    type: 1
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
                logger.error( 'occur error : ', err )
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
    yidian ( data, callback ) {
        let option = {
            url: data
        }
        request.get(option,(err,result)=>{
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            if(result.statusCode != 200 ){
                logger.error('一点状态码错误',result.statusCode)
                logger.info(result)
                return callback(true)
            }
            let $ = cheerio.load(result.body),
                name = $('#source-name').text(),
                href = $('#source-name').attr('href'),
                h_array = href.split('='),
                v_id = h_array[h_array.length-1],
                res = {
                    id: v_id,
                    name: name
                }
            callback(null,res)
        })
    }
    tudou (data,callback) {
        let test = data.indexOf('html'),
            option = {}
        if( test > 0 ){
            let v_array = data.split('/'),
                v_id = (v_array[v_array.length-1].split('.'))[0]
                option.url = api.tudou.url + v_id
        }else{
            let v_array = data.split('/'),
                v_id = v_array[v_array.length-2]
                option.url = api.tudou.url + v_id
        }
        request.get ( option, ( err, result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            if(result.statusCode != 200 ){
                logger.error('土豆状态码错误',result.statusCode)
                logger.info(result)
                return callback(true)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('土豆json数据解析失败')
                logger.info(result)
                return callback(e)
            }
            let res = {
                id: result.detail.userid,
                name: result.detail.username
            }
            callback(null,res)
        })
    }
    baomihua ( data, callback ) {
        let urlObj = URL.parse(data,true),
            hostname = urlObj.hostname,
            pathname = urlObj.pathname,
            id,v_id,option = {}
        if(hostname == 'www.baomihua.com' || hostname == 'baomihua.com'){
            let v_array = pathname.split('/')
            if(pathname.indexOf('_')){
                id = v_array[2].split('_')[0]
                v_id = v_array[2].split('_')[1]
            }else{
                id = v_array[2]
            }
        }else{
            let v_array = pathname.split('/')
            v_id = v_array[2]
        }
        if(id){
            option.url = api.baomihua.url + `?channelid=${id}&type=channelinfo`
        }else{
            option.url = api.baomihua.url + `?channelid=0&type=channelinfo&videoid=${v_id}`
        }
        request.get ( option, ( err, result ) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            if(result.statusCode != 200 ){
                logger.error('爆米花状态码错误',result.statusCode)
                logger.info(result)
                return callback(true)
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('爆米花json数据解析失败')
                logger.info(result)
                return callback(e)
            }
            let res = {
                id: result.result.ChannelInfo.ChannelID,
                name: result.result.ChannelInfo.ChannelName
            }
            callback(null,res)
        })
    }
    ku6 ( data ,callback ) {
        let v_array1 = data.split('/'),
            v_array2 = v_array1[v_array1.length-1].split('.'),
            v_id = v_array2[0] + '..',
            v_time = new Date().getTime(),
            option = {
                url: api.ku6.url + v_id + '&_=' + v_time
            }
        request.get( option, (err,result) => {
            if(err){
                logger.error('occur error:', err )
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('酷6json数据解析失败')
                logger.info(result)
                return callback(e)
            }
            let res = {
                id: result.data.list[0].author.id,
                name: result.data.list[0].author.nick
            }
            callback(null,res)
        })
    }
    btime ( data, callback) {
        let option = {
            url: data
        }
        request.get( option, (err,result) => {
            if(err){
                logger.error('occur error: ',err)
                return callback(err)
            }
            if(result.statusCode != 200){
                logger.error('北京时间状态码错误:',result.statusCode)
                logger.info(result)
                return callback(true)
            }
            let $ = cheerio.load(result.body),
                id = $("input[name='uid']").attr('value'),
                option = {
                    url: api.btime.url + id
                }
            request.get( option, (err,result) => {
                if(err){
                    logger.error( 'occur error : ', err )
                    return callback(err)
                }
                try{
                    result = JSON.parse(result.body)
                } catch (e){
                    logger.error('北京时间json数据解析失败')
                    logger.info('json error: ',result.body)
                    return callback(e)
                }
                let res = {
                    id: result.data.uid,
                    name: result.data.nickname
                }
                callback(null,res)
            })
        })
    }
    weishi ( data, callback ) {
        let urlObj = URL.parse(data, true),
            hostname = urlObj.hostname,
            pathname = urlObj.pathname,
            id, v_id, option = {}, res = {}
        if (hostname.indexOf('qq') == -1) {
            v_id = pathname.split('/')[2]
            option.url = api.weishi.url_2 + `?id=${v_id}`
            option.referer = `http://www.weishi.com/t/${v_id}`
        } else {
            id = pathname.split('/')[2]
            option.url = api.weishi.url_1 + `?uid=${id}&_=${new Date().getTime()}`
            option.referer = `http://weishi.qq.com/u/${id}`
        }
        request.get(option, (err, result) => {
            if (err) {
                logger.error('occur error: ', err)
                return callback(err)
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('微视json数据解析失败')
                logger.info('json error: ', result.body)
                return callback(e)
            }
            let data = result.data.user
            res.name = Object.keys(data)[0]
            res.id = data[res.name]
            callback(null,res)
        })
    }
    xiaoying ( data, callback) {
        let path = URL.parse(data,true).pathname,
            v_array = path.split('/'),
            id = v_array[2],
            option = {
                url: api.xiaoying.url + id
            }
        request.get( option, (err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('小影json数据解析失败')
                logger.info('json error: ',result.body)
                return callback(e)
            }
            let res = {
                id: result.videoinfo.auid,
                name: result.videoinfo.username
            }
            callback(null,res)
        })
    }
    budejie ( data, callback ) {
        let urlObj = URL.parse(data, true),
            hostname = urlObj.hostname,
            pathname = urlObj.pathname,
            id, v_id, option = {}, res = {}
        switch (hostname) {
            case 'www.budejie.com':
                if(pathname.indexOf('user') == -1){
                    let start = pathname.indexOf('-'),
                        end = pathname.indexOf('.')
                    v_id = pathname.substring(start + 1,end)
                    option.url = `http://www.budejie.com/detail-${v_id}.html`
                }else{
                    let start = pathname.indexOf('-'),
                        end = pathname.indexOf('.')
                    id = pathname.substring(start + 1,end)
                    option.url = api.budejie.url_1 + id
                }
                break
            case 'm.budejie.com':
            case 'a.f.budejie.com':
                let start = pathname.lastIndexOf('/'),
                    end = pathname.indexOf('.')
                v_id = pathname.substring(start + 1,end)
                option.url = `http://www.budejie.com/detail-${v_id}.html`
                break
            default:
                return
        }
        if(id){
            request.get( option, ( err, result) => {
                if (err) {
                    logger.error( 'occur error : ', err )
                    return callback(err)
                }
                if (result.statusCode != 200) {
                    logger.error('不得姐状态码错误', result.statusCode)
                    logger.info(result)
                    return callback(true)
                }
                try {
                    result = JSON.parse(result.body)
                } catch (e) {
                    logger.error('不得姐json数据解析失败')
                    logger.info('json error: ',result)
                    return callback(e)
                }
                let data = result.data
                res.id = data.id
                res.name = data.username
                callback(null,res)
            })
        } else {
            request.get( option, ( err, result ) => {
                if (err) {
                    logger.error( 'occur error : ', err )
                    return callback(err)
                }
                if (result.statusCode != 200) {
                    logger.error('不得姐状态码错误', result.statusCode)
                    logger.info(result)
                    return callback(true)
                }
                let $ = cheerio.load(result.body),
                    userNode = $('.u-user-name'),
                    href = userNode.attr('href'),
                    start = href.lastIndexOf('-'),
                    end = href.indexOf('.')
                res.id = href.substring(start + 1,end)
                res.name = userNode.html().trim()
                callback(null,res)
            })
        }
    }
    neihan( data, callback) {
        let path = URL.parse(data, true).pathname,
            v_array = path.split('/'),
            id = v_array[3],
            option = {
                url: api.neihan.url + 'p' + id
            }
        request.get(option, (err, result) => {
            if (err) {
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            if (result.statusCode != 200) {
                logger.error('内涵段子状态码错误', result.statusCode)
                logger.info(result)
                return callback(true)
            }
            let $ = cheerio.load(result.body),
                name = $('.name-time-wrapper .name').text(),
                href = $('.detail-wrapper .header a').attr('href')
            let hArr = href.split('/'),
                v_id = hArr[4],
                res = {
                    name: name,
                    id: v_id
                }
            callback(null, res)
        })
    }
    yy( data, callback) {
        let host = URL.parse(data,true).hostname,
            option
        if(host == 'shenqu.3g.yy.com'){
            let path = URL.parse(data,true).pathname,
                v_array1 = path.split('/'),
                v_array2 = v_array1[v_array1.length-1].split('_'),
                v_array3 = v_array2[1].split('.'),
                v_id = v_array3[0]
            option = {
                url: api.yy.url_1 + v_id
            }
        }else if(host == 'w.3g.yy.com'){
            let q = URL.parse(data,true).query,
                v_id = q.resid
            option = {
                url: api.yy.url_2 + v_id
            }
        }else{
            logger.error('链接错误',data)
            return callback(true)
        }
        request.get( option, (err,result) => {
            if(err){
                logger.error('occur error: ',err)
                return callback(err)
            }
            if(result.statusCode != 200){
                logger.error('yy状态码错误',result.statusCode)
                logger.info(result)
                return callback(true)
            }
            let $ = cheerio.load(result.body),
                name = $('.info-txt .nickname a').text(),
                href = $('.info-txt .nickname a').attr('href'),
                h_array = href.split('/'),
                id = h_array[h_array.length-1],
                res = {
                    name: name,
                    id: id
                }
            callback(null,res)
        })
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