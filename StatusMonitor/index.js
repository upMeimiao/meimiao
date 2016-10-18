const HTTP = require('http')
const URL = require('url')
const path = require("path")
const fs = require("fs")
const mime = require("mime")

let logger
class web {
    constructor ( settings ) {
        this.settings = settings
        this.port = 3002
        this.ip = '121.42.164.116'
        logger = settings.logger
        logger.debug('WEB服务实例化')
    }
    start () {
        const server = HTTP.createServer((req, res) => {
            let pathname = URL.parse(req.url).pathname
            if(req.url === '/'){
                pathname = '/index.html'
            }
            let realPath = path.join('StatusMonitor',pathname)
            fs.readFile(realPath, "binary", (err, file) => {
                if(err){
                    res.writeHead(404)
                    res.end('找不到相关文件')
                    return
                }
                res.setHeader('Content-Type',`${mime.lookup(pathname)};charset=utf-8`)
                res.writeHead(200)
                res.write(file, "binary")
                res.end()
            })
        })
        server.listen(this.port, this.ip, () => {
            logger.debug(`Server running at ${this.ip}:${this.port}`)
        })
    }
}
module.exports = web
