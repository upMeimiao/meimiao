/**
 * Created by dell on 2017/8/8.
 */
(function() {
  var data = {
    "status": 102,
    "create_time": 1501985252,
    "video": {
      "url_list": ["http:\/\/hotsoon.snssdk.com\/hotsoon\/item\/video\/_playback\/?video_id=6f50adf29e1244d6b994ce8e0471375b\u0026line=0\u0026watermark=1", "http:\/\/hotsoon.snssdk.com\/hotsoon\/item\/video\/_playback\/?video_id=6f50adf29e1244d6b994ce8e0471375b\u0026line=1\u0026watermark=1"],
      "cover": {
        "url_list": ["http:\/\/p3.pstatp.com\/large\/341b0000785af7d2f679.jpg", "http:\/\/pb9.pstatp.com\/large\/341b0000785af7d2f679.jpg", "http:\/\/pb3.pstatp.com\/large\/341b0000785af7d2f679.jpg"],
        "uri": "large\/341b0000785af7d2f679"
      },
      "uri": "6f50adf29e1244d6b994ce8e0471375b",
      "height": 960,
      "width": 544,
      "duration": 10.0
    },
    "location": "\u664b\u4e2d",
    "media_type": 4,
    "text": "\u4eba\u5e05\uff01\u5531\u7684\u597d",
    "author": {
      "city": "\u664b\u4e2d",
      "fan_ticket_count": 10,
      "avatar_large": {
        "url_list": ["http:\/\/p9.pstatp.com\/live\/1080x1080\/1bcf0020809fd2413a12.jpg", "http:\/\/pb1.pstatp.com\/live\/1080x1080\/1bcf0020809fd2413a12.jpg", "http:\/\/pb3.pstatp.com\/live\/1080x1080\/1bcf0020809fd2413a12.jpg"],
        "uri": "1080x1080\/1bcf0020809fd2413a12"
      },
      "short_id": 120770733,
      "level": 1,
      "gender": 0,
      "id_str": "60703249796",
      "avatar_medium": {
        "url_list": ["http:\/\/p9.pstatp.com\/live\/720x720\/1bcf0020809fd2413a12.jpg", "http:\/\/pb1.pstatp.com\/live\/720x720\/1bcf0020809fd2413a12.jpg", "http:\/\/pb3.pstatp.com\/live\/720x720\/1bcf0020809fd2413a12.jpg"],
        "uri": "720x720\/1bcf0020809fd2413a12"
      },
      "signature": "\u8ba4\u771f\u505a\u4e8b\uff0c\u8ba4\u771f\u505a\u4eba\uff0c\u4f60\u5f00\u5fc3\u5c31\u597d\uff01",
      "avatar_thumb": {
        "url_list": ["http:\/\/p9.pstatp.com\/live\/100x100\/1bcf0020809fd2413a12.jpg", "http:\/\/pb1.pstatp.com\/live\/100x100\/1bcf0020809fd2413a12.jpg", "http:\/\/pb3.pstatp.com\/live\/100x100\/1bcf0020809fd2413a12.jpg"],
        "uri": "100x100\/1bcf0020809fd2413a12"
      },
      "nickname": "\u8463\u65b0\u5c27V",
      "id": 60703249796
    },
    "id": "6450977525643349261",
    "stats": {
      "digg_count": 3,
      "play_count": 41,
      "comment_count": 0,
      "income": 50,
      "share_count": 0,
      "ticket": 5
    }
  };

  var TT_LOGID = "20170808150803010006024155712236";

  var abpos = '';

  //ABTest
  var ttFrom = Common.Util.getUrlParam(location.href, 'hs_from');
  if (ttFrom && (ttFrom == 'huoshan1toutiao')) {
    if ($.cookie('tt_webid')) {
      var ab = $.cookie('tt_webid') % 2;
      if (ab == 0) {
        abpos = 'exp';
        // gaevent('share_videotitle', 'share_video', 'videotitle_experiment');
      } else {
        abpos = 'ctr';
        // gaevent('share_videotitle', 'share_video', 'videotitle_control');
      }
    }
  }

  // 推荐数据上报到头条
  window.HUOSHAN_CODE_ID = "900716024"; // 推荐数据上报code_id
  window.HUOSHAN_SITE_ID = "5000716";

  require('wap:component/detail_video/detail').create({
    data: data,
    req_id: TT_LOGID,
    abpos: abpos
  });
  require('wap:component/recommend_video/recommend_video').create({
    id: data.id || '',
    count: 40,
    req_id: TT_LOGID,
    abpos: ''
  });

  require('wap:page/reflow/reflow_video/index').create({
    data: data,
    req_id: TT_LOGID,
    abpos: abpos
  });
  $.browser.weixin && require('wap:component/common/util/weixinUtil').init({
    type: 'video'
  });

  listener.trigger('www.huoshan.reflow', 'send-act', {
    'act': 'open'
  });

  window.data = data;
  return window;
})();
