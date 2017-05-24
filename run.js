const logging = require('./lib/logger.js');
// arguments parse
const userArgv = require('optimist')
  .usage('Usage: $0 -i [instance name] -a [schedule|proxy|servant|auth|monitor|server]  -p [num] -t [video|comment] -h')
  .options('i', {
    alias: 'instance',
    default: 'master',
    describe: 'Specify a instance',
    demand: true
  })
  .options('a', {
    alias: 'action',
    default: 'scheduler',
    describe: 'Specify a action[schedule|proxy|servant|auth|monitor|server]',
    demand: true
  })
  .options('p', {
    alias: 'port',
    default: 2016,
    describe: 'Specify a service port, for config service and proxy router'
  })
  .options('t', {
    alias: 'type',
    default: 'video',
    describe: 'Specify a action type[video|comment]'
  })
  .options('h', {
    alias: 'help',
    describe: 'Help infomation'
  });

const options = userArgv.argv;
if (options.h) {
  userArgv.showHelp();
  process.exit();
}
const settings = require(`./instance/${options.i}/settings.json`);
settings.instance = options.i;
// log level
let logLevel = 'TRACE';
let spiderDir;
if (options.t === 'video') {
  spiderDir = './spider/';
} else {
  spiderDir = './spiderComment/';
}
if (settings.log_level)logLevel = settings.log_level;
const scheduler = () => {
  const logger = logging.getLogger('调度中心', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  settings.type = options.t;
  const spider = new (require('./scheduler'))(settings);
  spider.start();
};
const servant = () => {
  const logger = logging.getLogger('平台', options.i, logLevel);
  settings.logger = logger;
  settings.port = parseInt(options.p, 10);
  settings.instance = options.i;
  const spider = new (require('./servant'))(settings);
  spider.start();
};
const authenticate = () => {
  const logger = logging.getLogger('IP认证', options.i, logLevel);
  settings.logger = logger;
  settings.port = 2018;// parseInt( options[ 'p' ] )
  settings.instance = options.i;
  const spider = new (require('./authenticate'))(settings);
  spider.start();
};
const server = () => {
  const logger = logging.getLogger('数据中心', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  settings.type = options.t;
  const spider = new (require('./sendServer'))(settings);
  spider.start();
};
const statusMonitor = () => {
  const logger = logging.getLogger('状态监控', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require('./monitor'))(settings);
  spider.start();
};

const monitorSpider = () => {
  const logger = logging.getLogger('接口监控', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require('./monitorSpider'))(settings);
  spider.start();
};

const kueMonitor = () => {
  const logger = logging.getLogger('Kue监控', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  settings.type = options.t;
  const spider = new (require('./kueMonitor'))(settings);
  spider.start();
};
const proxy = () => {
  const logger = logging.getLogger('代理', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require('./proxy'))(settings);
  spider.start();
};
const tencent = () => {
  const logger = logging.getLogger('腾讯视频', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}tencent`))(settings);
  spider.start();
};
const kuaibao = () => {
  const logger = logging.getLogger('天天快报', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}kuaibao`))(settings);
  spider.start();
};
const souhu = () => {
  const logger = logging.getLogger('搜狐视频', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}souhu`))(settings);
  spider.start();
};
const toutiao = () => {
  const logger = logging.getLogger('今日头条', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}toutiao`))(settings);
  spider.start();
};
const le = () => {
  const logger = logging.getLogger('乐视', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}le`))(settings);
  spider.start();
};
const bili = () => {
  const logger = logging.getLogger('bili', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}bili`))(settings);
  spider.start();
};
const meipai = () => {
  const logger = logging.getLogger('美拍', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}meipai`))(settings);
  spider.start();
};
const miaopai = () => {
  const logger = logging.getLogger('秒拍', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}miaopai`))(settings);
  spider.start();
};
const youku = () => {
  const logger = logging.getLogger('优酷', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}youku`))(settings);
  spider.start();
};
const iqiyi = () => {
  const logger = logging.getLogger('爱奇艺', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}iqiyi`))(settings);
  spider.start();
};
const yidian = () => {
  const logger = logging.getLogger('一点资讯', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}yidian`))(settings);
  spider.start();
};
const tudou = () => {
  const logger = logging.getLogger('土豆', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}tudou`))(settings);
  spider.start();
};
const baomihua = () => {
  const logger = logging.getLogger('爆米花', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}baomihua`))(settings);
  spider.start();
};
const ku6 = () => {
  const logger = logging.getLogger('酷6', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}ku6`))(settings);
  spider.start();
};
const btime = () => {
  const logger = logging.getLogger('北京时间', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}btime`))(settings);
  spider.start();
};
const weishi = () => {
  const logger = logging.getLogger('微视', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}weishi`))(settings);
  spider.start();
};
const xiaoying = () => {
  const logger = logging.getLogger('小影', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}xiaoying`))(settings);
  spider.start();
};
const budejie = () => {
  const logger = logging.getLogger('不得姐', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}budejie`))(settings);
  spider.start();
};
const neihan = () => {
  const logger = logging.getLogger('内涵段子', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}neihan`))(settings);
  spider.start();
};
const yy = () => {
  const logger = logging.getLogger('yy', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}yy`))(settings);
  spider.start();
};
const acfun = () => {
  const logger = logging.getLogger('acfun', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}acfun`))(settings);
  spider.start();
};
const weibo = () => {
  const logger = logging.getLogger('微博', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}weibo`))(settings);
  spider.start();
};
const tv56 = () => {
  const logger = logging.getLogger('56视频', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}tv56`))(settings);
  spider.start();
};
const ifeng = () => {
  const logger = logging.getLogger('凤凰自媒体', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}ifeng`))(settings);
  spider.start();
};
const uctt = () => {
  const logger = logging.getLogger('UC头条', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}uctt`))(settings);
  spider.start();
};
const wangyi = () => {
  const logger = logging.getLogger('网易号', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}wangyi`))(settings);
  spider.start();
};
const mgtv = () => {
  const logger = logging.getLogger('芒果TV', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}mgtv`))(settings);
  spider.start();
};
const qzone = () => {
  const logger = logging.getLogger('QQ空间', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}qzone`))(settings);
  spider.start();
};
const cctv = () => {
  const logger = logging.getLogger('CCTV', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}cctv`))(settings);
  spider.start();
};
const pptv = () => {
  const logger = logging.getLogger('pptv', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}pptv`))(settings);
  spider.start();
};
const xinlan = () => {
  const logger = logging.getLogger('新蓝网', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}xinlan`))(settings);
  spider.start();
};
const v1 = () => {
  const logger = logging.getLogger('第一视频', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}v1`))(settings);
  spider.start();
};
const fengxing = () => {
  const logger = logging.getLogger('风行网', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}fengxing`))(settings);
  spider.start();
};
const huashu = () => {
  const logger = logging.getLogger('华数', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}huashu`))(settings);
  spider.start();
};
const baofeng = () => {
  const logger = logging.getLogger('暴风', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}baofeng`))(settings);
  spider.start();
};
const baiduVideo = () => {
  const logger = logging.getLogger('百度视频', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}baiduVideo`))(settings);
  spider.start();
};
const baijia = () => {
  const logger = logging.getLogger('百度百家', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}baijia`))(settings);
  spider.start();
};
const liVideo = () => {
  const logger = logging.getLogger('梨视频', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}liVideo`))(settings);
  spider.start();
};
const youtube = () => {
  const logger = logging.getLogger('YouTube', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}youtube`))(settings);
  spider.start();
};
const xiangkan = () => {
  const logger = logging.getLogger('小米想看', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}xiangkan`))(settings);
  spider.start();
};
const facebook = () => {
  const logger = logging.getLogger('facebook', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}facebook`))(settings);
  spider.start();
};
const renren = () => {
  const logger = logging.getLogger('人人视频', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}renren`))(settings);
  spider.start();
};
const dianshi = () => {
  const logger = logging.getLogger('点视', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}dianshi`))(settings);
  spider.start();
};
const bolo = () => {
  const logger = logging.getLogger('网易菠萝', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}bolo`))(settings);
  spider.start();
};
const huoshan = () => {
  const logger = logging.getLogger('火山小视频', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require(`${spiderDir}huoshan`))(settings);
  spider.start();
};
const test = () => {
  const logger = logging.getLogger('测试', options.i, logLevel);
  settings.logger = logger;
  settings.instance = options.i;
  const spider = new (require('./test/youtube'))(settings);
  spider.start();
};
switch (options.a) {
  case 'scheduler':
    scheduler();
    break;
  case 'servant':
    servant();
    break;
  case 'auth':
    authenticate();
    break;
  case 'server':
    server();
    break;
  case 'monitor':
    statusMonitor();
    break;
  case 'monitorSpider':
    monitorSpider();
    break;
  case 'kue':
    kueMonitor();
    break;
  case 'proxy':
    proxy();
    break;
  case 'tencent':
    tencent();
    break;
  case 'kuaibao':
    kuaibao();
    break;
  case 'souhu':
    souhu();
    break;
  case 'toutiao':
    toutiao();
    break;
  case 'le':
    le();
    break;
  case 'bili':
    bili();
    break;
  case 'meipai':
    meipai();
    break;
  case 'miaopai':
    miaopai();
    break;
  case 'youku':
    youku();
    break;
  case 'iqiyi':
    iqiyi();
    break;
  case 'yidian':
    yidian();
    break;
  case 'tudou':
    tudou();
    break;
  case 'baomihua':
    baomihua();
    break;
  case 'ku6':
    ku6();
    break;
  case 'btime':
    btime();
    break;
  case 'weishi':
    weishi();
    break;
  case 'xiaoying':
    xiaoying();
    break;
  case 'budejie':
    budejie();
    break;
  case 'neihan':
    neihan();
    break;
  case 'yy':
    yy();
    break;
  case 'acfun':
    acfun();
    break;
  case 'weibo':
    weibo();
    break;
  case 'tv56':
    tv56();
    break;
  case 'ifeng':
    ifeng();
    break;
  case 'uctt':
    uctt();
    break;
  case 'wangyi':
    wangyi();
    break;
  case 'mgtv':
    mgtv();
    break;
  case 'qzone':
    qzone();
    break;
  case 'cctv':
    cctv();
    break;
  case 'pptv':
    pptv();
    break;
  case 'xinlan':
    xinlan();
    break;
  case 'v1':
    v1();
    break;
  case 'fengxing':
    fengxing();
    break;
  case 'huashu':
    huashu();
    break;
  case 'baofeng':
    baofeng();
    break;
  case 'baiduVideo':
    baiduVideo();
    break;
  case 'baijia':
    baijia();
    break;
  case 'liVideo':
    liVideo();
    break;
  case 'xiangkan':
    xiangkan();
    break;
  case 'youtube':
    youtube();
    break;
  case 'facebook':
    facebook();
    break;
  case 'renren':
    renren();
    break;
  case 'dianshi':
    dianshi();
    break;
  case 'bolo':
    bolo();
    break;
  case 'huoshan':
    huoshan();
    break;
  case 'test':
    test();
    break;
  default:
    userArgv.showHelp();
}