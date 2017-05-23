/**
 * Created by dell on 2017/5/18.
 */
const Redis = require('../lib/myredis');
const request = require('request');
const async = require('async');
const cheerio = require('cheerio');

let redis;
const myRedis = Redis.createClient('127.0.0.1', 6379, 15, '', (err, cli) => {
  if (err) {
    console.log('数据库连接失败', err);
    return;
  }
  redis = cli;
});

/**
* 删除已经更新成功的用户ID
* */
const deleteErrId = (user) => {
  redis.SREM('staging_id_mid_err1', `${user.bid}_${user.mid}`, (err, result) => {
    if (err) {
      console.log('删除ID失败', `${user.bid}_${user.mid}`);
      return;
    }
    if (result) {
      console.log(`删除 ${user.bid}_${user.mid}: `, result);
      redis.SREM('staging_id_mid_err2', `${user.bid}_${user.mid}`);
    }
  });
};

/**
* 存储更新失败的用户id
* */
const errId = (user) => {
  redis.sadd('staging_id_mid_err1', `${user.bid}_${user.mid}`, (err, result) => {
    if (err) {
      console.log(`当前id: ${user.bid}_${user.mid} 存储失败`, err);
      return;
    }
    if (result === 1) {
      console.log(`失败ID ${user.bid}_${user.mid} 存储成功`);
      return;
    }
    if (result === 0) {
      console.log(`失败ID ${user.bid}_${user.mid} 已存在`);
      redis.sadd('staging_id_mid_err2', `${user.bid}_${user.mid}`);
    }
  });
};
/**
* 获取完encodeID之后更新encodeID
* */
const updateId = (user, callback) => {
  const options = {
    method: 'POST',
    url: 'http://staging-dev.meimiaoip.com/index.php/Spider/Encode/update',
    form: {
      bid: user.uid,
      bname: user.name,
      encodeId: user.encodeId,
      mid: user.mid
    }
  };
  request(options, (err, res, body) => {
    if (err) {
      console.log('更新失败', err);
      errId(user);
      callback();
      return;
    }
    if (res.statusCode != 200) {
      console.log('更新失败', res.statusCode);
      errId(user);
      callback();
      return;
    }
    console.log(`${user.bid} 更新成功`);
    redis.sadd('staging_id_mid_ok', `${user.bid}_${user.mid}`);
    deleteErrId(user);
    callback();
  });
};

/**
* 通过获取到的用户ID获取对应的encodeID
* */
const encodeID = (user, callback) => {
  const options = {
    method: 'GET',
    url: `http://www.tudou.com/home/_${user.bid}`
  };
  request(options, (err, res, body) => {
    if (err) {
      console.log(`获取 ${user.bid} encodeId 失败`, err);
      errId(user);
      callback();
      return;
    }
    if (res.statusCode != 200) {
      console.log(`获取 ${user.bid} encodeId 状态码错误`, res.statusCode);
      errId(user);
      callback();
      return;
    }
    const $ = cheerio.load(body);
    body = body.replace(/[\s\n\r]/g, '');
    const encodeId = body.match(/,eid:"(\w*)/) ? body.match(/,eid:"(\w*)/)[1] : '',
      uid = body.match(/ckx=idtudoucomiid(\d*)/) ? body.match(/ckx=idtudoucomiid(\d*)/)[1] : '',
      name = $('.user-avatar img').attr('alt'),
      userInfo = {
        bid: user.bid,
        mid: user.mid,
        encodeId,
        uid,
        name
      };
    if (!encodeId || !uid) {
      console.log(`获取 ${user.bid} encodeId 错误`);
      errId(user);
      callback();
      return;
    }
    console.log(`获取到对应 ${user.bid} 数据`);
    updateId(userInfo, () => {
      callback();
    });
  });
};

/**
 *  最后了从redis里边查询一下还有没有错误的用户ID
 * */
const chaID = () => {
  redis.SCARD('staging_id_mid_err1', (err, result) => {
    if (err) {
      console.log('查询数据库ID数量失败', err);
      return;
    }
    if (!result) {
      console.log('成功更新完encodeID');
    } else {
      console.log(`还有未能更新的账号ID ${result} 个`);
    }
  });
};

/**
* 从redis里边获取更新失败的ID
* */
const redisUpdataId = () => {
  const idArr = [];
  redis.SMEMBERS('staging_id_mid_err1', (err, result) => {
    if (err) {
      console.log('获取redis中的ID失败', err);
      return;
    }
    if (result) {
      for (const id of result) {
        idArr.push(id);
      }
      let index = 0,
        user;
      async.whilst(
        () => index < idArr.length,
        (cb) => {
          user = {
            bid: idArr[index].split('_')[0],
            mid: idArr[index].split('_')[1]
          };
          encodeID(user, () => {
            index += 1;
            cb();
          });
        },
        () => {
          console.log('从redis中取出id完成');
          chaID();
        }
      );
    }
  });
};

/**
* 从远程获取土豆的用户信息
* */
const getPlatform = () => {
  const options = {
    method: 'GET',
    url: 'http://staging-dev.meimiaoip.com/index.php/Spider/Encode/platData?p=12'
  };
  request(options, (err, res, body) => {
    if (err) {
      console.log('获取平台失败', err);
      return;
    }
    if (res.statusCode != 200) {
      console.log('获取失败', res.statusCode);
      return;
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      console.log('解析失败', body);
      return;
    }
    let index = 0;
    async.whilst(
      () => index < body.data.length,
      (cb) => {
        encodeID(body.data[index], () => {
          index += 1;
          cb();
        });
      },
      () => {
        /**
         * 从远程库里更新数据完成
         * 然后从本地redis里拿出更新失败的数据在重新试一次
         * */
        redisUpdataId();
      }
    );
  });
};
getPlatform();

