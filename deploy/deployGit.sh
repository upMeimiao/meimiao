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

echo "--------------更新中控服务器代码--------------"
echo
echo "--------------$scheduler_1--------------"
cd ~/qiaosuan && git pull origin master
echo "-------------- $scheduler_1 代码更新完成--------------"
echo
for loop in ${scheduler_2} ${send_1} ${send_2} ${spider_1} ${spider_2} ${spider_3} ${spider_4} ${spider_5} ${spider_6}
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
#echo "--------------$scheduler_2--------------"
#echo "登录scheduler_2服务器$scheduler_2"
#ssh root@${scheduler_2} 'cd ~/qiaosuan && git pull origin master'
#echo "代码更新完成，退出服务器scheduler_2"
#echo
#echo "--------------$spider_1--------------"
#echo "登录spider_1服务器$spider_1"
#ssh root@10.163.223.12 'cd ~/qiaosuan && git pull origin master'
#echo "代码更新完成，退出服务器spider_1"
#echo
#echo "登录spider服务器10.163.223.12"
#ssh root@10.163.216.52 'cd ~/qiaosuan && git pull origin master'
#echo "代码更新完成，退出该服务器"
#echo "登录spider服务器10.163.223.12"
#ssh root@10.169.22.212 'cd ~/qiaosuan && git pull origin master'
