#!/bin/sh
echo "开启清理一色爬虫日志文件"
cd /root/yise_statistics_spider/instance/bili/logs
rm -rf *
cd /root/yise_statistics_spider/instance/config/logs
rm -rf *
cd /root/yise_statistics_spider/instance/iqiyi/logs
rm -rf *
cd /root/yise_statistics_spider/instance/le/logs
rm -rf *
cd /root/yise_statistics_spider/instance/meipai/logs
rm -rf *
cd /root/yise_statistics_spider/instance/miaopai/logs
rm -rf *
cd /root/yise_statistics_spider/instance/toutiao/logs
rm -rf *
cd /root/yise_statistics_spider/instance/tx/logs
rm -rf *
cd /root/yise_statistics_spider/instance/youku/logs
rm -rf *
echo "yis爬虫日志文件清理完毕"