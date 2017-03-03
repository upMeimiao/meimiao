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
        this.baomihuaDeal = new (require('./baomihuaDealWith'))(this)
        this.ku6Deal = new (require('./ku6DealWith'))(this)
        this.btimeDeal = new (require('./btimeDealWith'))(this)
        this.weishiDeal = new (require('./weishiDealWith'))(this)
        this.xiaoyingDeal = new (require('./xiaoyingDealWith'))(this)
        this.budejieDeal = new (require('./budejieDealWith'))(this)
        this.neihanDeal = new (require('./neihanDealWith'))(this)
        this.yyDeal = new (require('./yyDealWith'))(this)
        this.tv56Deal = new (require('./tv56DealWith'))(this)
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
            },
            baomihua_rule = new schedule.RecurrenceRule(),
            baomihua_work = {
                "name":"baomihua","platform":13,"id":23603,"bname":"一风之音"
            },
            ku6_rule = new schedule.RecurrenceRule(),
            ku6_work = {
                "name":"ku6","platform":14,"id":19665704,"bname":"淘梦网"
            },
            btime_rule = new schedule.RecurrenceRule(),
            btime_work = {
                "name":"btime","platform":15,"id":84626,"bname":"陈翔六点半"
            },
            weishi_rule = new schedule.RecurrenceRule(),
            weishi_work = {
                "name":"weishi","platform":16,"id":31724433,"bname":"暴走漫画"
            },
            xiaoying_rule = new schedule.RecurrenceRule(),
            xiaoying_work = {
                "name":"xiaoying","platform":17,"id":"b35I4","bname":"徐老师来巡山㊣"
            },
            budejie_rule = new schedule.RecurrenceRule(),
            budejie_work = {
                "name":"budejie","platform":18,"id":15731223,"bname":"星座不求人"
            },
            neihan_rule = new schedule.RecurrenceRule(),
            neihan_work = {
                "name":"neihan","platform":19,"id":3243978216,"bname":"主播真会玩"
            },
            yy_rule = new schedule.RecurrenceRule(),
            yy_work = {
                "name":"yy","platform":20,"id":1493559120,"bname":"陈翔六点半"
            },
            tv56_rule = new schedule.RecurrenceRule(),
            tv56_work = {
                "name":"tv56","platform":21,"id":210741517,"bname":"Miss排位日记"
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
        baomihua_rule.second = [13]
        ku6_rule.second = [14]
        btime_rule.second = [15]
        weishi_rule.second = [16]
        xiaoying_rule.second = [17]
        budejie_rule.second = [18]
        neihan_rule.second = [19]
        yy_rule.second = [20]
        tv56_rule.second = [21]
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
        schedule.scheduleJob(baomihua_rule,() => {
            this.baomihuaDeal.baomihua(baomihua_work,(err,result) => {
                logger.debug(err,result)
            })
        })
        schedule.scheduleJob(ku6_rule,() => {
            this.ku6Deal.ku6(ku6_work,(err,result) => {
                logger.debug(err,result)
            })
        })
        schedule.scheduleJob(btime_rule,() => {
            this.btimeDeal.btime(btime_work,(err,result) => {
                logger.debug(err,result)
            })
        })
        schedule.scheduleJob(weishi_rule,() => {
            this.weishiDeal.weishi(weishi_work,(err,result) => {
                logger.debug(err,result)
            })
        })
        schedule.scheduleJob(xiaoying_rule,() => {
            this.xiaoyingDeal.xiaoying(xiaoying_work,(err,result) => {
                logger.debug(err,result)
            })
        })
        schedule.scheduleJob(budejie_rule,() => {
            this.budejieDeal.budejie(budejie_work,(err,result) => {
                logger.debug(err,result)
            })
        })
        schedule.scheduleJob(neihan_rule,() => {
            this.neihanDeal.neihan(neihan_work,(err,result) => {
                logger.debug(err,result)
            })
        })
        schedule.scheduleJob(yy_rule,() => {
            this.yyDeal.yy(yy_work,(err,result) => {
                logger.debug(err,result)
            })
        })
        schedule.scheduleJob(tv56_rule,() => {
            this.tv56Deal.tv56(tv56_work,(err,result) => {
                logger.debug(err,result)
            })
        })
        logger.trace('启动函数')
    }
}
module.exports = spiderCore