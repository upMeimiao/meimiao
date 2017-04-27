#!/bin/sh

path1='/root/newStart/'
path2='/root/commStart/'
#这里的-d 参数判断$path是否存在
if [ ! -d ${path1} ]
then
    mkdir /root/newStart/
fi
cp ~/qiaosuan/newStart/* ~/newStart/

if [ ! -d ${path2} ]
then
    mkdir /root/commStart/
fi
cp ~/qiaosuan/commStart/* ~/commStart/