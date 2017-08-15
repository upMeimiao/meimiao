/**
 * Created by dell on 2017/7/28.
 */
const Redis = require('ioredis');
const request = require('request');
const nodemailer = require('nodemailer');
const async = require('neo-async');

const redis = new Redis('redis://:C19prsPjHs52CHoA0vm@127.0.0.1:6379/7', {
  reconnectOnError(err) {
    return err.message.slice(0, 'READONLY'.length) === 'READONLY';
  }
});

const platform = [
  { bid: 1002143827, bname: '怕上火暴王老菊' },
  { bid: 1006205227, bname: '耳科赵医生' },
  { bid: 1028361511, bname: '神奇陆夫人' },
  { bid: 5884829935, bname: '一色神技能' },
  { bid: 1095240537, bname: '万能的大熊' },
  { bid: 1111142595, bname: '李老鼠说车' },
  { bid: 1140554177, bname: 'Misaya若风lol' },
  { bid: 1164475834, bname: '李明霖' },
  { bid: 5869525717, bname: '办公室小野' },
  { bid: 1197002213, bname: '男人装' },
  { bid: 1198639525, bname: '金哥Kimoon' },
  { bid: 1232700124, bname: '向北不哭' },
  { bid: 1883564374, bname: '我和动漫的日常' },
  { bid: 2206258462, bname: 'NASA中文' },
  { bid: 6004273387, bname: '迷彩虎' },
  { bid: 5508734253, bname: '嗨氏' },
  { bid: 2625858604, bname: 'kanahoooo' },
  { bid: 6049590367, bname: '局座召忠' },
  { bid: 5496045720, bname: '踏马行者' },
  { bid: 1908758204, bname: '陈翔六点半' }
];

const transporter = nodemailer.createTransport({
  pool: true,
  maxConnections: 10,
  service: 'QQex', // no need to set host or port etc.
  auth: {
    user: 'zhupenghui@meimiao.net',
    pass: 'Zhupenghui123'
  }
});
const sendEmail = (task, fansInfo, Info, time) => {
  let html = '<table cellspacing="0" cellpadding="0" border="1">';
  if (Info === 'status' || Info === 'error') {
    html += '<tr><td>平台</td><td>微博</td></tr>';
    html += `<tr><td>id</td><td>${task.bid}</td></tr>`;
    html += `<tr><td>name</td><td>${task.bname}</td></tr>`;
    html += `<tr><td>error</td><td>${fansInfo}</td></tr>`;
    html += `<tr><td>错误发生时间</td><td>${time}</td></tr>`;
  }
  if (Info !== 'error' && Info !== 'status') {
    html += '<tr><td>平台</td><td>微博</td></tr>';
    html += `<tr><td>id</td><td>${task.bid}</td></tr>`;
    html += `<tr><td>name</td><td>${task.bname}</td></tr>`;
    html += `<tr><td>上几次数据</td><td>${fansInfo.beforeFans}</td></tr>`;
    html += `<tr><td>本次数据</td><td>${fansInfo.fans}</td></tr>`;
    html += `<tr><td>两次异常数据相差</td><td>${fansInfo.num}</td></tr>`;
    html += `<tr><td>本次发生异常的数据</td><td>${JSON.stringify(Info)}</td></tr>`;
    html += `<tr><td>开始记录的时间</td><td>${fansInfo.start}</td></tr>`;
    html += `<tr><td>异常发生时间</td><td>${fansInfo.last}</td></tr>`;
  }
  html += '</table>';
  const mailOptions = {
    from: '"朱鹏辉" <zhupenghui@meimiao.net>',
    to: ['zhupenghui@meimiao.net'], // list of receivers,
    subject: '微博粉丝数异常信息', // Subject line
    text: html, // plaintext body
    html // html body
  };
  transporter.sendMail(mailOptions, (error) => {
    if (error) {
      console.log('error in sending Email', error);
    }
    html = null; task = null; fansInfo = null; Info = null;
  });
};

const errorInfo = (task, info) => {
  const time = new Date().getTime();
  if (!isNaN(info)) {
    sendEmail(task, `status: ${info}`, 'status', time);
    return;
  }
  sendEmail(task, `err: ${info}`, 'error', time);
};

