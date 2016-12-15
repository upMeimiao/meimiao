const axon = require( 'axon' )
const msgpack = require( 'msgpack5' )()

let logger,settings
class proxy{
    constructor(_core){
        this.core = _core
        settings = _core.settings
        logger = settings.logger
        this.host = settings.proxy.host
        this.port = settings.proxy.port
        this.sock = axon.socket('req')
        logger.trace( 'Proxy module instantiation' )
    }
    ready(callback) {
        this.sock.connect(this.port, this.host)
        logger.trace('Start send test')
        this.sock.send('test', 'test', (res) => {
            if(res) {
                logger.info('Proxy server return back :', res)
                logger.trace('Connection is fine')
                return callback(null, true)
            }
        } )
    }
    need(times, callback) {
        if(times > 5){
            return callback('timeout!')
        }
        logger.trace('Send a Require command')
        this.sock.send('borrow', msgpack.encode('borrow'), (res) => {
            if(res) {
                let proxy
                try {
                    proxy = msgpack.decode(res)
                } catch (e) {
                    logger.error('Decode response occur error!')
                    return callback(e.message)
                }
                return callback(null, proxy)
            }
            setTimeout(() => {
                return this.need(times + 1, callback)
            }, 10000)
        })
    }
    back(proxy, status, callback) {
        const back = {
            proxy: proxy,
            status: status
        }
        this.sock.send('back', msgpack.encode(back), (res) => {
            if(callback) {
                return callback(res)
            }
        })
    }
}
module.exports = proxy