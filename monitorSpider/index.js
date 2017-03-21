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
        this.acfunDeal = new (require('./acfunDealWith'))(this)
        this.weiboDeal = new (require('./weiboDealWith'))(this)
        this.ifengDeal = new (require('./ifengDealWith'))(this)
        this.wangyiDeal = new (require('./wangyiDealWith'))(this)  
        this.ucttDeal = new (require('./ucttDealWith'))(this)
        this.mgtvDeal = new (require('./mgtvDealWith'))(this)
        this.baijiaDeal = new (require('./baijiaDealWith'))(this)
        this.qzoneDeal = new (require('./qzoneDealWith'))(this)
        this.cctvDeal = new (require('./cctvDealWith'))(this)
        this.pptvDeal = new (require('./pptvDealWith'))(this)
        this.xinlanDeal = new (require('./xinlanDealWith'))(this)
        this.v1Deal = new (require('./v1DealWith'))(this)
        this.fengxingDeal = new (require('./fengxingDealWith'))(this)
        this.huashuDeal = new (require('./huashuDealWith'))(this)
        this.baofengDeal = new (require('./baofengDealWith'))(this)
        this.baiduvideoDeal = new (require('./baiduvideoDealWith'))(this)        
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
            this.setTask(()=>{
                logger.debug( '创建任务' )
            })
        })
    }
    start () {
        logger.trace('启动函数')
        this.getH(()=>{
            this.assembly()
            setInterval(()=>{
                this.getH()
            },86400000)
        })
    }
    getH (callback) {
        this.xiaoyingDeal.getH( ( err, result ) => {
            if(err){
                return
            }
            this.h = result
            if(callback){
                callback()
            }
        })
    }
    setYoukuTask(){
        let youku_work = {
                "name":"youku","platform":1,"id":854459409,"bname":"一色神技能","encodeId":"UMzQxNzgzNzYzNg=="
            }
        this.youkuDeal.youku(youku_work,(err,result) => {
            this.setYoukuTask()
        })
    }
    setIqiyiTask(){
        let iqiyi_work = {
                "name":"iqiyi","platform":2,"id":1036522467,"bname":"笑实验阿拉苏"
            }
        this.iqiyiDeal.iqiyi(iqiyi_work,(err,result) => {
            this.setIqiyiTask()
        })
    }
    setLeTask(){
        let le_work = {
                "name":"le","platform":3,"id":115666268,"bname":"女神TV"
            }
        this.leDeal.le(le_work,(err,result) => {
            this.setLeTask()
        })
    }
    setTencentTask(){
        let tencent_work = {
                "name":"tencent","platform":4,"id":"3549c076ea202664a0b6c87bb849e22c","bname":"papi酱"
            }
        this.tencentDeal.tencent(tencent_work,(err,result) => {
            this.setTencentTask()
        })
    }
    setMeipaiTask(){
        let meipai_work = {
                "name":"meipai","platform":5,"id":1000001181,"bname":"暴走漫画"
            }
        this.meipaiDeal.meipai(meipai_work,(err,result) => {
            this.setMeipaiTask()
        })
    }
    setToutiaoTask(){
        let toutiao_work = {
                "name":"toutiao","platform":6,"id":3164006864,"bname":"V电影"
            }
        this.toutiaoDeal.toutiao(toutiao_work,(err,result) => {
            this.setToutiaoTask()
        })
    }
    setMiaopaiTask(){
        let miaopai_work = {
                "name":"miaopai","platform":7,"id":"-fbM2XIO6WEsMCR-","bname":"DS女老诗"
            }
        this.miaopaiDeal.miaopai(miaopai_work,(err,result) => {
            this.setMiaopaiTask()
        })
    }
    setBiliTask(){
        let bili_work = {
                "name":"bili","platform":8,"id":11058749,"bname":"一风之音"
            }
        this.biliDeal.bili(bili_work,(err,result) => {
            this.setBiliTask()
        })
    }
    setSouhuTask(){
        let souhu_work = {
                "name":"souhu","platform":9,"id":12303675,"bname":"起小点"
            }
        this.souhuDeal.souhu(souhu_work,(err,result) => {
            this.setSouhuTask()
        })
    }
    setKuaibaoTask(){
        let kuaibao_work = {
                "name":"kuaibao","platform":10,"id":5005354,"bname":"微在涨姿势"
            }
        this.kuaibaoDeal.kuaibao(kuaibao_work,(err,result) => {
            this.setKuaibaoTask()
        })
    }
    setYidianTask(){
        let yidian_work = {
                "name":"yidian","platform":11,"id":"m110950","bname":"一色神技能"
            }
        this.yidianDeal.yidian(yidian_work,(err,result) => {
            this.setYidianTask()
        })
    }
    setTudouTask(){
        let tudou_work = {
                "name":"tudou","platform":12,"id":109218404,"bname":"辛巴达解说"
            }
        this.tudouDeal.tudou(tudou_work,(err,result) => {
            this.setTudouTask()
        })
    }
    setBaomihuaTask(){
        let baomihua_work = {
                "name":"baomihua","platform":13,"id":23603,"bname":"一风之音"
            }
        this.baomihuaDeal.baomihua(baomihua_work,(err,result) => {
            this.setBaomihuaTask()
        })
    }
    setKu6Task(){
        let ku6_work = {
                "name":"ku6","platform":14,"id":19665704,"bname":"淘梦网"
            }
        this.ku6Deal.ku6(ku6_work,(err,result) => {
            this.setKu6Task()
        })
    }
    setBtimeTask(){
        let btime_work = {
                "name":"btime","platform":15,"id":84626,"bname":"陈翔六点半"
            }
        this.btimeDeal.btime(btime_work,(err,result) => {
            this.setBtimeTask()
        })
    }
    setWeishiTask(){
        let weishi_work = {
                "name":"weishi","platform":16,"id":31724433,"bname":"暴走漫画"
            }
        this.weishiDeal.weishi(weishi_work,(err,result) => {
            this.setWeishiTask()
        })
    }
    setXiaoyingTask(){
        let xiaoying_work = {
                "name":"xiaoying","platform":17,"id":"b35I4","bname":"徐老师来巡山㊣"
            }
        this.xiaoyingDeal.xiaoying(xiaoying_work,(err,result) => {
            this.setXiaoyingTask()
        })
    }
    setBudejieTask(){
        let budejie_work = {
                "name":"budejie","platform":18,"id":15731223,"bname":"星座不求人"
            }
        this.budejieDeal.budejie(budejie_work,(err,result) => {
            this.setBudejieTask()
        })
    }
    setNeihanTask(){
        let neihan_work = {
                "name":"neihan","platform":19,"id":3243978216,"bname":"主播真会玩"
            }
        this.neihanDeal.neihan(neihan_work,(err,result) => {
            this.setNeihanTask()
        })
    }
    setYyTask(){
        let yy_work = {
                "name":"yy","platform":20,"id":1493559120,"bname":"陈翔六点半"
            }
        this.yyDeal.yy(yy_work,(err,result) => {
            this.setYyTask()
        })
    }
    setTv56Task(){
        let tv56_work = {
                "name":"tv56","platform":21,"id":210741517,"bname":"Miss排位日记"
            }
        this.tv56Deal.tv56(tv56_work,(err,result) => {
            this.setTv56Task()
        })
    }
    setAcfunTask(){
        let acfun_work = {
                "name":"acfun","platform":22,"id":1395294,"bname":"淘梦网"
            }
        this.acfunDeal.acfun(acfun_work,(err,result) => {
            this.setAcfunTask()
        })
    }
    setWeiboTask(){
        let weibo_work = {
                "name":"weibo","platform":23,"id":1850235592,"bname":"糗事百科"
            }
        this.weiboDeal.weibo(weibo_work,(err,result) => {
            this.setWeiboTask()
        })
    }
    setIfengTask(){
        let ifeng_work = {
                "name":"ifeng","platform":24,"id":5451,"bname":"女神TV"
            }
        this.ifengDeal.ifeng(ifeng_work,(err,result) => {
            this.setIfengTask()
        })
    }
    setWangyiTask(){
        let wangyi_work = {
                "name":"wangyi","platform":25,"id":"T1463289680374","bname":"女神TV"
            }
        this.wangyiDeal.wangyi(wangyi_work,(err,result) => {
            this.setWangyiTask()
        })
    }
    setUcttTask(){
        let uctt_work = {
                "name":"uctt","platform":26,"id":"65a41150ce7e47e888f8953c2ec2d82b","bname":"一色神技能"
            }
        this.ucttDeal.uctt(uctt_work,(err,result) => {
            this.setUcttTask()
        })
    }
    setMgtvTask(){
        let mgtv_work = {
                "name":"mgtv","platform":27,"id":308703,"bname":"芒果捞星闻"
            }
        this.mgtvDeal.mgtv(mgtv_work,(err,result) => {
            this.setMgtvTask()
        })
    }
    setBaijiaTask(){
        let baijia_work = {
                "name":"baijia","platform":28,"id":1537728865301176,"bname":"一风之音"
            }
        this.baijiaDeal.baijia(baijia_work,(err,result) => {
            this.setBaijiaTask()
        })
    }
    setQzoneTask(){
        let qzone_work = {
                "name":"qzone","platform":29,"id":1023862575,"bname":"畅所欲言"
            }
        this.qzoneDeal.qzone(qzone_work,(err,result) => {
            this.setQzoneTask()
        })
    }
    setCctvTask(){
        let cctv_work = {
                "name":"cctv","platform":30,"id":41691090,"bname":"飞碟说官方频道"
            }
        this.cctvDeal.cctv(cctv_work,(err,result) => {
            this.setCctvTask()
        })
    }
    setPptvTask(){
        let pptv_work = {
                "name":"pptv","platform":31,"id":8057347,"bname":"飞碟说第二季","encodeId":75395
            }
        this.pptvDeal.pptv(pptv_work,(err,result) => {
            this.setPptvTask()
        })
    }
    setXinlanTask(){
        let xinlan_work = {
                "name":"xinlan","platform":32,"id":1061,"bname":"二更","encodeId":16
            }
        this.xinlanDeal.xinlan(xinlan_work,(err,result) => {
            this.setXinlanTask()
        })
    }
    setV1Task(){
        let v1_work = {
                "name":"v1","platform":33,"id":6046584,"bname":"2762414443@qq.com","encodeId":2666584
            }
        this.v1Deal.v1(v1_work,(err,result) => {
            this.setV1Task()
        })
    }
    setFengxingTask(){
        let fengxing_work = {
                "name":"fengxing","platform":34,"id":608,"bname":"飞碟说"
            }
        this.fengxingDeal.fengxing(fengxing_work,(err,result) => {
            this.setFengxingTask()
        })
    }
    setHuashuTask(){
        let huashu_work = {
                "name":"huashu","platform":35,"id":40350,"bname":"飞碟说"
            }
        this.huashuDeal.huashu(huashu_work,(err,result) => {
            this.setHuashuTask()
        })
    }
    setBaofengTask(){
        let baofeng_work = {
                "name":"baofeng","platform":36,"id":805373,"bname":"二更视频"
            }
        this.baofengDeal.baofeng(baofeng_work,(err,result) => {
            this.setBaofengTask()
        })
    }
    setBaiduvideoTask(){
        let baiduvideo_work = {
                "name":"baiduvideo","platform":37,"id":18680,"bname":"陈翔六点半"
            }
        this.baiduvideoDeal.baiduvideo(baiduvideo_work,(err,result) => {
            this.setBaiduvideoTask()
        })
    }
    setTask (callback) {
        async.parallel([
            (callback) => {
                this.setYoukuTask()
                callback()
            },
            (callback) => {
                this.setIqiyiTask()
                callback()
            },
            (callback) => {
                this.setLeTask()
                callback()
            },
            (callback) => {
                this.setTencentTask()
                callback()
            },
            (callback) => {
                this.setMeipaiTask()
                callback()
            },
            (callback) => {
                this.setToutiaoTask()
                callback()
            },
            (callback) => {
                this.setMiaopaiTask()
                callback()
            },
            (callback) => {
                this.setBiliTask()
                callback()
            },
            (callback) => {
                this.setSouhuTask()
                callback()
            },
            (callback) => {
                this.setKuaibaoTask()
                callback()
            },
            (callback) => {
                this.setYidianTask()
                callback()
            },
            (callback) => {
                this.setTudouTask()
                callback()
            },
            (callback) => {
                this.setBaomihuaTask()
                callback()
            },
            (callback) => {
                this.setKu6Task()
                callback()
            },
            (callback) => {
                this.setBtimeTask()
                callback()
            },
            (callback) => {
                this.setWeishiTask()
                callback()
            },
            (callback) => {
                this.setXiaoyingTask()
                callback()
            },
            (callback) => {
                this.setBudejieTask()
                callback()
            },
            (callback) => {
                this.setNeihanTask()
                callback()
            },
            (callback) => {
                this.setYyTask()
                callback()
            },
            (callback) => {
                this.setTv56Task()
                callback()
            },
            (callback) => {
                this.setAcfunTask()
                callback()
            },
            (callback) => {
                this.setWeiboTask()
                callback()
            },
            (callback) => {
                this.setIfengTask()
                callback()
            },
            (callback) => {
                this.setWangyiTask()
                callback()
            },
            (callback) => {
                this.setUcttTask()
                callback()
            },
            (callback) => {
                this.setMgtvTask()
                callback()
            },
            (callback) => {
                this.setBaijiaTask()
                callback()
            },
            (callback) => {
                this.setQzoneTask()
                callback()
            },
            (callback) => {
                this.setCctvTask()
                callback()
            },
            (callback) => {
                this.setPptvTask()
                callback()
            },
            (callback) => {
                this.setXinlanTask()
                callback()
            },
            (callback) => {
                this.setV1Task()
                callback()
            },
            (callback) => {
                this.setFengxingTask()
                callback()
            },
            (callback) => {
                this.setHuashuTask()
                callback()
            },
            (callback) => {
                this.setBaofengTask()
                callback()
            },
            (callback) => {
                this.setBaiduvideoTask()
                callback()
            }
        ],(err, result) => {
            if(err){
                logger.debug(err)
                return
            }
            logger.debug(null,result)
        })
        logger.trace('启动函数')
    }
}
module.exports = spiderCore