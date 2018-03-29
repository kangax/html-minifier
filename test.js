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

if (typeof phantom === 'undefined') {
  load('./src/htmlminifier');
  require(process.argv[2]);
  hook();
}
else {
  var system = require('system');
  setTimeout(function() {
    system.stderr.write('timed out');
    phantom.exit(1);
  }, 15000);
  var page = require('webpage').create();
  page.onAlert = function(details) {
    console.log(details);
    phantom.exit();
  };
  page.open(system.args[1], function(status) {
    if (status !== 'success') {
      phantom.exit(1);
    }
    page.evaluate(hook);
  });
}
