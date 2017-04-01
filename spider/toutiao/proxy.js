const request = require('request')

let logger,settings
class proxy{
    constructor(_core){
        this.core = _core
        settings = _core.settings
        logger = settings.logger
        logger.trace( 'Proxy module instantiation' )
    }
    need(times, callback) {
        if(times > 4){
            return callback('timeout!')
        }
        //logger.trace('Send a Require command')
        request(`http://${settings.proxy.host}:${settings.proxy.port}`,(err, res, body) => {
            if(err){
                logger.debug('err:',err)
                return setTimeout(() => {
                    return this.need(times + 1, callback)
                }, 3000)
            }
            let proxy
            try {
                proxy = JSON.parse(body)
            } catch (e) {
                logger.error('Decode response occur error!')
                return callback(e.message)
            }
            if(proxy.proxy){
                //logger.debug(proxy.proxy)
                return callback(null, proxy.proxy)
            }
            setTimeout(() => {
                logger.debug('setTImeout')
                return this.need(times + 1, callback)
            }, 3000)
        })
    }
    back(proxy, status, callback) {
        request.post(`http://${settings.proxy.host}:${settings.proxy.port}/?proxy=${proxy}&status=${status}`,(err, res, body) => {
            if(err){
                if(callback) {
                    return callback(res)
                }
            }
            if(callback) {
                return callback(res)
            }
        })
    }
}
module.exports = proxy