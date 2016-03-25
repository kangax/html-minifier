 /* global minify, HTMLLint */
'use strict';

if (typeof minify === 'undefined') {
  self.minify = require('html-minifier').minify;
}
if (typeof HTMLLint === 'undefined') {
  self.HTMLLint = require('html-minifier/src/htmllint').HTMLLint;
}

test('lint exists', function() {
  ok(minify);
  ok(HTMLLint);
});

test('lint is instance of HTMLLint', function() {
  var lint = new HTMLLint();
  ok(lint instanceof HTMLLint);
});

test('lint API', function() {
  var lint = new HTMLLint();
  equal(0, lint.log.length, '`log` property exists');
  equal('function', typeof lint.populate, '`populate` method exists');
  equal('function', typeof lint.test, '`test` method exists');
  equal('function', typeof lint.testElement, '`testElement` method exists');
  equal('function', typeof lint.testAttribute, '`testAttribute` method exists');
});

test('deprecated element (font)', function() {
  var lint = new HTMLLint();
  minify('<font>foo</font>', { lint: lint });
  var log = lint.log.join('');

  ok(log.indexOf('font') > -1);
  ok(log.indexOf('deprecated') > -1);
});
