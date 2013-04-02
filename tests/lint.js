(function(global){

  var minify = global.minify, input, output, lint;

  module('', {
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
    ok(log.indexOf('deprecated element') > -1);
  });

})(this);
