const Redis = require('ioredis')

const redis = new Redis(`redis://:C19prsPjHs52CHoA0vm@r-m5e43f2043319e64.redis.rds.aliyuncs.com:6379/15`,{
    reconnectOnError: function (err) {
        if (err.message.slice(0, 'READONLY'.length) === 'READONLY') {
            return true
        }
    }
})

exports.getAids = (req, res) => {
    redis.smembers('article', (err, result) => {
        if(err){
            return res.status(502).json({status: false})
        }
        res.status(200).json({status:true, total: result.length, result})
    })
}