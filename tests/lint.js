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

function process(input, options) {
  options = options || {};
  var lint = new HTMLLint();
  options.lint = lint;
  minify(input, options);
  var element = {};
  lint.populate(element);
  return element.innerHTML || '';
}

function match(log, str, count) {
  var index = -str.length;
  var n = 0;
  do {
    index = log.indexOf(str, index + str.length);
  } while (index !== -1 && ++n);
  equal(n, count);
}

test('deprecated attribute', function() {
  var log = process('<script language="javascript">foo();</script>');
  match(log, 'script', 1);
  match(log, 'language', 1);
  match(log, 'deprecated-attribute', 1);
  log = process('<script type="text/javascript">foo();</script>');
  match(log, 'script', 0);
  match(log, 'language', 0);
  match(log, 'deprecated-attribute', 0);
});

test('deprecated element', function() {
  var log = process('<font>foo</font>');
  match(log, 'font', 1);
  match(log, 'deprecated-element', 1);
  log = process('<span>foo</span>');
  match(log, 'span', 0);
  match(log, 'deprecated-element', 0);
});

test('missing DOCTYPE', function() {
  var log = process('<html><head><title>foo</title></head><body>bar</body></html>');
  match(log, 'DOCTYPE', 1);
  log = process('<!DOCTYPE html><html><head><title>foo</title></head><body>bar</body></html>');
  match(log, 'DOCTYPE', 0);
});

test('repeating attribute', function() {
  var log = process('<a data-foo="bar" href="/" data-foo="baz">click</a>');
  match(log, 'data-foo', 1);
  match(log, 'repeating-attribute', 1);
  log = process('<a data-foo="bar" href="/" ng-foo="baz">click</a>');
  match(log, 'repeating-attribute', 0);
});

test('duplicate errors', function() {
  var log = process('<font>foo</font>');
  match(log, 'DOCTYPE', 1);
  match(log, 'font', 1);
  match(log, 'deprecated-element', 1);
  log = process('<font>foo</font>', { sortAttributes: true });
  match(log, 'DOCTYPE', 1);
  match(log, 'font', 1);
  match(log, 'deprecated-element', 1);
  log = process('<font>foo</font>', { sortClassName: true });
  match(log, 'DOCTYPE', 1);
  match(log, 'font', 1);
  match(log, 'deprecated-element', 1);
});
