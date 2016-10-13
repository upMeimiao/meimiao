const logging = require('./lib/logger.js')
//arguments parse
const userArgv = require('optimist')
    .usage('Usage: $0 -i [instance name] -a [crawl|test|config|proxy|schedule]  -p [num] -l[url] -h')
    .options('i', {
        'alias' : 'instance',
        'default' : 'scheduler',
        'describe' : 'Specify a instance',
        'demand' : true
    })
    .options('a', {
        'alias' : 'action',
        'default' : 'scheduler',
        'describe' : 'Specify a action[crawl|test|config|proxy|schedule]',
        'demand' : true
    })
    .options('p', {
        'alias' : 'port',
        'default' : 2016,
        'describe' : 'Specify a service port, for config service and proxy router'
    })
    .options('h', {
        'alias' : 'help',
        'describe' : 'Help infomation'
    })
const options = userArgv.argv
if(options['h']){
    userArgv.showHelp()
    process.exit()
}
const settings = require('./instance/'+options['i']+'/'+'settings.json')
settings['instance'] = options['i']
//log level
let log_level = 'TRACE'
if(settings['log_level'])log_level = settings['log_level']
const scheduler = () => {
    let logger = logging.getLogger('调度中心',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let scheduler = new (require('./scheduler'))(settings)
    scheduler.start()
}
const servant = () => {
    let logger = logging.getLogger('平台',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let scheduler = new (require('./servant'))(settings)
    scheduler.start()
}
const server = () => {
    let logger = logging.getLogger('数据中心',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./sendServer'))(settings)
    spider.start()
}
const statusServer = () =>{
    let logger = logging.getLogger('数据中心',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./StatusServer'))(settings)
    spider.start()
}
const tencent = () => {
    let logger = logging.getLogger('腾讯视频',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./spider/tencent'))(settings)
    spider.start()
}
const kuaibao = () => {
    let logger = logging.getLogger('天天快报',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./spider/kuaibao'))(settings)
    spider.start()
}
const souhu = () => {
    let logger = logging.getLogger('搜狐视频',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./spider/souhu'))(settings)
    spider.start()
}
const toutiao = () => {
    let logger = logging.getLogger('今日头条',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./spider/toutiao'))(settings)
    spider.start()
}
const le = () => {
    let logger = logging.getLogger('乐视',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./spider/le'))(settings)
    spider.start()
}
const bili = () => {
    let logger = logging.getLogger('bili',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./spider/bili'))(settings)
    spider.start()
}
const meipai = () => {
    let logger = logging.getLogger('美拍',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./spider/meipai'))(settings)
    spider.start()
}
const miaopai = () => {
    let logger = logging.getLogger('秒拍',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./spider/miaopai'))(settings)
    spider.start()
}
const youku = () => {
    let logger = logging.getLogger('优酷',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./spider/youku'))(settings)
    spider.start()
}
const iqiyi = () => {
    let logger = logging.getLogger('爱奇艺',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./spider/iqiyi'))(settings)
    spider.start()
}
const yidian = () => {
    let logger = logging.getLogger('一点资讯',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./spider/yidian'))(settings)
    spider.start()
}
const tudou = () => {
    let logger = logging.getLogger('土豆',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./spider/tudou'))(settings)
    spider.start()
}
const baomihua = () => {
    let logger = logging.getLogger('爆米花',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./spider/baomihua'))(settings)
    spider.start()
}
const ku6 = () => {
    let logger = logging.getLogger('酷6',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./spider/ku6'))(settings)
    spider.start()
}
const btime = () => {
    let logger = logging.getLogger('北京时间',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./spider/btime'))(settings)
    spider.start()
}
const weishi = () => {
    let logger = logging.getLogger('微视', options['i'], log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./spider/weishi'))(settings)
    spider.start()
}
const xiaoying = () => {
    let logger = logging.getLogger('小影',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./spider/xiaoying'))(settings)
    spider.start()
}
const budejie = () => {
    let logger = logging.getLogger('不得姐',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./spider/budejie'))(settings)
    spider.start()
}
const neihan = () => {
    let logger = logging.getLogger('内涵段子',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./spider/neihan'))(settings)
    spider.start()
}
const yy = () => {
    let logger = logging.getLogger('yy',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./spider/yy'))(settings)
    spider.start()
}
const acfun = () => {
    let logger = logging.getLogger('acfun',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./spider/acfun'))(settings)
    spider.start()
}
const tv56 = () => {
    let logger = logging.getLogger('56视频',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./spider/tv56'))(settings)
    spider.start()
}
const test = () => {
    let logger = logging.getLogger('web',options['i'],log_level)
    settings['logger'] = logger
    settings['instance'] = options['i']
    let spider = new (require('./input'))(settings)
    spider.start()
}
switch (options['a']){
    case 'scheduler':
        scheduler()
        break
    case 'servant':
        servant()
        break
    case 'server':
        server()
        break
    case 'status':
        statusServer()
        break
    case 'tencent':
        tencent()
        break
    case 'kuaibao':
        kuaibao()
        break
    case 'souhu':
        souhu()
        break
    case 'toutiao':
        toutiao()
        break
    case 'le':
        le()
        break
    case 'bili':
        bili()
        break
    case 'meipai':
        meipai()
        break
    case 'miaopai':
        miaopai()
        break
    case 'youku':
        youku()
        break
    case 'iqiyi':
        iqiyi()
        break
    case 'yidian':
        yidian()
        break
    case 'tudou':
        tudou()
        break
    case 'baomihua':
        baomihua()
        break
    case 'ku6':
        ku6()
        break
    case 'btime':
        btime()
        break
    case 'weishi':
        weishi()
        break
    case 'xiaoying':
        xiaoying()
        break
    case 'budejie':
        budejie()
        break
    case 'neihan':
        neihan()
        break
    case 'yy':
        yy()
        break
    case 'acfun':
        acfun()
        break
    case 'tv56':
        tv56()
        break
    case 'test':
        test()
        break
    default:
        userArgv.showHelp()
}