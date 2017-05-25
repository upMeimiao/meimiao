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
            ssh root@${loop} 'pm2 reload servant'
            echo
            echo "--------------调度服务重启完成，退出服务器$loop --------------"
            echo
        done
        ;;
    'auth')
        echo "--------------重启认证服务--------------"
        echo
        echo "--------------$scheduler_1--------------"
        pm2 reload 认证中心
        echo "-------------- 重启$scheduler_1 认证服务--------------"
        echo
        for loop in ${scheduler_2}
        do
            echo
            echo "--------------$loop--------------"
            echo "--------------登录服务器$loop --------------"
            echo "--------------重启${loop}认证服务--------------"
            echo
            ssh root@${loop} 'pm2 reload 认证中心'
            echo
            echo "--------------调度服务重启完成，退出服务器$loop --------------"
            echo
        done
        ;;
    esac
elif [ $1 == 'se' ]
then
    case $2 in
    'v')
        for loop in ${send_1} ${send_2}
        do
            echo
            echo "--------------$loop--------------"
            echo "--------------登录服务器$loop --------------"
            echo "--------------重启${loop}视频数据发送服务--------------"
            echo
            ssh root@${loop} 'pm2 reload send'
            echo
            echo "--------------视频数据发送服务重启完成，退出服务器$loop --------------"
            echo
        done
        ;;
    'c')
        for loop in ${send_1} ${send_2}
        do
            echo
            echo "--------------$loop--------------"
            echo "--------------登录服务器$loop --------------"
            echo "--------------重启${loop}评论数据发送服务--------------"
            echo
            ssh root@${loop} 'pm2 reload c_send'
            echo
            echo "--------------评论数据发送服务重启完成，退出服务器$loop --------------"
            echo
        done
        ;;
    esac
elif [ $1 == 'sp' ]
then
    for loop in ${spider_0} ${spider_1} ${spider_2} ${spider_3} ${spider_4} ${spider_5} ${spider_6} ${spider_7} ${spider_8} ${spider_9}
        do
            echo
            echo "--------------$loop--------------"
            echo "--------------登录服务器$loop --------------"
            echo "--------------重启${loop} $2 服务--------------"
            echo
            case $2 in
            '优酷')
                ssh root@${loop} 'pm2 reload 优酷'
                ;;
            '爱奇艺')
                ssh root@${loop} 'pm2 reload 爱奇艺'
                ;;
            '腾讯视频')
                ssh root@${loop} 'pm2 reload 腾讯视频'
                ;;
            '今日头条')
                ssh root@${loop} 'pm2 reload 今日头条'
                ;;
            '秒拍')
                ssh root@${loop} 'pm2 reload 秒拍'
                ;;
            '哔哩哔哩')
                ssh root@${loop} 'pm2 reload 哔哩哔哩'
                ;;
            '美拍')
                ssh root@${loop} 'pm2 reload 美拍'
                ;;
            '搜狐')
                ssh root@${loop} 'pm2 reload 搜狐'
                ;;
            '天天快报')
                ssh root@${loop} 'pm2 reload 天天快报'
                ;;
            '乐视')
                ssh root@${loop} 'pm2 reload 乐视'
                ;;
            '一点资讯')
                ssh root@${loop} 'pm2 reload 一点资讯'
                ;;
            '土豆')
                ssh root@${loop} 'pm2 reload 土豆'
                ;;
            '爆米花')
                ssh root@${loop} 'pm2 reload 爆米花'
                ;;
            '网易号')
                ssh root@${loop} 'pm2 reload 网易号'
                ;;
            'acFun')
                ssh root@${loop} 'pm2 reload acFun'
                ;;
            'UC头条')
                ssh root@${loop} 'pm2 reload UC头条'
                ;;
            '凤凰号')
                ssh root@${loop} 'pm2 reload 凤凰号'
                ;;
            'QQ空间')
                ssh root@${loop} 'pm2 reload QQ空间'
                ;;
            '酷6')
                ssh root@${loop} 'pm2 reload 酷6'
                ;;
            '北京时间')
                ssh root@${loop} 'pm2 reload 北京时间'
                ;;
            '小影')
                ssh root@${loop} 'pm2 reload 小影'
                ;;
            '百思不得姐')
                ssh root@${loop} 'pm2 reload 百思不得姐'
                ;;
            '内涵段子')
                ssh root@${loop} 'pm2 reload 内涵段子'
                ;;
            'yy')
                ssh root@${loop} 'pm2 reload yy'
                ;;
            '芒果TV')
                ssh root@${loop} 'pm2 reload 芒果TV'
                ;;
            '56视频')
                ssh root@${loop} 'pm2 reload 56视频'
                ;;
            'PPTV')
                ssh root@${loop} 'pm2 reload PPTV'
                ;;
            '央视')
                ssh root@${loop} 'pm2 reload 央视'
                ;;
            '微博')
                ssh root@${loop} 'pm2 reload 微博'
                ;;
            '微视')
                ssh root@${loop} 'pm2 reload 微视'
                ;;
            '风行网')
                ssh root@${loop} 'pm2 reload 风行网'
                ;;
            '第一视频')
                ssh root@${loop} 'pm2 reload 第一视频'
                ;;
            '新蓝网')
                ssh root@${loop} 'pm2 reload 新蓝网'
                ;;
            '华数')
                ssh root@${loop} 'pm2 reload 华数'
                ;;
            '暴风')
                ssh root@${loop} 'pm2 reload 暴风'
                ;;
            '百度视频')
                ssh root@${loop} 'pm2 reload 百度视频'
                ;;
            '百家号')
                ssh root@${loop} 'pm2 reload 百家号'
                ;;
            '梨视频')
                ssh root@${loop} 'pm2 reload 梨视频'
                ;;
            '人人视频')
                ssh root@${loop} 'pm2 reload 人人视频'
                ;;
            '点视')
                ssh root@${loop} 'pm2 reload 点视'
                ;;
            '网易菠萝')
                ssh root@${loop} 'pm2 reload 网易菠萝'
                ;;
            '火山小视频')
                ssh root@${loop} 'pm2 reload 火山小视频'
                ;;
            esac
            echo
            echo "--------------$2 视频服务重启完成，退出服务器 $loop --------------"
            echo
        done
