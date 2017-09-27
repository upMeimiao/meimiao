const kue = require('kue');
const request = require('request');
const HTTP = require('http');
const os = require('os');
const events = require('events');
const Redis = require('ioredis');
const schedule = require('node-schedule');

class mediaScheduler extends events {
  constructor(scheduler) {
    super();
    this.settings = scheduler.settings;
    this.redis = scheduler.redis;
    this.logger = scheduler.logger;
    this.handle = new (require('./mediaHandle'))(this);
    this.queue = kue.createQueue({
      redis: {
        port: this.redis.port,
        host: this.redis.host,
        auth: this.redis.auth,
        db: this.redis.jobDB
      },
      // jobEvents: false
    });
    this.logger.trace('视频任务调度器初始化完成');
  }
  assembly() {
    this.taskDB = new Redis(`redis://:${this.redis.auth}@${this.redis.host}:${this.redis.port}/${this.redis.taskDB}`, {
      reconnectOnError(err) {
        return err.message.slice(0, 'READONLY'.length) === 'READONLY';
      }
    });
    // this.emit('task_loaded',test_data)
    // const rule = new schedule.RecurrenceRule();
    let rule;
    const osName = os.hostname();
    // if (osName === 'iFabledeMacBook-Pro.local') {
    if (osName === 'iZt4n0b9sw5qoog46blmorZ') {
      this.createServer();
    } else {
      switch (osName) {
        case 'iZm5e5o52kssf0z0i9vm1hZ':
          rule = '0 * * * * *';
          // rule.second = [0];
          // rule.minute = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58];
          // rule.second = [0, 6, 12, 18, 24, 30, 36, 45, 51, 57];
          break;
        case 'iZ28ilm78mlZ':
          rule = '30 * * * * *';
          // rule.second = [30];
          // rule.minute = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49, 51, 53, 55, 57, 59];
          // rule.second = [3, 9, 15, 21, 27, 33, 39, 42, 48, 54];
          break;
        default:
          rule = '30 * * * * *';
          // rule.second = [0, 3, 6, 9, 12, 15, 18, 21, 24,
          //   27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57];
          break;
      }
      schedule.scheduleJob(rule, () => {
        this.getTask();
      });
    }
  }
  start() {
    this.logger.trace('启动函数');
    this.on('task_loaded', (raw) => {
      this.handle.rawLoop(raw);
    });
    this.on('task_init', (raw) => {
      this.handle.checkInit(raw);
    });
    this.on('task_init_set', (raw) => {
      this.handle.setInit(raw);
    });
    this.on('task_check_kue', (raw) => {
      this.checkKue(raw);
    });
    this.on('task_set_create', (raw) => {
      this.handle.setCreate(raw);
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
      this.logger.error(raw);
    });
    this.assembly();
  }
  createServer() {
    const server = HTTP.createServer((req, res) => {
      switch (req.method) {
        case 'POST':
          this.routerHandle(req, res);
          break;
        default:
          res.setHeader('Content-Type', 'text/html;charset=utf-8');
          res.writeHead(400);
          res.end();
          break;
      }
    });
    server.listen(2888, () => {
      this.logger.debug('Server running at 2888 port');
    });
  }
  routerHandle(req, res) {
    let postData = '',
      body;
    req.addListener('data', (data) => {
      postData += data;
    });
    req.addListener('end', () => {
      if (postData && postData !== '') {
        body = JSON.parse(postData);
        this.emit('task_check_kue', body.data);
      }
    });
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok' }));
  }
  getTask() {
    request.get(this.settings.url, (err, res, body) => {
      if (err) {
        this.logger.error('occur error : ', err);
        return;
      }
      if (res.statusCode !== 200) {
        return;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        this.logger.error('json数据解析失败');
        this.logger.info(body);
        return;
      }
      this.logger.debug(body);
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
    if (p === 2 && raw.id === '1045961206') {
      return;
    }
    // if ((p === 6 && raw.id === '6116731501') || (p === 2 && raw.id === '1045961206')) {
    //   return;
    // }
    let job = this.queue.create(raw.platform, {
      id: raw.id,
      p: raw.p,
      name: raw.name,
      encodeId: raw.encodeId,
      type: raw.type,
      mapBid: raw.mapBid
    }).priority(raw.priority)
      .attempts(5)
      .backoff({ delay: 150 * 1000, type: 'fixed' })
      .removeOnComplete(true);
    // if (p !== 6) {
    //   job.attempts(5);
    // }
    if (job.data.type === 0) {
      delete job.data.type;
    }
    if (job.data.encodeId === '') {
      delete job.data.encodeId;
    }
    job.save((err) => {
      if (err) {
        this.logger.error('Create queue occur error', err);
        this.emit('redis_error', { db: 'jobDB', action: 6 });
        return;
      }
      this.taskDB.hset(`${raw.p}:${raw.id}`, 'kue_id', job.id);
      this.logger.debug(`任务: ${job.type}_${job.data.id} 创建完成`);
      job = null;
      raw = null;
    });
  }
  checkKue(raw) {
    const p = Number(raw.p);
    if (((p === 39 || p === 40) && !raw.origin) || ((p === 39 || p === 40) && raw.first)) {
      this.emit('task_set_create', raw);
      return;
    }
    const key = `${raw.p}:${raw.id}`;
    this.taskDB.hget(key, 'kue_id', (error, result) => {
      if (error) {
        this.emit('redis_error', { db: 'taskDB', action: 2 });
        return;
      }
      kue.Job.get(result, raw.platform, (err, job) => {
        if (err) {
          if (err.message.includes('doesnt exist') || err.message === 'invalid id param') {
            this.emit('task_set_create', raw);
          } else {
            this.logger.error('Job get error : ', err);
          }
          return;
        }
        const time = new Date().getTime();
        if ((job.state() === 'active' || job.state() === 'delayed') && time - job.updated_at >= 3600000) {
          this.emit('task_set_create', raw);
          return;
        }
        if (job.state() === 'failed') {
          this.emit('task_set_create', raw);
        }
      });
    });
  }
}
module.exports = mediaScheduler;