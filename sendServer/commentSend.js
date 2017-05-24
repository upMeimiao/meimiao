const request = require('request');
const util = require('util');
const events = require('events');

class commentSend {
  constructor(sendServer) {
    events.EventEmitter.call(this);
    this.settings = sendServer.settings;
    this.logger = sendServer.logger;
    this.onlineOption = {
      url: this.settings.sendUrl,
      // url: "http://100.98.39.12/index.php/Spider/video/postVideosMore/",//settings.sendUrl,
      headers: {
        'content-type': 'application/json'
      }
    };
    this.stagingOption = {
      url: 'http://staging-dev.meimiaoip.com/index.php/Spider/comment/postComments',
      headers: {
        'content-type': 'application/json'
      }
    };
    this.redis = sendServer.redis;
    this.logger.trace('commentSend instantiation ...');
  }
  assembly() {
    this.emit('get_lists');
    setInterval(() => {
      this.emit('get_lists');
    }, this.settings.send_interval);
  }
  start() {
    this.logger.trace('启动函数');
    this.on('get_lists', () => {
      this.getData();
    });
    this.on('send_data', (raw, time) => {
      this.sendOnline(raw, time);
    });
    this.on('send_data_staging', (raw, time) => {
      this.sendStaging(raw, time);
    });
    this.assembly();
  }
  getData() {
    const key = [], list = [];
    for (let i = 0; i < 1500; i += 1) {
      key[i] = ['lpop', 'comment_cache'];
    }
    this.redis.pipeline(
      key
    ).exec((err, result) => {
      if (err) {
        return;
      }
      for (const [index, elem] of result.entries()) {
        if (elem[1]) {
          list.push(JSON.parse(elem[1]));
        }
      }
      this.emit('send_data', list, 0);
      this.emit('send_data_staging', list, 0);
    });
  }
  sendOnline(list, time) {
    if (list.length === 0) {
      list = null;
      return;
    }
    let newList = [];
    for (const [index, elem] of list.entries()) {
      if (elem.platform < 40) {
        newList.push(elem);
      }
    }
    if (newList.length === 0) {
      list = null;
      newList = null;
      return;
    }
    // this.onlineOption.body = JSON.stringify({ data: list });
    this.onlineOption.body = JSON.stringify({ data: newList });
    request.post(this.onlineOption, (err, res, result) => {
      if (err) {
        this.logger.error('online occur error : ', err.message);
        time += 1;
        if (time > 3) {
          list = null;
          time = null;
          newList = null;
        } else {
          setTimeout(() => {
            this.emit('send_data', list, time);
          }, 300);
        }
        return;
      }
      if (res.statusCode !== 200) {
        this.logger.error(`online errorCode: ${res.statusCode}`);
        this.logger.error(result);
        this.logger.error(JSON.stringify({ data: newList }));
        time += 1;
        if (time > 3) {
          list = null;
          time = null;
          newList = null;
        } else {
          setTimeout(() => {
            this.emit('send_data', list, time);
          }, 1500);
        }
        return;
      }
      try {
        result = JSON.parse(result);
      } catch (e) {
        this.logger.error('online 返回数据 json数据解析失败');
        this.logger.error(result);
        // this.logger.error(JSON.stringify(newList))
        list = null;
        time = null;
        newList = null;
        return;
      }
      if (Number(result.errno) === 0) {
        // this.logger.debug('online back end')
        this.logger.debug(`${newList.length}个评论 online back end`);
        // this.logger.debug('online back end',result.data)
      } else {
        // this.logger.error('online back error')
        this.logger.error(result);
        // this.logger.error('media info: ',list)
      }
      // this.logger.debug(`${newList.length}个评论 online back end`)
      list = null;
      newList = null;
      time = null;
    });
  }
  sendStaging(list, time) {
    if (list.length === 0) {
      list = null;
      return;
    }
    this.stagingOption.body = JSON.stringify({ data: list });
    request.post(this.stagingOption, (err, res, result) => {
      if (err) {
        this.logger.error('staging occur error : ', err.message);
        time += 1;
        if (time > 3) {
          list = null;
          time = null;
          // newList = null
        } else {
          setTimeout(() => {
            this.emit('send_data_staging', list, time);
          }, 300);
        }
        return;
      }
      if (res.statusCode !== 200) {
        this.logger.error(`staging errorCode: ${res.statusCode}`);
        this.logger.error(result);
        time += 1;
        if (time > 3) {
          list = null;
          time = null;
          // newList = null
        } else {
          setTimeout(() => {
            this.emit('send_data_staging', list, time);
          }, 1500);
        }
        return;
      }
      try {
        result = JSON.parse(result);
      } catch (e) {
        this.logger.error('staging 返回数据 json数据解析失败');
        this.logger.error(result);
        this.logger.error(JSON.stringify(list));
        list = null;
        time = null;
        return;
      }
      if (Number(result.errno) === 0) {
        // this.logger.debug('staging back end')
        this.logger.info(result.data);
        this.logger.debug(`${list.length}个评论 staging back end`);
      } else {
        // this.logger.error('staging back error')
        this.logger.error(result);
        // this.logger.error('media info: ',list)
      }
      // this.logger.info('客户端发出', list)
      // this.logger.debug(`${list.length}个视频 staging back end`)
      list = null;
      // newList = null;
      time = null;
    });
  }
}
util.inherits(commentSend, events.EventEmitter);
module.exports = commentSend;