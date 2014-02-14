(function(global){

  var minify = global.minify || require('../dist/all.js').minify,
      HTMLLint = HTMLLint || require('../dist/all.js').HTMLLint,
      input,
      output,
      lint = new HTMLLint();

  test('lint exists', function() {
    ok(typeof lint !== 'undefined');
  });

  test('lint is instance of HTMLLint', function() {
    ok(lint instanceof HTMLLint);
  });

  test('lint API', function() {
    equal(0, lint.log.length, '`log` property exists');
    equal("function", typeof lint.populate, '`populate` method exists');
    equal("function", typeof lint.test, '`test` method exists');
    equal("function", typeof lint.testElement, '`testElement` method exists');
    equal("function", typeof lint.testAttribute, '`testAttribute` method exists');
  });

  test('deprecated element (font)', function(){
    minify('<font>foo</font>', { lint: lint });
    var log = lint.log.join('');

    ok(log.indexOf('font') > -1);
    ok(log.indexOf('deprecated') > -1);
  });

})(typeof exports === 'undefined' ? window : exports);
