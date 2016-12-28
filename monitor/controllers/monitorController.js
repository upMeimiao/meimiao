const Redis = require('ioredis')
const schedule = require('node-schedule')
const async = require('async')
const request = require('request')
const logging = require( 'log4js' )
const logger = logging.getLogger()

const monitorClint = new Redis(`redis://:@127.0.0.1:6379/5`,{
    reconnectOnError: function (err) {
        if (err.message.slice(0, 'READONLY'.length) === 'READONLY') {
            return true
        }
    }
})
const getFailedTask = () => {
    const options = {
        method: 'GET',
        url: 'http://kue.iapi.site/api/jobs/failed/0...500/',
        headers: {
            authorization: 'Basic dmVyb25hOjIzMTk0NDY='
        }
    }
    request(options, (error, response, body) => {
        if(error){
            logger.error('get failed task error:',error.message)
            return
        }
        try {
            body = JSON.parse(body)
        } catch (e) {
            logger.error('failed task json parse error:',error.message)
            return
        }
       logger.debug(body)
    })
}
exports.getFailedTask = getFailedTask
exports.monitorClint = monitorClint
