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

echo "启动第二级别任务"

echo "启动酷6"
pm2 start ~/commStart/ku6.json
echo "任务酷6启动完成"

echo "启动56视频"
pm2 start ~/commStart/tv56.json
echo "任务56视频启动完成"

echo "启动爆米花"
pm2 start ~/commStart/baomihua.json
echo "任务爆米花启动完成"

echo "启动凤凰号"
pm2 start ~/commStart/ifeng.json
echo "任务凤凰号启动完成"

echo "启动百度百家"
pm2 start ~/commStart/baijia.json
echo "任务百度百家启动完成"

echo "启动一点资讯"
pm2 start ~/commStart/yidian.json
echo "任务一点资讯启动完成"

echo "启动网易"
pm2 start ~/commStart/wangyi.json
echo "任务网易启动完成"

echo "启动UC头条"
pm2 start ~/commStart/uctt.json
echo "任务UC头条启动完成"

echo "第二优先级任务启动完成"