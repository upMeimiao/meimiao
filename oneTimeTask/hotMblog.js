const request = require('request');
const async = require('async');
const trimHtml = require('trim-html');

let score = 0;
const trimConf = { limit: 200, preserveTags: false, wordBreak: true };
const options = {
  method: 'GET',
  url: 'https://m.weibo.cn/api/container/getIndex',
  qs: { containerid: '102803_ctg1_8698', count: '20' },
  headers: {
    referer: 'https://m.weibo.cn/p/index?containerid=102803',
    'x-requested-with': 'XMLHttpRequest',
    'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
  }
};
function send(data, callback) {
  score += 1;
  const option = {
    method: 'POST',
    url: 'http://spider-monitor.meimiaoip.com/api/hotWeibo',
    headers: {
      'content-type': 'application/json',
    },
    body: { score, mblog: data },
    json: true
  };
  request(option, (error, response, body) => {
    if (error) {
      callback(error);
      return;
    }
    if (response.statusCode !== 200) {
      callback(response.statusCode);
      return;
    }
    console.log(body);
    callback();
  });
}
function dealWith(info, callback) {
  let index = 0, mblog, mblogInfo;
  const length = info.length;
  async.whilst(
    () => index < length,
    (cb) => {
      mblog = info[index].mblog;
      mblogInfo = {
        context: trimHtml(mblog.text, trimConf).html.replace(/​​​/g, ''),
        bid: mblog.bid,
        reposts: mblog.reposts_count,
        comments: mblog.comments_count,
        attitudes: mblog.attitudes_count,
        user: {
          id: mblog.user.id,
          name: mblog.user.screen_name,
          fans: mblog.user.followers_count
        }
      };
      send(mblogInfo, () => {
        index += 1;
        cb();
      });
    },
    () => {
      callback();
    }
  );
}
function start() {
  let sign = 1;
  async.whilst(
    () => sign <= 5,
    (cb) => {
      options.qs.page = sign;
      request(options, (error, response, body) => {
        if (error) {
          return setTimeout(() => {
            cb();
          }, 2000);
        }
        if (response.statusCode !== 200) {
          return setTimeout(() => {
            cb();
          }, 2000);
        }
        try {
          body = JSON.parse(body);
        } catch (e) {
          return setTimeout(() => {
            cb();
          }, 2000);
        }
        dealWith(body.cards, () => {
          sign += 1;
          cb();
        });
      });
    },
    () => {
      console.log('end');
    }
  );
}

start();