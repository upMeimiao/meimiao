const HTTP = require('http')
const URL = require('url')
const path = require("path")
const fs = require("fs")

let logger
class web {
    constructor ( settings ) {
        this.settings = settings
        this.port = settings.listen.port
        this.ip = settings.listen.ip
        logger = settings.logger
        logger.debug('WEB服务实例化')
    }
    start () {
        const server = HTTP.createServer((req, res) => {
            res.writeHead(200, {
                'Content-Type': 'text/html;charset=utf-8'
            })
            if(req.url =='/favicon.ico')return
            let realPath = path.join('input','/input.html')
            fs.readFile(realPath, "binary", (err, file) => {
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
