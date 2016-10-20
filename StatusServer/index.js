const async = require( 'async' )
const HTTP = require('http')
const request = require( 'request' )
const myRedis = require( '../lib/myredis.js' )

let logger
class server {
    constructor(settings) {
        this.settings = settings
        this.redis = settings.redis
        this.port = settings.listen.port
        this.ip = settings.listen.ip
        logger = this.settings.logger
        logger.trace('调度器初始化完成')
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
        logger.trace('启动函数')
        this.assembly()
    }
    createServer () {
        const server = HTTP.createServer((req, res) => {
            res.writeHead(200, {
                'Access-Control-Allow-Origin':'*',
                'Content-Type': 'application/json;charset=utf-8'
            })
            //logger.debug(`url: ${req.url}`)
            switch (req.url){
                case '/get/data':
                    this.deal((err,result)=>{
                        if(err){
                            res.writeHead(500)
                            return
                        }
                        res.end(result)
                    })
                    break
                case '/get/server':
                    this.getServerData((err,result)=>{
                        if(err){
                            res.writeHead(500)
                            return
                        }
                        res.end(result)
                    })
                    break
                default:
                    res.writeHead(404)
                    res.end()
                    break
            }
        })
        server.listen(this.port, this.ip, () => {
            logger.debug(`Server running at ${this.ip}:${this.port}`)
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
            // try {
            //     result = JSON.parse(body)
            // } catch (e){
            //     logger.error('json数据解析失败')
            //     logger.info(body)
            //     return callback(e)
            // }
            callback(null,body)
        })
    }
    deal(callback){
        async.waterfall([
            (callback) => {
                this.taskDB.dbsize( (err,result) => {
                    if( err ){
                        return callback(err)
                    }
                    callback(null, result)
                })
            },
            (length, callback) => {
                this.taskDB.scan (0,'COUNT',length, (err,result) => {
                    if( err ){
                        return callback(err)
                    }
                    callback(null, result[1])
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
                return callback(err)
            }
            return callback(null,result)
        })
    }
    getInfo( list, callback ){
        let index = 0,
            infos = [],
            info
        async.whilst(
            () => {
                return index < list.length
            },
            (cb) => {
                this.taskDB.hmget( list[index], 'id', 'init', 'create', 'video_number', 'update','bname', (err,result)=>{
                    if(err) return
                    info = {
                        p: list[index].substring(0,list[index].indexOf(':')),
                        bid: result[0],
                        init: result[1],
                        create: result[2],
                        videoNumber: result[3],
                        update: result[4] || null,
                        bname: result[5] || null
                    }
                    infos.push(info)
                    index++
                    cb()
                })
            },
            (err, result) => {
                if(err){
                    return callback(err)
                }
                const data = {
                    infos: infos,
                    count: infos.length
                }
                return callback(null,JSON.stringify(data))
            }
        )
    }
}
module.exports = server
