# -*-coding:utf-8 -*-
import json


def test(data):
    info = json.loads(data)
    return json.dumps(info)
