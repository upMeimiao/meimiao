const async = require( 'async' )
const platformMap = require('./platform')
let logger,scheduler
class dealWith{
    constructor ( _scheduler ){
        scheduler = _scheduler
        logger = _scheduler.settings.logger
        logger.debug('任务处理模块 实例化...')
    }
    rawLoop ( raw ) {
        const data = raw.data,
            len = data ? data.length : 0
        let i = 0
        //logger.debug(raw)
        async.whilst(
            () => {
                return i < len
            },
            (cb) => {
                this.classify( data[i], () => {
                    i++
                    cb()
                })
            },
            () => {
                //logger.debug("开始等待下次执行时间")
            }
        )
    }
    classify ( _, callback ) {
        // const platform = platformMap.get(Number(_.p)),
        // baseInfo = {
        //     id: _.id,
        //     p: _.p,
        //     name: _.name,
        //     platform: platform,
        //     encodeId: _.encodeId ? _.encodeId : '',
        //     type: _.type ? _.type : ''
        // }
        const platform = platformMap.get(Number(_.platform)),
            baseInfo = {
            id: _.bid,
            p: _.platform,
            name: _.bname,
            platform: platform,
            encodeId: _.encodeId ? _.encodeId : '',
            type: _.type ? _.type : '',
            uid: ''
        }
        scheduler.emit( 'task_init', baseInfo)
        callback()
    }
    checkInit ( raw ) {
        const key = raw.p + ':' + raw.id
        scheduler.taskDB.exists( key ,( err, result )=>{
            if( err ){
                scheduler.emit( 'redis_error', {db: 'taskDB',action: 1})
                return
            }
            if( result === 0 ){
                scheduler.emit( 'task_init_set', raw)
                return
            }
            if( result === 1 ){
                scheduler.emit( 'task_check_kue', raw)
                return
            }
        })
    }
    setInit ( raw ){
        const key = raw.p + ':' + raw.id,
            time = new Date().getTime()
        scheduler.taskDB.hmset( key, 'id', raw.id, 'bname', raw.name, 'init', time, 'create', time, 'video_number', 0,
            ( err, result )=>{
                if( err ){
                    scheduler.emit( 'redis_error', {db: 'taskDB',action: 3})
                    return
                }
                raw.first = true
                scheduler.emit( 'task_create', raw )
            }
        )
    }
    setCreate ( raw ) {
        const key = raw.p + ':' + raw.id,
            time = new Date().getTime()
        scheduler.taskDB.hset( key, 'create', time, ( err, result )=>{
            if( err ){
                scheduler.emit( 'redis_error', {db: 'taskDB',action: 3})
                return
            }
            raw.first = false
            scheduler.emit( 'task_create', raw )
        })
    }
}
module.exports = dealWith