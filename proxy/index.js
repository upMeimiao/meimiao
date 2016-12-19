const async = require('async')
const HTTP = require('http')
const URL = require('url')

let logger, settings

class proxy{
    constructor(_settings) {
        settings = _settings
        this.settings = _settings
        logger = settings.logger
        this.getProxy = new (require( './getProxy.js' ))( this )
        this.redis = new (require( './redis.js' ))( this )
        this.enborrow = true
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
        const server = HTTP.createServer((req, res) => {
            switch ( req.method ){
                case 'GET':
                    this.getHandle( req, res )
                    break
                case 'POST':
                    this.postHandle( req, res )
                    break
                default:
                    res.setHeader('Content-Type',`text/html;charset=utf-8`)
                    res.writeHead(400)
                    res.end()
                    break
            }
        })
        server.listen(port, host, () => {
            logger.debug(`Server running at ${host}:${port}`)
        })
    }
    getHandle(req, res){
        this.borrow((err, val) => {
            res.setHeader('Content-Type',`application/json;charset=utf-8`)
            res.writeHead(200)
            res.end(JSON.stringify({proxy:val}))
        })
    }
    postHandle(req, res){
        const proxy = URL.parse(req.url,true).query.proxy,
            status = URL.parse(req.url,true).query.status
        this.back({proxy:proxy,status:status}, (err, result) => {
            res.setHeader('Content-Type',`application/json;charset=utf-8`)
            res.writeHead(200)
            res.end(JSON.stringify({res:result}))
        })
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
                logger.error(err.message)
                return callback(err.message)
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