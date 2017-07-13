const kue = require('kue');
const request = require('request');
const os = require('os');
const HTTP = require('http');
const events = require('events');
const Redis = require('ioredis');
const schedule = require('node-schedule');
// const _getTask = require('./getTask');

class commentScheduler extends events {
  constructor(scheduler) {
    super();
    this.settings = scheduler.settings;
    this.redis = scheduler.redis;
    this.logger = scheduler.logger;
    this.handle = new (require('./commentHandle'))(this);
    this.queue = kue.createQueue({
      prefix: 'c',
      redis: {
        port: this.redis.port,
        host: this.redis.host,
        auth: this.redis.auth,
        db: this.redis.jobDB
      },
      jobEvents: false
    });
    this.logger.trace('评论任务调度器初始化完成');
  }
  assembly() {
    this.taskDB = new Redis(`redis://:${this.redis.auth}@${this.redis.host}:${this.redis.port}/${this.redis.taskDB}`, {
      reconnectOnError(err) {
        return err.message.slice(0, 'READONLY'.length) === 'READONLY';
      }
    });
    const rule = new schedule.RecurrenceRule();
    const osName = os.hostname();
    if (osName === 'iZt4n0b9sw5qoog46blmorZ') {
      this.createServer();
    } else {
      switch (osName) {
        case 'servant_3':
          rule.second = [1, 21, 41];
          // rule.second = [20, 50];
          break;
        case 'iZ28ilm78mlZ':
          rule.second = [11, 31, 51];
          break;
        default:
          rule.second = [1, 11, 21, 31, 31, 51];
          break;
      }
      schedule.scheduleJob(rule, () => {
        this.getTask();
      });
      // this.getTask();
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
    this.on('task_check_snapshots', (raw) => {
      this.handle.checkSnapshots(raw);
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
    server.listen(2889, () => {
      this.logger.debug('Server running at 2889 port');
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
        this.emit('task_loaded', body);
      }
    });
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok' }));
  }
  getTask() {
    // _getTask.getTask('http://staging-dev.meimiaoip.com/index.php/Spider/videoCommO/getUpdateV?limit=120&platform=',
    //   (err, result) => {
    //     if (!err) {
    //       this.emit('task_loaded', result);
    //     }
    //   }
    // );
    request.get(this.settings.url, (err, res, body) => {
      if (err) {
        this.logger.error('occur error : ', err);
        return;
      }
      if (res.statusCode !== 200) {
        this.logger.error('get comment task : ', res.statusCode);
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
      if (!body.data || !Array.isArray(body.data) || body.data.length === 0) return;
      if (Number(body.data[0].platform) === 39 || Number(body.data[0].platform) === 40) {
        this.emit('origin_youtube', body.data);
        return;
      }
      this.emit('task_loaded', body);
    });
  }
  originOverseas(raw) {
    const options = {
      method: 'POST',
      url: 'http://spider-overseas.meimiaoip.com:51905/origin/sc/comment/',
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
    let jobType;
    if (Number(raw.taskType) === 0) {
      jobType = `comment_${raw.platform}`;
    }
    if (Number(raw.taskType) === 1) {
      jobType = `comment_update_${raw.platform}`;
    }
    let job = this.queue.create(jobType, {
      p: raw.p,
      bid: raw.bid,
      aid: raw.aid,
      taskType: raw.taskType,
      commentId: raw.comment_id,
      commentTime: raw.comment_time,
      commentNum: raw.comment_num
    }).priority('critical').attempts(5).backoff({ delay: 20 * 1000, type: 'fixed' })
      .removeOnComplete(true);
    job.save((err) => {
      if (err) {
        this.logger.error('Create queue occur error：', err);
        this.emit('redis_error', { db: 'jobDB', action: 6 });
        return;
      }
      this.taskDB.hset(`c:${raw.p}:${raw.aid}`, 'kue_id', job.id);
      this.logger.debug(`任务: ${job.type}_${job.data.aid} 创建完成`);
      job = null;
      raw = null;
    });
  }
  checkKue(raw) {
    const key = `c:${raw.p}:${raw.aid}`;
    this.taskDB.hget(key, 'kue_id', (error, result) => {
      if (error) {
        commentScheduler.emit('redis_error', { db: 'taskDB', action: 2 });
        return;
      }
      kue.Job.get(result, `comment_${raw.platform}`, (err, job) => {
        if (err) {
          // if (err.message.includes('doesnt exist') || err.message === 'invalid id param') {
          //   this.emit('task_set_create', raw);
          // } else {
          //   this.logger.error('Job get error : ', err);
          // }
          this.emit('task_set_create', raw);
          return;
        }
        const time = new Date().getTime();
        if ((job.state() === 'active' || job.state() === 'delayed') && time - job.created_at >= 3600000) {
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
module.exports = commentScheduler;