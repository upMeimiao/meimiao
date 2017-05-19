#!/bin/sh
echo "启动 彩虹 spider"

echo "启动第一级别任务"

echo "启动美拍"
pm2 start ~/commStart/meipai.json
echo "任务美拍启动完成"

echo "启动秒拍"
pm2 start ~/commStart/miaopai.json
echo "任务秒拍启动完成"

echo "启动哔哩哔哩"
pm2 start ~/commStart/bili.json
echo "任务哔哩哔哩启动完成"

echo "启动微博"
pm2 start ~/commStart/weibo.json
echo "任务微博启动完成"

echo "启动QQ空间"
pm2 start ~/commStart/qzone.json
echo "任务启动QQ空间完成"

echo "启动AcFun"
pm2 start ~/commStart/acfun.json
echo "任务AcFun启动完成"

echo "启动今日头条"
pm2 start ~/commStart/toutiao.json
echo "任务今日头条启动完成"

echo "启动天天快报"
pm2 start ~/commStart/kuaibao.json
echo "任务天天快报启动完成"

echo "启动优酷"
pm2 start ~/commStart/youku.json
echo "任务优酷启动完成"

echo "启动爱奇艺"
pm2 start ~/commStart/iqiyi.json
echo "任务爱奇艺启动完成"

echo "启动腾讯"
pm2 start ~/commStart/tencent.json
echo "任务腾讯启动完成"

echo "启动搜狐"
pm2 start ~/commStart/souhu.json
echo "任务搜狐启动完成"

echo "启动乐视"
pm2 start ~/commStart/le.json
echo "任务乐视启动完成"

echo "启动土豆"
pm2 start ~/commStart/tudou.json
echo "任务土豆启动完成"

echo "第一优先级任务启动完成"

echo "启动第四级别任务"

echo "启动微视"
pm2 start ~/commStart/weishi.json
echo "任务微视启动完成"

echo "启动YY"
pm2 start ~/commStart/yy.json
echo "任务YY启动完成"

echo "启动华数TV"
pm2 start ~/commStart/huashu.json
echo "任务华数TV启动完成"

echo "启动风行网"
pm2 start ~/commStart/fengxing.json
echo "任务风行网启动完成"

echo "启动暴风影音"
pm2 start ~/commStart/baofeng.json
echo "任务暴风影音启动完成"

echo "启动新蓝网"
pm2 start ~/commStart/xinlan.json
echo "任务新蓝网启动完成"

echo "启动PPTV"
pm2 start ~/commStart/pptv.json
echo "任务启动完成"

echo "启动人人视频"
pm2 start ~/commStart/renren.json
echo "任务人人视频启动完成"

echo "第四优先级任务启动完成"