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
        this.liVideoDeal = new (require('./liVideoDealWith'))(this)         
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
            logger.debug("youku 又执行一次")
            this.setYoukuTask()
        })
    }
    setIqiyiTask(){
        let iqiyi_work = {
                "name":"iqiyi","platform":2,"id":1006283018,"bname":"百湖动漫"
            }
        this.iqiyiDeal.iqiyi(iqiyi_work,(err,result) => {
            logger.debug("iqiyi 又执行一次")
            this.setIqiyiTask()
        })
    }
    setLeTask(){
        let le_work = {
                "name":"le","platform":3,"id":102395765,"bname":"四叶草影视_"
            }
        this.leDeal.le(le_work,(err,result) => {
            logger.debug("le 又执行一次")
            this.setLeTask()
        })
    }
    setTencentTask(){
        let tencent_work = {
                "name":"tencent","platform":4,"id":"43320d9b51eb813ca7f358a3c1cdb434","bname":"半部喜剧工作室"
            }
        this.tencentDeal.tencent(tencent_work,(err,result) => {
            logger.debug("tencent 又执行一次")
            this.setTencentTask()
        })
    }
    setMeipaiTask(){
        let meipai_work = {
                "name":"meipai","platform":5,"id":1000001181,"bname":"暴走漫画"
            }
        this.meipaiDeal.meipai(meipai_work,(err,result) => {
            logger.debug("meipai 又执行一次")
            this.setMeipaiTask()
        })
    }
    setToutiaoTask(){
        let toutiao_work = {
            //id: '5567057918', user_id: '5567057918', p: '6', name: '看鉴', type: '0'
                "name":"toutiao","platform":6,"id":1558215549476865,"bname":"LOL大神第一视角", "user_id": 52915184920, type: "0"
            }
        this.toutiaoDeal.toutiao(toutiao_work,(err,result) => {
            logger.debug("toutiao 又执行一次")
            this.setToutiaoTask()
        })
    }
    setMiaopaiTask(){
        let miaopai_work = {
                "name":"miaopai","platform":7,"id":"12FegTgfcIlgp1yImocKww__","bname":"暴走汽车"
            }
        this.miaopaiDeal.miaopai(miaopai_work,(err,result) => {
            logger.debug("miaopai 又执行一次")
            this.setMiaopaiTask()
        })
    }
    setBiliTask(){
        let bili_work = {
                "name":"bili","platform":8,"id":10217261,"bname":"九筒空间站"
            }
        this.biliDeal.bili(bili_work,(err,result) => {
            logger.debug("bili 又执行一次")
            this.setBiliTask()
        })
    }
    setSouhuTask(){
        let souhu_work = {
                "name":"souhu","platform":9,"id":142228397,"bname":"暴走漫画官方"
            }
        this.souhuDeal.souhu(souhu_work,(err,result) => {
            logger.debug("souhu 又执行一次")
            this.setSouhuTask()
        })
    }
    setKuaibaoTask(){
        let kuaibao_work = {
                "name":"kuaibao","platform":10,"id":5008846,"bname":"四叶草影视"
            }
        this.kuaibaoDeal.kuaibao(kuaibao_work,(err,result) => {
            logger.debug("kuaibao 又执行一次")
            this.setKuaibaoTask()
        })
    }
    setYidianTask(){
        let yidian_work = {
                "name":"yidian","platform":11,"id":"m110950","bname":"一色神技能"
            }
        this.yidianDeal.yidian(yidian_work,(err,result) => {
            logger.debug("yidian 又执行一次")
            this.setYidianTask()
        })
    }
    setTudouTask(){
        let tudou_work = {
                "name":"tudou","platform":12,"id":100598752,"bname":"文曰小强"
            }
        this.tudouDeal.tudou(tudou_work,(err,result) => {
            logger.debug("tudou 又执行一次")
            this.setTudouTask()
        })
    }
    setBaomihuaTask(){
        let baomihua_work = {
                "name":"baomihua","platform":13,"id":26826,"bname":"寰球大百科"
            }
        this.baomihuaDeal.baomihua(baomihua_work,(err,result) => {
            logger.debug("baomihua 又执行一次")
            this.setBaomihuaTask()
        })
    }
    setKu6Task(){
        let ku6_work = {
                "name":"ku6","platform":14,"id":24858895,"bname":"百骗大扒秀"
            }
        this.ku6Deal.ku6(ku6_work,(err,result) => {
            logger.debug("ku6 又执行一次")
            this.setKu6Task()
        })
    }
    setBtimeTask(){
        let btime_work = {
                "name":"btime","platform":15,"id":84626,"bname":"陈翔六点半"
            }
        this.btimeDeal.btime(btime_work,(err,result) => {
            logger.debug("btime 又执行一次")
            this.setBtimeTask()
        })
    }
    setWeishiTask(){
        let weishi_work = {
                "name":"weishi","platform":16,"id":31724433,"bname":"暴走漫画"
            }
        this.weishiDeal.weishi(weishi_work,(err,result) => {
            logger.debug("weishi 又执行一次")
            this.setWeishiTask()
        })
    }
    setXiaoyingTask(){
        let xiaoying_work = {
                "name":"xiaoying","platform":17,"id":"b35I4","bname":"徐老师来巡山㊣"
            }
        this.xiaoyingDeal.xiaoying(xiaoying_work,(err,result) => {
            logger.debug("xiaoying 又执行一次")
            this.setXiaoyingTask()
        })
    }
    setBudejieTask(){
        let budejie_work = {
                "name":"budejie","platform":18,"id":15731223,"bname":"星座不求人"
            }
        this.budejieDeal.budejie(budejie_work,(err,result) => {
            logger.debug("budejie 又执行一次")
            this.setBudejieTask()
        })
    }
    setNeihanTask(){
        let neihan_work = {
                "name":"neihan","platform":19,"id":3243978216,"bname":"主播真会玩"
            }
        this.neihanDeal.neihan(neihan_work,(err,result) => {
            logger.debug("neihan 又执行一次")
            this.setNeihanTask()
        })
    }
    setYyTask(){
        let yy_work = {
                "name":"yy","platform":20,"id":1493559120,"bname":"陈翔六点半"
            }
        this.yyDeal.yy(yy_work,(err,result) => {
            logger.debug("yy 又执行一次")
            this.setYyTask()
        })
    }
    setTv56Task(){
        let tv56_work = {
                "name":"tv56","platform":21,"id":210741517,"bname":"Miss排位日记"
            }
        this.tv56Deal.tv56(tv56_work,(err,result) => {
            logger.debug("tv56 又执行一次")
            this.setTv56Task()
        })
    }
    setAcfunTask(){
        let acfun_work = {
                "name":"acfun","platform":22,"id":1395294,"bname":"淘梦网"
            }
        this.acfunDeal.acfun(acfun_work,(err,result) => {
            logger.debug("acfun 又执行一次")
            this.setAcfunTask()
        })
    }
    setWeiboTask(){
        let weibo_work = {
                "name":"weibo","platform":23,"id":1850235592,"bname":"糗事百科"
            }
        this.weiboDeal.weibo(weibo_work,(err,result) => {
            logger.debug("weibo 又执行一次")
            this.setWeiboTask()
        })
    }
    setIfengTask(){
        let ifeng_work = {
                "name":"ifeng","platform":24,"id":5451,"bname":"女神TV"
            }
        this.ifengDeal.ifeng(ifeng_work,(err,result) => {
            logger.debug("ifeng 又执行一次")
            this.setIfengTask()
        })
    }
    setWangyiTask(){
        let wangyi_work = {
                "name":"wangyi","platform":25,"id":"T1460515715642","bname":"星座不求人"
            }
        this.wangyiDeal.wangyi(wangyi_work,(err,result) => {
            logger.debug("wangyi 又执行一次")
            this.setWangyiTask()
        })
    }
    setUcttTask(){
        let uctt_work = {
                "name":"uctt","platform":26,"id":"58629bcbb00242cf979933540b8f14ff","bname":"九筒空间站"
            }
        this.ucttDeal.uctt(uctt_work,(err,result) => {
            logger.debug("uctt 又执行一次")
            this.setUcttTask()
        })
    }
    setMgtvTask(){
        let mgtv_work = {
                "name":"mgtv","platform":27,"id":308703,"bname":"芒果捞星闻"
            }
        this.mgtvDeal.mgtv(mgtv_work,(err,result) => {
            logger.debug("mgtv 又执行一次")
            this.setMgtvTask()
        })
    }
    setBaijiaTask(){
        let baijia_work = {
                "name":"baijia","platform":28,"id":1549140452549485,"bname":"太阳猫早餐"
            }
        this.baijiaDeal.baijia(baijia_work,(err,result) => {
            logger.debug("baijia 又执行一次")
            this.setBaijiaTask()
        })
    }
    setQzoneTask(){
        let qzone_work = {
                "name":"qzone","platform":29,"id":1417345227,"bname":"66车讯"
            }
        this.qzoneDeal.qzone(qzone_work,(err,result) => {
            logger.debug("qzone 又执行一次")
            this.setQzoneTask()
        })
    }
    setCctvTask(){
        let cctv_work = {
                "name":"cctv","platform":30,"id":19512760,"bname":"贝瓦网"
            }
        this.cctvDeal.cctv(cctv_work,(err,result) => {
            logger.debug("cctv 又执行一次")
            this.setCctvTask()
        })
    }
    setPptvTask(){
        let pptv_work = {
                "name":"pptv","platform":31,"id":8057347,"bname":"飞碟说第二季","encodeId":75395
            }
        this.pptvDeal.pptv(pptv_work,(err,result) => {
            logger.debug("pptv 又执行一次")
            this.setPptvTask()
        })
    }
    setXinlanTask(){
        let xinlan_work = {
                "name":"xinlan","platform":32,"id":1061,"bname":"二更","encodeId":16
            }
        this.xinlanDeal.xinlan(xinlan_work,(err,result) => {
            logger.debug("xinlan 又执行一次")
            this.setXinlanTask()
        })
    }
    setV1Task(){
        let v1_work = {
                "name":"v1","platform":33,"id":8495742,"bname":"qqfibl4jj8","encodeId":3001916
            }
        this.v1Deal.v1(v1_work,(err,result) => {
            logger.debug("v1 又执行一次")
            this.setV1Task()
        })
    }
    setFengxingTask(){
        let fengxing_work = {
                "name":"fengxing","platform":34,"id":117523,"bname":"贝瓦故事"
            }
        this.fengxingDeal.fengxing(fengxing_work,(err,result) => {
            logger.debug("fengxing 又执行一次")
            this.setFengxingTask()
        })
    }
    setHuashuTask(){
        let huashu_work = {
                "name":"huashu","platform":35,"id":63598,"bname":"人类实验室"
            }
        this.huashuDeal.huashu(huashu_work,(err,result) => {
            logger.debug("huashu 又执行一次")
            this.setHuashuTask()
        })
    }
    setBaofengTask(){
        let baofeng_work = {
                "name":"baofeng","platform":36,"id":814408,"bname":"小伶玩具双人游戏"
            }
        this.baofengDeal.baofeng(baofeng_work,(err,result) => {
            logger.debug("baofeng 又执行一次")
            this.setBaofengTask()
        })
    }
    setBaiduvideoTask(){
        let baiduvideo_work = {
                "name":"baiduvideo","platform":37,"id":18680,"bname":"陈翔六点半"
            }
        this.baiduvideoDeal.baiduvideo(baiduvideo_work,(err,result) => {
            logger.debug("baiduvideo 又执行一次")
            this.setBaiduvideoTask()
        })
    }
    setLiVideoTask(){
        let liVideo_work = {
                "name":"liVideo","platform":38,"id":134,"bname":"二更"
            }
        this.liVideoDeal.liVideo(liVideo_work,(err,result) => {
            logger.debug("liVideo 又执行一次")
            this.setLiVideoTask()
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
            }
            ,
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
            },
            (callback) => {
                this.setLiVideoTask()
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