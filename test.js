/* eslint-env qunit */
'use strict';

function load(path) {
  var obj = require(path);
  for (var key in obj) {
    global[key] = obj[key];
  }
  return obj;
}

var alert = console.log;
var QUnit = load('qunit');

function hook() {
  var failures = [];
  QUnit.log(function(details) {
    if (!details.result) {
      failures.push(details);
    }
  });
  QUnit.done(function(details) {
    details.failures = failures;
    alert(JSON.stringify(details));
  });
  QUnit.start();
}

load('./src/htmlminifier');
require(process.argv[2]);
hook();
