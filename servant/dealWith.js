const URL = require('url')
const cheerio = require('cheerio')
const request = require( '../lib/req' )
const r = require('request')
const jsonp = function (data) {
    return data
}
const _Callback =function (data) {
    return data
}

let logger,api

class DealWith {
    constructor( core ) {
        logger = core.settings.logger
        api = core.settings.servantAPI
        logger.debug('处理器实例化...')
    }
    youku ( remote, callback ) {
        let option = {
            url: api.youku.url + '?client_id=' + api.youku.key + "&video_url=" + encodeURIComponent(remote)
        }
        request.get (option,(err,result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err,{code:102,p:1})
            }
            if(result.statusCode != 200 ){
                logger.error('优酷状态码错误',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:1})
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('优酷json数据解析失败')
                logger.info(result)
                return callback(e,{code:102,p:1})
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
                return callback(err,{code:102,p:8})
            }
            if(result.statusCode != 200 ){
                logger.error('哔哩哔哩状态码错误',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:8})
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('哔哩哔哩json数据解析失败')
                logger.info(result)
                return callback(e,{code:102,p:8})
            }
            let res = {
                id: result.data.owner.mid,
                name: result.data.owner.name,
                p: 8
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
                return callback(err,{code:102,p:5})
            }
            if(result.statusCode != 200 ){
                logger.error('美拍状态码错误',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:5})
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('美拍json数据解析失败')
                logger.info(result)
                return callback(e,{code:102,p:5})
            }
            let res = {
                id: result.user.id,
                name: result.user.screen_name,
                p: 5
            }
            callback(null,res)
        })
    }
    miaopai (data,callback) {
        let urlObj = URL.parse(data,true),
            pathname = urlObj.pathname,
            hostname = urlObj.hostname
        let start = pathname.lastIndexOf('/'),
            end = pathname.lastIndexOf('.'),
            id = pathname.substring(start+1,end)
        if(hostname == 'm.miaopai.com'){
            id = pathname.substring(start+1)
        }
        let option = {
            url: api.miaopai.url + id
        }
        request.get ( option, ( err, result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err,{code:102,p:7})
            }
            if(result.statusCode != 200 ){
                logger.error('秒拍状态码错误',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:7})
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('秒拍json数据解析失败')
                logger.info(result)
                return callback(e,{code:102,p:7})
            }
            let res = {
                id: result.result.ext.owner.suid,
                name: result.result.ext.owner.nick,
                p: 7
            }
            callback(null,res)
        })
    }
    sohu (data,callback) {
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
                return callback(err,{code:102,p:9})
            }
            if(result.statusCode != 200 ){
                logger.error('搜狐状态码错误',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:9})
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('搜狐json数据解析失败')
                logger.info(result)
                return callback(e,{code:102,p:9})
            }
            logger.debug(result)
            let res,uid = result.data.user ? result.data.user.user_id : result.data.user_id
            if(result.data.user){
                let res = {
                    id: uid,
                    name: result.data.user.nickname,
                    p: 9
                }
                return callback(null,res)
            }
            request.get ({url:`http://api.tv.sohu.com/v4/user/info/${uid}.json?api_key=f351515304020cad28c92f70f002261c&_=${(new Date()).getTime()}`}, ( err, result) => {
                if (err) {
                    logger.error('occur error : ', err)
                    return callback(err, {code: 102, p: 9})
                }
                if (result.statusCode != 200) {
                    logger.error('搜狐状态码错误', result.statusCode)
                    logger.info(result)
                    return callback(true, {code: 102, p: 9})
                }
                try {
                    result = JSON.parse(result.body)
                } catch (e) {
                    logger.error('搜狐json数据解析失败')
                    logger.info(result)
                    return callback(e, {code: 102, p: 9})
                }
                let res = {
                    id: uid,
                    name: result.data.nickname,
                    p: 9
                }
                return callback(null,res)
            })
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
                return callback(err,{code:102,p:10})
            }
            if(result.statusCode != 200 ){
                logger.error('天天快报状态码错误',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:10})
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('天天快报json数据解析失败')
                logger.info(result)
                return callback(e,{code:102,p:10})
            }
            if(result.newslist.length == 0){return callback(true,{code:102,p:10})}
            let back = result.newslist[0],
                res = {
                    id: back.chlid,
                    name: back.chlname,
                    p: 10
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
                return callback(err,{code:102,p:2})
            }
            if(result.statusCode != 200 ){
                logger.error('爱奇艺状态码错误1',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:2})
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
                    return callback(err,{code:102,p:2})
                }
                if(result.statusCode != 200 ){
                    logger.error('爱奇艺状态码错误2',result.statusCode)
                    logger.info(result)
                    return callback(true,{code:102,p:2})
                }
                let back = eval(result.body),
                    res = {
                        id: back.data.user.id,
                        name: back.data.user.name,
                        p: 2
                    }
                callback(null,res)
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
                return callback(err,{code:102,p:3})
            }
            if(result.statusCode != 200 ){
                logger.error('乐视状态码错误1',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:3})
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
            id = info.substring(8,info.lastIndexOf('"'))
            let option = {
                url: `http://api.chuang.letv.com/outer/ugc/video/user/videocount?callback=jsonp&userid=${id}&_=${(new Date()).getTime()}`
            }
            request.get(option,(err,result) => {
                if(err){
                    logger.error( 'occur error : ', err )
                    return callback(true,{code:102,p:3})
                }
                result = eval(result.body)
                let data = result.data,
                    name = data ? data.nickname : null
                // let _$ = cheerio.load(result.body),
                //     name = _$('.au_info .au_info_name').text()
                let res ={
                    id: id,
                    name: name,
                    type: 1,
                    p: 3
                }
                callback(null,res)
            })
        })
    }
    tencent (data,callback){
        let urlObj = URL.parse(data,true),
            pathname = urlObj.pathname,
            query = urlObj.query,
            start = pathname.lastIndexOf('/'),
            end = pathname.indexOf('.html'),
            option = {},res,
            vid = pathname.substring(start+1,end)
        if(pathname.startsWith('/x/cover/')){
            if(query.vid){
                vid = query.vid
            }
        }
        option.url = api.tencent.url + vid + "&_=" + new Date().getTime()
        request.get(option,(err,result)=>{
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err,{code:102,p:4})
            }
            if(result.statusCode != 200 ){
                logger.error('腾讯状态码错误1',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:4})
            }
            let back = eval(result.body)
            if( back.result && (back.result.code == -200 || back.result.code == -12)){
                option.url = data
                request.get(option,(err,result) => {
                    if(err){
                        logger.error( 'occur error : ', err )
                        return callback(err,{code:102,p:4})
                    }
                    if(result.statusCode != 200 ){
                        logger.error('腾讯状态码错误2',result.statusCode)
                        logger.info(result)
                        return callback(true,{code:102,p:4})
                    }
                    let $ = cheerio.load(result.body),
                        num = $('.btn_book .num')
                    // if(num.length){
                    //     return callback(true,{code:102,p:4})
                    // }
                    let user = $('.user_info'),
                        //name = user.attr('title'),
                        href = user.attr('href'),
                        idDom = $('.btn_book'),
                        id = href.substring(href.lastIndexOf('/')+1)
                    option.url = href
                    request.get(option,(err,result)=>{
                        if(err){
                            logger.error( 'occur error : ', err )
                            return callback(err,{code:102,p:4})
                        }
                        if(result.statusCode != 200 ){
                            logger.error('腾讯状态码错误3',result.statusCode)
                            logger.info(result)
                            return callback(true,{code:102,p:4})
                        }
                        let $ = cheerio.load(result.body),
                            nameDom = $('h2.user_info_name'),
                            nameDom2 = $('#userInfoNick'),
                            name
                        if(nameDom.length == 0){
                            name = nameDom2.text()
                            id = idDom.attr('r-subscribe')
                        }else{
                            name = nameDom.text()
                        }
                        res = {
                            id: id,
                            name: name,
                            type: 2,
                            p: 4
                        }
                        return callback(null,res)
                    })
                })
            }else{
                let nameIs = back.vppinfo.nick ? back.vppinfo.nick : back.vppinfo.nickdefault
                if(!back.result || !nameIs){
                    res = {
                        id: back.vppinfo.euin,
                        name: nameIs,
                        type: 1,
                        p: 4
                    }
                    return callback(null,res)
                }else{
                    option.url = data
                    request.get(option,(err,result) => {
                        if(err){
                            logger.error( 'occur error : ', err )
                            return callback(err,{code:102,p:4})
                        }
                        if(result.statusCode != 200 ){
                            logger.error('腾讯状态码错误2',result.statusCode)
                            logger.info(result)
                            return callback(true,{code:102,p:4})
                        }
                        let $ = cheerio.load(result.body),
                            num = $('.btn_book .num')
                        // if(num.length){
                        //     return callback(true,{code:102,p:4})
                        // }
                        let user = $('.user_info'),
                            //name = user.attr('title'),
                            href = user.attr('href'),
                            id = href.substring(href.lastIndexOf('/')+1)
                        option.url = href
                        request.get(option,(err,result)=>{
                            if(err){
                                logger.error( 'occur error : ', err )
                                return callback(err,{code:102,p:4})
                            }
                            if(result.statusCode != 200 ){
                                logger.error('腾讯状态码错误3',result.statusCode)
                                logger.info(result)
                                return callback(true,{code:102,p:4})
                            }
                            let $ = cheerio.load(result.body),
                                name = $('h2.user_info_name').html()
                            res = {
                                id: id,
                                name: name,
                                type: 2,
                                p: 4
                            }
                            return callback(null,res)
                        })
                    })
                }
            }

        })
    }
    toutiao (data,callback) {
        let pathname = URL.parse(data,true).pathname,
            v_id, option = {}
        if(pathname.startsWith('/i') || pathname.startsWith('/api/pc')){
            if(pathname.startsWith('/api/pc')){
                v_id = pathname.replace(/\//g,'').substring(9)
            }else if(pathname.startsWith('/item/')){
                v_id = pathname.replace(/\//g,'').substring(4)
            }else{
                v_id = pathname.replace(/\//g,'').substring(1)
            }
            option.url = api.toutiao.url + v_id + "/info/"
            request.get(option,(err,result)=>{
                if(err){
                    logger.error( 'occur error : ', err )
                    return callback(err,{code:102,p:6})
                }
                if(result.statusCode != 200 ){
                    logger.error('头条状态码错误',result.statusCode)
                    logger.info(result)
                    return callback(true,{code:102,p:6})
                }
                try {
                    result = JSON.parse(result.body)
                } catch (e) {
                    logger.error('头条json数据解析失败')
                    logger.info(result)
                    return callback(e,{code:102,p:6})
                }
                request.get({url: `http://lf.snssdk.com/2/user/profile/v3/?media_id=${result.data.media_user.id}`},(err,resInfo)=> {
                    if (err) {
                        logger.error('occur error : ', err)
                        return callback(err, {code: 102, p: 6})
                    }
                    if (resInfo.statusCode != 200) {
                        logger.error('头条状态码错误', resInfo.statusCode)
                        logger.info(resInfo)
                        return callback(true, {code: 102, p: 6})
                    }
                    try {
                        resInfo = JSON.parse(resInfo.body)
                    } catch (e) {
                        logger.error('头条json数据解析失败')
                        logger.info(resInfo)
                        return callback(e, {code: 102, p: 6})
                    }
                    let res = {
                        id: result.data.media_user.id,
                        name: result.data.media_user.screen_name,
                        // avatar: result.data.media_user.avatar_url,
                        p: 6,
                        encode_id: resInfo.data.user_id
                    }
                    callback(null,res)
                })
            })
        }else if(pathname.startsWith('/a') || pathname.startsWith('/group/')){
            r.head(data,{headers:{'User-Agent':':Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'}},(err,res,body)=>{
                v_id = (res.request.path).replace(/\//g,'').substring(1)
                option.url = api.toutiao.url + v_id + "/info/"
                request.get(option,(err,result)=>{
                    if(err){
                        logger.error( 'occur error : ', err )
                        return callback(err,{code:102,p:6})
                    }
                    if(result.statusCode != 200 ){
                        logger.error('头条状态码错误',result.statusCode)
                        logger.info(result)
                        return callback(true,{code:102,p:6})
                    }
                    try {
                        result = JSON.parse(result.body)
                    } catch (e) {
                        logger.error('头条json数据解析失败')
                        logger.info(result)
                        return callback(e,{code:102,p:6})
                    }
                    request.get({url: `http://lf.snssdk.com/2/user/profile/v3/?media_id=${result.data.media_user.id}`},(err,resInfo)=> {
                        if (err) {
                            logger.error('occur error : ', err)
                            return callback(err, {code: 102, p: 6})
                        }
                        if (resInfo.statusCode != 200) {
                            logger.error('头条状态码错误', resInfo.statusCode)
                            logger.info(resInfo)
                            return callback(true, {code: 102, p: 6})
                        }
                        try {
                            resInfo = JSON.parse(resInfo.body)
                        } catch (e) {
                            logger.error('头条json数据解析失败')
                            logger.info(resInfo)
                            return callback(e, {code: 102, p: 6})
                        }
                        let res = {
                            id: result.data.media_user.id,
                            name: result.data.media_user.screen_name,
                            // avatar: result.data.media_user.avatar_url,
                            p: 6,
                            encode_id: resInfo.data.user_id
                        }
                        callback(null,res)
                    })
                })
            })
        }
    }
    yidian ( data, callback ) {
        let option = {
            url: data
        }
        request.get(option,(err,result)=>{
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err,{code:102,p:11})
            }
            if(result.statusCode != 200 ){
                logger.error('一点状态码错误',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:11})
            }
            let $ = cheerio.load(result.body),
                name = $('#source-name').text(),
                href = $('#source-name').attr('href')
            if(!name || !href){
                logger.error(`url可能不是播放页地址:${data}`)
                return callback(true,{code:101,p:11})
            }
            let h_array = href.split('='),
                v_id = h_array[h_array.length-1],
                res = {
                    id: v_id,
                    name: name,
                    p: 11
                }
            callback(null,res)
        })
    }
    tudou (data,callback) {
        let pathname = URL.parse(data,true).pathname,
            test = pathname.indexOf('html'),
            option = {},v_id
        if(pathname.startsWith('/albumplay') && test> 0){
            let v_array = pathname.split('/')
            v_id = (v_array[v_array.length-1].split('.'))[0]
            option.url = `http://www.tudou.com/tvp/getItemInfo.action?ic=${v_id}&app=5`
        }else if( test > 0 ){
            let v_array = pathname.split('/')
            v_id = (v_array[v_array.length-1].split('.'))[0]
            option.url = api.tudou.url + v_id
        }else{
            let v_array = pathname.split('/')
            v_id = v_array[3]
            option.url = api.tudou.url + v_id
        }
        request.get ( option, ( err, result) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err,{code:102,p:12})
            }
            if(result.statusCode != 200 ){
                logger.error('土豆状态码错误',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:12})
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('土豆json数据解析失败')
                logger.info(result)
                return callback(e,{code:102,p:12})
            }
            let res
            if(pathname.startsWith('/albumplay')){
                res = {
                    id: result.oid,
                    name: result.onic,
                    p: 12
                }
                return callback(null,res)
            }
            if(!result.detail){
                return callback(true,{code:102,p:12})
            }
            res = {
                id: result.detail.userid,
                name: result.detail.username,
                p: 12
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
                return callback(err,{code:102,p:13})
            }
            if(result.statusCode != 200 ){
                logger.error('爆米花状态码错误',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:13})
            }
            try{
                result = JSON.parse(result.body)
            } catch (e){
                logger.error('爆米花json数据解析失败')
                logger.info(result)
                return callback(e,{code:102,p:13})
            }
            let res = {
                id: result.result.ChannelInfo.ChannelID,
                name: result.result.ChannelInfo.ChannelName,
                p: 13
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
                return callback(err,{code:102,p:14})
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('酷6json数据解析失败')
                logger.info(result)
                return callback(e,{code:102,p:14})
            }
            let res = {
                id: result.data.list[0].author.id,
                name: result.data.list[0].author.nick,
                p: 14
            }
            callback(null,res)
        })
    }
    btime ( data, callback) {
        let pathname = URL.parse(data,true).pathname,
            hostname = URL.parse(data,true).hostname,
            option = {}
        if(hostname == 'new.item.btime.com'){
            option.url = `http://api.btime.com/trans?fmt=json&news_from=4&news_id=${pathname.replace(/\//g,'')}`
            return request.get(option, (err,result) => {
                if(err){
                    logger.error( 'occur error : ', err )
                    return callback(err,{code:102,p:15})
                }
                try{
                    result = JSON.parse(result.body)
                } catch (e){
                    logger.error('北京时间json数据解析失败')
                    logger.info('json error: ',result.body)
                    return callback(e,{code:102,p:15})
                }
                let res = {
                    id: result.data.author_uid,
                    name: result.data.source,
                    p: 15
                }
                return callback(null,res)
            })
        }
        if(!((pathname.startsWith('/video/')) || (pathname.startsWith('/wemedia/')) || (pathname.startsWith('/wm/')) || (pathname.startsWith('/ent/') || (pathname.startsWith('/detail/'))))){
            return callback(true,{code:101,p:15})
        }
        option.url = data
        request.get( option, (err,result) => {
            if(err){
                logger.error('occur error: ',err)
                return callback(err,{code:102,p:15})
            }
            if(result.statusCode != 200){
                logger.error('北京时间状态码错误:',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:15})
            }
            let $ = cheerio.load(result.body),
                id = $("input[name='uid']").attr('value'),
                option = {
                    url: api.btime.url + id
                }
            if(!id){
                let scriptDOM = $('script'),
                    scriptText = scriptDOM[35].children[0].data,
                    v_id = scriptText.replace('var video_id = "','').replace('";','')
                option.url = `http://api.btime.com/trans?fmt=json&news_from=4&news_id=${v_id}`
                request.get(option, (err,result) => {
                    if(err){
                        logger.error( 'occur error : ', err )
                        return callback(err,{code:102,p:15})
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch (e){
                        logger.error('北京时间json数据解析失败')
                        logger.info('json error: ',result.body)
                        return callback(e,{code:102,p:15})
                    }
                    let res = {
                        id: result.data.author_uid,
                        name: result.data.source,
                        p: 15
                    }
                    return callback(null,res)
                })
            }else{
                request.get( option, (err,result) => {
                    if(err){
                        logger.error( 'occur error : ', err )
                        return callback(err,{code:102,p:15})
                    }
                    try{
                        result = JSON.parse(result.body)
                    } catch (e){
                        logger.error('北京时间json数据解析失败')
                        logger.info('json error: ',result.body)
                        return callback(e,{code:102,p:15})
                    }
                    let res = {
                        id: result.data.uid,
                        name: result.data.nickname,
                        p: 15
                    }
                    return callback(null,res)
                })
            }
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
            if(pathname.includes('u')){
                id = pathname.split('/')[2]
                option.url = api.weishi.url_1 + `?uid=${id}&_=${new Date().getTime()}`
                option.referer = `http://weishi.qq.com/u/${id}`
            }else{
                v_id = pathname.split('/')[2]
                option.url = api.weishi.url_2 + `?id=${v_id}`
                option.referer = `http://weishi.qq.com/t/${v_id}`
            }
        }
        request.get(option, (err, result) => {
            if (err) {
                logger.error('occur error: ', err)
                return callback(err,{code:102,p:16})
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('微视json数据解析失败')
                logger.info('json error: ', result.body)
                return callback(e,{code:102,p:16})
            }
            let data = result.data.user
            res.name = Object.keys(data)[0]
            res.id = data[res.name]
            res.p = 16
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
                return callback(err,{code:102,p:17})
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.error('小影json数据解析失败')
                logger.info('json error: ',result.body)
                return callback(e,{code:102,p:17})
            }
            let res = {
                id: result.videoinfo.auid,
                name: result.videoinfo.username,
                p: 17
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
                if(pathname.indexOf('pc') !== -1){
                    let start = pathname.indexOf('/pc/'),
                        end = pathname.indexOf('.')
                    v_id = pathname.substring(start + 4,end)
                    option.url = `http://www.budejie.com/detail-${v_id}.html`
                }else if(pathname.indexOf('user') == -1){
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
                    return callback(err,{code:102,p:18})
                }
                if (result.statusCode != 200) {
                    logger.error('不得姐状态码错误1', result.statusCode)
                    logger.info(result)
                    return callback(true,{code:102,p:18})
                }
                try {
                    result = JSON.parse(result.body)
                } catch (e) {
                    logger.error('不得姐json数据解析失败')
                    logger.info('json error: ',result)
                    return callback(e,{code:102,p:18})
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
                    return callback(err,{code:102,p:18})
                }
                if (result.statusCode != 200) {
                    logger.error('不得姐状态码错误2', result.statusCode)
                    logger.info(result)
                    return callback(true,{code:102,p:18})
                }
                let $ = cheerio.load(result.body),
                    userNode = $('.u-user-name'),
                    href = userNode.attr('href'),
                    start = href.lastIndexOf('-'),
                    end = href.indexOf('.')
                res.id = href.substring(start + 1,end)
                res.name = userNode.text().trim()
                res.p = 18
                callback(null,res)
            })
        }
    }
    neihan( data, callback) {
        let urlObj = URL.parse(data, true),
            hostname = urlObj.hostname,
            path = urlObj.pathname,
            v_array = path.split('/'),
            option = {},id,v_id
        if(hostname == 'm.neihanshequ.com'){
            id = path.includes('share') ? v_array[3] : v_array[2]
            option.url = api.neihan.url + 'p' + id
        }else if(hostname == 'neihanshequ.com' && path.startsWith('/p')){
            let rex = new RegExp(/^p[1-9]\d*|0$/)
            if(rex.test(v_array[1]) ){
                option.url = data
            }else{
                return callback(true,{code:101,p:19})
            }
        }else if(hostname == 'neihanshequ.com' && path.startsWith('/user/')){
            id = v_array[2]
            option.url = data
            request.get( option, ( err, result ) => {
                if (err) {
                    logger.error( 'occur error : ', err )
                    return callback(err,{code:102,p:19})
                }
                if (result.statusCode != 200) {
                    logger.error('内涵段子状态码错误', result.statusCode)
                    logger.info(result)
                    return callback(true,{code:102,p:19})
                }
                let $ = cheerio.load(result.body,{ignoreWhitespace:true}),
                    name = $('.desc-item .desc-wrapper .name').text(),
                    res = {
                        name: name,
                        id: id,
                        p: 19
                    }
                return callback(null,res)
            })
        }else{
            return callback(true,{code:101,p:19})
        }
        request.get(option, (err, result) => {
            if (err) {
                logger.error( 'occur error : ', err )
                return callback(err,{code:102,p:19})
            }
            if (result.statusCode != 200) {
                logger.error('内涵段子状态码错误', result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:19})
            }
            let $ = cheerio.load(result.body),
                name = $('.name-time-wrapper .name').text(),
                href = $('.detail-wrapper .header a').attr('href')
            let hArr = href.split('/'),
                v_id = hArr[4],
                res = {
                    name: name,
                    id: v_id,
                    p: 19
                }
            callback(null, res)
        })
    }
    yy( data, callback) {
        let urlObj = URL.parse(data,true),
            host = urlObj.hostname,
            path = urlObj.pathname,
            option = {}
        if(host == 'shenqu.3g.yy.com'){
            let v_array1 = path.split('/'),
                v_array2 = v_array1[v_array1.length-1].split('_'),
                v_array3 = v_array2[1].split('.'),
                v_id = v_array3[0]
            option.url = api.yy.url_1 + v_id
        }else if(host == 'w.3g.yy.com'){
            let q = URL.parse(data,true).query
            option.url = q.resid ? api.yy.url_2 + q.resid : api.yy.url_3 + q.pid
        }else if(host == 'www.yy.com'){
            if(path.startsWith('/x/') || path.startsWith('/s/') || path.startsWith('/d/')){
                option.url = data
            }else{
                return callback(true,{code:101,p:20})
            }
        }else{
            logger.error('链接错误',data)
            return callback(true,{code:101,p:20})
        }
        request.get( option, (err,result) => {
            if(err){
                logger.error('occur error: ',err)
                return callback(err,{code:102,p:20})
            }
            if(result.statusCode != 200){
                logger.error('yy状态码错误',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:20})
            }
            let $ = cheerio.load(result.body),
                name = $('.info-txt .nickname a').text(),
                href = $('.info-txt .nickname a').attr('href'),
                h_array = href.split('/'),
                id = h_array[h_array.length-1],
                res = {
                    name: name,
                    id: id,
                    p: 20
                }
            callback(null,res)
        })
    }
    tv56( data, callback) {
        let urlObj = URL.parse(data,true),
            host = urlObj.hostname,
            path = urlObj.pathname,
            v_array = path.split('/'),
            pre_vid = v_array[2].replace('.html',''),
            vid,id,res,name
        switch (host){
            case 'www.56.com':
                if(path.indexOf('play_album-aid') == -1){
                    vid = pre_vid.split('_')[1]
                }else{
                    vid = pre_vid.split('_')[2].split('-')[1]
                }
                break
            case 'm.56.com':
                vid =  pre_vid.split('-')[1]
                break
            default:
                return callback(true,{code:101,p:21})
        }
        let options = {
            method: 'GET',
            url: `http://m.56.com/view/id-${vid}.html`,
            headers: {
                'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
            }
        }
        r( options, ( err, res, body ) => {
            if(err){
                logger.error('occur error: ',err)
                return callback(err,{code:102,p:21})
            }
            if(res.statusCode != 200){
                logger.error('56状态码错误',res.statusCode)
                return callback(true,{code:102,p:21})
            }
            let $ = cheerio.load(body,{
                    ignoreWhitespace:true
                }),
                scriptData = $('script')[1].children[0].data,
                reg_id = new RegExp("sohu_user_id:'[0-9]+'"),
                _id_info = scriptData.match(reg_id),id_info,
                reg_name = new RegExp("user_name:'[A-Za-z0-9_\u4e00-\u9fa5]+'"),
                _name_info = scriptData.match(reg_name),name_info
            if(_id_info && _name_info){
                id_info = _id_info[0]
                name_info = _name_info[0]
            }else{
                return callback(true,{code:102,p:21})
            }
            id = id_info.substring(14,id_info.lastIndexOf("'"))
            name = name_info.substring(11,name_info.lastIndexOf("'"))
            res = {
                id: id,
                name: name,
                p: 21
            }
            callback(null,res)
        })
    }
    acfun( data, callback){
        let host = URL.parse(data,true).hostname,
            option = {},
            v_id
        if(host == 'www.acfun.tv' || host == 'www.acfun.cn'){
            let v_array = URL.parse(data,true).pathname.split('ac')
            v_id = v_array[1]
        }else{
            v_id = URL.parse(data,true).query.ac
        }
        option.url = api.acfun.url + v_id
        option.deviceType = '0'
        request.get( option, (err,result) => {
            if(err){
                logger.error('occur error: ',err)
                return callback(err,{code:102,p:22})
            }
            if(result.statusCode != 200){
                logger.error('A站状态码错误',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:22})
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('A站json数据解析失败')
                logger.info('json error: ',result)
                return callback(e,{code:102,p:22})
            }
            let res = {
                name: result.data.owner.name,
                id: result.data.owner.id,
                p: 22
            }
            callback(null,res)
        })
    }
    weibo(remote, callback) {
        let urlObj = URL.parse(remote,true),
            host = urlObj.hostname,
            path = urlObj.pathname,
            bid = path.match(/\/\d*/).toString().replace(/\//g,''),
            option = {},
            v_id
        if(bid == ''){
            bid = path.match(/status\/\d*/).toString().replace(/status\//,'')
        }
        if(bid.length > 10){
            option.url = remote
            request.get( option, (err,result) => {
                if(err){
                    logger.error('occur error: ',err)
                    return callback(err,{code:102,p:23})
                }
                if(result.statusCode != 200){
                    logger.error('weibo状态码错误',result.statusCode)
                    logger.info(result)
                    return callback(true,{code:102,p:23})
                }
                let $ = cheerio.load(result.body),
                    script
                try{
                    script = $('script')[1].children[0].data.replace(/[\s\n\r]/g,'')
                    bid = script.match(/"user":\{"id":\d*/).toString().replace(/"user":\{"id":/,'')
                }catch(e){
                    this.weibo(remote, callback)
                    return
                }
                
                option.url = 'http://m.weibo.cn/container/getIndex?sudaref=m.weibo.cn&retcode=6102&type=uid&value='+bid
                this.getRes(option,callback)
            })
        }else{
            option.url = 'http://m.weibo.cn/container/getIndex?sudaref=m.weibo.cn&retcode=6102&type=uid&value='+bid
            this.getRes(option,callback)
        }
    }
    getRes( option, callback ){
        request.get( option, ( err, result ) => {
            if(err){
                logger.error('occur error: ',err)
                return callback(err,{code:102,p:23})
            }
            if(result.statusCode != 200){
                logger.error('weibo状态码错误',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:23})
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                logger.debug('weibo数据解析失败')
                return callback(e,{code:102,p:23})
            }
            let res = {
                name: result.userInfo.screen_name,
                id: result.userInfo.id,
                p: 23
            }
            callback(null,res)
        })
    }
    ifeng(remote, callback) {
        const urlObj = URL.parse(remote,true),
            host = urlObj.host,
            pathname = urlObj.pathname,
            option = {},
            date_reg = /\d{6}/
        let v_id
        if(host == "vcis.ifeng.com"){
            v_id = urlObj.query.guid
        }else if(host == "v.ifeng.com"){
            if(pathname.startsWith('/m/')){
                option.url = remote
                request.get(option, ( err, result ) => {
                    if (err) {
                        logger.error('occur error: ', err)
                        return callback(err, {code: 102, p: 24})
                    }
                    let _$ = cheerio.load(result.body),
                        script = _$('script')[8].children[0].data,
                        guid = script.match(/\"id\": \"[\d\w-]*/),
                        v_id = guid[0].toString().replace(/\"id\": \"/,"")
                    //logger.debug(v_id)
                    option.url = api.ifeng.url + v_id
                    request.get( option, (err,result) => {
                        if(err){
                            logger.error('occur error: ',err)
                            return callback(err,{code:102,p:24})
                        }
                        if(result.statusCode != 200){
                            logger.error('凤凰状态码错误',result.statusCode)
                            logger.error(result)
                            return callback(true,{code:102,p:24})
                        }
                        try {
                            result = JSON.parse(result.body)
                        } catch (e) {
                            logger.error('凤凰json数据解析失败')
                            logger.info('json error: ',result)
                            return callback(e,{code:102,p:24})
                        }
                        let res = {
                            name: result.weMedia.name,
                            id: result.weMedia.id,
                            p: 24
                        }
                        callback(null,res)
                    })
                })
                return
            }else{
                let index = remote.indexOf(date_reg.exec(remote));
                let preffix = remote.substring(index,remote.length).replace(".shtml","")
                v_id = preffix.replace(/\d*\//,"");
            }
        }
        option.url = api.ifeng.url + v_id
        request.get( option, (err,result) => {
            if(err){
                logger.error('occur error: ',err)
                return callback(err,{code:102,p:24})
            }
            if(result.statusCode != 200){
                logger.error('凤凰状态码错误',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:24})
            }
            try {
                result = JSON.parse(result.body)
            } catch (e) {
                logger.error('凤凰json数据解析失败')
                logger.info('json error: ',result)
                return callback(e,{code:102,p:24})
            }
            let res = {
                name: result.weMedia.name,
                id: result.weMedia.id,
                p: 24
            }
            callback(null,res)
        })
    }
    wangyi(remote, callback) {
        let host    = URL.parse(remote,true).hostname,
            dataUrl = remote.match(/\/\w*\.html/).toString().replace(/\//,'').replace(/\.html/,''),
            option  = {
                url : 'http://c.m.163.com/nc/video/detail/'+dataUrl+'.html'
            }
        request.get( option, (err,result) => {
            if(err){
                logger.error('occur error: ',err)
                return callback(err,{code:102,p:25})
            }
            if(result.statusCode != 200){
                logger.error('网易状态码错误',result.statusCode)
                logger.error(result)
                return callback(true,{code:102,p:25})
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                logger.error('网易数据解析失败')
                return callback(e,{code:102,p:25})
            }
            let res = {
                name: result.videoTopic.tname,
                id: result.videoTopic.tid,
                p: 25
            }
            //logger.debug(res.name)
            callback(null,res)
        })
    }
    uctt(remote, callback) {
        let host = URL.parse(remote, true).hostname,
            option = {
                url: remote
            },
            bid = '', aid = '', options = {}
        if(host == 'v.mp.uc.cn' || host == 'a.mp.uc.cn'){
            bid = remote.match(/wm_id=\w*/).toString().replace(/wm_id=/,'')
            options.url = 'http://napi.uc.cn/3/classes/article/categories/wemedia/lists/'+ bid +'?_app_id=cbd10b7b69994dca92e04fe00c05b8c2&_fetch=1&_fetch_incrs=1&_size=5&_max_pos=&uc_param_str=frdnsnpfvecpntnwprdsssnikt'
            request.get( options, ( err, info ) => {
                if(err){
                    logger.error('occur error: ',err)
                    return callback(err,{code:102,p:26})
                }
                try{
                    info = JSON.parse(info.body)
                }catch(e){
                    logger.debug('UC数据解析失败')
                    return callback(e,{code:102,p:26})
                }
                let res = {
                    name: info.data[0].wm_name,
                    id: bid,
                    p: 26
                }
                callback(null,res)
            })
        }else{
            request.get( option, ( err, result ) => {
                if(err){
                    logger.error('occur error: ',err)
                    return callback(err,{code:102,p:26})
                }
                if(result.statusCode != 200){
                    logger.error('UC状态码错误',result.statusCode)
                    logger.info(result)
                    return callback(true,{code:102,p:26})
                }
                let $ = cheerio.load(result.body),
                    script
                if(host == 'tc.uc.cn'){
                    script = $('script')[0].children[0].data
                }else{
                    script = $('script')[1].children[0].data
                }
                bid = script.match(/mid=\w*/) == undefined? '': script.match(/mid=\w*/).toString().replace(/mid=/,'')
                if(bid == ''){
                    aid = script.match(/aid=\d*/).toString().replace(/aid=/,'')
                    let bidUrl = {
                        url : 'http://s4.uczzd.cn/ucnews/video?app=ucnews-iflow&aid='+aid
                    }, name
                    request.get( bidUrl, (err,bidInfo) => {
                        bidInfo = bidInfo.body
                        bid = bidInfo.match(/mid=\w*/).toString().replace(/mid=/,'')
                        name = bidInfo.match(/\"source_name\":\"[^\x00-\xff]*/).toString().replace(/\"source_name\":\"/,'')
                        let res = {
                            name: name,
                            id: bid,
                            p: 26
                        }
                        callback(null,res)
                    })
                }else{
                    options.url = 'http://napi.uc.cn/3/classes/article/categories/wemedia/lists/'+ bid +'?_app_id=cbd10b7b69994dca92e04fe00c05b8c2&_fetch=1&_fetch_incrs=1&_size=5&_max_pos=&uc_param_str=frdnsnpfvecpntnwprdsssnikt'
                    request.get( options, ( err, info ) => {
                        if(err){
                            logger.error('occur error: ',err)
                            return callback(err,{code:102,p:26})
                        }
                        try{
                            info = JSON.parse(info.body)
                        }catch(e){
                            logger.debug('UC数据解析失败')
                            return callback(e,{code:102,p:26})
                        }
                        let res = {
                            name: info.data[0].wm_name,
                            id: bid,
                            p: 26
                        }
                        callback(null,res)
                    })
                }
            })
        }
    }
    mgtv(remote, callback) {
        let host = URL.parse(remote,true).hostname,
            bid = '',
            index = 0,
            option = {}
        if(host == 'www.mgtv.com'){
            bid = remote.match(/b\/\d*/).toString().replace(/b\//,'')
        }else{
            bid = remote.match(/b\/\d*/).toString().replace(/b\//,'')
        }
        option.url = 'http://pcweb.api.mgtv.com/variety/showlist?collection_id='+bid
        //logger.debug(option.url)
        request.get( option, (err,result) => {
            if(err){
                logger.error('occur error: ',err)
                return callback(err,{code:102,p:27})
            }
            if(result.statusCode != 200){
                logger.error('芒果TV状态码错误',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:27})
            }
            try{
                result = JSON.parse(result.body)
            }catch(e){
                logger.debug('芒果TV数据解析失败')
                return callback(e,{code:102,p:27})
            }
            index = result.data.info.title.indexOf(' ')
            index = index == -1 ? result.data.info.title.length : index
            let res = {
                name: result.data.info.title.substring(0,index),
                id: result.data.tab_y[0].id,
                p: 27
            }
            callback(null,res)
        })
    }
    qzone(remote, callback) {
        let query = URL.parse(remote,true).query,
            host = URL.parse(remote,true).hostname,
            uin = '',
            tid = '',
            option = {}
        if(host == 'user.qzone.qq.com'){
            uin = remote.match(/com\/\d*/).toString().replace(/com\//,'')
            tid = remote.match(/mood\/\w*/).toString().replace(/mood\//,'')
            option.url = api.qzone.url+"&uin="+uin+"&tid="+tid
            this.getQzone(option,callback)
        }else if(host == 'mobile.qzone.qq.com'){
            if(remote.match(/&u=\d*/) == null){
                uin = query.res_uin
                tid = query.cellid
            }else{
                uin = query.u
                tid = query.i
            }
            option.url = api.qzone.url+"&uin="+uin+"&tid="+tid
            this.getQzone(option,callback)
        }else if(host == 'h5.qzone.qq.com'){
            uin = query.uin
            tid = query.shoushou_id
            option.url = api.qzone.url+"&uin="+uin+"&tid="+tid
            this.getQzone(option,callback)
        }else{
            option.url = remote
            request.get( option, (err,result) => {
                if(err){
                    logger.error('occur error: ',err)
                    return callback(err,{code:102,p:29})
                }
                if(result.statusCode != 200){
                    logger.error('网易状态码错误',result.statusCode)
                    logger.info(result)
                    return callback(true,{code:102,p:29})
                }
                let $ = cheerio.load(result.body),
                    script = $('script')[13].children[0].data,
                    data = script.match(/"uin":"\d*","_wv":"\d*","_ws":"\d*","adtag":"\w*","is_video":"\w*","shuoshuo_id":"\w*","data/).toString().replace(/"uin/,'{"uin').replace(/,"data/,'}')
                    try{
                        data = JSON.parse(data)
                    }catch(e){
                        logger.debug('QQ空间bid请求参数解析失败')
                        return callback(e,{code:102,p:29})
                    }
                option.url = api.qzone.url+"&uin="+data.uin+"&tid="+data.shuoshuo_id
                this.getQzone(option,callback)
            })
        }
        
        
    }
    getQzone( option, callback ){
        request.get( option, (err,result) => {
            if(err){
                logger.error('occur error: ',err)
                return callback(err,{code:102,p:29})
            }
            if(result.statusCode != 200){
                logger.error('QQ空间状态码错误',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:29})
            }
            try{
                result = eval(result.body)
            }catch(e){
                logger.debug('QQ空间数据解析失败')
                return callback(e,{code:102,p:29})
            }
            let res = {
                name: result.usrinfo.name,
                id: result.usrinfo.uin,
                p: 29
            }
            callback(null,res)
        })
    }
    cctv(data, callback){
        let urlObj   = URL.parse(data,true),
            host     = urlObj.hostname,
            path     = urlObj.pathname,
            bid      = '',
            name     = '',
            option   = {
                url : data
            }
        request.get( option, (err, result) => {
            if(err){
                logger.error('occur error: ',err)
                return callback(err,{code:102,p:30})
            }
            if(result.statusCode != 200){
                logger.error('CCTV状态码错误',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:30})
            }
            let $    = cheerio.load(result.body)
            bid  = $('#userName a').attr('href').match(/\d*\/index/).toString().replace(/\/index/,'')
            name = $('#userName a').text()
            let res  = {
                p: 30,
                id: bid,
                name: name
            }
            callback(null,res)
        })
    }
    pptv( data, callback ){
        let vid    = data.match(/show\/\w*\.html/).toString().replace(/show\//,''),
            option = {
                url : data,
                referer : 'http://v.pptv.com/page/'+vid
            }
        request.get( option, (err, result) => {
            if(err){
                logger.error('occur error: ',err)
                return callback(err,{code:102,p:31})
            }
            if(result.statusCode != 200){
                logger.error('PPTV状态码错误',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:31})
            }
            let $ = cheerio.load(result.body),
                script = $('script')[2].children[0].data,
                data = script.replace(/[\s\n]/g,'').replace(/varwebcfg=/,'').replace(/;/,''),
                name = $('div#video-info .bd>h3').text().split(' ')
            try{
                data = JSON.parse(data)
            }catch(e){
                logger.debug('PPTV数据转换失败')
                return callback(e,{code:102,p:31})
            }
            let res = {
                name: name[0],
                id: data.pid,
                p: 31,
                encode_id: data.cat_id
            }
            callback(null,res)
        })
    }
    xinlan( data, callback ){
        let urlObj   = URL.parse(data,true),
            host     = urlObj.hostname,
            path     = urlObj.pathname,
            option   = {
                url : data
            }
        request.get( option, (err, result) => {
            if(err){
                logger.error('occur error: ',err)
                return callback(err,{code:102,p:32})
            }
            if(result.statusCode != 200){
                logger.error('新蓝网状态码错误',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:32})
            }
            let $ = cheerio.load(result.body),
                script

            if(host == 'tv.cztv.com'){
                script = $('script')[3].children[0].data
            }else{
                script = $('script')[0].children[0].data
            }
            let data = script.replace(/[\s\n]/g,'').replace(/var__INFO__=/,'').replace(/;/,'')

            let res = {
                name: data.match(/pTitle:"[^\x00-\xff]*/).toString().replace(/pTitle:"/,''),
                id: data.match(/pid:\d*/).toString().replace(/pid:/,''),
                p: 32,
                encode_id: data.match(/cid:\d*/).toString().replace(/cid:/,'')
            }
            callback(null,res)
        })
    }
    v1( data, callback ){
        let urlObj   = URL.parse(data,true),
            host     = urlObj.hostname,
            path     = urlObj.pathname,
            bid      = '',
            name     = '',
            vid      = '',
            option   = {
                url : data
            }
        vid = path.match(/\d*\./).toString().replace(/[\.]/g,'')
        option.url = 'http://static.app.m.v1.cn/www/mod/mob/ctl/videoDetails/act/get/vid/'+vid+'/pcode/010210000/version/4.5.4.mindex.html'
        request.get( option, (err, result) => {
            if(err){
                logger.error('occur error: ',err)
                return callback(err,{code:102,p:33})
            }
            if(result.statusCode != 200){
                logger.error('v1状态码错误',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:33})
            }
            try{
                result = JSON.parse(result.body)
            } catch(e){
                logger.debug('v1数据转换失败')
                return callback(e,{code:102,p:33})
            }
            this.getenCodeid( data, (err, encodeid) => {
                let res  = {
                    p: 33,
                    id: result.body.obj.videoDetail.userInfo.userId,
                    name: result.body.obj.videoDetail.userInfo.userName,
                    encode_id: encodeid
                }
                callback(null,res)
            })           
        })
    }
    getenCodeid( url, callback ){
        let option = {
            url: url
        }
        request.get( option, (err, result) => {
            if(err){
                logger.debug('v1 encodeid 请求失败')
                return this.getenCodeid(url,callback)
            }
            if(result.statusCode != 200){
                logger.debug('v1 encodeid 状态码错误')
                return this.getenCodeid(url,callback)
            }
            let $ = cheerio.load(result.body),
                encodeid = $('a.btn_alSub').attr('id').replace('isfocusbtn_','')
            callback(null,encodeid)
        })
    }
    fengxing( data, callback ){
        let urlObj    = URL.parse(data,true),
            host      = urlObj.hostname,
            path      = urlObj.pathname,
            bid       = '',
            encode_id = '',
            name      = '',
            option    = {
                url : data
            }
        if(host == 'pm.funshion.com' || host == 'm.fun.tv'){
            if(urlObj.query.mid == undefined){
                return callback(null,{id:'',name:'',p:34})
            }
            bid = urlObj.query.mid
        }else{
            if(path.match(/g-\d*/) == null){
                bid = path.match(/c-\d*/).toString().replace(/c-/,'')
                option.url = 'http://www.fun.tv/channel/lists/'+bid+'/'
                this.getfengxiang('视频号',option,callback)
            }else{
                bid = path.match(/g-\d*/).toString().replace('g-','')
                option.url = 'http://pm.funshion.com/v5/media/profile?cl=iphone&id='+bid+'&si=0&uc=202&ve=3.2.9.2'
                this.getfengxiang('',option,callback)
            }
        }
    }
    getfengxiang( video, option, callback ){
        if(video == '视频号'){
            request.get( option, (err,result) => {
                if(err){
                    logger.error('occur error: ',err)
                    return callback(err,{code:102,p:34})
                }
                let $          = cheerio.load(result.body),
                    bid        = $('div.ch-info div.info a').attr('data-id'),
                    name       = $('div.ch-info div.info h1').text()
                let res = {
                    id: bid,
                    name: name,
                    p: 34
                }
                callback(null,res)
            })
        }else{
            request.get( option, (err,result) => {
                if(err){
                    logger.error('occur error: ',err)
                    return callback(err,{code:102,p:34})
                }
                if(result.statusCode != 200){
                    logger.error('风行状态码错误',result.statusCode)
                    logger.info(result)
                    return callback(true,{code:102,p:34})
                }
                try{
                    result = JSON.parse(result.body)
                } catch(e){
                    logger.debug('风行数据转换失败')
                    return callback(e,{code:102,p:34})
                }
                let res  = {
                    p: 34,
                    id: result.id,
                    name: result.name
                }
                callback(null,res)
            })
        }
    }
    huashu( data, callback ){
        let urlObj   = URL.parse(data,true),
            host     = urlObj.hostname,
            path     = urlObj.pathname,
            bid      = path.match(/id\/\d*/).toString().replace(/id\//,''),
            name     = '',
            option   = {
                url : 'http://www.wasu.cn/Play/show/id/'+bid
            }
        request.get( option, (err,result) => {
            if(err){
                logger.error('视频详情: ',err)
                return callback(err,{code:102,p:35})
            }
            if(result.statusCode != 200){
                logger.error('视频详情状态码错误',result.statusCode)
                logger.info(result)
                return callback(true,{code:102,p:35})
            }
            let $ = cheerio.load(result.body)
            option.url = $('div.play_information_t').eq(0).find(' div.r div.one a').attr('href')
            request.get( option, (err, result) => {
                if(err){
                    logger.error('专辑信息: ',err)
                    return callback(err,{code:102,p:35})
                }
                if(result.statusCode != 200){
                    logger.error('专辑信息状态码错误',result.statusCode)
                    logger.info(result)
                    return callback(true,{code:102,p:35})
                }
                let $      = cheerio.load(result.body),
                    script = $('script')[8].children[0].data,
                    bid    = script.match(/aggvod\/id\/\d*/).toString().replace('aggvod/id/',''),
                    name   = $('span.movie_name').text(),
                    res    = {
                        id : bid,
                        name : name,
                        p : 35
                    }
                callback(null,res)
            })
        })
    }
    baofeng( data, callback ){
        let urlObj    = URL.parse(data,true),
            host      = urlObj.hostname,
            path      = urlObj.pathname,
            bid       = path.match(/play-\d*/).toString().replace('play-',''),
            listId    = null,
            encode_id = '',
            name      = '',
            option    = {
                url : data
            }
        request.get( option, (err,result) => {
            if(err){
                logger.debug('暴风PC请求失败',err)
                return callback(err,{code:102,p:36})
            }
            if(result.statusCode != 200){
                logger.debug('暴风PC状态码错误',result.statusCode)
                return callback(true,{code:102,p:36})
            }
            try{
                let $ = cheerio.load(result.body),
                    script = $('script')[16].children[0].data.replace(/[\s\n\r]/g,''),
                    startIndex = script.indexOf('{"info_box_tpl"'),
                    endIndex = script.indexOf(';varstatic_storm_json')
                result = JSON.parse(script.substring(startIndex,endIndex))
            }catch(e){
                logger.info(result)
                logger.debug('数据解析失败')
                return callback(true,{code:102,p:36})
            }
            let res = {
                id: bid,
                name: result.info_name,
                p: 36
            }
            callback(null,res)
        })
    }
    baidu ( data, callback ){
        let urlObj   = URL.parse(data,true),
            host     = urlObj.hostname,
            path     = urlObj.pathname,
            bid      = null,
            name     = '',
            option   = {
                url : data
            }
        if(host == 'baidu.56.com'){
            let video = path.match(/\d*\.html/).toString()
            option.url = 'http://baishi.baidu.com/watch/'+video
        }
        request.get( option, (err, result) => {
            if(err){
                logger.debug('百度视频请求失败',err)
                return callback(err,{code:102,p:37})
            }
            if(result.statusCode != 200){
                logger.debug('百度视频的状态码错误',result.statusCode)
                return callback(true,{code:102,p:37})
            }
            let $ = cheerio.load(result.body)
            bid = result.body.match(/pgcTid: \'\d*/).toString().replace('pgcTid: \'','')
            name = result.body.match(/pgcName: \'[^\x00-\xff]*/).toString().replace('pgcName: \'','')
            let res = {
                id: bid,
                name: name,
                p: 37
            }
            callback(null,res)
        })
    }
    baijia ( data, callback ){
        let urlObj   = URL.parse(data,true),
            host     = urlObj.hostname,
            path     = urlObj.pathname,
            bid      = null,
            name     = '',
            option   = {
                url : data
            }
        request.get( option, (err, result) => {
            if(err){
                logger.debug('百度百家视频请求失败',err)
                return callback(err,{code:102,p:28})
            }
            if(result.statusCode != 200){
                logger.debug('百度百家的状态码错误',result.statusCode)
                return callback(true,{code:102,p:28})
            }
            let $ = cheerio.load(result.body)
            result = result.body.replace(/[\n\r\s]/g,'')
            let startIndex = result.indexOf('videoData'),
                endIndex = result.indexOf(';window.listInitData'),
                dataJson = result.substring(startIndex+10,endIndex)
            if($('script')[11].children[0] == undefined && $('script')[12].children[0] == undefined){
                dataJson = result.substring(startIndex+19,endIndex)
            }
            try{
                dataJson = JSON.parse(dataJson)
            }catch(e){
                logger.debug('百家号用户数据解析失败')
                logger.info(dataJson)
                return callback(true,{code:102,p:28})
            }
            let res = {
                id: dataJson.app.id,
                name: dataJson.app.name,
                p: 28
            }
            callback(null,res)
        })
    }

}
module.exports = DealWith