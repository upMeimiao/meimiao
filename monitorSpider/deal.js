/**
 * Spider Core
 * Created by junhao on 16/6/22.
 */
const kue = require( 'kue' )
const request = require('request')
const myRedis = require( '../lib/myredis.js' )
const async = require( 'async' )
const domain = require('domain')
var schedule = require('node-schedule');

let logger,settings
class deal {
    constructor (_settings) {
        settings = _settings
        this.settings = settings
        this.redis = settings.redis
        this.youkuDeal = new (require('./youkuDealWith'))(this)
        this.iqiyiDeal = new (require('./iqiyiDealWith'))(this)
        logger = settings.settings.logger
        logger.trace('spiderCore instantiation ...')
    }
    start () {
        logger.trace('启动函数')
        async.parallel(
            {
                youku:() => {
                    this.setTask(1,(err)=>{
                        
                    })
                },
                aiqiyi:() => {
                    this.setTask(2,(err)=>{
                        
                    })
                }
            },
            ( err, result ) => {
                
            }
        )
    }
    setTask (platform) {
     	const rule = new schedule.RecurrenceRule();
     	switch(platform) {
     		case 1:
     			rule.second = [0,10,20,30,40,50]
     			break
            case 2:
                rule.second = [5,15,25,35,45,55]
                break
     		default:
     			rule.second = [0,5,10,15,20,25,30,35,40,45,50]
     	}
    	const YOUKU = schedule.scheduleJob(rule, () =>{
            this.youku()
        })
        const IQIYI = schedule.scheduleJob(rule, () =>{
            this.iqiyi()
        })
    }
    youku() {
        let work = {
            "name":"youku","platform":1,"bid":854459409,"bname":"一色神技能","encodeId":"UMzQxNzgzNzYzNg=="
        }
        this.youkuDeal.youku(work,() => {

        })
    }
    iqiyi() {
        let work = {
            
        }
        this.iqiyiDeal.iqiyi(work,() => {

        })
    }
}
module.exports = deal