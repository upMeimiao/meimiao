const kue = require('kue')
const request = require('request')
const HTTP = require('http')
const util = require('util')
const os = require('os')
const events = require('events')
const myRedis = require('../lib/myredis.js')
const schedule = require('node-schedule')

let logger
class scheduler {
    constructor ( settings ) {
        events.EventEmitter.call( this )
        this.settings = settings
        this.redis = settings.redis
        logger = this.settings.logger
        this.dealWith = new (require('./dealWith'))(this)
        this.queue = kue.createQueue({
            redis: {
                port: this.redis.port,
                host: this.redis.host,
                auth: this.redis.auth,
                db: this.redis.jobDB
            }
        })
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
                    this.emit( 'redis_error', {db:'taskDB',action: 0})
                    process.exit()
                    return
                }
                this.taskDB = cli
                logger.debug( "任务信息数据库连接建立...成功" )
                //this.emit('task_loaded',test_data)
                const rule = new schedule.RecurrenceRule();
                const osName = os.hostname()
                // if (osName === 'iFabledeMacBook-Pro.local') {
                if (osName === 'iZt4n0b9sw5qoog46blmorZ') {
                    this.createServer()
                } else {
                    switch (osName){
                        case 'servant_3':
                            rule.second = [0,10,20,30,40,50]
                            // rule.minute = [0,2,4,6,8,10,11,12,14,16,18,20,22,24,25,26,28,30,31,32,34,36,38,40,42,44,46,48,50,52,54,56,58]
                            break
                        case 'iZ28ilm78mlZ':
                            // rule.minute = [1,3,5,7,9,11,13,15,16,17,19,20,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53,55,57,59]
                            rule.second = [5,15,25,35,45,55]
                            break
                        default:
                            rule.second = [0,5,10,15,20,25,30,35,40,45,50,55]
                            break
                    }
                    const j = schedule.scheduleJob(rule, () =>{
                        this.getTask()
                    })
                }
            }
        )
    }
    start () {
        logger.trace('启动函数')
        this.on( 'task_loaded', ( raw ) => {
            this.dealWith.rawLoop( raw )
        })
        this.on( 'task_init', ( raw ) => {
            this.dealWith.checkInit( raw )
        })
        this.on( 'task_init_set', ( raw ) => {
            this.dealWith.setInit( raw )
        })
        this.on( 'task_check_kue', ( raw ) =>{
            this.checkKue( raw )
        })
        this.on( 'task_set_create', ( raw ) => {
            this.dealWith.setCreate( raw )
        })
        this.on( 'task_create', ( raw ) => {
            this.createQueue( raw )
        })
        this.on('origin_youtube', (raw) => {
            this.origin_youtube(raw)
        })
        this.on( 'redis_error', ( raw ) => {
            /**
             * todo send email
             */
            logger.error(raw)
        })
        this.assembly()
    }
    createServer() {
        const server = HTTP.createServer((req, res) => {
            switch (req.method){
                case 'POST':
                    this.handle(req, res);
                    break;
                default:
                    res.setHeader('Content-Type',`text/html;charset=utf-8`);
                    res.writeHead(400);
                    res.end();
                    break
            }
        });
        server.listen(2888, () => {
            logger.debug(`Server running at 2888 port`);
        })
    }
    handle(req, res) {
        let postData = "",body
        req.addListener("data", (data) => {
            postData += data
        })
        req.addListener("end", () => {
            body = JSON.parse(postData)
            this.emit('task_check_kue', body.data)
        })
        res.setHeader('Content-Type',`application/json;charset=utf-8`)
        res.writeHead(200)
        res.end(JSON.stringify({status: 'ok'}))
    }
    getTask () {
        request.get(this.settings.url, (err,res,body) => {
            if(err){
                logger.error( 'occur error : ', err )
                return
            }
            if(res.statusCode !== 200){
                return
            }
            try {
                body = JSON.parse(body)
            } catch (e){
                logger.error('json数据解析失败')
                logger.info(body)
                return
            }
            logger.debug(body)
            this.emit('task_loaded',body)
        })
    }
    origin_youtube(raw) {
        const options = {
            method : 'POST',
            url: 'http://47.88.137.212:2888',
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                data: raw
            })
        }
        request(options,(err, res, body)=>{
            console.log(body)
        })
    }
    createQueue (raw) {
        if(Number(raw.p) === 39 && !raw.origin){
            raw.origin = true
            this.emit('origin_youtube', raw)
            return
        }
        if((raw.p == 12 && (raw.id == '366570608' || raw.id == '102599789' || raw.id == '113077877' || raw.id == '120663556' || raw.id == '113077233' || raw.id == '113077988' || raw.id == '120663663' || raw.id == '120663623' || raw.id == '113077745' || raw.id == '113077370' || raw.id == '366571453' || raw.id == '120663699'))|| (raw.p == 6 && raw.id == '6116731501') || (raw.p == 2 && raw.id == '1045961206') || (raw.p == 1 && (raw.id == '85879440' || raw.id == '1051381206' || raw.id == '1125009518'))){
            return
        }
        let job = this.queue.create( raw.platform , {
            id: raw.id,
            p: raw.p,
            name: raw.name,
            encodeId: raw.encodeId,
            type: raw.type
            // user_id: raw.uid
        }).priority('critical').backoff({delay: 150 * 1000, type:'fixed'}).removeOnComplete(true)
        // if(raw.p == 6 || ((raw.p == 2 && raw.id == '1060140460') || (raw.p == 2 && raw.id == '1045961206'))){
        //     job.ttl(10800000)
        // }
        if(raw.p != 6 && !(raw.p == 2 && raw.id == '1060140460') && !(raw.p == 2 && raw.id == '1045961206')){
            job.attempts(5)
        }
        // if(!job.data.user_id){
        //     delete job.data.user_id
        // }
        if(job.data.type === 0){
            delete job.data.type
        }
        if(job.data.encodeId === ''){
            delete job.data.encodeId
        }
        job.save( (err) => {
            if(err){
                logger.error( 'Create queue occur error' )
                logger.error( 'error :' , err )
                this.emit( 'redis_error', {db:'jobDB',action: 6})
                return
            }
            this.taskDB.hset( `${raw.p}:${raw.id}`, 'kue_id', job.id)
            logger.debug("任务: " + job.type + "_" + job.data.id + " 创建完成")
            job = null
            raw = null
        })
    }
    // getUserId ( raw, callback ){
    //     const key = raw.p + ':' + raw.id
    //     this.taskDB.hget( key, 'uid',(err,result)=>{
    //         if( err ){
    //             scheduler.emit( 'redis_error', {db: 'taskDB',action: 2})
    //             return callback(err,raw)
    //         }
    //         raw.uid = result
    //         callback(null,raw)
    //     })
    // }
    checkKue (raw) {
        if((Number(raw.p) === 39 && !raw.origin) || (Number(raw.p) === 39) && raw.first){
            return this.emit('task_set_create',raw)
        }
        const key = raw.p + ':' + raw.id
        this.taskDB.hget(key, 'kue_id', (err, result)=>{
            if (err) {
                scheduler.emit('redis_error', {db: 'taskDB',action: 2})
                return
            }
            const url = `http://${this.settings.kue.ip}:3000/api/job/${result}`
            //const url = `http://127.0.0.1:3000/api/job/${result}`
            request.get( url, {'auth': {'user': 'verona','pass': '2319446'}}, ( err, res, body) => {
                if(err){
                    logger.error( 'occur error : ', err )
                    return
                }
                if(res.statusCode !== 200){
                    return
                }
                try {
                    body = JSON.parse(body)
                } catch (e){
                    logger.error('json数据解析失败')
                    logger.error(body)
                    return
                }
                if( body.error ){
                    return this.emit('task_set_create',raw)
                }
                const time = new Date().getTime()
                if( (body.state === 'active' || body.state === 'delayed') && time - body.updated_at > 3600000){
                    return this.emit('task_set_create',raw)
                }
                if( body.state === 'failed' ){
                    return this.emit('task_set_create',raw)
                }
                return
            })
        })
    }
}
util.inherits( scheduler, events.EventEmitter )
module.exports = scheduler