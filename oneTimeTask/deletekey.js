const Redis = require('ioredis')
const async = require('async')

const redis = new Redis(`redis://:C19prsPjHs52CHoA0vm@r-m5e43f2043319e64.redis.rds.aliyuncs.com:6379/2`,{
    reconnectOnError: function (err) {
        if (err.message.slice(0, 'READONLY'.length) === 'READONLY') {
            return true
        }
    }
})
redis.keys('c:*',(err,result)=>{
    loop(result)
})
function loop(info) {
    let i = 0,len = info.length
    async.whilst(
        () => {
            return i < len
        },
        (cb) => {
            delkey(info[i],()=>{
                i++
                cb()
            })
        },
        ()=>{
            console.log('end')
            redis.quit()
        }
    )
}
function delkey(key, callback) {
    redis.del(key,()=>{
        callback()
    })
}