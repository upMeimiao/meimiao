const kue = require('kue');
const request = require('request');
const util = require('util');
const os = require('os');
const events = require('events');
const myRedis = require('../lib/myredis.js');
const schedule = require('node-schedule');
const _getTask = require('./getTask');

class commentScheduler {
  constructor(scheduler) {
    events.EventEmitter.call(this);
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
      }
    });
    this.logger.trace('评论任务调度器初始化完成');
  }
  assembly() {
    myRedis.createClient(this.redis.host,
      this.redis.port,
      this.redis.taskDB,
      this.redis.auth,
      (err, cli) => {
        if (err) {
          this.this.logger.error('连接redis数据库出错。错误信息：', err);
          this.this.logger.error('出现错误，程序终止。');
          this.emit('redis_error', { db: 'taskDB', action: 0 });
          process.exit();
          return;
        }
        this.taskDB = cli;
        this.logger.debug('任务信息数据库连接建立...成功');
        const rule = new schedule.RecurrenceRule();
        const osName = os.hostname();
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
        // this.getTask();
        schedule.scheduleJob(rule, () => {
          this.getTask();
        });
      }
    );
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
    this.on('redis_error', (raw) => {
            /**
             * todo send email
             */
      this.logger.error(raw);
    });
    this.assembly();
  }
  getTask() {
    // _getTask.getTask('http://staging-dev.meimiaoip.com/index.php/Spider/videoCommO/getUpdateV?limit=120&platform=',
    //   (err, result) => {
    //     if (!err) {
    //       this.emit('task_loaded', result);
    //     }
    //   }
    // );
    request.get('http://qiaosuan-intra.meimiaoip.com/index.php/Spider/videoCommO/getUpdateV?limit=2000', (err, res, body) => {
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
      this.emit('task_loaded', body);
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
        this.logger.error('Create queue occur error');
        this.logger.error('error: ', err);
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
    // return this.emit('task_set_create', raw);
    const key = `c:${raw.p}:${raw.aid}`;
    this.taskDB.hget(key, 'kue_id', (error, result) => {
      if (error) {
        commentScheduler.emit('redis_error', { db: 'taskDB', action: 2 });
        return;
      }
      const url = `http://${this.settings.kue.ip}:3003/c/api/job/${result}`;
      // const url = `http://127.0.0.1:3000/api/job/${result}`;
      request.get(url, { auth: { user: 'verona', pass: '2319446' } }, (err, res, body) => {
        if (err) {
          this.logger.error('occur error : ', err);
          return;
        }
        if (res.statusCode !== 200) {
          this.logger.error('comment kue : ', res.statusCode);
          return;
        }
        try {
          body = JSON.parse(body);
        } catch (e) {
          this.logger.error('json数据解析失败');
          this.logger.error(body);
          return;
        }
        if (body.error) {
          this.emit('task_set_create', raw);
          return;
        }
        const time = new Date().getTime();
        if ((body.state === 'active' || body.state === 'delayed') && time - body.created_at > 3600000) {
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
util.inherits(commentScheduler, events.EventEmitter);
module.exports = commentScheduler;