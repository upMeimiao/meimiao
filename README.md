# QiaoSuan System

------

## Git 分支：

> * master：目前为空，用于后期代码合并
> * scheduler：中控系统
    > *任务调度模块 —— scheduler文件夹
    > *数据发送模块 —— sendServer文件夹
    > *获取用户信息模块 —— servant文件夹
> * spider：爬虫系统
> * staging-scheduler,staging-spider：用于测试环境的中控系统与爬虫系统
> * center：添加任务分片的逻辑的中控系统，主要修改任务调度模块，用于替换旧的逻辑
> * new-spider：与任务分片相适应的爬虫系统，目前还未修改

## 文件及文件夹作用
> * 文件夹绝大部分属于相关任务模块
> * lib —— 自己封装的模块文件夹
> * instance —— 配置文件及log文件夹
> * newStart —— 用于pm2启动的脚本存放文件夹
> * run.js —— 程序启动文件
    > *node run.js -i 配置文件夹下的某个文件夹名 -a 启动文件中定义的方法名

## 主要模块及作用
> * Node内置模块
> *HTTP
> *URL
> *events
> *util
> * pm2 用于Node的进程管理器，了解即可
> * request 用于发送http请求的模块，大部分情况下，不直接用，使用lib下的封装过的req.js（重构时使用lib/request.js）;
某些情况也会直接用；需要学习。
https://www.npmjs.com/package/request
> * kue 代理任务调度的模块，需要学习；
https://www.npmjs.com/package/kue
> * async 处理异步流程的模块，需要学习；
http://caolan.github.io/async/docs.html
> * cheerio node中处理DOM的模块，需要学习；
https://www.npmjs.com/package/cheerio
> * moment JavaScript 日期处理类库
http://momentjs.cn/
> * eventproxy 事件代理
用于代替node提供的events模块
https://www.npmjs.com/package/eventproxy

##其他技术
> * redis
http://www.redis.cn/（中文官网）
http://redis.io/（官网）