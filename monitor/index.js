const HTTP = require('http')
const URL = require('url')
const path = require("path")
const fs = require("fs")
const mime = require("mime")
const kue = require( 'kue' )

let logger
class web {
    constructor ( settings ) {
        this.settings = settings
        this.port = 3000
        this.ip = '127.0.0.1'
        this.redis = settings.redis
        logger = settings.logger
        this.queue = kue.createQueue({
            redis: {
                port: this.redis.port,
                host: this.redis.host,
                auth: this.redis.auth,
                db: this.redis.jobDB
            }
        })
        logger.debug('WEB服务实例化')
    }
    start () {
        const server = HTTP.createServer((req, res) => {
            let pathname = URL.parse(req.url).pathname
            if(req.url === '/'){
                pathname = '/kue/index'
            }
            let pathArr = pathname.split('/'),
                realPath
            switch (pathArr[1]){
                case 'kue':
                    realPath = pathArr[2] + '.html'
                    this.kueHandle(realPath,req,res)
                    break
                case 'api':
                    realPath = pathname.substring(4)
                    this.apiHandle(realPath,req,res)
                    break
                case 'src':
                    this.kueHandle(pathname,req,res)
                    break
                default:
                    res.writeHead(404,{
                        'Content-Type': 'text/html;charset=utf-8'
                    })
                    res.end('找不到相关文件')
                    return
            }
        })
        server.listen(this.port, this.ip, () => {
            logger.debug(`Server running at ${this.ip}:${this.port}`)
        })
    }
    kueHandle ( realPath, req, res ){
        realPath = path.join('kueMonitor',realPath)
        fs.readFile(realPath, "binary", (err, file) => {
            if(err){
                res.writeHead(404)
                res.end('找不到相关文件')
                return
            }
            res.setHeader('Content-Type',`${mime.lookup(realPath)};charset=utf-8`)
            res.writeHead(200)
            res.write(file, "binary")
            res.end()
        })
    }
    apiHandle ( realPath, req, res ){
        res.setHeader('Content-Type',`application/json;charset=utf-8`)
        res.writeHead(200)
        res.end()
    }
}
module.exports = web