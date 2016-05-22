// Require babel hook included to load all subsequent files required by
// gulp with the extensions .es6, .es, .jsx, .js and transpile them
// with babel. This will also automatically require the polyfill.
require("babel-register");

// *gulpfile.js*

// Load gulp configuration
var conf = require('./config/gulpfile.conf.js');