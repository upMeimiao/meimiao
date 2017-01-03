const schedule = require('node-schedule')
const async = require('async')
const request = require('request')
const crypto = require('crypto')
const platformMap = require('./platform')
const emailServer = require('./emailServer')
const monitorContronller = require('./monitorController')
const logger = monitorContronller.logger
const client = monitorContronller.monitorClint

exports.start = () => {
    const rule = new schedule.RecurrenceRule()
    rule.minute = [0,30]
    const j = schedule.scheduleJob(rule, () =>{
        _failedTaskAlarm()
    })
}
const _failedTaskAlarm = () => {
    let sign = true, cursor = 0, failedArr = []
    async.whilst(
        () => {
            return sign
        },
        (cb) => {
            client.sscan('failed', cursor, 'count', 100, (err, result) => {
                if(err){
                    logger.debug(err)
                    return cb()
                }
                if(Number(result[0]) === 0){
                    sign = false
                } else {
                    cursor = result[0]
                }
                for (let [index, elem] of result[1].entries()) {
                    failedArr.push(JSON.parse(elem))
                }
                cb()
            })
        },
        (err, result) => {
            _getFailedInfo(failedArr,(err, raw) => {
                _failedPretreatment(raw)
            })
        }
    )
}
const _failedPretreatment = (info) => {
    if(info.length === 0){
        return
    }
    let emailContent = ''
    for (let [index, elem] of info.entries()) {
        if(elem && elem.p != 14 && elem.p != 23){
            emailContent += `<p>平台：${platformMap.get(Number(elem.p))}，bid：${elem.bid}，bname：${elem.bname}</p>`
        }
    }
    if(emailContent != ''){
        emailServer.sendAlarm('任务失败',emailContent)
    }
}
const _getFailedInfo = (info, callback) => {
    let hash,key,data
    const getRedisData = (item, callback) => {
        hash = crypto.createHash('md5')
        hash.update(item.p + ":" + item.bid)
        key = "failed:" +hash.digest('hex')
        client.hmget(key, 'times', 'lastTime', (err,result)=>{
            if(err) return callback(null, null)
            if(!result[0]){
                client.srem('failed', JSON.stringify(item))
                return callback(null, null)
            }
            if(result[1] < new Date().getTime() - 1800000) return callback(null, null)
            data = {
                p: item.p,
                bid: item.bid,
                bname: item.bname,
                times: result[0]
            }
            callback(null,data)
        })
    }
    async.map(info, getRedisData, (err, results) => {
        callback(null, results)
    })
}