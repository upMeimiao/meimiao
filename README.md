# QiaoSuan System

------

## Git 分支：

> * master：主分支，用于线上环境部署
> *任务调度模块 —— scheduler文件夹
> *数据发送模块 —— sendServer文件夹
> *获取用户信息模块 —— servant文件夹
> *爬虫模块 —— spider文件夹
> * staging：用于测试环境部署的分支
> * taskSheet：添加任务分片的逻辑进行重构的分支

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