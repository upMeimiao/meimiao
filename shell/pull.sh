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
spider_5="10.161.93.13"
spider_6="10.252.29.87"
spider_7="10.28.227.41"
spider_8="10.144.191.122"
spider_9="10.30.144.86"

echo $1

case $1 in
'')
    echo '缺少参数'
    echo 'pull  更新所有服务器node代码'
    echo 'update  更新所有服务器pm2版本'
    ;;
'pull')
    echo "--------------更新中控服务器代码--------------"
    echo
    echo "--------------$scheduler_1--------------"
    cd ~/qiaosuan && git pull origin master
    echo "-------------- $scheduler_1 代码更新完成--------------"
    echo
    for loop in ${scheduler_2} ${send_1} ${send_2} ${spider_0} ${spider_1} ${spider_2} ${spider_3} ${spider_4} ${spider_5} ${spider_6} ${spider_7} ${spider_8} ${spider_9}
    do
        echo
        echo "--------------$loop--------------"
        echo "--------------登录服务器$loop --------------"
        echo "--------------更新服务器${loop}代码--------------"
        echo
        ssh root@${loop} 'cd ~/qiaosuan && git pull origin master'
        echo
        echo "--------------代码更新完成，退出服务器$loop --------------"
        echo
    done
    ;;
'update')
    for loop in ${send_1} ${send_2} ${spider_1} ${spider_2} ${spider_3} ${spider_4} ${spider_5} ${spider_6} ${spider_7} ${spider_8} ${spider_9} ${scheduler_2}
    do
        echo
        echo "--------------$loop--------------"
        echo "--------------登录服务器$loop --------------"
        echo "--------------服务器${loop} pm2 update--------------"
        echo
        ssh root@${loop} 'pm2 update'
        echo
        echo "--------------pm2 update完成，退出服务器$loop --------------"
        echo
    done
    echo "--------------中控服务器pm2 update--------------"
    echo
    echo "--------------$scheduler_1--------------"
    pm2 update
    echo "-------------- $scheduler_1 pm2 update完成--------------"
    echo
    ;;
esac
