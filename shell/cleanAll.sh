#!/bin/sh

scheduler_1="10.251.55.50"
scheduler_2="10.169.16.235"
send_1="10.28.79.123"
send_2="10.28.79.37"
spider_0="10.169.22.212"
spider_1="10.163.223.12"
spider_2="10.163.216.52"
spider_3="10.28.227.35"
spider_4="10.28.227.72"
spider_5="10.31.32.107"
spider_6="10.31.32.113"
spider_7="10.28.227.41"
spider_8="10.31.32.95"
spider_9="10.30.144.86"

spider_comment_1="10.31.50.81"
spider_comment_2="10.25.80.59"
spider_comment_3="10.25.79.173"
spider_comment_4="10.31.50.82"
spider_comment_5="10.31.48.66"
spider_comment_6="10.25.12.26"
spider_comment_7="10.31.50.74"
spider_comment_8="10.26.176.183"
spider_comment_9="10.26.173.137"
spider_comment_10="10.25.76.108"

echo "--------------中控服务器log 清理--------------"
echo
echo "--------------$scheduler_1--------------"
cd ~/qiaosuan && sh clean.sh
echo "-------------- $scheduler_1 log 清理完成--------------"
echo
for loop in ${scheduler_2} ${spider_0} ${send_1} ${send_2} ${spider_1} ${spider_2} ${spider_3} ${spider_4} ${spider_5} ${spider_6} ${spider_7} ${spider_8} ${spider_9} ${spider_comment_1} ${spider_comment_2} ${spider_comment_3} ${spider_comment_4} ${spider_comment_5} ${spider_comment_6} ${spider_comment_7} ${spider_comment_8} ${spider_comment_9} ${spider_comment_10}
do
    echo
    echo "--------------$loop--------------"
    echo "--------------登录服务器$loop --------------"
    echo "--------------服务器${loop} log 清理--------------"
    echo
    ssh root@${loop} 'cd ~/qiaosuan && sh clean.sh'
    echo
    echo "--------------log 清理完成，退出服务器$loop --------------"
    echo
done