#!/bin/sh

scheduler_1="10.251.55.50"
scheduler_2="10.169.16.235"
send_1="10.28.79.123"
send_2="10.28.79.37"
spider_1="10.163.223.12"
spider_2="10.163.216.52"
spider_3="10.169.22.212"
spider_4="10.161.93.13"
spider_5="10.252.29.87"
spider_6="10.144.191.122"

echo $1
if [ $1 == 'sc' ]
then
    case $2 in
    'scheduler')
        echo "--------------重启调度服务--------------"
        echo
        echo "--------------$scheduler_1--------------"
        pm2 reload 调度中心
        echo "-------------- 重启$scheduler_1 调度服务--------------"
        echo
        for loop in ${scheduler_2}
        do
            echo
            echo "--------------$loop--------------"
            echo "--------------登录服务器$loop --------------"
            echo "--------------重启${loop}调度服务--------------"
            echo
            ssh root@${loop} 'pm2 reload 调度中心'
            echo
            echo "--------------调度服务重启完成，退出服务器$loop --------------"
            echo
        done
        ;;
    'servant')
        echo "--------------重启servant服务--------------"
        echo
        echo "--------------$scheduler_1--------------"
        pm2 reload servant
        echo "-------------- 重启$scheduler_1 servant服务--------------"
        echo
        for loop in ${scheduler_2}
        do
            echo
            echo "--------------$loop--------------"
            echo "--------------登录服务器$loop --------------"
            echo "--------------重启${loop}调度服务--------------"
            echo
            ssh root@${loop} 'pm2 reload 调度中心'
            echo
            echo "--------------调度服务重启完成，退出服务器$loop --------------"
            echo
        done
        ;;
    esac
elif [ $1 == 'se' ]
then
    command2
else
    commandN
fi