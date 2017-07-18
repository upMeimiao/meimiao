/**
 * Created by dell on 2017/7/18.
 */
const request = require('request');
const async = require('neo-async');

const beginTime = new Date().getTime();
const bidArr = [];
const ceshi = () => {
  const lastTime = new Date().getTime(),
    options = { method: 'GET',
      url: 'https://m.weibo.cn/api/container/getIndex?sudaref=login.sina.com.cn&retcode=6102&containerid=1005051908758204',
      headers: {
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
        referer: 'https://m.weibo.cn/p/1005051908758204'
      }
    };
  request(options, (error, response, body) => {
    if (error) {
      console.log('开始时间', beginTime, '出错时间', lastTime, '请求出错', error);
      return;
    };
    if (response.statusCode !== 200) {
      console.log('开始时间', beginTime, '结束时间', lastTime, '出错的状态码', response.statusCode);
      return;
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      console.log('开始时间', beginTime, '结束时间', lastTime, '解析失败的数据', body);
      return;
    }
    if (!body || !body.userInfo) {
      console.log('开始时间', beginTime, '结束时间', lastTime, '出错时的数据', body);
      return;
    }
    console.log('陈翔六点半粉丝数', body.userInfo.followers_count);
  });
};
ceshi();
setInterval(() => {
  ceshi();
}, 3000);

const begin = () => {
  const queue = async.queue((task, callback) => {
    ceshi(bid);
    callback();
  });
};