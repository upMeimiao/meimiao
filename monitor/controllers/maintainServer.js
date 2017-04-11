const schedule = require('node-schedule')
const moment = require('moment')
const kue = require('kue')
const Redis = require('ioredis')
const request = require('request')

const redis = new Redis(`redis://:C19prsPjHs52CHoA0vm@r-m5e43f2043319e64.redis.rds.aliyuncs.com:6379/1`,{
    reconnectOnError: function (err) {
        if (err.message.slice(0, 'READONLY'.length) === 'READONLY') {
            return true
        }
    }
})

kue.createQueue({
    redis: {
        port: '6379',
        host: 'r-m5e43f2043319e64.redis.rds.aliyuncs.com',
        auth: 'C19prsPjHs52CHoA0vm',
        db: 2
    }
})
exports.start = () => {
    const rule = new schedule.RecurrenceRule()
    rule.hour = 8
    rule.minute = 30
    schedule.scheduleJob(rule, () =>{
        failedJobRemove(0)
    })
    setInterval(()=>{
        monitorBanned()
    }, 1200000)
}
const failedJobRemove = (num) => {
    if(num > 2){
        return
    }
    kue.Job.rangeByState('failed', 0, 1000, 'asc', (err, jobs) => {
        if(err){
            num++
            return setTimeout(()=>{
                failedJobRemove(num)
            }, 300000)
        }
        jobs.forEach((job) => {
            if(moment().valueOf() - job.created_at > 86400000){
                job.remove()
            }
        })
    })
}

const monitorBanned = () => {
    redis.zrangebyscore('channel:banned', '-1', '(0', (err, result) => {
        if(err || !result || result.length === 0)return
        let key = [],content=''
        for (let [index, elem] of result.entries()) {
            content += `<p>平台：${elem.split('_')[0]}，ID：${elem.split('_')[1]}</p>`
            key[index] = ['zadd', 'channel:banned', 1, elem]
        }
        redis.pipeline(key).exec()
        request({
            method : 'POST',
            url: 'http://localhost:3001/api/alarm',
            form : {
                subject: 'IP账号疑似被封禁(或找不到)',
                content: content
            }
        })
    })
}