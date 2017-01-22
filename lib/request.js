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
        proxy: option.proxy ? option.proxy.replace('https','http') : null,
        url: option.url,
        timeout: 5000,
        headers: option.headers ?  option.headers : {
            'Referer': option.referer || null,
            'User-Agent': user_agent,
            'deviceType': option.deviceType || null
        }
    }
    if(!options.proxy){
        delete options.proxy
    }
    if(!options.headers['User-Agent']){
        delete options.headers['User-Agent']
    }
    if(!options.headers.Referer){
        delete options.headers.Referer
    }
    if(!options.headers.deviceType){
        delete options.headers.deviceType
    }
    request.get( options , (err,res,body) => {
        if ( err ) {
            // logger.error( 'occur error : ', err.message )
            // logger.error( `error url: ${option.url}` )
            return callback(err)
        }
        if( res.statusCode != 200){
            // logger.error(`请求状态有误: ${res.statusCode}`)
            // logger.error( `error url: ${option.url}` )
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
    if(!options.headers['User-Agent']){
        delete options.headers['User-Agent']
    }
    if(!options.headers.Referer){
        delete options.headers.Referer
    }
    if(!options.headers['content-type']){
        delete options.headers['content-type']
    }
    request.post ( options, ( err, res, body ) => {
        if ( err ) {
            logger.error( 'occur error : ', err.message )
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