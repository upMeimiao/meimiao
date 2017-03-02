/**
 * Spider Core
 * Created by junhao on 16/6/22.
 */
const kue = require( 'kue' )
const request = require('request')
const myRedis = require( '../lib/myredis.js' )
const async = require( 'async' )
const domain = require('domain')
const schedule = require('node-schedule')

let logger,settings
class spiderCore {
    constructor (_settings) {
        settings = _settings
        this.settings = settings
        this.redis = settings.redis
        // this.dealWith = new( require('./dealWith'))(this)
        this.youkuDeal = new (require('./youkuDealWith'))(this)
        this.iqiyiDeal = new (require('./iqiyiDealWith'))(this)
        this.leDeal = new (require('./leDealWith'))(this)
        this.tencentDeal = new (require('./tencentDealWith'))(this)
        this.meipaiDeal = new (require('./meipaiDealWith'))(this)
        this.toutiaoDeal = new (require('./toutiaoDealWith'))(this)
        this.miaopaiDeal = new (require('./miaopaiDealWith'))(this)
        this.biliDeal = new (require('./biliDealWith'))(this)
        this.souhuDeal = new (require('./souhuDealWith'))(this)
        this.kuaibaoDeal = new (require('./kuaibaoDealWith'))(this)
        this.yidianDeal = new (require('./yidianDealWith'))(this)
        this.tudouDeal = new (require('./tudouDealWith'))(this)
        this.proxy = new (require('./proxy'))(this)
        logger = settings.logger
        logger.trace('spiderCore instantiation ...')
    }
    assembly ( ) {
        //并行，最后传值按task顺序,连接数据库
        async.parallel([
            (callback) => {
                myRedis.createClient(this.redis.host,
                    this.redis.port,
                    this.redis.MSDB,
                    this.redis.auth,
                    ( err, cli ) => {
                        if(err){
                            return callback(err)
                        }
                        this.MSDB = cli
                        //用于存接口返回的正确数据
                        //下一次调用接口后，返回值与已经存储的返回值作比较，正常则存储新的，不正常则报错误
                        //
                        logger.debug( "接口监控数据库连接建立...成功" )
                        callback()
                    }
                )
            }
        ],(err, results) => {
            if ( err ) {
                logger.error( "连接redis数据库出错。错误信息：", err )
                logger.error( "出现错误，程序终止。" )
                process.exit()
                return
            }
            logger.debug( '创建数据库连接完毕' )
            //this.setYoukuTask(1)
            this.setTask()
        })
    }
    start () {
        logger.trace('启动函数')
        this.assembly()
        
    }
    setTask () {
        let youku_rule = new schedule.RecurrenceRule(),
            youku_work = {
                "name":"youku","platform":1,"id":854459409,"bname":"一色神技能","encodeId":"UMzQxNzgzNzYzNg=="
            },
            iqiyi_rule = new schedule.RecurrenceRule(),
            iqiyi_work = {
                "name":"iqiyi","platform":2,"id":1036522467,"bname":"笑实验阿拉苏"
            },
            le_rule = new schedule.RecurrenceRule(),
            le_work = {
                "name":"le","platform":3,"id":115666268,"bname":"女神TV"
            },
            tencent_rule = new schedule.RecurrenceRule(),
            tencent_work = {
                "name":"tencent","platform":4,"id":"59d7fb0813b0bdf6d5b0b89a1ce27006","bname":"飞碟说"
            },
            meipai_rule = new schedule.RecurrenceRule(),
            meipai_work = {
                "name":"meipai","platform":5,"id":1000001181,"bname":"暴走漫画"
            },
            toutiao_rule = new schedule.RecurrenceRule(),
            toutiao_work = {
                "name":"toutiao","platform":6,"id":3164006864,"bname":"V电影"
            },
            miaopai_rule = new schedule.RecurrenceRule(),
            miaopai_work = {
                "name":"miaopai","platform":7,"id":"-fbM2XIO6WEsMCR-","bname":"DS女老诗"
            },
            bili_rule = new schedule.RecurrenceRule(),
            bili_work = {
                "name":"bili","platform":8,"id":11058749,"bname":"一风之音"
            },
            souhu_rule = new schedule.RecurrenceRule(),
            souhu_work = {
                "name":"souhu","platform":9,"id":12303675,"bname":"起小点"
            },
            kuaibao_rule = new schedule.RecurrenceRule(),
            kuaibao_work = {
                "name":"kuaibao","platform":10,"id":5005354,"bname":"微在涨姿势"
            },
            yidian_rule = new schedule.RecurrenceRule(),
            yidian_work = {
                "name":"yidian","platform":11,"id":"m110950","bname":"一色神技能"
            },
            tudou_rule = new schedule.RecurrenceRule(),
            tudou_work = {
                "name":"tudou","platform":12,"id":109218404,"bname":"辛巴达解说"
            }

        youku_rule.second = [1]
        iqiyi_rule.second = [2]
        le_rule.second = [3]
        tencent_rule.second = [4]
        meipai_rule.second = [5]
        toutiao_rule.second = [6]
        miaopai_rule.second = [7]
        bili_rule.second = [8]
        souhu_rule.second = [9]
        kuaibao_rule.second = [10]
        yidian_rule.second = [11]
        tudou_rule.second = [12]
        schedule.scheduleJob(youku_rule,() => {
            this.youkuDeal.youku(youku_work,(err,result) => {
                logger.debug(err,result)
            })
        })
        schedule.scheduleJob(iqiyi_rule,() => {
            this.iqiyiDeal.iqiyi(iqiyi_work,(err,result) => {
                logger.debug(err,result)
            })
        })
        schedule.scheduleJob(le_rule,() => {
            this.leDeal.le(le_work,(err,result) => {
                logger.debug(err,result)
            })
        })
        schedule.scheduleJob(tencent_rule,() => {
            this.tencentDeal.tencent(tencent_work,(err,result) => {
                logger.debug(err,result)
            })
        })
        schedule.scheduleJob(meipai_rule,() => {
            this.meipaiDeal.meipai(meipai_work,(err,result) => {
                logger.debug(err,result)
            })
        })
        schedule.scheduleJob(toutiao_rule,() => {
            this.toutiaoDeal.toutiao(toutiao_work,(err,result) => {
                logger.debug(err,result)
            })
        })
        schedule.scheduleJob(miaopai_rule,() => {
            this.miaopaiDeal.miaopai(miaopai_work,(err,result) => {
                logger.debug(err,result)
            })
        })
        schedule.scheduleJob(bili_rule,() => {
            this.biliDeal.bili(bili_work,(err,result) => {
                logger.debug(err,result)
            })
        })
        schedule.scheduleJob(souhu_rule,() => {
            this.souhuDeal.souhu(souhu_work,(err,result) => {
                logger.debug(err,result)
            })
        })
        schedule.scheduleJob(kuaibao_rule,() => {
            this.kuaibaoDeal.kuaibao(kuaibao_work,(err,result) => {
                logger.debug(err,result)
            })
        })
        schedule.scheduleJob(yidian_rule,() => {
            this.yidianDeal.yidian(yidian_work,(err,result) => {
                logger.debug(err,result)
            })
        })
        schedule.scheduleJob(tudou_rule,() => {
            this.tudouDeal.tudou(tudou_work,(err,result) => {
                logger.debug(err,result)
            })
        })
        logger.trace('启动函数')
    }
}
module.exports = spiderCore