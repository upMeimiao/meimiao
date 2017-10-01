const spiderUtils = require('../lib/spiderUtils');

const arr = [{ bid: 12, id: '123456', name: 'yis' }, { bid: 12, id: '123456', name: 'yis' }, { bid: 12, id: '123456', name: 'yis' }, { bid: 13, id: '123456', name: 'yis' }];

console.log(spiderUtils.mediaUnique(arr));