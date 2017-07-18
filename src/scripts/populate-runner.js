require('babel-register');
require('babel-polyfill');



// const tables = ['user']
const tables = ['user','appointment']
// run es6 file
require('./populate-dev')(tables)
