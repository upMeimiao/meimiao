class scheduler {
  constructor(settings) {
    this.settings = settings;
    this.redis = settings.redis;
    this.logger = settings.logger;
  }
  start() {
    switch (this.settings.type) {
      case 'video':
        this.mediaScheduler = new (require('./media'))(this);
        this.logger.trace('调度器初始化完成');
        this.mediaScheduler.start();
        break;
      case 'comment':
        this.commentScheduler = new (require('./comment'))(this);
        this.logger.trace('调度器初始化完成');
        this.commentScheduler.start();
        break;
      default:
        this.mediaScheduler = new (require('./media'))(this);
        this.logger.trace('调度器初始化完成');
        this.mediaScheduler.start();
        break;
    }
  }
}
module.exports = scheduler;