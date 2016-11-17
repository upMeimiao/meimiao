const kue = require( 'kue' )
const request = require( 'request' )
const util = require( 'util' )
const events = require( 'events' )
const myRedis = require( '../lib/myredis.js' )
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
                // const j = schedule.scheduleJob('* /6 * * * *', () =>{
                //     this.getTask()
                // })
                setInterval( () => {
                    this.getTask()
                }, 300000)
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
        this.on( 'redis_error', ( raw ) => {
            /**
             * todo send email
             */
            logger.error(raw)
        })
        this.assembly()
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
    createQueue ( raw ) {
        const job = this.queue.create( raw.platform , {
            id: raw.id,
            p: raw.p,
            name: raw.name,
            encodeId: raw.encodeId,
            type: raw.type
        }).priority('critical').attempts(5).backoff({delay: 60*1000, type:'fixed'}).removeOnComplete(true)
        // if(!raw.first){
        //     job.ttl(300000)
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
        })
    }
    checkKue ( raw ) {
        const key = raw.p + ':' + raw.id
        this.taskDB.hget( key, 'kue_id',(err,result)=>{
            if( err ){
                scheduler.emit( 'redis_error', {db: 'taskDB',action: 2})
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
                if( (body.state === 'active' || body.state === 'delayed') && time - body.created_at > 3600000){
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