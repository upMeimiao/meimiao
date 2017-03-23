/**
 * Created by ifable on 2017/3/23.
 */
const moment = require('moment')
const async = require('async')
const request = require('request')
const spiderUtils = require('../../lib/spiderUtils')
let logger

class dealWith {
    constructor(spiderCore) {
        this.core = spiderCore
        this.settings = spiderCore.settings
        this.api = this.settings.spiderAPI.youtube
        logger = this.settings.logger
        logger.trace('DealWith instantiation ...')
    }
    tudo(task, callback) {
        task.total = 0
        this.channel(task, (err, result) => {
            if (err) {
                callback(err)
            } else {
                callback(null, result)
            }
        })
    }
    channel(task, callback) {
        const options = {
            method: 'GET',
            url: `${this.api.channel}${task.id}`,
            proxy: 'http://127.0.0.1:56428',
            qs: {
                ajax: '1',
                layout: 'mobile',
                tsp: '1',
                utcoffset: '480'
            },
            headers: {
                'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
            }
        }
        request(options, (error, response, body) => {
            if (error) {
                logger.error('occur error : ', error.message)
                return callback(error.message)
            }
            if (response.statusCode !== 200) {
                logger.error(`list error code: ${response.statusCode}`)
                return callback(JSON.stringify({statusCode: response.statusCode}))
            }
            try {
                body = JSON.parse(body.replace(')]}\'',''))
            } catch (e){
                return console.log(e.message)
            }
            console.log(body)
        });
    }
}
module.exports = dealWith