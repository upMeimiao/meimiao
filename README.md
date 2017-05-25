# QiaoSuan System

------

> README只提供有限的信息，更详细的资料请查阅[WIKI](http://git.meimiao.net/qiaosuan_spider/code/wikis)

## 监控系统

[Kue监控](http://spider-kue.meimiaoip.com/kue) 

[任务状态监控](http://spider-monitor.meimiaoip.com) 

[认证测试页](http://spider-monitor.meimiaoip.com/auth) 
    

## Git 分支及模块：

> * master：主分支，用于线上环境部署
> * staging：用于测试环境部署的分支
> * 任务调度模块 —— scheduler文件夹
> * 数据发送模块 —— sendServer文件夹
> * 获取用户信息模块 —— servant文件夹
> * Kue UI 监控模块 —— kueMonitor文件夹
> * 监控及一些 web 服务 —— monitor文件夹
> * 爬虫模块 —— spider文件夹

## 文件及文件夹作用
> * 文件夹绝大部分属于相关任务模块
> * lib —— 自己封装的模块文件夹
> * instance —— 配置文件及log文件夹
> * newStart —— 用于pm2启动的脚本存放文件夹
> * run.js —— 程序启动文件
> * node run.js -i 配置文件夹下的某个文件夹名 -a 启动文件中定义的方法名

## 主要模块及作用

> * Node内置模块
> * HTTP
> * URL
> * events
> * util
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
> * eventproxy 事件代理,用于代替node提供的events模块 https://www.npmjs.com/package/eventproxy
> * nodemailer 用于发送邮件
> * node-schedule 用于定时执行任务
> * redis redis数据库连接驱动
> * ioredis redis集群连接驱动

## 其他技术

> * redis  http://www.redis.cn/ （中文官网）  http://redis.io/ （官网）

## 视频需要信息

* author  发布者
* platform  平台id
* bid  帐号id
* aid   视频(文章)id
* title  视频(文章)标题
* desc  视频描述
* play_num  播放量
* read_num  阅读数
* forward_num  转发数
* comment_num  评论数
* save_num  收藏数
* follow_num  关注数
* support  顶
* step  踩
* a_create_time  视频(文章)发布时间
* v_url  播放地址
* v_img  头图
* tag  标签
* class  分类
* long_t  时长

## 专辑视频需要信息

* platform  平台id
* bid  帐号id
* program_list 专辑栏目列表数组（里边存储的是整个列表里的专辑信息）
* program_id   专辑id
* program_name  专辑名称
* link  专辑链接
* play_link  专辑播放链接
* thumbnail  专辑截图
* video_count  专辑视频数量
* view_count  专辑总播放量
* published  专辑创建时间
* video_list  单个专辑里所有的视频ID存储数组

## 评论需要信息

* platform  平台id
* bid  帐号id
* aid   视频(文章)id
* cid  评论id
* content  评论内容
* ctime  评论发布时间
* support  评论信息顶量
* step  评论踩数
* reply  评论回复数
* c_user  用来存放评论者的信息对象
* uid  评论者id
* uname  评论者名称
* uavatar  评论者头像

## 平台ID

1. 优酷视频
2. 爱奇艺
3. 乐视视频
4. 腾讯视频
5. 美拍
6. 今日头条
7. 秒拍
8. 哔哩哔哩
9. 搜狐
10. 天天快报
11. 一点资讯
12. 土豆视频
13. 爆米花
14. 酷6视频
15. 北京时间
16. 微视
17. 小影
18. 百思不得姐
19. 内涵段子
20. YY
21. 56视频
22. AcFun
23. 微博
24. 凤凰号
25. 网易号
26. UC头条号 
27. 芒果视频
28. 百家号
29. qq空间
30. 央视网-爱西柚
31. PPTV
32. 新蓝
33. 第一视频
34. 风行网
35. 华数TV
36. 暴风影音
37. 百度视频
38. 梨视频
39. YouTube
40. Facebook
41. 人人视频
42. 点视
43. 小米想看（spider未支持，巧发支持）
44. 网易菠萝
45. 火山小视频

## 流程图
![spider-flow](http://git.meimiao.net/qiaosuan_spider/code/wikis/img/introduction.svg)