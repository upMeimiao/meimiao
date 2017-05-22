/**
 * Created by dell on 2017/5/18.
 */
const Redis = require('../../lib/myredis');
const request = require('request');
const async = require('async');

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
  redis.SPOP('errID', bid, (err, result) => {
    if (err) {
      console.log('删除ID失败', bid);
      return;
    }
    if (result) {
      console.log(`删除 ${bid}: `, result);
      redis.SPOP('errID2', bid);
    }
  });
};

/**
* 存储更新失败的用户id
* */
const errId = (bid) => {
  redis.sadd('errID', bid, (err, result) => {
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
      redis.sadd('errID2', bid);
    }
  });
};
/**
* 获取完encodeID之后更新encodeID
* */
const updateId = (bid, encodeID, callback) => {
  const options = {
    method: 'POST',
    url: 'http://www.meimiaoip.com/index.php/Spider/Encode/update',
    form: {
      platform: 12,
      bid,
      encodeId: encodeID,
    }
  };
  request(options, (err, res, body) => {
    if (err) {
      console.log('更新失败', err);
      errId(bid);
      callback();
      return;
    }
    if (res.statusCode != 200) {
      console.log('更新失败', res.statusCode);
      errId(bid);
      callback();
      return;
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      console.log('解析失败', body);
      callback();
      return;
    }
    console.log(`${bid} 更新成功`);
    redis.sadd('www', bid);
    deleteErrId(bid);
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
    let encodeId = body.replace(/[\s\n\r]/g, '');
    encodeId = encodeId.match(/,eid:"(\w*)/) ? encodeId.match(/,eid:"(\w*)/)[1] : '';
    if (!encodeID) {
      console.log(`获取 ${bid} 的encodeID 错误`);
      errId(bid);
      callback();
      return;
    }
    updateId(bid, encodeId, () => {
      callback();
    });
  });
};

/**
 *  最后了从redis里边查询一下还有没有错误的用户ID
 * */
const chaID = () => {
  redis.SCARD('errID', (err, result) => {
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
* 从远程获取土豆的用户信息
* */
const getPlatform = () => {
  const options = {
    method: 'GET',
    url: 'http://www.meimiaoip.com/index.php/Spider/Encode/platData?p=12'
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
    const length = body.data.length;
    async.whilst(
      () => index < length,
      (cb) => {
        if (body.data[index].encodeId) {
          index += 1;
          cb();
          return;
        }
        encodeID(body.data[index].bid, () => {
          index += 1;
          cb();
        });
      },
      () => {
        console.log('更新完成');
        setTimeout(() => {
          redisUpdataId();
        }, 1000);
      }
    );
  });
};
getPlatform();

