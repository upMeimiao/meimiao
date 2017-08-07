/**
 * Created by dell on 2017/8/7.
 */
const request = require('request');

const time = new Date().getTime();

const option = {
  method: 'GET',
  url: 'http://www.weibo.com/5884829935/FaEBowJ9f?wvr=6&mod=weibotime&type=comment',
  headers: {
    'Upgrade-Insecure-Requests': 1,
    Referer: 'http://weibo.com/p/1005055884829935/home?from=page_100505_profile&wvr=6&mod=data&is_hot=1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
    Cookie: 'SINAGLOBAL=9973892314779.559.1502072732550; login_sid_t=60bfff7303ed02ff79e3d1dbde836708; YF-Ugrow-G0=169004153682ef91866609488943c77f; YF-V5-G0=572595c78566a84019ac3c65c1e95574; WBStorage=0c663978e8e51f06|undefined; _s_tentry=www.baidu.com; UOR=,,www.baidu.com; Apache=2296727999173.48.1502072850367; ULV=1502072850371:2:2:2:2296727999173.48.1502072850367:1502072732592; YF-Page-G0=d52660735d1ea4ed313e0beb68c05fc5; SCF=AnpTNvbtUbZg053T-qg6cHnY3q5mCqaYEocsf20juvw1oL898-dQCUyybthSF4grW5axWGKqKc_XgD5RuVtb_F8.; SUB=_2A250g6HTDeRhGeNL7FYQ9SbKzjyIHXVX-JQbrDV8PUNbmtANLXj7kW9EWF3yfleqjrDgBH1_MXTxri7Wgg..; SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9W5F3yibNQgCZ9L1gkM-JH925JpX5K2hUgL.Fo-fS0BpSKncSK52dJLoIpRLxK-LBo5L12qLxK-L1KnL12-LxK-LB-BL1K5cSoqt; SUHB=0S7C3GyK13Bvtb; ALF=1502678017; SSOLoginState=1502073219'
  }
};
request(option, (err, res, body) => {
  if (err) {
    console.log(err);
    return;
  }
  if (res.statusCode !== 200) {
    console.log(res.statusCode);
    return;
  }
  console.log(body);
});
