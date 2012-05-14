(function(global){
  
  var minify, QUnit, 
    test, equals, ok,
    input, output, HTMLLint, lint;

  if (typeof require === 'function') {
    QUnit = require('./qunit');
    minify = require('../src/htmlminifier').minify;
    HTMLLint = require('../src/htmllint').HTMLLint;
  } else {
    QUnit = global.QUnit;
    minify = global.minify;
    HTMLLint = global.HTMLLint;
  }

  test = QUnit.test;
  equals = QUnit.equals;
  ok = QUnit.ok;

  QUnit.module('', {
    setup: function() {
      lint = new HTMLLint();
    }
  });
  
  test('lint exists', function() {
    ok(typeof lint !== 'undefined');
  });
  
  test('lint is instance of HTMLLint', function() {
    ok(lint instanceof HTMLLint);
  });
  
  test('lint API', function() {
    equals(0, lint.log.length, '`log` property exists');
    equals("function", typeof lint.populate, '`populate` method exists');
    equals("function", typeof lint.test, '`test` method exists');
    equals("function", typeof lint.testElement, '`testElement` method exists');
    equals("function", typeof lint.testAttribute, '`testAttribute` method exists');
  });
  
  test('deprecated element (font)', function(){
    minify('<font>foo</font>', { lint: lint });
    var log = lint.log.join('');

    ok(log.indexOf('font') > -1);
    ok(log.indexOf('deprecated') > -1);
    ok(log.indexOf('element') > -1);
  });
  
}(this));