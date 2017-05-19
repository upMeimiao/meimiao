const request = require('request');
const util = require('util');
const events = require('events');
const Redis = require('ioredis');

let logger;
class sendServer {
  constructor(settings) {
    events.EventEmitter.call(this);
    this.settings = settings;
    logger = settings.logger;
    this.onlineOption = {
      url: settings.sendUrl,
      // url: "http://100.98.39.12/index.php/Spider/video/postVideosMore/",//settings.sendUrl,
      headers: {
        'content-type': 'application/json'
      }
    };
    this.stagingOption = {
      url: 'http://staging-dev.meimiaoip.com/index.php/Spider/video/postVideosMore/',
      headers: {
        'content-type': 'application/json'
      }
    };
    this.redis = new Redis(`redis://:${settings.redis.auth}@${settings.redis.host}:${settings.redis.port}/${settings.redis.cache_db}`, {
      reconnectOnError(err) {
        return err.message.slice(0, 'READONLY'.length) === 'READONLY';
      }
    });
    logger.trace('sendServer instantiation ...');
  }
  assembly() {
    this.emit('get_lists');
    setInterval(() => {
      this.emit('get_lists');
    }, this.settings.send_interval);
  }
  start() {
    logger.trace('启动函数');
    this.on('get_lists', () => {
      this.getData();
    });
    this.on('get_lists_staging', () => {
      this.deal_staging();
    });
    this.on('send_data', (raw, time) => {
      // this.deal(raw);
      this.sendOnline(raw, time);
    });
    this.on('send_data_staging', (raw, time) => {
      this.sendStaging(raw, time);
    });
    this.assembly();
  }
  getData() {
    const key = [], list = [];
    for (let i = 0; i < 500; i += 1) {
      key[i] = ['lpop', 'cache'];
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
    // this.onlineOption.body = JSON.stringify({data: list})
    // this.onlineOption.form = {data: newList}
    this.onlineOption.body = JSON.stringify({ data: newList });
    request.post(this.onlineOption, (err, res, result) => {
      if (err) {
        logger.error('online occur error : ', err.message);
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
        logger.error(`online errorCode: ${res.statusCode}`);
        logger.error(result);
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
        logger.error('online 返回数据 json数据解析失败');
        logger.error(result);
        // logger.error(JSON.stringify(newList))
        list = null;
        time = null;
        newList = null;
        return;
      }
      if (Number(result.errno) === 0) {
        // logger.debug('online back end')
        logger.debug(`${newList.length}个视频 online back end`);
        // logger.debug('online back end',result.data)
      } else {
        // logger.error('staging back error')
        logger.error(result);
        // logger.error('media info: ',list)
      }
      // logger.debug(`${newList.length}个视频 online back end`)
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
    // let newList = [],length = Math.min(list.length,150)
    // for(let i = 0; i < length; i++){
    //     newList.push(list[i])
    // }
    this.stagingOption.body = JSON.stringify({ data: list });
    // this.stagingOption.form = {data: list}
    request.post(this.stagingOption, (err, res, result) => {
      if (err) {
        logger.error('staging occur error : ', err.message);
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
        logger.error(`staging errorCode: ${res.statusCode}`);
        logger.error(result);
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
        logger.error('staging 返回数据 json数据解析失败');
        logger.error(result);
        logger.error(JSON.stringify(list));
        list = null;
        time = null;
        return;
      }
      if (Number(result.errno) === 0) {
        // logger.debug('staging back end')
        // logger.info(result.data)
        logger.debug(`${list.length}个视频 staging back end`);
      } else {
        // logger.error('staging back error')
        logger.error(result);
        // logger.error('media info: ',list)
      }
      // logger.info('客户端发出', list)
      // logger.debug(`${list.length}个视频 staging back end`)
      list = null;
      // newList = null;
      time = null;
    });
  }
}
util.inherits(sendServer, events.EventEmitter);
module.exports = sendServer;