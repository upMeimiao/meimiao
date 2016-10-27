const URL = require('url')
const cheerio = require('cheerio')
const request = require( '../lib/request' )
const jsonp = function (data) {
    return data
}

let logger,api

class DealWith {
    constructor( core ) {
        logger = core.settings.logger
        api = core.settings.api
        logger.debug('处理器实例化...')
    }
    youku ( remote, callback ) {
        callback()
        // let option = {
        //     url: api.youku.url + '?client_id=' + api.youku.key + "&video_url=" + encodeURIComponent(data)
        // }
        // request.get (option,(err,result) => {
        //     if(err){
        //         logger.error( 'occur error : ', err )
        //         return callback(err)
        //     }
        //     if(result.statusCode != 200 ){
        //         logger.error('优酷状态码错误',result.statusCode)
        //         logger.info(result)
        //         return callback(true)
        //     }
        //     try{
        //         result = JSON.parse(result.body)
        //     } catch (e){
        //         logger.error('优酷json数据解析失败')
        //         logger.info(result)
        //         return callback(e)
        //     }
        //     let user = result.user,
        //         res = {
        //             id: user.id,
        //             name: user.name,
        //             p: 1,
        //             encode_id: user.link.substring(user.link.lastIndexOf('/')+1),
        //         }
        //     callback(null,res)
        // })
    }
}
module.exports = DealWith