const request = require( 'request' )

let logger,settings
class getProxy{
    constructor(proxy) {
        settings = proxy.settings
        logger = settings.logger
        logger.debug( '获取代理信息模块实例化...' )
    }
    ready(callback) {
        this.get( (err, raw) => {
            if(err){
                return callback(err)
            }
            return callback(null, raw)
        })
    }
    get(callback) {
        const proxy = []
        request(settings.proxy.newApi, (err, res, body) => {
            if(err){
                logger.error('Get proxy occur error')
                return callback(err)
            }
            try{
                body = JSON.parse(body)
            } catch (e) {
                logger.error('parse proxy-json  error')
                return callback(e)
            }
            if(body.error){
                return callback(body.error)
            }
            // body.forEach((item) => {
            //     proxy.push(item.host + ':' + item.port)
            //     // proxy.push(item.host + ':' + item.port)
            // })
            return callback(null, body.data.proxy_list)
        })
    }
}
module.exports = getProxy