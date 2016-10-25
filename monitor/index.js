const HTTP = require('http')
const URL = require('url')
const path = require("path")
const fs = require("fs")
const mime = require("mime")
const request = require( 'request' )
const async = require( 'async' )
const myRedis = require( '../lib/myredis.js' )

let logger
class web {
    constructor ( settings ) {
        this.settings = settings
        this.port = 3001
        this.ip = '10.251.55.50'
        this.redis = settings.redis
        logger = settings.logger
        logger.debug('WEB服务实例化')
    }
    assembly () {
        myRedis.createClient(this.redis.host,
            this.redis.port,
            this.redis.taskDB,
            this.redis.auth,
            ( err, cli ) => {
                if(err){
                    logger.error( "连接redis数据库出错。错误信息：", err )
                    logger.error( "出现错误，程序终止。" )
                    process.exit()
                    return
                }
                this.taskDB = cli
                logger.debug( "任务信息数据库连接建立...成功" )
                this.createServer()
            }
        )
    }
    start () {
        logger.trace('启动服务')
        this.assembly()
    }
    createServer () {
        const server = HTTP.createServer((req, res) => {
            let pathname = URL.parse(req.url).pathname
            if(req.url === '/'){
                pathname = '/app/index'
            }
            let pathArr = pathname.split('/'),
                router
            switch (pathArr[1]){
                case 'app':
                    router = pathArr[2] + '.html'
                    this.appHandle(router,req,res)
                    break
                case 'api':
                    router = pathname.substring(4)
                    this.apiHandle(router,req,res)
                    break
                case 'lib':
                    this.appHandle(pathname,req,res)
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
    appHandle ( router, req, res ){
        const realPath = path.join('monitor',router)
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
    apiHandle ( router, req, res ){
        const routerArr = router.split('/'),
            method = routerArr[1]
        switch (method){
            case 'get':
                this.apiHandleGet( router, req, res )
                break
            default:
                res.setHeader('Content-Type',`text/html;charset=utf-8`)
                res.writeHead(400)
                res.end()
                break
        }
    }
    apiHandleGet ( router, req, res ) {
        const routerArr = router.split('/'),
            action = routerArr[2]
        switch (action){
            case 'data':
                this.getData( req, res )
                break
            default:
                res.setHeader('Content-Type',`text/html;charset=utf-8`)
                res.writeHead(400)
                res.end()
                break
        }
    }
    getData( req, res ) {
        async.waterfall([
            (callback) => {
                this.getServerData( (err,result) => {
                    if( err ){
                        return callback(err)
                    }
                    callback(null, result)
                })
            },
            (list, callback) => {
                this.getInfo( list, (err, info)=>{
                    if(err){
                        return callback(err)
                    }
                    callback(null, info)
                })
            }
        ], function (err, result) {
            if(err){
                res.setHeader('Content-Type',`text/html;charset=utf-8`)
                res.writeHead(502)
                res.end()
                return
            }
            res.setHeader('Content-Type',`application/json;charset=utf-8`)
            res.writeHead(200)
            res.end(result)
        })
    }
    getServerData(callback){
        request.get('http://qiaosuan-intra.caihongip.com/index.php/spider/videoO/getTaskStatus/rxdebug/2015', (err,res,body) => {
            if(err){
                logger.error( 'occur error : ', err )
                return callback(err)
            }
            if(res.statusCode !== 200){
                return callback(true)
            }
            let result
            try {
                result = JSON.parse(body)
            } catch (e){
                logger.error('json数据解析失败')
                logger.error(body)
                return callback(e)
            }
            if(result.errno !== 0){
                return callback(true)
            }
            if(result.data.length === 0){
                const data = {
                    infos: 0,
                    count: []
                }
                res.setHeader('Content-Type',`application/json;charset=utf-8`)
                res.writeHead(200)
                res.end(JSON.stringify(data))
                return
            }
            callback(null,result.data)
        })
    }
    getInfo ( list, callback ){
        const self = this
        const getRedisData = function ( item, callback ) {
            const key = item.platform + ":" + item.bid
            let info
            self.taskDB.hmget( key, 'init', 'create', 'video_number', 'update', (err,result)=>{
                if(err) return
                info = {
                    p: item.platform,
                    bid: item.bid,
                    bname: item.bname,
                    post_t: item.post_t,
                    update_t: item.update_t,
                    is_post: item.is_post,
                    init: result[0],
                    create: result[1],
                    videoNumber: result[2],
                    update: result[3] || null
                }
                callback(null,info)
            })
        }
        async.map(list, getRedisData, (err, results) => {
            const data = {
                infos: results,
                count: list.length
            }
            return callback(null,JSON.stringify(data))
        })
    }
}
module.exports = web