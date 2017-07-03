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
cd /root/qiaosuan/instance/overseas/logs
rm -rf *.log
rm -rf *.log-*
rm -rf *.log.*.gz
cd /root/qiaosuan/instance/comment/logs
rm -rf *.log
rm -rf *.log-*
rm -rf *.log.*.gz
cd /root/qiaosuan/instance/comment_overseas/logs
rm -rf *.log
rm -rf *.log-*
rm -rf *.log.*.gz
rm -rf /root/qiaosuan/instance/*/logs/*.log*
#rm -rf *.log
#rm -rf *.log-*
#rm -rf *.log.*.gz

echo "巧算日志文件清理完毕"

echo "开启pm2日志文件"
pm2 flush
cd /root/.pm2/logs
rm -rf ./*__*.log
echo "pm2日志文件清理完毕"