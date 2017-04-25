const python = require('python.js');
const sys = python.import('sys');

sys.path.append(__dirname);
const pytest = python.import('py_json');
const arg = JSON.stringify({ name: 'junhoa', age: 25, c: '\U000267cc' });
const a = pytest.test(arg);
console.log(a);
