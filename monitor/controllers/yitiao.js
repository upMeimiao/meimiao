const Redis = require('ioredis')

const redis = new Redis(`redis://:C19prsPjHs52CHoA0vm@r-m5e43f2043319e64.redis.rds.aliyuncs.com:6379/12`,{
    reconnectOnError: function (err) {
        if (err.message.slice(0, 'READONLY'.length) === 'READONLY') {
            return true
        }
    }
})

exports.getMedia = (req, res) => {
    let key = '375520641_' + req.query.hours
    redis.smembers(key, (err, result) => {
        if(err){
            return res.status(502).json({status: false})
        }
        let list = []
        for (let [index, elem] of result.entries()) {
            list.push(JSON.parse(elem))
        }
        res.status(200).json({status:true, total: list.length, list})
    })
}