elif [ $1 == 'sp_c' ]
then
    for loop in ${spider_comment_1} ${spider_comment_2} ${spider_comment_3} ${spider_comment_4} ${spider_comment_5} ${spider_comment_6} ${spider_comment_7} ${spider_comment_8} ${spider_comment_9} ${spider_comment_10}
        do
            echo
            echo "--------------$loop--------------"
            echo "--------------登录服务器$loop --------------"
            echo "--------------重启${loop} $2 服务--------------"
            echo
            case $2 in
            '优酷')
                ssh root@${loop} 'pm2 reload 优酷'
                ;;
            '爱奇艺')
                ssh root@${loop} 'pm2 reload 爱奇艺'
                ;;
            '腾讯视频')
                ssh root@${loop} 'pm2 reload 腾讯视频'
                ;;
            '今日头条')
                ssh root@${loop} 'pm2 reload 今日头条'
                ;;
            '秒拍')
                ssh root@${loop} 'pm2 reload 秒拍'
                ;;
            '哔哩哔哩')
                ssh root@${loop} 'pm2 reload 哔哩哔哩'
                ;;
            '美拍')
                ssh root@${loop} 'pm2 reload 美拍'
                ;;
            '搜狐')
                ssh root@${loop} 'pm2 reload 搜狐'
                ;;
            '天天快报')
                ssh root@${loop} 'pm2 reload 天天快报'
                ;;
            '乐视')
                ssh root@${loop} 'pm2 reload 乐视'
                ;;
            '一点资讯')
                ssh root@${loop} 'pm2 reload 一点资讯'
                ;;
            '土豆')
                ssh root@${loop} 'pm2 reload 土豆'
                ;;
            '爆米花')
                ssh root@${loop} 'pm2 reload 爆米花'
                ;;
            '网易号')
                ssh root@${loop} 'pm2 reload 网易号'
                ;;
            'acFun')
                ssh root@${loop} 'pm2 reload acFun'
                ;;
            'UC头条')
                ssh root@${loop} 'pm2 reload UC头条'
                ;;
            '凤凰号')
                ssh root@${loop} 'pm2 reload 凤凰号'
                ;;
            'QQ空间')
                ssh root@${loop} 'pm2 reload QQ空间'
                ;;
            '酷6')
                ssh root@${loop} 'pm2 reload 酷6'
                ;;
            '北京时间')
                ssh root@${loop} 'pm2 reload 北京时间'
                ;;
            '小影')
                ssh root@${loop} 'pm2 reload 小影'
                ;;
            '百思不得姐')
                ssh root@${loop} 'pm2 reload 百思不得姐'
                ;;
            '内涵段子')
                ssh root@${loop} 'pm2 reload 内涵段子'
                ;;
            'yy')
                ssh root@${loop} 'pm2 reload yy'
                ;;
            '芒果TV')
                ssh root@${loop} 'pm2 reload 芒果TV'
                ;;
            '56视频')
                ssh root@${loop} 'pm2 reload 56视频'
                ;;
            'PPTV')
                ssh root@${loop} 'pm2 reload PPTV'
                ;;
            '央视')
                ssh root@${loop} 'pm2 reload 央视'
                ;;
            '微博')
                ssh root@${loop} 'pm2 reload 微博'
                ;;
            '微视')
                ssh root@${loop} 'pm2 reload 微视'
                ;;
            '风行网')
                ssh root@${loop} 'pm2 reload 风行网'
                ;;
            '第一视频')
                ssh root@${loop} 'pm2 reload 第一视频'
                ;;
            '新蓝网')
                ssh root@${loop} 'pm2 reload 新蓝网'
                ;;
            '华数')
                ssh root@${loop} 'pm2 reload 华数'
                ;;
            '暴风')
                ssh root@${loop} 'pm2 reload 暴风'
                ;;
            '百度视频')
                ssh root@${loop} 'pm2 reload 百度视频'
                ;;
            '百家号')
                ssh root@${loop} 'pm2 reload 百家号'
                ;;
            '梨视频')
                ssh root@${loop} 'pm2 reload 梨视频'
                ;;
            '人人视频')
                ssh root@${loop} 'pm2 reload 人人视频'
                ;;
            '点视')
                ssh root@${loop} 'pm2 reload 点视'
                ;;
            '网易菠萝')
                ssh root@${loop} 'pm2 reload 网易菠萝'
                ;;
            '火山小视频')
                ssh root@${loop} 'pm2 reload 火山小视频'
                ;;
            esac
            echo
            echo "--------------$2 评论服务重启完成，退出服务器 $loop --------------"
            echo
        done
else
    echo "参数缺失"
fi