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

echo "启动第三级别任务"

echo "启动CCTV"
pm2 start ~/commStart/cctv.json
echo "任务启动完成"

echo "启动内涵段子"
pm2 start ~/commStart/neihan.json
echo "任务内涵段子启动完成"

echo "启动百思不得姐"
pm2 start ~/commStart/budejie.json
echo "任务百思不得姐启动完成"

echo "启动第一视频"
pm2 start ~/commStart/v1.json
echo "任务第一视频启动完成"

echo "启动小影"
pm2 start ~/commStart/xiaoying.json
echo "任务小影启动完成"

echo "启动芒果TV"
pm2 start ~/commStart/mgtv.json
echo "任务芒果TV启动完成"

echo "启动梨视频 "
pm2 start ~/commStart/liVideo.json
echo "任务梨视频启动完成"

echo "启动北京时间"
pm2 start ~/commStart/btime.json
echo "任务北京时间启动完成"

echo "第三优先级任务启动完成"