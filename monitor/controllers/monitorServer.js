const Redis = require('ioredis')
const schedule = require('node-schedule')
const monitorContronller = require('./monitorController')

const clint = monitorContronller.monitorClint

exports.start = () => {
    monitorContronller.getFailedTask()
}