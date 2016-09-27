const request = require('request')

exports.get = ( option, callback) => {
    var back = {},
        options = {
            method : 'GET',
            url: option.url,
            headers: {
                'Host': option.host,
                'Referer': option.referer,
                'User-Agent': option.ua || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.84 Safari/537.36'
            }
        }
    request.get(options, (err,res,body) =>{
        if ( err ) {
            return callback(err)
        }
        back = {
            statusCode : res.statusCode,
            headers : JSON.stringify( res.headers ),
            body : body
        }
        return callback( null, back );
    })
}
exports.post = ( option, callback ) => {
    var options = {
        method : 'POST',
        url: option.url,
        form : option.data
    };
    var back = {}
    request.post( options, ( err, res, body ) => {
        if ( err ) {
            return callback(err)
        }
        back = {
            statusCode : res.statusCode,
            headers : JSON.stringify( res.headers ),
            body : body
        }
        return callback( null, back )
    } )
}