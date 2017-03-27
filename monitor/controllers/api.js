const Redis = require('ioredis')
const async = require('async')
const request = require('request')

const redis = new Redis(`redis://:C19prsPjHs52CHoA0vm@r-m5e43f2043319e64.redis.rds.aliyuncs.com:6379/1`,{
    reconnectOnError: function (err) {
        if (err.message.slice(0, 'READONLY'.length) === 'READONLY') {
            return true
        }
    }
})

const _getServerData = (callback) => {
    request.get('http://qiaosuan-intra.meimiaoip.com/index.php/spider/videoO/getTaskStatus/rxdebug/2015', (err,res,body) => {
        if(err){
            return callback(err)
        }
        if(res.statusCode !== 200){
            return callback(res.statusCode)
        }
        let result
        try {
            result = JSON.parse(body)
        } catch (e){
            return callback(e)
        }
        if(result.errno !== 0){
            return callback(result.errno)
        }
        callback(null,result.data)
    })
}
const _getInfo = (list, callback) => {
    const getRedisData = ( item, callback ) => {
        const key = item.platform + ":" + item.bid
        let info
        redis.hmget( key, 'init', 'create', 'video_number', 'update', (err,result)=>{
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
                videoNumber: Number(result[2]).toString() !== 'NaN' ? Number(result[2]) : result[2],
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
        return callback(null,data)
    })
}
exports.findData = (req, res) => {
    async.waterfall([
        (callback) => {
            _getServerData( (err,result) => {
                if( err ){
                    return callback(err)
                }
                callback(null, result)
            })
        },
        (list, callback) => {
            _getInfo( list, (err, info)=>{
                if(err){
                    return callback(err)
                }
                callback(null, info)
            })
        }
    ], function (err, result) {
        if(err){
            return res.status(502).send()
        }
        res.json(result)
    })
}