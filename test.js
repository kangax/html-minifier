'use strict';

function load(path) {
  var obj = require(path);
  for (var key in obj) {
    global[key] = obj[key];
  }
  return obj;
}

load('.');
load('./src/htmllint.js');
var QUnit = load('qunitjs');
QUnit.done(function(data) {
  process.send(data);
});
require(process.argv[2]);
QUnit.load();
