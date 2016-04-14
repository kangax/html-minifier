/* eslint-env phantomjs, qunit */
'use strict';

function load(path) {
  var obj = require(path);
  for (var key in obj) {
    global[key] = obj[key];
  }
  return obj;
}

var alert = console.log;
var QUnit = load('qunitjs');

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
}

if (typeof phantom === 'undefined') {
  load('./src/htmllint');
  load('./src/htmlminifier');
  hook();
  require(process.argv[2]);
  QUnit.load();
}
else {
  var page = require('webpage').create();
  page.onAlert = function(details) {
    console.log(details);
    phantom.exit();
  };
  page.open(require('system').args[1], function(status) {
    if (status !== 'success') {
      phantom.exit(1);
    }
    page.evaluate(hook);
  });
}
