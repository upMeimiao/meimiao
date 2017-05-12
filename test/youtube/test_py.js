// const python = require('python.js');
// const sys = python.import('sys');
// const pyjson = python.import('json');
// // sys.path.append(__dirname);
// // const pytest = python.import('py_json');
// const arg = JSON.stringify({ name: 'junhoa', age: 25, c: '\U000267cc' });
// const info = pyjson.loads(arg);
// const a = pyjson.dumps(info);
// // const a = pytest.test(arg);
// console.log(a);


var python = require('python.js');
var os = python.import('os');
var sys = python.import('json');
var path = require('path');

console.log(os.path.basename(os.getcwd()) == path.basename(process.cwd()));