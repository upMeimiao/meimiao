#!/bin/sh

path='/root/newStart/'
#这里的-d 参数判断$path是否存在
if [ ! -d ${path} ]
then
    mkdir /root/newStart/
fi
cp ~/qiaosuan/newStart/* ~/newStart/