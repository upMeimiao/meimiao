/**
 * Created by junhao on 16/4/8.
 */
var request = require('request')
var logger
var api_request = function ( spiderCore ) {
    'use strict'
    this.spiderCore = spiderCore;
    logger = spiderCore.settings.logger
    this.settings = spiderCore.settings
    logger.debug( 'API Request 实例化...' )
}
api_request.prototype.get = function (url,callback) {
    var back = {}
    request.get(url,function(err,res,body){
        if ( err ) {
            logger.error( 'occur error : ', err );
        }
        back = {
            statusCode : res.statusCode,
            headers : JSON.stringify( res.headers ),
            body : body
        }
        return callback( err, back );
    })
}
api_request.prototype.post = function (url,data,callback) {
    'use strict'
    var options = {
        method : 'POST',
        url: url,
        form : data
    };
    var back = {}
    this.logger.debug(options)
    request.post( options, function ( err, res, body ) {
        if ( err ) {
            logger.error( 'occur error : ', err );
        }
        back = {
            statusCode : res.statusCode,
            headers : JSON.stringify( res.headers ),
            body : body
        };

        return callback( err, back );
    } )
}
api_request.prototype.gets = function (url,id,callback) {
    var back = {}
    var options = {
        method : 'GET',
        url: url,
        headers: {
            'Referer':'http://m.le.com/vplay_' + id +'.html'
        }
    }
    request.get(options,function(err,res,body){
        if ( err ) {
            logger.error( 'occur error : ', err );
        }
        back = {
            statusCode : res.statusCode,
            headers : JSON.stringify( res.headers ),
            body : body
        }
        return callback( err, back );
    })
}
module.exports = api_request