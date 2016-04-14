#!/bin/sh
echo "开启清理爬虫日志文件"
cd /root/neoc_spider/instance/servant/logs
rm -rf *
cd /root/neoc_spider/instance/servant2/logs
rm -rf *
echo "爬虫日志文件清理完毕"