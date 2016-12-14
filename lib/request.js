const request = require('request')
const pc_ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.82 Safari/537.36'
const m_ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
exports.get = ( logger, option , callback ) => {
    let back = {},user_agent
    switch (option.ua){
        case 1:
            user_agent = pc_ua
            break
        case 2:
            user_agent = m_ua
            break
        case 3:
            user_agent = option.own_ua
            break
        default:
            user_agent = null
            break
    }
    let options = {
        method : 'GET',
        url: option.url,
        timeout: 45000,
        headers: {
            // 'Referer': option.referer || null,
            // 'User-Agent': user_agent,
            // 'deviceType': option.deviceType || null,
            'Accept-Encoding':	'deflate',
            'Cookie':	'_ba=BA0.2-20161214-51e32-ufWgHwlgSm8uE767U9bQ; install_id=6706712822; ttreq=1$549ea86df1538103e28ba6946498446f3cdb1e4a; qh[360]=1',
    'Connection':	'keep-alive',
            'Cache-Control':'no-cach',
    'Accept':	'application/json',
    'User-Agent':	'Mozilla/5.0 (iPhone; CPU iPhone OS 10_2 like Mac OS X) AppleWebKit/602.3.12 (KHTML, like Gecko) Mobile/14C92 NewsArticle/5.9.0.5 JsSdk/2.0 NetType/WIFI (News 5.9.0 10.200000)',
    'Referer':	'https://lf.snssdk.com/2/user/profile/v3/?media_id=5567057918&to_html=1&version_code=5.9.0&app_name=news_article&vid=4CF7A0FF-E11D-4216-9FAD-E4A35021BA8C&device_id=32511333734&channel=App%20Store&resolution=1242*2208&aid=13&ab_version=95360,83095,95599,95646,93820,95606,95592,90764,95628,95928,95445,92439,93157,95003,95970,95616,94005,87496,93961,96058,87988&ab_feature=z1&build_version=5.9.0.5&openudid=3a7f9dc84dff69ba5e1f784a0f12bce99fbb9ce9&live_sdk_version=1.3.0&idfv=4CF7A0FF-E11D-4216-9FAD-E4A35021BA8C&ac=WIFI&os_version=10.2&ssmix=a&device_platform=iphone&iid=6706712822&ab_client=a1,f2,f7,e1&device_type=iPhone%206S%20Plus&idfa=00000000-0000-0000-0000-000000000000&refer=default',
        'Accept-Language':	'zh-cn',
    'X-Requested-With':	'XMLHttpRequest'
        }
    }
    request.get( options , (err,res,body) => {
        if ( err ) {
            logger.error( 'occur error : ', err )
            logger.error( `error url: ${option.url}` )
            return callback(err)
        }
        if( res.statusCode != 200){
            logger.error(`请求状态有误: ${res.statusCode}`)
            logger.error( `error url: ${option.url}` )
            return callback(true)
        }
        back = {
            statusCode : res.statusCode,
            headers : JSON.stringify( res.headers ),
            body : body
        }
        return callback( null, back )
    })
}
exports.post = ( logger, option , callback ) => {
    let back = {},user_agent
    switch (option.ua){
        case 1:
            user_agent = pc_ua
            break
        case 2:
            user_agent = m_ua
            break
        case 3:
            user_agent = option.own_ua
            break
        default:
            user_agent = null
            break
    }
    let options = {
        method : 'POST',
        url: option.url,
        headers: {
            'content-type': option.contentType || null,
            'Referer': option.referer || null,
            'User-Agent': user_agent
        },
        form : option.data
    }
    request.post ( options, ( err, res, body ) => {
        if ( err ) {
            logger.error( 'occur error : ', err )
            logger.error( `error url: ${option.url}` )
            return callback(err)
        }
        if( res.statusCode != 200){
            logger.error(`请求状态有误: ${res.statusCode}`)
            logger.error( `error url: ${option.url}` )
            return callback(true)
        }
        back = {
            statusCode : res.statusCode,
            headers : JSON.stringify( res.headers ),
            body : body
        }
        return callback( err, back )
    } )
}