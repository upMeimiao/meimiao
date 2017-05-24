const moment = require('moment');
const request = require('request');

/**
 * 删除对象中值为null的属性
 * @param obj
 * @returns {*} 该对象被锁定，无法进行任何修改
 */
exports.deleteProperty = (obj) => {
  if (typeof obj !== 'object' || Object.prototype.toString.call(obj) === '[object Array]') {
    // 参数非对象（数组也不可以），直接返回该数据
    return obj;
  }
  const { keys, values, entries } = Object;
  for (const [key, value] of entries(obj)) {
    if (value === null || value === undefined) {
      delete obj[key];
    }
  }
  return Object.freeze(obj);
};

/**
 * 对抓取到的字符串（视频标题、视频详情、评论内容等）进行截取与特定字符的删除
 * @param str
 * @param length
 * @returns {*|{dist}|string|void|XML}
 */
exports.stringHandling = (str, length) => {
  if (typeof str !== 'string') {
    // 参数非字符串，直接返回该数据
    return str;
  }
  str = str.replace(/"/g, '').replace(/[\s\r\n]/g, '');
  if (length && length > 0) {
    str = str.substr(0, Number(length));
  }
  return str;
};

/**
 * 对抓取到的数字(应该是数字的字符串/字段)进行判断与容错处理
 * @param num
 * @returns {*}
 */
exports.numberHandling = (num) => {
  if (typeof num !== 'string' && typeof num !== 'number') {
    // 参数非字符串或数字，直接返回该数据
    return num;
  }
  if (isNaN(num) && num.includes('万')) {
    return Number(num.replace('万', '') * 10000);
  }
  if (isNaN(num) && num.includes('亿')) {
    return Number(num.replace('亿', '') * 100000000);
  }
  if (isNaN(num) && num.includes(',')) {
    return Number(num.replace(/,/g, ''));
  }
  if (Number(num) < 0) {
    /**
     * 如果该值为负数返回null，通过deleteProperty方法去掉
     * 一般情况不应该有负值，如果有特殊情况，请修改该方法
     */
    return null;
  }
  return Number(num);
};

/**
 * 发送视频数据时对同一批的数据进行去重（只要是同一个视频就去掉）
 * @param mediaArr
 * @returns {Array|[*]}
 */
exports.mediaUnique = (mediaArr) => {
  if (typeof mediaArr !== 'object' && Object.prototype.toString.call(mediaArr) !== '[object Array]') {
    // 参数非数组，直接返回该数据
    return mediaArr;
  }
  const map = new Map();
  for (const [index, elem] of mediaArr.entries()) {
    map.set(elem.bid.toString() + elem.id.toString(), elem);
  }
  mediaArr = [...map.values()];
  map.clear();
  return mediaArr;
};

/**
 * 将 00:00:00 与 00:00 形式的视频时长转换为秒数
 * @param time String
 * @returns {*}
 */
exports.longTime = (time) => {
  if (typeof time !== 'string') {
    // 参数非字符串或数字，直接返回该数据
    return time;
  }
  const timeArr = time.split(':');
  let longT = '';
  if (timeArr.length === 2) {
    longT = moment.duration(`00:${time}`).asSeconds();
  } else if (timeArr.length === 3) {
    longT = moment.duration(time).asSeconds();
  }
  return longT;
};

/**
 * 视频任务、评论任务发送更新状态方法
 * @param url String
 * @param data Object
 */
exports.sendUpdate = (url, data) => {
  const options = {
    method: 'POST',
    url,
    form: data
  };
  request(options, (err, res, body) => {
    if (err) {
      console.error(err.message);
      return;
    }
    if (res.statusCode !== 200) {
      console.error(res.statusCode);
      return;
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      console.error(e.message);
      return;
    }
    if (Number(body.errno) === 0) {
      console.log(body.errmsg);
    } else {
      console.error(body);
    }
  });
};

/**
 * 将媒体（视频）信息或评论信息保存到缓存队列
 * @param db redis数据库
 * @param listsName 队列名称
 * @param data 数据 Object
 */
exports.saveCache = (db, listsName, data) => {
  db.rpush(listsName, JSON.stringify(data), (err) => {
    if (err) {
      console.error('加入缓存队列出现错误：', err.message);
      return;
    }
    console.log(`${data.cid ? `评论信息: ${data.cid} ` : `视频信息: ${data.aid} `}加入缓存队列`);
    data = null;
  });
};

/**
 * 记录被封禁账号和找不到的账号
 * @param db
 * @param data
 */
exports.banned = (db, data) => {
  db.zscore('channel:banned', data, (err, result) => {
    if (err) return;
    if (!result) {
      db.zadd('channel:banned', -1, data);
    }
  });
};

/**
 * 记录评论数用于评论任务的生成
 * @param db
 * @param raw
 */
exports.commentSnapshots = (db, raw) => {
  if (!raw.comment_num || raw.comment_num === '') {
    return;
  }
  const key = `c:${raw.p}:${raw.aid}`;
  db.exists(key, (error, exists) => {
    if (error && exists === 0) {
      return;
    }
    if (exists === 1) {
      db.hmget(key, 'newSnapshots', 'snapshotsTime', 'update', (err, snapshots) => {
        if (err || (snapshots[1] && (new Date().getTime() - snapshots[1]) < 3600000)) return;
        if (snapshots[2] && (new Date().getTime() - snapshots[2] > 3600000)) {
          db.hmset(key, 'newSnapshots', Number(raw.comment_num), 'snapshotsTime', new Date().getTime());
        } else {
          db.hmset(key, 'oldSnapshots', Number(snapshots[0]), 'newSnapshots', Number(raw.comment_num), 'snapshotsTime', new Date().getTime());
        }
      });
    }
  });
};

/**
 *  Facebook（或其他需要登录的平台）账号被封（或cookie过期）把当前账号存储起来并发送邮件告知开发人员
 *  db  数据库表名
 *  data 失败的（或cookie过期）账号
 *  callback 操作完成返回
 * */
exports.sendError = (db, email, callback) => {
  db.sadd('user:Facebook', email, (err, result) => {
    if (err) {
      callback(err);
      return;
    }
    if (result === 1) {
      request({
        method: 'POST',
        url: 'http://10.251.55.50:3001/api/alarm',
        form: {
          subject: '用户账号被封禁(或Cookie到期)',
          content: `<p>平台: Facebook，平台ID: 40，出错账号: ${email}</p>`
        }
      });
    }
    callback();
  });
};