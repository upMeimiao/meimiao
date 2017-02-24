const schedule = require('node-schedule')
const emailServerLz = require('./emailServerLz')
const Redis = require('ioredis')
const moment = require('moment')
const logging = require( 'log4js' )
const logger = logging.getLogger('接口监控')

const mSpiderClient = new Redis(`redis://:C19prsPjHs52CHoA0vm@r-m5e43f2043319e64.redis.rds.aliyuncs.com:6379/7`,{
    reconnectOnError: function (err) {
        if (err.message.slice(0, 'READONLY'.length) === 'READONLY') {
            return true
        }
    }
})

exports.start = () => {
    const errReadRule = new schedule.RecurrenceRule()
    errReadRule.second = [1]
    schedule.scheduleJob(errReadRule, () =>{
        _getKeys()
    })
}
const judgeIsErr = (result,n) => {
    let results = JSON.parse(result[n]),
        platform = results["platform"],
        urlDesc = results["urlDesc"],
        fstTime = results["firstTime"],
        lastTime = results["lastTime"],
        succTimes = (+result[4]),
        errTimes = results["times"]
    // 无成功记录
    // platform url urlDesc bid errDesc  firstTime times lastTime
    if(!result[4] 
        && (Number(lastTime) - Number(fstTime) >= 60*60*1000)){
        emailServerLz.sendAlarm(`接口监控：${platform}平台${urlDesc}接口一小时内无成功记录`,`${platform}平台${urlDesc}接口一小时内无成功记录`)
    }
    // 有成功记录，失败次数与成功次数作比较
    if(result[4]){
        let resultZero = JSON.parse(result[0])
        // 如果有responseErr
        if(resultZero){
            //错误描述含有TIMEOUT字段，超时率过80%，发报错邮件
            if(errTimes/(errTimes + succTimes) > 0.8
            && (Number(lastTime) - Number(fstTime) >= 60*60*1000)){
                let resultZeroFstTime = new Date(resultZero.firstTime),
                    resultZeroLastTime = new Date(resultZero.lastTime),
                    resultZeroErrDesc = JSON.stringify(resultZero.errDesc),
                    errDescript = (results["errDesc"] 
                            && results["errDesc"]["code"] 
                            && results["errDesc"]["code"] == "ESOCKETTIMEDOUT" || "ETIMEDOUT") 
                            ? "请求超时" : "接口报错"
                    emailContentsZ =  `<p>平台：${resultZero.platform}</p>
                                      <p>接口：${resultZero.url}</p>
                                      <p>接口功能描述：${resultZero.urlDesc}</p>
                                      <p>账号id：${resultZero.bid}</p>
                                      <p>错误描述：${resultZeroErrDesc}</p>
                                      <p>首次发生时间：${resultZeroFstTime}</p>
                                      <p>最后一次发生时间：${resultZeroLastTime}</p>
                                      <p>错误发生次数：${resultZero.times}</p>
                                      <p>请求成功次数：${succTimes}</p>`
                emailServerLz.sendAlarm(`接口监控：${resultZero.platform}平台${resultZero.urlDesc}接口${errDescript}`,emailContentsZ)
            }
        } else {
            // 如果不是responseErr,一小时内错误率达到30%则邮件报错
            if(errTimes/(errTimes + succTimes) > 0.3 
                && (Number(lastTime) - Number(fstTime) >= 60*60*1000)){
                let resultN = JSON.parse(result[n]),
                resultNFstTime = new Date(resultN.firstTime),
                resultNLastTime = new Date(resultN.lastTime),
                resultNLasErrDesc = JSON.stringify(resultN.errDesc),
                emailContentsN =  `<p>平台：${resultN.platform}</p>
                                    <p>接口：${resultN.url}</p>
                                    <p>接口功能描述：${resultN.urlDesc}</p>
                                    <p>账号id：${resultN.bid}</p>
                                    <p>错误描述：${resultNLasErrDesc}</p>
                                    <p>首次发生时间：${resultNFstTime}</p>
                                    <p>最后一次发生时间：${resultNLastTime}</p>
                                    <p>错误发生次数：${resultN.times}</p>
                                    <p>请求成功次数：${succTimes}</p>`,
                errDescMail
                logger.debug("n====================",n)
                if(result[1]){
                    errDescMail = "返回值错误"
                }else if(2){
                    errDescMail = "返回值解析错误"
                }else if(3){
                    errDescMail = "dom错误"
                }
                emailServerLz.sendAlarm(`接口监控：${resultN.platform}平台${resultN.urlDesc}接口${resultNLasErrDesc}`,emailContentsN)
            }
            
        }
    }
} 
//循环读取redis数据内容，找出报错记录，发邮件
const _getKeys = () => {
    let keys,i,j,keyName,
        platformArr = ["youku","iqiyi","le","tencent","meipai","toutiao","miaopai","bili","souhu","kuaibao"
                    /*,"yidian","tudou","baomihua","ku6","btime","weishi","xiaoying","budejie","neihan","yy"
                    ,"tv56","acfun","weibo","ifeng","wangyi","uctt","mgtv","baijia","qzone","cctv"
                    ,"pptv","xinlan","v1","fengxing","huashu","baofeng","baiduvideo"*/],
        urlDescArr = ["Expr","list","videos","info","total","play","total","user","_user","Desc","view","comment","commentNum","vidTag","digg","field","userId"]
    for(i = 0; i < platformArr.length; i++){
        for(j = 0; j < urlDescArr.length; j++){
            keys = `apiMonitor:${platformArr[i]}:${urlDescArr[j]}`
            mSpiderClient.hmget(keys,"responseErr","resultErr","doWithResErr","domBasedErr","succTimes",(err,result) => {
                if(err){
                    logger.debug("读取redis发生错误")
                    return
                }
                if(!result){
                    logger.debug("redis中没有当前搜索的key")
                    return
                }
                // 有result
                logger.debug("result==================",result)
                if(result[0]){
                    judgeIsErr(result,0)
                }
                if(result[1]){   
                    judgeIsErr(result,1)
                }
                if(result[2]){
                    judgeIsErr(result,2)
                }
                if(result[3]){
                    judgeIsErr(result,3)
                }
            })
        }
    }
}