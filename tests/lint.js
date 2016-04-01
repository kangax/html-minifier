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

function process(input) {
  var lint = new HTMLLint();
  minify(input, { lint: lint });
  var element = {};
  lint.populate(element);
  return element.innerHTML;
}

test('deprecated element (font)', function() {
  var log = process('<font>foo</font>');
  ok(log.indexOf('font') > -1);
  ok(log.indexOf('deprecated') > -1);
});

test('missing DOCTYPE', function() {
  var log = process('<html><head><title>foo</title></head><body>bar</body></html>');
  ok(log.indexOf('DOCTYPE') > -1);
});

test('repeating attribute', function() {
  var log = process('<a data-foo="bar" href="/" data-foo="baz">click</a>');
  ok(log.indexOf('repeating attribute') > -1);
});
