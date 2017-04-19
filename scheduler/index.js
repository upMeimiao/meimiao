const kue = require('kue');
const request = require('request');
const HTTP = require('http');
const util = require('util');
const os = require('os');
const events = require('events');
const myRedis = require('../lib/myredis.js');
const schedule = require('node-schedule');

let logger;
class scheduler {
  constructor(settings) {
    events.EventEmitter.call(this);
    this.settings = settings;
    this.redis = settings.redis;
    logger = this.settings.logger;
    this.dealWith = new (require('./dealWith'))(this);
    this.queue = kue.createQueue({
      redis: {
        port: this.redis.port,
        host: this.redis.host,
        auth: this.redis.auth,
        db: this.redis.jobDB
      }
    });
    logger.trace('调度器初始化完成');
  }
  assembly() {
    myRedis.createClient(this.redis.host,
            this.redis.port,
            this.redis.taskDB,
            this.redis.auth,
            (err, cli) => {
              if (err) {
                logger.error('连接redis数据库出错。错误信息：', err);
                logger.error('出现错误，程序终止。');
                this.emit('redis_error', { db: 'taskDB', action: 0 });
                process.exit();
                return;
              }
              this.taskDB = cli;
              logger.debug('任务信息数据库连接建立...成功');
                // this.emit('task_loaded',test_data)
              const rule = new schedule.RecurrenceRule();
              const osName = os.hostname();
                // if (osName === 'iFabledeMacBook-Pro.local') {
              if (osName === 'iZt4n0b9sw5qoog46blmorZ') {
                this.createServer();
              } else {
                switch (osName) {
                  case 'servant_3':
                    rule.second = [0];
                    // rule.second = [0, 6, 12, 18, 24, 30, 36, 45, 51, 57];
                    break;
                  case 'iZ28ilm78mlZ':
                    rule.second = [30];
                    // rule.second = [3, 9, 15, 21, 27, 33, 39, 42, 48, 54];
                    break;
                  default:
                    rule.second = [0, 3, 6, 9, 12, 15, 18, 21, 24,
                      27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57];
                    break;
                }
                schedule.scheduleJob(rule, () => {
                  this.getTask();
                });
              }
            }
        );
  }
  start() {
    logger.trace('启动函数');
    this.on('task_loaded', (raw) => {
      this.dealWith.rawLoop(raw);
    });
    this.on('task_init', (raw) => {
      this.dealWith.checkInit(raw);
    });
    this.on('task_init_set', (raw) => {
      this.dealWith.setInit(raw);
    });
    this.on('task_check_kue', (raw) => {
      this.checkKue(raw);
    });
    this.on('task_set_create', (raw) => {
      this.dealWith.setCreate(raw);
    });
    this.on('task_create', (raw) => {
      this.createQueue(raw);
    });
    this.on('origin_youtube', (raw) => {
      this.originOverseas(raw);
    });
    this.on('redis_error', (raw) => {
            /**
             * todo send email
             */
      logger.error(raw);
    });
    this.assembly();
  }
  createServer() {
    const server = HTTP.createServer((req, res) => {
      switch (req.method) {
        case 'POST':
          this.handle(req, res);
          break;
        default:
          res.setHeader('Content-Type', 'text/html;charset=utf-8');
          res.writeHead(400);
          res.end();
          break;
      }
    });
    server.listen(2888, () => {
      logger.debug('Server running at 2888 port');
    });
  }
  handle(req, res) {
    let postData = '',
      body;
    req.addListener('data', (data) => {
      postData += data;
    });
    req.addListener('end', () => {
      body = JSON.parse(postData);
      this.emit('task_check_kue', body.data);
    });
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok' }));
  }
  getTask() {
    request.get(this.settings.url, (err, res, body) => {
      if (err) {
        logger.error('occur error : ', err);
        return;
      }
      if (res.statusCode !== 200) {
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        logger.error('json数据解析失败');
        logger.info(body);
        return;
      }
      logger.debug(body);
      this.emit('task_loaded', body);
    });
  }
  originOverseas(raw) {
    const options = {
      method: 'POST',
      url: 'http://spider-overseas.meimiaoip.com:51905/origin/sc/',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        data: raw
      })
    };
    request(options, (err, res, body) => {
      console.log(body);
    });
  }
  createQueue(raw) {
    const p = Number(raw.p);
    if ((p === 39 || p === 40) && !raw.origin) {
      raw.origin = true;
      this.emit('origin_youtube', raw);
      return;
    }
    if ((p === 6 && raw.id === '6116731501') || (p === 2 && raw.id === '1045961206')) {
      return;
    }
    let job = this.queue.create(raw.platform, {
      id: raw.id,
      p: raw.p,
      name: raw.name,
      encodeId: raw.encodeId,
      type: raw.type
      // user_id: raw.uid
    }).priority('critical').backoff({ delay: 150 * 1000, type: 'fixed' }).removeOnComplete(true);
    if (p !== 6 && !(p === 2 && raw.id === '1060140460') && !(p === 2 && raw.id === '1045961206')) {
      job.attempts(5);
    }
    // if(!job.data.user_id){
    //     delete job.data.user_id
    // }
    if (job.data.type === 0) {
      delete job.data.type;
    }
    if (job.data.encodeId === '') {
      delete job.data.encodeId;
    }
    job.save((err) => {
      if (err) {
        logger.error('Create queue occur error');
        logger.error('error :', err);
        this.emit('redis_error', { db: 'jobDB', action: 6 });
        return;
      }
      this.taskDB.hset(`${raw.p}:${raw.id}`, 'kue_id', job.id);
      logger.debug(`任务: ${job.type}_${job.data.id} 创建完成`);
      job = null;
      raw = null;
    });
  }
  checkKue(raw) {
    logger.debug(raw);
    const p = Number(raw.p);
    if (((p === 39 || p === 40) && !raw.origin) || ((p === 39 || p === 40) && raw.first)) {
      this.emit('task_set_create', raw);
      return;
    }
    const key = `${raw.p}:${raw.id}`;
    this.taskDB.hget(key, 'kue_id', (err, result) => {
      if (err) {
        scheduler.emit('redis_error', { db: 'taskDB', action: 2 });
        return;
      }
      const url = `http://${this.settings.kue.ip}:3000/api/job/${result}`;
      // const url = `http://127.0.0.1:3000/api/job/${result}`
      request.get(url, { auth: { user: 'verona', pass: '2319446' } }, (error, res, body) => {
        if (error) {
          logger.error('occur error : ', error);
          return;
        }
        if (res.statusCode !== 200) {
          return;
        }
        try {
          body = JSON.parse(body);
        } catch (e) {
          logger.error('json数据解析失败');
          logger.error(body);
          return;
        }
        if (body.error) {
          this.emit('task_set_create', raw);
          return;
        }
        const time = new Date().getTime();
        if ((body.state === 'active' || body.state === 'delayed') && time - body.updated_at > 3600000) {
          this.emit('task_set_create', raw);
          return;
        }
        if (body.state === 'failed') {
          this.emit('task_set_create', raw);
        }
      });
    });
  }
}
util.inherits(scheduler, events.EventEmitter);
module.exports = scheduler;