const setFans = (task, fans, info) => {
  const time = new Date().getTime(),
    fansKey = `fans:weibo:${task.bid}`;
  let fansData;
  redis.get(fansKey, (err, result) => {
    if (err) {
      errorInfo(task, err);
      return;
    }
    if (!result) {
      fansData = {
        bid: task.bid,
        bname: task.bname,
        start: time,
        last: time,
        fans,
        beforeFans: [fans],
        num: 0
      };
      redis.set(fansKey, JSON.stringify(fansData));
      return;
    }
    result = JSON.parse(result);
    const length = result.beforeFans.length - 1,
      num = Number(fans) - Number(result.fans);
    if (num >= 10000) {
      result.last = time;
      result.beforeFans.push(fans);
      result.num = num;
      result.fans = fans;
      sendEmail(task, result, info);
      redis.set(fansKey, JSON.stringify(result));
      return;
    }
    if (length >= 4) {
      result.beforeFans.shift();
    }
    result.beforeFans.push(fans);
    result.last = time;
    result.fans = fans;
    redis.set(fansKey, JSON.stringify(result));
    task = null; info = null; fans = null; result = null;
  });
};

// const list = (task, data) => {
//   const option = {
//     method: 'GET',
//     headers: {
//       'User-Agent': 'Weibo/5598 CFNetwork/811.5.4 Darwin/16.6.0'
//     }
//   };
//   let containerid, fans;
//   if (task.NoVideo) {
//     containerid = data.tabsInfo.tabs[1].containerid;
//     option.url = `http://api.weibo.cn/2/guest/cardlist?c=iphone&s=6dd467f9&count=20&containerid=${containerid}_-_WEIBO_SECOND_PROFILE_WEIBO_ORI&page=0`;
//   } else {
//     containerid = data.tabsInfo.tabs[2].containerid;
//     option.url = `http://api.weibo.cn/2/guest/cardlist?c=iphone&s=6dd467f9&count=20&containerid=${containerid}_time&page=0`;
//   }
//   request(option, (err, res, body) => {
//     if (err) {
//       // console.log('list请求失败', err);
//       errorInfo(task, err);
//       return;
//     }
//     if (res.statusCode !== 200) {
//       // console.log('list请求状态', res.statusCode);
//       errorInfo(task, res.statusCode);
//       return;
//     }
//     try {
//       body = JSON.parse(body);
//     } catch (e) {
//       // console.log('list解析失败', body);
//       errorInfo(task, body);
//       return;
//     }
//     if (!body.cards || !body.cards.length === 0) {
//       errorInfo(task, body);
//       return;
//     }
//     for (const value of body.cards) {
//       if (!value.mblog) {
//         // console.log('---');
//         continue;
//       }
//       if (value.mblog.user && Number(task.bid) !== Number(value.mblog.user.id)) {
//         // console.log(Number(task.bid), '+++',Number(value.mblog.user.id));
//         continue;
//       }
//       // console.log(value);
//       fans = value;
//       break;
//     }
//     setFans(task, fans, body.cards);
//   });
// };

const user = (task, callback) => {
  let option = {
    method: 'GET',
    url: `https://m.weibo.cn/api/container/getIndex?type=uid&value=${task.bid}`,
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
      Referer: `https://m.weibo.cn/u/${task.id}`,
      'X-Requested-With': 'XMLHttpRequest'
    }
  };
  request(option, (err, res, body) => {
    if (err) {
      if (err.includes('socket hang up')) {
        task = null; body = null; option = null;
        callback();
        return;
      }
      errorInfo(task, err.message);
      task = null; body = null; option = null;
      callback();
      return;
    }
    if (Number(res.statusCode) !== 200) {
      errorInfo(task, res.statusCode);
      task = null; body = null; option = null;
      callback();
      return;
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      errorInfo(task, res.statusCode);
      task = null; body = null; option = null;
      callback();
      return;
    }
    if (!body || !body.userInfo || !body.userInfo.followers_count) {
      errorInfo(task, body);
      task = null; body = null; option = null;
      callback();
      return;
    }
    task.fans = body.userInfo ? body.userInfo.followers_count : '';
    // if (body.tabsInfo.tabs[2].title !== '视频') {
    //   task.NoVideo = true;
    //   list(task, body);
    // } else {
    //   task.NoVideo = false;
    //   list(task, body);
    // }
    setFans(task, task.fans, body);
    task = null; body = null; option = null;
    callback();
  });
};

const weiboTask = (plat) => {
  const queue = async.queue((work, callback) => {
    // console.log(1111);
    user(work, () => {
      callback();
    });
  }, 20);

  queue.drain = () => {
    // setTimeout(() => {
    //   weiboTask(plat);
    //   // plat = null;
    // }, 300000);
  };
  queue.push(plat, () => {
    // 1111111
    plat = null;
  });
};
weiboTask(platform);
setInterval(() => {
  weiboTask(platform);
}, 300000);