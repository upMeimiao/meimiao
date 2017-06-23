/**
 * Created by zhupenghui on 17/6/22.
 */
const async = require( 'neo-async' );
const cheerio = require('cheerio');
const request = require( '../../lib/request' );
const infoCheck = require('../controllers/infoCheck');

const jsonp = (data) => data;
let logger, typeErr;
class dealWith {
  constructor(core) {
    this.core = core;
    this.settings = core.settings;
    logger = this.settings.logger;
    logger.trace('huashu monitor begin...');
  }
  start(task, callback) {
    task.timeout = 0;
    this.getVideo(task, () => {
      callback();
    });
  }
  getUser(task) {
    const name = encodeURIComponent(task.name),
      option = {
      url: `http://www.fun.tv/search/?word=${name}&type=site`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'user', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'user', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      const $ = cheerio.load(result.body),
        list = $('div.search-result>div.search-item'),
        user = {};
      for (let i = 0; i < list.length; i += 1) {
        const bid = list.eq(i).attr('block').match(/g_\d*/).toString()
          .replace('g_', '');
        if (task.id == bid) {
          user.fans_num = list.eq(i).find('div.mod-li-i div.mod-sub-wrap span.sub-tip b').text();
          break;
        }
      }
      if (!user.fans_num) {
        typeErr = {type: 'data', err: 'fengxing-dom-fans-error', interface: 'user', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getVideo(task, callback) {
    const option = {
      url: this.settings.spiderAPI.huashu.videoList + task.id
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVideo', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVideo', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getVideo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      for (let i = 0; i < result[1].aggData.length; i += 1) {
        if (result[1].aggData[i].name === '华数') {
          result = result[1].aggData[i];
          break;
        }
      }
      const vidInfo = result.aggRel,
        contents = result.aggChild.data[0].tele_data,
        length = contents.length;
      task.listid = vidInfo.video_sid;
      task.total = length;
      if (contents[0].vuid != null) {
        this.getVideoList(task, () => {
          callback();
        });
        return;
      }
      this.getVidInfo(task, contents[0].assetid);
      this.getComment(task, vidInfo.video_sid);
      this.getPlay(task, contents[0].assetid);
      callback();
    });
  }
  getVideoList(task, callback) {
    const option = {
      url: this.settings.spiderAPI.huashu.videoList2 + task.listid
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVideoList', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVideoList', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        callback();
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getVideoList', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        callback();
        return;
      }
      const contents = result.dramadatas;
      task.type = 'list2';
      this.getVidInfo(task, contents[0].episodeid);
      this.getComment(task, result.video_sid);
      this.getPlay(task,contents[0].episodeid);
      callback();
    });
  }
  getVidInfo(task, vid) {
    const option = {
      url: `http://clientapi.wasu.cn/Phone/vodinfo/id/${vid}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getVidInfo', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getVidInfo', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getVidInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result) {
        typeErr = {type: 'data', err: 'huashu-data-null', interface: 'getVidInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
        return;
      }
      if (!result.class && !result.duration && !result.updatetime) {
        typeErr = {type: 'data', err: 'huashu-data-null-class', interface: 'getVidInfo', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getComment(task, sid) {
    const option = {
      url: `http://changyan.sohu.com/api/3/topic/liteload?client_id=cyrHNCs04&topic_category_id=37&page_size=10&hot_size=5&topic_source_id=${sid}&_=${new Date().getTime()}`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getComment', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getComment', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = JSON.parse(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getComment', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
  getPlay(task, vid) {
    const option = {
      url: `http://pro.wasu.cn/index/vod/updateViewHit/id/${vid}/pid/37/dramaId/${vid}?${new Date().getTime()}&jsoncallback=jsonp`
    };
    request.get(logger, option, (err, result) => {
      if (err) {
        if (err.status && err.status !== 200) {
          typeErr = {type: 'status', err: JSON.stringify(err.status), interface: 'getPlay', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        } else {
          typeErr = {type: 'error', err: JSON.stringify(err.message), interface: 'getPlay', url: option.url};
          infoCheck.interface(this.core, task, typeErr);
        }
        return;
      }
      try {
        result = eval(result.body);
      } catch (e) {
        typeErr = {type: 'json', err: `error: ${JSON.stringify(e.message)}, data: ${result.body}`, interface: 'getPlay', url: option.url};
        infoCheck.interface(this.core, task, typeErr);
      }
    });
  }
}
module.exports = dealWith;