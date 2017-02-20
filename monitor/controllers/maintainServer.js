const schedule = require('node-schedule')
const moment = require('moment')
const kue = require('kue')

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
}
const failedJobRemove = (num) => {
    if(num > 2){
        return
    }
    kue.Job.rangeByState('failed', 0, 1000, 'asc', (err, jobs) => {
        if(err){
            num++
            setTimeout(()=>{
                failedJobRemove(num)
            }, 300000)
            return
        }
        jobs.forEach((job) => {
            if(Number(job.data.p) < 28 && (moment().valueOf() - job.created_at > 86400000)){
                job.remove()
            }
        })
    })
}