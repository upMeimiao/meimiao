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
const deleteErrId = (bid) => {
  redis.SREM('staging_bid_err1', bid, (err, result) => {
    if (err) {
      console.log('删除ID失败', bid);
      return;
    }
    if (result === 1) {
      console.log(`删除 ${bid}: 成功`);
      redis.SREM('staging_bid_err2', bid);
      return;
    }
    if (result === 0) {
      console.log('删除失败', bid);
    }
  });
};

/**
* 存储更新失败的用户id
* */
const errId = (bid) => {
  redis.sadd('staging_bid_err1', bid, (err, result) => {
    if (err) {
      console.log(`当前id: ${bid} 存储失败`, err);
      return;
    }
    if (result === 1) {
      console.log(`失败ID ${bid} 存储成功`);
      return;
    }
    if (result === 0) {
      console.log(`失败ID ${bid} 已存在`);
      redis.sadd('staging_bid_err2', bid);
    }
  });
};
/**
* 获取完encodeID之后更新encodeID
* */
const updateId = (user, callback) => {
  const options = {
    method: 'GET',
    url: `http://staging-dev.meimiaoip.com/index.php/Script/Debug/saveBid?bid=${user.bid}&new_bid=${user.new_bid}`
  };
  request(options, (err, res, body) => {
    if (err) {
      console.log(`${user.bid} 更新失败`, err);
      errId(user.bid);
      callback();
      return;
    }
    if (res.statusCode != 200) {
      console.log(`${user.bid} 更新失败`, res.statusCode);
      errId(user.bid);
      callback();
      return;
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      console.log(`${user.bid} 解析失败`, body);
      callback();
      return;
    }
    console.log(`${user.bid} 更新成功`);
    redis.sadd('staging_bid_ok', user.bid);
    deleteErrId(user.bid);
    callback();
  });
};

/**
* 通过获取到的用户ID获取对应的encodeID
* */
const encodeID = (bid, callback) => {
  const options = {
    method: 'GET',
    url: `http://www.tudou.com/home/_${bid}`
  };
  request(options, (err, res, body) => {
    if (err) {
      console.log(`获取 ${bid} 的encodeID 失败`, err);
      errId(bid);
      callback();
      return;
    }
    if (res.statusCode != 200) {
      console.log(`获取 ${bid} 的encodeID 状态码错误`, res.statusCode);
      errId(bid);
      callback();
      return;
    }
    body = body.replace(/[\s\n\r]/g, '');
    const encodeId = body.match(/,eid:"(\w*)/) ? body.match(/,eid:"(\w*)/)[1] : '',
      new_bid = body.match(/ckx=idtudoucomiid(\d*)/) ? body.match(/ckx=idtudoucomiid(\d*)/)[1] : '',
      user = {
        bid,
        new_bid,
        encodeId
      };
    if (!encodeId || !new_bid) {
      console.log(`获取 ${bid} 的encodeID 错误`);
      errId(bid);
      callback();
      return;
    }
    updateId(user, () => {
      callback();
    });
  });
};

/**
 *  最后了从redis里边查询一下还有没有错误的用户ID
 * */
const chaID = () => {
  redis.SCARD('staging_bid_err1', (err, result) => {
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
  redis.SMEMBERS('errID', (err, result) => {
    if (err) {
      console.log('获取redis中的ID失败', err);
      return;
    }
    if (result) {
      for (const id of result) {
        idArr.push(id);
      }
      let index = 0;
      async.whilst(
        () => index < idArr.length,
        (cb) => {
          encodeID(idArr[index], () => {
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
 * 从单页列表中异步执行单个用户
 * */
const deal = (list, callback) => {
  let index = 0;
  const length = list.length;
  async.whilst(
    () => index < length,
    (cb) => {
      encodeID(list[index].bid, () => {
        index += 1;
        cb();
      });
    },
    () => {
      callback();
    }
  );
};

/**
* 从远程获取土豆的用户信息
* */
const getPlatform = () => {
  const options = {
    method: 'GET'
  };
  let cycle = true,
    page = 1;
  async.whilst(
    () => cycle,
    (cb) => {
      options.url = `http://staging-dev.meimiaoip.com/index.php/Script/Debug/showbid?page=${page}&limit=100`;
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
        if (body.data.list == null) {
          cycle = false;
          cb();
          return;
        }
        deal(body.data.list, () => {
          page += 1;
          cb();
        });
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
};
getPlatform();

