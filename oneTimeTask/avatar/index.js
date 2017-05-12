/**
 * Created by ifable on 2017/2/27.
 */
const request = require('request');
const log4js = require('log4js');
const handle = require('./handle');
const Redis = require('ioredis');

const redis = new Redis('redis://:@127.0.0.1:6379/10', {
  reconnectOnError(err) {
    return err.message.slice(0, 'READONLY'.length) === 'READONLY';
  }
});

log4js.configure({
  appenders: [
    {
      type: 'file',
      filename: `avatar-${process.pid}.log`,
      encoding: 'utf-8'
    },
    {
      type: 'stdout'
    }
  ]
});
const logger = log4js.getLogger('avatar');
logger.setLevel('TRACE');

const redisUser = () => new Promise((resolve, reject) => {
  redis.smembers('error', (err, result) => {
    if (err) {
      reject(err.message);
    } else {
      resolve(result);
    }
  });
});

const getUser = () => new Promise((resolve, reject) => {
  request('http://www.meimiaoip.com/index.php/spider/videoO/getTaskStatus', (err, res, body) => {
    if (err) {
      return reject(err.message);
    }
    if (res.statusCode !== 200) {
      return reject(res.statusCode);
    }
    let result;
    try {
      result = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
    if (result.errno !== 0) {
      return reject(result.errno);
    }
    resolve(result.data);
  });
});
async function getID(user) {
  let info = {};
  switch (Number(user.platform)) {
    case 1:
      info = await handle.youku(user);
      break;
    case 2:
      info = await handle.iqiyi(user);
      break;
    case 3:
      info = await handle.le(user);
      break;
    case 4:
      info = await handle.tencent(user);
      break;
    case 5:
      info = await handle.meipai(user);
      break;
    case 6:
      info = await handle.toutiao(user);
      break;
    case 7:
      info = await handle.miaopai(user);
      break;
    case 8:
      info = await handle.bili(user);
      break;
    case 9:
      info = await handle.sohu(user);
      break;
    case 10:
      info = await handle.kuaibao(user);
      break;
    case 11:
      info = await handle.yidian(user);
      break;
    case 12:
      info = await handle.tudou(user);
      break;
    case 13:
      info = await handle.baomihua(user);
      break;
    case 14:
      info = await handle.ku6(user);
      break;
    case 15:
      info = await handle.btime(user);
      break;
    case 16:
      info = await handle.weishi(user);
      break;
    case 17:
      info = await handle.xiaoying(user);
      break;
    case 18:
      info = await handle.budejie(user);
      break;
    case 19:
      info = await handle.neihan(user);
      break;
    case 20:
      info = await handle.yy(user);
      break;
    case 21:
      info = await handle.tv56(user);
      break;
    case 22:
      info = await handle.acfun(user);
      break;
    case 23:
      info = await handle.weibo(user);
      break;
    case 24:
      info = await handle.ifeng(user);
      break;
    case 25:
      info = await handle.wangyi(user);
      break;
    case 26:
      info = await handle.uctt(user);
      break;
    case 27:
      info = await handle.mgtv(user);
      break;
    case 28:
      info = await handle.baijia(user);
      break;
    case 29:
      info = await handle.qzone(user);
      break;
    case 30:
      info = await handle.cctv(user);
      break;
    case 31:
      info = await handle.pptv(user);
      break;
    case 32:
      info = await handle.xinlan(user);
      break;
    case 33:
      info = await handle.v1(user);
      break;
    case 34:
      info = await handle.fengxing(user);
      break;
    case 35:
      info = await handle.huashu(user);
      break;
    case 36:
      info = await handle.baofeng(user);
      break;
    case 37:
      info = await handle.baiduVideo(user);
      break;
  }
  return info;
}
const send = info => new Promise((resolve, reject) => {
  if (!info.avatar) {
    return reject(info);
  }
  const options = {
    method: 'POST',
    url: 'http://www.meimiaoip.com/index.php/spider/imgSave/update',
    form: {
      p: info.p,
      bid: info.id,
      avatar: info.avatar || ''
    }
  };
  request(options, (error, response, body) => {
    if (error) {
      return reject(error.message);
    }
    if (response.statusCode !== 200) {
      return reject(response.statusCode);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      return reject(e.message);
    }
    if (body.errno != 0) {
      return reject(body);
    }
    resolve(body);
  });
});
async function start() {
  let users, result, infos = [], ok;
  users = await getUser();
    // users = await redisUser()
  for (const user of users) {
        // if((user.platform < 24) || user.platform == 30 || user.platform > 31){
        //     continue
        // }
    try {
      result = await getID(user);
    } catch (e) {
      if (e !== '未完成') {
        logger.error(e);
                // redis.sadd('error', user)
        redis.sadd('error', JSON.stringify(user));
      }
      continue;
    }
    logger.debug(result);
    try {
      ok = await send(result);
    } catch (e) {
      if (!e.errno) {
        redis.sadd('error', JSON.stringify(user));
      }
      continue;
    }
        // redis.srem('error10',user)
    infos.push(ok);
  }
  return infos;
}

start()
    .then((result) => {
      logger.debug(result.length);
      redis.quit();
    })
    .catch((err) => {
      logger.error('error', err);
    });