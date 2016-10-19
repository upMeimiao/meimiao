const kue = require('kue')
const express = require('express')
const ui = require('kue-ui')
const cors = require('cors')
const basicAuth = require('basic-auth-connect')
const app = express()

let logger
class kueMonitor {
    constructor ( settings ){
        this.settings = settings
        this.redis = settings.redis
        logger = this.settings.logger
        kue.createQueue({
            redis: {
                port: this.redis.port,
                host: this.redis.host,
                auth: this.redis.auth,
                db: this.redis.jobDB
            }
        })
    }
    start () {
        ui.setup({
            apiURL: '/api',
            baseURL: '/kue',
            updateInterval: 5000
        })
        app.use(basicAuth('verona', '2319446'))
        app.use(cors())
        app.use('/api', kue.app)
        app.use('/kue', ui.app)
        app.listen(3000)
        logger.debug('UI started on port 3000')
    }
}


module.exports = kueMonitor