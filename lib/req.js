const request = require('request')

let logger
let settings
let core
class req {
    constructor ( spiderCore ){
        core = spiderCore
        settings = core.settings
        logger = settings.logger
    }
    get ( option , callback ){
        let back = {},
            options = {
                method : 'GET',
                url: option.url,
                headers: {
                    'Referer': option.referer || null
                }
            }
        request.get( options , (err,res,body) => {
            if ( err ) {
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            back = {
                statusCode : res.statusCode,
                headers : JSON.stringify( res.headers ),
                body : body
            }
            return callback( null, back )
        })
    }
    post ( option , callback ) {
        let back = {},
            options = {
                method : 'POST',
                url: option.url,
                headers: {
                    'Referer': option.referer || null
                },
                form : option.data
            }
        request.post ( options, ( err, res, body ) => {
            if ( err ) {
                logger.error( 'occur error : ', err )
                return callback( err )
            }
            back = {
                statusCode : res.statusCode,
                headers : JSON.stringify( res.headers ),
                body : body
            }
            return callback( err, back )
        } )
    }
}
module.exports = req