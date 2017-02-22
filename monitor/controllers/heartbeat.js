const Redis = require('ioredis')

const redis = new Redis(`redis://:C19prsPjHs52CHoA0vm@127.0.0.1:6379/3`,{
    reconnectOnError: function (err) {
        if (err.message.slice(0, 'READONLY'.length) === 'READONLY') {
            return true
        }
    }
})
exports.do = (io, socket) => {
    setInterval(() => {
        redis.llen('cache', (err, number) => {
            if(err){
                return
            }
            socket.emit('cache', {num: number})
        })
    }, 300000)
}