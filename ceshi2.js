/**
 * Created by dell on 2017/9/26.
 */

// var request = require("request");
//
// var options = {
//   method: 'GET',
//   url: 'https://www.facebook.com/100017345710792/videos?lst=100017345710792%3A100003896634272%3A1506416645',
//   proxy: 'http://127.0.0.1:56777',
//   headers: {
//     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
//     cookie: 'locale=zh_CN; datr=i8bJWbbF0bmLFgX06O0rk6dl; sb=i8bJWTugOIa7798lNEcP-slk; c_user=100017345710792; xs=1%3AzRTUuymN8QWAmw%3A2%3A1506416440%3A-1%3A-1; fr=0ODFwFfmAXwYSaB2s.AWUJfJGa56Le7I5A3Z-zh03YeHM.BZw6ek.Mh.AAA.0.0.BZyhc4.AWV5ljYJ; pl=n; act=1506417937756%2F5; wd=1209x974; presence=EDvF3EtimeF1506418072EuserFA21B17345710792A2EstateFDutF1506418072749CEchFDp_5f1B17345710792F1CC'
//   }
// };
//
// request(options, function (error, response, body) {
//   if (error) throw new Error(error);
//   console.log(body);
// });

const arr = [123, 234, 567, 'aaa'];

const [,,, a] = arr;
console.log(a);