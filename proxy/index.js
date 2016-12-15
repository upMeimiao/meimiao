const async = require('async')
const axon = require('axon')
const msgpack = require( 'msgpack5' )()

let logger, settings

class proxy{
    constructor(_settings) {
        settings = _settings
        this.settings = _settings
        logger = settings.logger
        this.getProxy = new (require( './getProxy.js' ))( this )
        this.redis = new (require( './redis.js' ))( this )
        this.enborrow = true
        this.sock = axon.socket('rep')
        logger.debug( '代理池 实例化...' )
    }
    start() {
        async.parallel([
            (cb) => {
                this.getProxy.ready((err, result) => {
                    if(err) {
                        logger.error('获取代理服务器出现错误:',err)
                        return cb(err)
                    }
                    return cb(err, result)
                })
            },
            (cb) => {
                this.redis.ready((err, result) => {
                    if (err) {
                        logger.error('redis 连接出现错误')
                        return cb(err)
                    }
                    return cb(err, result)
                })
            }
        ],(err, result) => {
            if(err){
                logger.error(err)
                logger.error('程序终止')
                process.exit()
            }
            this.redis.saveProxy(result[0], (err, result) => {
                if(err) {
                    logger.error('保存代理信息出现错误:', err)
                }
                logger.trace('Ready Go!')
                this.server()
            })
        })
    }
    server() {
        const host = settings.proxy.host,
            port = settings.proxy.port
        this.sock.bind(port, host, () => {
            logger.trace('Listen on', host, ':', port)
        })
        this.sock.on('message', (type, msg, reply) => {
            if(type === 'test'){
                return reply('ok')
            }
            try {
                msg = msgpack.decode(msg)
            } catch (e) {
                logger.error('Msgpack Encode Occur Error!' , e.message)
                return reply(msgpack.encode( e.message ))
            }
            logger.debug('type:', type, 'msg:', msg)
            this.handle(type, msg, (err, val) => {
                if(err){
                    return reply(null)
                }
                reply(val)
            })
        })
    }
    handle(type, data, callback) {
        switch (type) {
            case 'borrow':
                return this.borrow((err, val) => {
                    return callback(null, val)
                })
            case 'back':
                return this.back(data, (err, result) => {
                    return callback(err, result)
                })
            default:
                return callback(null)
        }
    }
    borrow(callback) {
        if(!this.enborrow){
            this.refill(() => {
                this.enborrow = true
            })
            return callback(null, null)
        }
        this.redis.borrow((err, retry, proxy) => {
            if(err) {
                logger.error(err)
                return callback(err)
            }
            if(proxy) {
                return callback(null, proxy)
            } else {
                this.enborrow = false
                this.refill(() => {
                    this.enborrow = true
                })
                return callback( null , null )
            }
        })
    }
    back(data, callback) {
        this.redis.back(data, (err) => {
            if(err) {
                logger.error(err)
                return callback(err)
            }
            return callback(null,'ok')
        })
    }
    refill(callback) {
        this.getProxy.ready((err, proxy) => {
            if(err) {
                logger.error('Refill proxy occur err:', err)
                return callback(err)
            }
            this.redis.saveProxy(proxy,() => {
                return callback(null, proxy)
            })
        } )
    }
}
module.exports = proxy