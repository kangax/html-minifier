/* eslint-env phantomjs, qunit */
'use strict';

const process = require('process');

function load(path) {
  const obj = require(path);
  for (const key in obj) {
    global[key] = obj[key];
  }

  return obj;
}

const alert = console.log;
const QUnit = load('qunit');

function hook() {
  const failures = [];
  QUnit.log(details => {
    if (!details.result) {
      failures.push(details);
    }
  });
  QUnit.done(details => {
    details.failures = failures;
    alert(JSON.stringify(details));
  });
  QUnit.start();
}

if (typeof phantom === 'undefined') {
  load('./src/htmlminifier');
  require(process.argv[2]);
  hook();
} else {
  const system = require('system');
  setTimeout(() => {
    system.stderr.write('timed out');
    phantom.exit(1);
  }, 15_000);
  const page = require('webpage').create();
  page.onAlert = function(details) {
    console.log(details);
    phantom.exit();
  };

  page.open(system.args[1], status => {
    if (status !== 'success') {
      phantom.exit(1);
    }

    page.evaluate(hook);
  });
}
