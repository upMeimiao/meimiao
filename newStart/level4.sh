#!/bin/sh
echo "启动 彩虹 spider"

echo "启动第一级别任务"

echo "启动优酷"
pm2 start ~/newStart/youku.json
echo "任务优酷启动完成"

echo "启动爱奇艺"
pm2 start ~/newStart/iqiyi.json
echo "任务爱奇艺启动完成"

echo "启动腾讯"
pm2 start ~/newStart/tencent.json
echo "任务腾讯启动完成"

echo "启动美拍"
pm2 start ~/newStart/meipai.json
echo "任务美拍启动完成"

echo "启动今日头条"
pm2 start ~/newStart/toutiao.json
echo "任务今日头条启动完成"

echo "启动秒拍"
pm2 start ~/newStart/miaopai.json
echo "任务秒拍启动完成"

echo "启动哔哩哔哩"
pm2 start ~/newStart/bili.json
echo "任务哔哩哔哩启动完成"

echo "启动搜狐"
pm2 start ~/newStart/souhu.json
echo "任务搜狐启动完成"

echo "启动天天快报"
pm2 start ~/newStart/kuaibao.json
echo "任务天天快报启动完成"

echo "启动微博"
pm2 start ~/newStart/weibo.json
echo "任务微博启动完成"

echo "启动乐视"
pm2 start ~/newStart/le.json
echo "任务乐视启动完成"

echo "启动土豆"
pm2 start ~/newStart/tudou.json
echo "任务土豆启动完成"

echo "第一优先级任务启动完成"

echo "启动第五级别任务"

echo "启动微视"
pm2 start ~/newStart/weishi.json
echo "任务微视启动完成"

echo "启动北京时间"
pm2 start ~/newStart/btime.json
echo "任务北京时间启动完成"

echo "启动百思不得姐"
pm2 start ~/newStart/budejie.json
echo "任务百思不得姐启动完成"

echo "启动新蓝网"
pm2 start ~/newStart/xinlan.json
echo "任务新蓝网启动完成"

echo "启动YY"
pm2 start ~/newStart/yy.json
echo "任务YY启动完成"

echo "启动百度视频"
pm2 start ~/newStart/baiduVideo.json
echo "任务百度视频启动完成"

echo "启动人人视频"
pm2 start ~/newStart/renren.json
echo "任务人人视频启动完成"

echo "启动点视"
pm2 start ~/newStart/dianshi.json
echo "任务点视启动完成"

echo "启动网易菠萝"
pm2 start ~/newStart/bolo.json
echo "任务网易菠萝启动完成"

echo "第四优先级任务启动完成"