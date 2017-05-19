#!/bin/sh
echo "开启清理巧算日志文件"
#echo "开启清理调度日志文件"
cd /root/qiaosuan/instance/master/logs
rm -rf *.log
rm -rf *.log-*
rm -rf *.log.*.gz
cd /root/qiaosuan/instance/scheduler/logs
rm -rf *.log
rm -rf *.log-*
rm -rf *.log.*.gz
cd /root/qiaosuan/instance/monitorSpider/logs
rm -rf *.log
rm -rf *.log-*
rm -rf *.log.*.gz

#echo "开启清理爬虫日志文件"
#cd /root/qiaosuan/instance/master/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/baomihua/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/bili/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/btime/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/budejie/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/iqiyi/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/ku6/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/kuaibao/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/le/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/meipai/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/miaopai/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/neihan/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/souhu/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/tencent/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/toutiao/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/tudou/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/weishi/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/xiaoying/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/yidian/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/youku/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/yy/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/acfun/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/tv56/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/ifeng/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/uctt/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
#cd /root/qiaosuan/instance/wangyi/logs
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz
echo "巧算日志文件清理完毕"

echo "开启pm2日志文件"
cd /root/.pm2/logs
rm -rf ./*
echo "pm2日志文件清理完毕"