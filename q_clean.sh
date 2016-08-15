#!/bin/sh
echo "开启清理巧算日志文件"
cd /root/qiaosuan/instance/servant/logs
rm -rf *.log
rm -rf *.log-*
cd /root/qiaosuan/instance/input/logs
rm -rf *.log
rm -rf *.log-*
cd /root/qiaosuan/instance/scheduler/logs
rm -rf *.log
rm -rf *.log-*
echo "巧算日志文件清理完毕"