#!/bin/sh
echo "启动 彩虹 spider"

echo "启动第一级别任务"

echo "启动秒拍"
pm2 start ~/commStart/miaopai.json
echo "任务秒拍启动完成"

echo "启动哔哩哔哩"
pm2 start ~/commStart/bili.json
echo "任务哔哩哔哩启动完成"

echo "启动搜狐"
pm2 start ~/commStart/souhu.json
echo "任务搜狐启动完成"

echo "启动天天快报"
pm2 start ~/commStart/kuaibao.json
echo "任务天天快报启动完成"

echo "启动微博"
pm2 start ~/commStart/weibo.json
echo "任务微博启动完成"


echo "启动酷6"
pm2 start ~/commStart/ku6.json
echo "任务酷6启动完成"

echo "启动北京时间"
pm2 start ~/commStart/btime.json
echo "任务北京时间启动完成"

echo "启动微视"
pm2 start ~/commStart/weishi.json
echo "任务微视启动完成"

echo "启动小影"
pm2 start ~/commStart/xiaoying.json
echo "任务小影启动完成"

echo "启动百思不得姐"
pm2 start ~/commStart/budejie.json
echo "任务百思不得姐启动完成"

echo "启动内涵段子"
pm2 start ~/commStart/neihan.json
echo "任务内涵段子启动完成"

echo "启动YY"
pm2 start ~/commStart/yy.json
echo "任务YY启动完成"

echo "启动芒果TV"
pm2 start ~/commStart/mgtv.json
echo "任务芒果TV启动完成"

echo "启动华数TV"
pm2 start ~/commStart/huashu.json
echo "任务华数TV启动完成"

echo "启动56视频"
pm2 start ~/commStart/tv56.json
echo "任务56视频启动完成"

echo "启动风行网"
pm2 start ~/commStart/fengxing.json
echo "任务风行网启动完成"

echo "启动第一视频"
pm2 start ~/commStart/v1.json
echo "任务第一视频启动完成"

echo "启动暴风影音"
pm2 start ~/commStart/baofeng.json
echo "任务暴风影音启动完成"

echo "启动新蓝网"
pm2 start ~/commStart/xinlan.json
echo "任务新蓝网启动完成"

echo "第三优先级任务启动完成"