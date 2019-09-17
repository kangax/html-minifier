/* global minify */
'use strict';

if (typeof minify === 'undefined') {
  self.minify = require('html-minifier').minify;
}
QUnit.module('minifier');
QUnit.test('`minifiy` exists', function(assert) {
  assert.ok(minify);
});

QUnit.test('parsing non-trivial markup', function(assert) {
  var input, output;

  assert.equal(minify('</td>'), '');
  assert.equal(minify('</p>'), '<p></p>');
  assert.equal(minify('</br>'), '<br>');
  assert.equal(minify('<br>x</br>'), '<br>x<br>');
  assert.equal(minify('<p title="</p>">x</p>'), '<p title="</p>">x</p>');
  assert.equal(minify('<p title=" <!-- hello world --> ">x</p>'), '<p title=" <!-- hello world --> ">x</p>');
  assert.equal(minify('<p title=" <![CDATA[ \n\n foobar baz ]]> ">x</p>'), '<p title=" <![CDATA[ \n\n foobar baz ]]> ">x</p>');
  assert.equal(minify('<p foo-bar=baz>xxx</p>'), '<p foo-bar="baz">xxx</p>');
  assert.equal(minify('<p foo:bar=baz>xxx</p>'), '<p foo:bar="baz">xxx</p>');
  assert.equal(minify('<p foo.bar=baz>xxx</p>'), '<p foo.bar="baz">xxx</p>');

  input = '<div><div><div><div><div><div><div><div><div><div>' +
            'i\'m 10 levels deep' +
          '</div></div></div></div></div></div></div></div></div></div>';

  assert.equal(minify(input), input);

  assert.equal(minify('<script>alert(\'<!--\')</script>'), '<script>alert(\'<!--\')</script>');
  assert.equal(minify('<script>alert(\'<!-- foo -->\')</script>'), '<script>alert(\'<!-- foo -->\')</script>');
  assert.equal(minify('<script>alert(\'-->\')</script>'), '<script>alert(\'-->\')</script>');

  assert.equal(minify('<a title="x"href=" ">foo</a>'), '<a title="x" href="">foo</a>');
  assert.equal(minify('<p id=""class=""title="">x'), '<p id="" class="" title="">x</p>');
  assert.equal(minify('<p x="x\'"">x</p>'), '<p x="x\'">x</p>', 'trailing quote should be ignored');
  assert.equal(minify('<a href="#"><p>Click me</p></a>'), '<a href="#"><p>Click me</p></a>');
  assert.equal(minify('<span><button>Hit me</button></span>'), '<span><button>Hit me</button></span>');
  assert.equal(minify('<object type="image/svg+xml" data="image.svg"><div>[fallback image]</div></object>'),
    '<object type="image/svg+xml" data="image.svg"><div>[fallback image]</div></object>'
  );

  assert.equal(minify('<ng-include src="x"></ng-include>'), '<ng-include src="x"></ng-include>');
  assert.equal(minify('<ng:include src="x"></ng:include>'), '<ng:include src="x"></ng:include>');
  assert.equal(minify('<ng-include src="\'views/partial-notification.html\'"></ng-include><div ng-view=""></div>'),
    '<ng-include src="\'views/partial-notification.html\'"></ng-include><div ng-view=""></div>'
  );

  // will cause test to time-out if fail
  input = '<p>For more information, read <a href=https://stackoverflow.com/questions/17408815/fieldset-resizes-wrong-appears-to-have-unremovable-min-width-min-content/17863685#17863685>this Stack Overflow answer</a>.</p>';
  output = '<p>For more information, read <a href="https://stackoverflow.com/questions/17408815/fieldset-resizes-wrong-appears-to-have-unremovable-min-width-min-content/17863685#17863685">this Stack Overflow answer</a>.</p>';
  assert.equal(minify(input), output);

  input = '<html ⚡></html>';
  assert.equal(minify(input), input);

  input = '<h:ællæ></h:ællæ>';
  assert.equal(minify(input), input);

  input = '<$unicorn>';
  assert.throws(function() {
    minify(input);
  }, 'Invalid tag name');
  assert.equal(minify(input, {
    continueOnParseError: true,
  }), input);

  input = '<begriffs.pagination ng-init="perPage=20" collection="logs" url="\'/api/logs?user=-1\'" per-page="perPage" per-page-presets="[10,20,50,100]" template-url="/assets/paginate-anything.html"></begriffs.pagination>';
  assert.equal(minify(input), input);

  // https://github.com/kangax/html-minifier/issues/41
  assert.equal(minify('<some-tag-1></some-tag-1><some-tag-2></some-tag-2>'),
    '<some-tag-1></some-tag-1><some-tag-2></some-tag-2>'
  );

  // https://github.com/kangax/html-minifier/issues/40
  assert.equal(minify('[\']["]'), '[\']["]');

  // https://github.com/kangax/html-minifier/issues/21
  assert.equal(minify('<a href="test.html"><div>hey</div></a>'), '<a href="test.html"><div>hey</div></a>');

  // https://github.com/kangax/html-minifier/issues/17
  assert.equal(minify(':) <a href="http://example.com">link</a>'), ':) <a href="http://example.com">link</a>');

  // https://github.com/kangax/html-minifier/issues/169
  assert.equal(minify('<a href>ok</a>'), '<a href>ok</a>');

  assert.equal(minify('<a onclick></a>'), '<a onclick></a>');

  // https://github.com/kangax/html-minifier/issues/229
  assert.equal(minify('<CUSTOM-TAG></CUSTOM-TAG><div>Hello :)</div>'), '<custom-tag></custom-tag><div>Hello :)</div>');

  // https://github.com/kangax/html-minifier/issues/507
  input = '<tag v-ref:vm_pv :imgs=" objpicsurl_ "></tag>';
  assert.equal(minify(input), input);
  input = '<tag v-ref:vm_pv :imgs=" objpicsurl_ " ss"123>';
  assert.throws(function() {
    minify(input);
  }, 'invalid attribute name');
  assert.equal(minify(input, {
    continueOnParseError: true,
  }), input);

  // https://github.com/kangax/html-minifier/issues/512
  input = '<input class="form-control" type="text" style="" id="{{vm.formInputName}}" name="{{vm.formInputName}}"' +
          ' placeholder="YYYY-MM-DD"' +
          ' date-range-picker' +
          ' data-ng-model="vm.value"' +
          ' data-ng-model-options="{ debounce: 1000 }"' +
          ' data-ng-pattern="vm.options.format"' +
          ' data-options="vm.datepickerOptions">';
  assert.equal(minify(input), input);
  input = '<input class="form-control" type="text" style="" id="{{vm.formInputName}}" name="{{vm.formInputName}}"' +
          ' <!--FIXME hardcoded placeholder - dates may not be used for service required fields yet. -->' +
          ' placeholder="YYYY-MM-DD"' +
          ' date-range-picker' +
          ' data-ng-model="vm.value"' +
          ' data-ng-model-options="{ debounce: 1000 }"' +
          ' data-ng-pattern="vm.options.format"' +
          ' data-options="vm.datepickerOptions">';
  assert.throws(function() {
    minify(input);
  }, 'HTML comment inside tag');
  assert.equal(minify(input, {
    continueOnParseError: true,
  }), input);

  // https://github.com/kangax/html-minifier/issues/974
  input = '<!–– Failing New York Times Comment -->';
  assert.throws(function() {
    minify(input);
  }, 'invalid HTML comment');
  assert.equal(minify(input, {
    continueOnParseError: true,
  }), input);

  input = '<br a=\u00A0 b="&nbsp;" c="\u00A0">';
  output = '<br a="\u00A0" b="&nbsp;" c="\u00A0">';
  assert.equal(minify(input), output);
  output = '<br a="\u00A0"b="\u00A0"c="\u00A0">';
  assert.equal(minify(input, {
    decodeEntities: true,
    removeTagWhitespace: true,
  }), output);
  output = '<br a=\u00A0 b=\u00A0 c=\u00A0>';
  assert.equal(minify(input, {
    decodeEntities: true,
    removeAttributeQuotes: true
  }), output);
  assert.equal(minify(input, {
    decodeEntities: true,
    removeAttributeQuotes: true,
    removeTagWhitespace: true,
  }), output);
});

QUnit.test('options', function(assert) {
  var input = '<p>blah<span>blah 2<span>blah 3</span></span></p>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, {}), input);
});

QUnit.test('case normalization', function(assert) {
  assert.equal(minify('<P>foo</p>'), '<p>foo</p>');
  assert.equal(minify('<DIV>boo</DIV>'), '<div>boo</div>');
  assert.equal(minify('<DIV title="moo">boo</DiV>'), '<div title="moo">boo</div>');
  assert.equal(minify('<DIV TITLE="blah">boo</DIV>'), '<div title="blah">boo</div>');
  assert.equal(minify('<DIV tItLe="blah">boo</DIV>'), '<div title="blah">boo</div>');
  assert.equal(minify('<DiV tItLe="blah">boo</DIV>'), '<div title="blah">boo</div>');
});

QUnit.test('space normalization between attributes', function(assert) {
  assert.equal(minify('<p title="bar">foo</p>'), '<p title="bar">foo</p>');
  assert.equal(minify('<img src="test"/>'), '<img src="test">');
  assert.equal(minify('<p title = "bar">foo</p>'), '<p title="bar">foo</p>');
  assert.equal(minify('<p title\n\n\t  =\n     "bar">foo</p>'), '<p title="bar">foo</p>');
  assert.equal(minify('<img src="test" \n\t />'), '<img src="test">');
  assert.equal(minify('<input title="bar"       id="boo"    value="hello world">'), '<input title="bar" id="boo" value="hello world">');
});

QUnit.test('space normalization around text', function(assert) {
  var input, output;
  input = '   <p>blah</p>\n\n\n   ';
  assert.equal(minify(input), input);
  output = '<p>blah</p>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  output = ' <p>blah</p> ';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    conservativeCollapse: true
  }), output);
  output = '<p>blah</p>\n';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    preserveLineBreaks: true
  }), output);
  output = ' <p>blah</p>\n';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    preserveLineBreaks: true
  }), output);
  [
    'a', 'abbr', 'acronym', 'b', 'big', 'del', 'em', 'font', 'i', 'ins', 'kbd',
    'mark', 's', 'samp', 'small', 'span', 'strike', 'strong', 'sub', 'sup',
    'time', 'tt', 'u', 'var'
  ].forEach(function(el) {
    assert.equal(minify('foo <' + el + '>baz</' + el + '> bar', { collapseWhitespace: true }), 'foo <' + el + '>baz</' + el + '> bar');
    assert.equal(minify('foo<' + el + '>baz</' + el + '>bar', { collapseWhitespace: true }), 'foo<' + el + '>baz</' + el + '>bar');
    assert.equal(minify('foo <' + el + '>baz</' + el + '>bar', { collapseWhitespace: true }), 'foo <' + el + '>baz</' + el + '>bar');
    assert.equal(minify('foo<' + el + '>baz</' + el + '> bar', { collapseWhitespace: true }), 'foo<' + el + '>baz</' + el + '> bar');
    assert.equal(minify('foo <' + el + '> baz </' + el + '> bar', { collapseWhitespace: true }), 'foo <' + el + '>baz </' + el + '>bar');
    assert.equal(minify('foo<' + el + '> baz </' + el + '>bar', { collapseWhitespace: true }), 'foo<' + el + '> baz </' + el + '>bar');
    assert.equal(minify('foo <' + el + '> baz </' + el + '>bar', { collapseWhitespace: true }), 'foo <' + el + '>baz </' + el + '>bar');
    assert.equal(minify('foo<' + el + '> baz </' + el + '> bar', { collapseWhitespace: true }), 'foo<' + el + '> baz </' + el + '>bar');
    assert.equal(minify('<div>foo <' + el + '>baz</' + el + '> bar</div>', { collapseWhitespace: true }), '<div>foo <' + el + '>baz</' + el + '> bar</div>');
    assert.equal(minify('<div>foo<' + el + '>baz</' + el + '>bar</div>', { collapseWhitespace: true }), '<div>foo<' + el + '>baz</' + el + '>bar</div>');
    assert.equal(minify('<div>foo <' + el + '>baz</' + el + '>bar</div>', { collapseWhitespace: true }), '<div>foo <' + el + '>baz</' + el + '>bar</div>');
    assert.equal(minify('<div>foo<' + el + '>baz</' + el + '> bar</div>', { collapseWhitespace: true }), '<div>foo<' + el + '>baz</' + el + '> bar</div>');
    assert.equal(minify('<div>foo <' + el + '> baz </' + el + '> bar</div>', { collapseWhitespace: true }), '<div>foo <' + el + '>baz </' + el + '>bar</div>');
    assert.equal(minify('<div>foo<' + el + '> baz </' + el + '>bar</div>', { collapseWhitespace: true }), '<div>foo<' + el + '> baz </' + el + '>bar</div>');
    assert.equal(minify('<div>foo <' + el + '> baz </' + el + '>bar</div>', { collapseWhitespace: true }), '<div>foo <' + el + '>baz </' + el + '>bar</div>');
    assert.equal(minify('<div>foo<' + el + '> baz </' + el + '> bar</div>', { collapseWhitespace: true }), '<div>foo<' + el + '> baz </' + el + '>bar</div>');
  });
  // Don't trim whitespace around element, but do trim within
  [
    'bdi', 'bdo', 'button', 'cite', 'code', 'dfn', 'math', 'q', 'rt', 'rtc', 'ruby', 'svg'
  ].forEach(function(el) {
    assert.equal(minify('foo <' + el + '>baz</' + el + '> bar', { collapseWhitespace: true }), 'foo <' + el + '>baz</' + el + '> bar');
    assert.equal(minify('foo<' + el + '>baz</' + el + '>bar', { collapseWhitespace: true }), 'foo<' + el + '>baz</' + el + '>bar');
    assert.equal(minify('foo <' + el + '>baz</' + el + '>bar', { collapseWhitespace: true }), 'foo <' + el + '>baz</' + el + '>bar');
    assert.equal(minify('foo<' + el + '>baz</' + el + '> bar', { collapseWhitespace: true }), 'foo<' + el + '>baz</' + el + '> bar');
    assert.equal(minify('foo <' + el + '> baz </' + el + '> bar', { collapseWhitespace: true }), 'foo <' + el + '>baz</' + el + '> bar');
    assert.equal(minify('foo<' + el + '> baz </' + el + '>bar', { collapseWhitespace: true }), 'foo<' + el + '>baz</' + el + '>bar');
    assert.equal(minify('foo <' + el + '> baz </' + el + '>bar', { collapseWhitespace: true }), 'foo <' + el + '>baz</' + el + '>bar');
    assert.equal(minify('foo<' + el + '> baz </' + el + '> bar', { collapseWhitespace: true }), 'foo<' + el + '>baz</' + el + '> bar');
    assert.equal(minify('<div>foo <' + el + '>baz</' + el + '> bar</div>', { collapseWhitespace: true }), '<div>foo <' + el + '>baz</' + el + '> bar</div>');
    assert.equal(minify('<div>foo<' + el + '>baz</' + el + '>bar</div>', { collapseWhitespace: true }), '<div>foo<' + el + '>baz</' + el + '>bar</div>');
    assert.equal(minify('<div>foo <' + el + '>baz</' + el + '>bar</div>', { collapseWhitespace: true }), '<div>foo <' + el + '>baz</' + el + '>bar</div>');
    assert.equal(minify('<div>foo<' + el + '>baz</' + el + '> bar</div>', { collapseWhitespace: true }), '<div>foo<' + el + '>baz</' + el + '> bar</div>');
    assert.equal(minify('<div>foo <' + el + '> baz </' + el + '> bar</div>', { collapseWhitespace: true }), '<div>foo <' + el + '>baz</' + el + '> bar</div>');
    assert.equal(minify('<div>foo<' + el + '> baz </' + el + '>bar</div>', { collapseWhitespace: true }), '<div>foo<' + el + '>baz</' + el + '>bar</div>');
    assert.equal(minify('<div>foo <' + el + '> baz </' + el + '>bar</div>', { collapseWhitespace: true }), '<div>foo <' + el + '>baz</' + el + '>bar</div>');
    assert.equal(minify('<div>foo<' + el + '> baz </' + el + '> bar</div>', { collapseWhitespace: true }), '<div>foo<' + el + '>baz</' + el + '> bar</div>');
  });
  [
    ['<span> foo </span>', '<span>foo</span>'],
    [' <span> foo </span> ', '<span>foo</span>'],
    ['<nobr>a</nobr>', '<nobr>a</nobr>'],
    ['<nobr>a </nobr>', '<nobr>a</nobr>'],
    ['<nobr> a</nobr>', '<nobr>a</nobr>'],
    ['<nobr> a </nobr>', '<nobr>a</nobr>'],
    ['a<nobr>b</nobr>c', 'a<nobr>b</nobr>c'],
    ['a<nobr>b </nobr>c', 'a<nobr>b </nobr>c'],
    ['a<nobr> b</nobr>c', 'a<nobr> b</nobr>c'],
    ['a<nobr> b </nobr>c', 'a<nobr> b </nobr>c'],
    ['a<nobr>b</nobr> c', 'a<nobr>b</nobr> c'],
    ['a<nobr>b </nobr> c', 'a<nobr>b</nobr> c'],
    ['a<nobr> b</nobr> c', 'a<nobr> b</nobr> c'],
    ['a<nobr> b </nobr> c', 'a<nobr> b</nobr> c'],
    ['a <nobr>b</nobr>c', 'a <nobr>b</nobr>c'],
    ['a <nobr>b </nobr>c', 'a <nobr>b </nobr>c'],
    ['a <nobr> b</nobr>c', 'a <nobr>b</nobr>c'],
    ['a <nobr> b </nobr>c', 'a <nobr>b </nobr>c'],
    ['a <nobr>b</nobr> c', 'a <nobr>b</nobr> c'],
    ['a <nobr>b </nobr> c', 'a <nobr>b</nobr> c'],
    ['a <nobr> b</nobr> c', 'a <nobr>b</nobr> c'],
    ['a <nobr> b </nobr> c', 'a <nobr>b</nobr> c']
  ].forEach(function(inputs) {
    assert.equal(minify(inputs[0], {
      collapseWhitespace: true,
      conservativeCollapse: true
    }), inputs[0], inputs[0]);
    assert.equal(minify(inputs[0], { collapseWhitespace: true }), inputs[1], inputs[0]);
    var input = '<div>' + inputs[0] + '</div>';
    assert.equal(minify(input, {
      collapseWhitespace: true,
      conservativeCollapse: true
    }), input, input);
    var output = '<div>' + inputs[1] + '</div>';
    assert.equal(minify(input, { collapseWhitespace: true }), output, input);
  });
  assert.equal(minify('<p>foo <img> bar</p>', { collapseWhitespace: true }), '<p>foo <img> bar</p>');
  assert.equal(minify('<p>foo<img>bar</p>', { collapseWhitespace: true }), '<p>foo<img>bar</p>');
  assert.equal(minify('<p>foo <img>bar</p>', { collapseWhitespace: true }), '<p>foo <img>bar</p>');
  assert.equal(minify('<p>foo<img> bar</p>', { collapseWhitespace: true }), '<p>foo<img> bar</p>');
  assert.equal(minify('<p>foo <wbr> bar</p>', { collapseWhitespace: true }), '<p>foo<wbr> bar</p>');
  assert.equal(minify('<p>foo<wbr>bar</p>', { collapseWhitespace: true }), '<p>foo<wbr>bar</p>');
  assert.equal(minify('<p>foo <wbr>bar</p>', { collapseWhitespace: true }), '<p>foo <wbr>bar</p>');
  assert.equal(minify('<p>foo<wbr> bar</p>', { collapseWhitespace: true }), '<p>foo<wbr> bar</p>');
  assert.equal(minify('<p>foo <wbr baz moo=""> bar</p>', { collapseWhitespace: true }), '<p>foo<wbr baz moo=""> bar</p>');
  assert.equal(minify('<p>foo<wbr baz moo="">bar</p>', { collapseWhitespace: true }), '<p>foo<wbr baz moo="">bar</p>');
  assert.equal(minify('<p>foo <wbr baz moo="">bar</p>', { collapseWhitespace: true }), '<p>foo <wbr baz moo="">bar</p>');
  assert.equal(minify('<p>foo<wbr baz moo=""> bar</p>', { collapseWhitespace: true }), '<p>foo<wbr baz moo=""> bar</p>');
  assert.equal(minify('<p>  <a href="#">  <code>foo</code></a> bar</p>', { collapseWhitespace: true }), '<p><a href="#"><code>foo</code></a> bar</p>');
  assert.equal(minify('<p><a href="#"><code>foo  </code></a> bar</p>', { collapseWhitespace: true }), '<p><a href="#"><code>foo</code></a> bar</p>');
  assert.equal(minify('<p>  <a href="#">  <code>   foo</code></a> bar   </p>', { collapseWhitespace: true }), '<p><a href="#"><code>foo</code></a> bar</p>');
  assert.equal(minify('<div> Empty <!-- or --> not </div>', { collapseWhitespace: true }), '<div>Empty<!-- or --> not</div>');
  assert.equal(minify('<div> a <input><!-- b --> c </div>', {
    collapseWhitespace: true,
    removeComments: true
  }), '<div>a <input> c</div>');
  [
    ' a <? b ?> c ',
    '<!-- d --> a <? b ?> c ',
    ' <!-- d -->a <? b ?> c ',
    ' a<!-- d --> <? b ?> c ',
    ' a <!-- d --><? b ?> c ',
    ' a <? b ?><!-- d --> c ',
    ' a <? b ?> <!-- d -->c ',
    ' a <? b ?> c<!-- d --> ',
    ' a <? b ?> c <!-- d -->'
  ].forEach(function(input) {
    assert.equal(minify(input, {
      collapseWhitespace: true,
      conservativeCollapse: true
    }), input, input);
    assert.equal(minify(input, {
      collapseWhitespace: true,
      removeComments: true
    }), 'a <? b ?> c', input);
    assert.equal(minify(input, {
      collapseWhitespace: true,
      conservativeCollapse: true,
      removeComments: true
    }), ' a <? b ?> c ', input);
    input = '<p>' + input + '</p>';
    assert.equal(minify(input, {
      collapseWhitespace: true,
      conservativeCollapse: true
    }), input, input);
    assert.equal(minify(input, {
      collapseWhitespace: true,
      removeComments: true
    }), '<p>a <? b ?> c</p>', input);
    assert.equal(minify(input, {
      collapseWhitespace: true,
      conservativeCollapse: true,
      removeComments: true
    }), '<p> a <? b ?> c </p>', input);
  });
  input = '<li><i></i> <b></b> foo</li>';
  output = '<li><i></i> <b></b> foo</li>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  input = '<li><i> </i> <b></b> foo</li>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  input = '<li> <i></i> <b></b> foo</li>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  input = '<li><i></i> <b> </b> foo</li>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  input = '<li> <i> </i> <b> </b> foo</li>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  input = '<div> <a href="#"> <span> <b> foo </b> <i> bar </i> </span> </a> </div>';
  output = '<div><a href="#"><span><b>foo </b><i>bar</i></span></a></div>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  input = '<head> <!-- a --> <!-- b --><link> </head>';
  output = '<head><!-- a --><!-- b --><link></head>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  input = '<head> <!-- a --> <!-- b --> <!-- c --><link> </head>';
  output = '<head><!-- a --><!-- b --><!-- c --><link></head>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  input = '<p> foo\u00A0bar\nbaz  \u00A0\nmoo\t</p>';
  output = '<p>foo\u00A0bar baz \u00A0 moo</p>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  input = '<label> foo </label>\n' +
          '<input>\n' +
          '<object> bar </object>\n' +
          '<select> baz </select>\n' +
          '<textarea> moo </textarea>\n';
  output = '<label>foo</label> <input> <object>bar</object> <select>baz</select> <textarea> moo </textarea>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  input = '<pre>\n' +
          'foo\n' +
          '<br>\n' +
          'bar\n' +
          '</pre>\n' +
          'baz\n';
  output = '<pre>\nfoo\n<br>\nbar\n</pre>baz';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
});

QUnit.test('types of whitespace that should always be preserved', function(assert) {
  // Hair space:
  var input = '<div>\u200afo\u200ao\u200a</div>';
  assert.equal(minify(input, { collapseWhitespace: true }), input);

  // Hair space passed as HTML entity:
  var inputWithEntities = '<div>&#8202;fo&#8202;o&#8202;</div>';
  assert.equal(minify(inputWithEntities, { collapseWhitespace: true }), inputWithEntities);

  // Hair space passed as HTML entity, in decodeEntities:true mode:
  assert.equal(minify(inputWithEntities, { collapseWhitespace: true, decodeEntities: true }), input);


  // Non-breaking space:
  input = '<div>\xa0fo\xa0o\xa0</div>';
  assert.equal(minify(input, { collapseWhitespace: true }), input);

  // Non-breaking space passed as HTML entity:
  inputWithEntities = '<div>&nbsp;fo&nbsp;o&nbsp;</div>';
  assert.equal(minify(inputWithEntities, { collapseWhitespace: true }), inputWithEntities);

  // Non-breaking space passed as HTML entity, in decodeEntities:true mode:
  assert.equal(minify(inputWithEntities, { collapseWhitespace: true, decodeEntities: true }), input);

  // Do not remove hair space when preserving line breaks between tags:
  input = '<p></p>\u200a\n<p></p>\n';
  assert.equal(minify(input, { collapseWhitespace: true, preserveLineBreaks: true }), input);

  // Preserve hair space in attributes:
  input = '<p class="foo\u200abar"></p>';
  assert.equal(minify(input, { collapseWhitespace: true }), input);

  // Preserve hair space in class names when deduplicating and reordering:
  input = '<a class="0 1\u200a3 2 3"></a>';
  assert.equal(minify(input, { sortClassName: false }), input);
  assert.equal(minify(input, { sortClassName: true }), input);
});

QUnit.test('doctype normalization', function(assert) {
  var input;
  var output = '<!doctype html>';

  input = '<!DOCTYPE html>';
  assert.equal(minify(input, { useShortDoctype: false }), input);
  assert.equal(minify(input, { useShortDoctype: true }), output);

  assert.equal(minify(input, {
    useShortDoctype: true,
    removeTagWhitespace: true
  }), '<!doctypehtml>');

  input = '<!DOCTYPE\nhtml>';
  assert.equal(minify(input, { useShortDoctype: false }), '<!DOCTYPE html>');
  assert.equal(minify(input, { useShortDoctype: true }), output);

  input = '<!DOCTYPE\thtml>';
  assert.equal(minify(input, { useShortDoctype: false }), input);
  assert.equal(minify(input, { useShortDoctype: true }), output);

  input = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN"\n    "http://www.w3.org/TR/html4/strict.dtd">';
  assert.equal(minify(input, { useShortDoctype: false }), '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">');
  assert.equal(minify(input, { useShortDoctype: true }), output);
});

QUnit.test('removing comments', function(assert) {
  var input;

  input = '<!-- test -->';
  assert.equal(minify(input, { removeComments: true }), '');

  input = '<!-- foo --><div>baz</div><!-- bar\n\n moo -->';
  assert.equal(minify(input, { removeComments: true }), '<div>baz</div>');
  assert.equal(minify(input, { removeComments: false }), input);

  input = '<p title="<!-- comment in attribute -->">foo</p>';
  assert.equal(minify(input, { removeComments: true }), input);

  input = '<script><!-- alert(1) --></script>';
  assert.equal(minify(input, { removeComments: true }), input);

  input = '<STYLE><!-- alert(1) --></STYLE>';
  assert.equal(minify(input, { removeComments: true }), '<style><!-- alert(1) --></style>');
});

QUnit.test('ignoring comments', function(assert) {
  var input, output;

  input = '<!--! test -->';
  assert.equal(minify(input, { removeComments: true }), input);
  assert.equal(minify(input, { removeComments: false }), input);

  input = '<!--! foo --><div>baz</div><!--! bar\n\n moo -->';
  assert.equal(minify(input, { removeComments: true }), input);
  assert.equal(minify(input, { removeComments: false }), input);

  input = '<!--! foo --><div>baz</div><!-- bar\n\n moo -->';
  assert.equal(minify(input, { removeComments: true }), '<!--! foo --><div>baz</div>');
  assert.equal(minify(input, { removeComments: false }), input);

  input = '<!-- ! test -->';
  assert.equal(minify(input, { removeComments: true }), '');
  assert.equal(minify(input, { removeComments: false }), input);

  input = '<div>\n\n   \t<div><div>\n\n<p>\n\n<!--!      \t\n\nbar\n\n moo         -->      \n\n</p>\n\n        </div>  </div></div>';
  output = '<div><div><div><p><!--!      \t\n\nbar\n\n moo         --></p></div></div></div>';
  assert.equal(minify(input, { removeComments: true }), input);
  assert.equal(minify(input, { removeComments: true, collapseWhitespace: true }), output);
  assert.equal(minify(input, { removeComments: false }), input);
  assert.equal(minify(input, { removeComments: false, collapseWhitespace: true }), output);

  input = '<p rel="<!-- comment in attribute -->" title="<!--! ignored comment in attribute -->">foo</p>';
  assert.equal(minify(input, { removeComments: true }), input);
});

QUnit.test('conditional comments', function(assert) {
  var input, output;

  input = '<![if IE 5]>test<![endif]>';
  assert.equal(minify(input, { removeComments: true }), input);

  input = '<!--[if IE 6]>test<![endif]-->';
  assert.equal(minify(input, { removeComments: true }), input);

  input = '<!--[if IE 7]>-->test<!--<![endif]-->';
  assert.equal(minify(input, { removeComments: true }), input);

  input = '<!--[if IE 8]><!-->test<!--<![endif]-->';
  assert.equal(minify(input, { removeComments: true }), input);

  input = '<!--[if lt IE 5.5]>test<![endif]-->';
  assert.equal(minify(input, { removeComments: true }), input);

  input = '<!--[if (gt IE 5)&(lt IE 7)]>test<![endif]-->';
  assert.equal(minify(input, { removeComments: true }), input);

  input = '<html>\n' +
          '  <head>\n' +
          '    <!--[if lte IE 8]>\n' +
          '      <script type="text/javascript">\n' +
          '        alert("ie8!");\n' +
          '      </script>\n' +
          '    <![endif]-->\n' +
          '  </head>\n' +
          '  <body>\n' +
          '  </body>\n' +
          '</html>';
  output = '<head><!--[if lte IE 8]>\n' +
           '      <script type="text/javascript">\n' +
           '        alert("ie8!");\n' +
           '      </script>\n' +
           '    <![endif]-->';
  assert.equal(minify(input, {
    minifyJS: true,
    removeComments: true,
    collapseWhitespace: true,
    removeOptionalTags: true,
    removeScriptTypeAttributes: true
  }), output);
  output = '<head><!--[if lte IE 8]><script>alert("ie8!")</script><![endif]-->';
  assert.equal(minify(input, {
    minifyJS: true,
    removeComments: true,
    collapseWhitespace: true,
    removeOptionalTags: true,
    removeScriptTypeAttributes: true,
    processConditionalComments: true
  }), output);

  input = '<!DOCTYPE html>\n' +
          '<html lang="en">\n' +
          '  <head>\n' +
          '    <meta http-equiv="X-UA-Compatible"\n' +
          '          content="IE=edge,chrome=1">\n' +
          '    <meta charset="utf-8">\n' +
          '    <!--[if lt IE 7]><html class="no-js ie6"><![endif]-->\n' +
          '    <!--[if IE 7]><html class="no-js ie7"><![endif]-->\n' +
          '    <!--[if IE 8]><html class="no-js ie8"><![endif]-->\n' +
          '    <!--[if gt IE 8]><!--><html class="no-js"><!--<![endif]-->\n' +
          '\n' +
          '    <title>Document</title>\n' +
          '  </head>\n' +
          '  <body>\n' +
          '  </body>\n' +
          '</html>';
  output = '<!DOCTYPE html>' +
           '<html lang="en">' +
           '<head>' +
           '<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">' +
           '<meta charset="utf-8">' +
           '<!--[if lt IE 7]><html class="no-js ie6"><![endif]-->' +
           '<!--[if IE 7]><html class="no-js ie7"><![endif]-->' +
           '<!--[if IE 8]><html class="no-js ie8"><![endif]-->' +
           '<!--[if gt IE 8]><!--><html class="no-js"><!--<![endif]-->' +
           '<title>Document</title></head><body></body></html>';
  assert.equal(minify(input, {
    removeComments: true,
    collapseWhitespace: true
  }), output);
  assert.equal(minify(input, {
    removeComments: true,
    collapseWhitespace: true,
    processConditionalComments: true
  }), output);
});

QUnit.test('collapsing space in conditional comments', function(assert) {
  var input, output;

  input = '<!--[if IE 7]>\n\n   \t\n   \t\t ' +
            '<link rel="stylesheet" href="/css/ie7-fixes.css" type="text/css" />\n\t' +
          '<![endif]-->';
  assert.equal(minify(input, { removeComments: true }), input);
  assert.equal(minify(input, { removeComments: true, collapseWhitespace: true }), input);
  output = '<!--[if IE 7]>\n\n   \t\n   \t\t ' +
             '<link rel="stylesheet" href="/css/ie7-fixes.css" type="text/css">\n\t' +
           '<![endif]-->';
  assert.equal(minify(input, { removeComments: true, processConditionalComments: true }), output);
  output = '<!--[if IE 7]>' +
             '<link rel="stylesheet" href="/css/ie7-fixes.css" type="text/css">' +
           '<![endif]-->';
  assert.equal(minify(input, {
    removeComments: true,
    collapseWhitespace: true,
    processConditionalComments: true
  }), output);

  input = '<!--[if lte IE 6]>\n    \n   \n\n\n\t' +
            '<p title=" sigificant     whitespace   ">blah blah</p>' +
          '<![endif]-->';
  assert.equal(minify(input, { removeComments: true }), input);
  assert.equal(minify(input, { removeComments: true, collapseWhitespace: true }), input);
  output = '<!--[if lte IE 6]>' +
             '<p title=" sigificant     whitespace   ">blah blah</p>' +
           '<![endif]-->';
  assert.equal(minify(input, {
    removeComments: true,
    collapseWhitespace: true,
    processConditionalComments: true
  }), output);
});

QUnit.test('remove comments from scripts', function(assert) {
  var input, output;

  input = '<script><!--\nalert(1);\n--></script>';
  assert.equal(minify(input), input);
  output = '<script>alert(1)</script>';
  assert.equal(minify(input, { minifyJS: true }), output);

  input = '<script><!--alert(2);--></script>';
  assert.equal(minify(input), input);
  output = '<script></script>';
  assert.equal(minify(input, { minifyJS: true }), output);

  input = '<script><!--alert(3);\n--></script>';
  assert.equal(minify(input), input);
  output = '<script></script>';
  assert.equal(minify(input, { minifyJS: true }), output);

  input = '<script><!--\nalert(4);--></script>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyJS: true }), input);

  input = '<script><!--alert(5);\nalert(6);\nalert(7);--></script>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyJS: true }), input);

  input = '<script><!--alert(8)</script>';
  assert.equal(minify(input), input);
  output = '<script></script>';
  assert.equal(minify(input, { minifyJS: true }), output);

  input = '<script type="text/javascript"> \n <!--\nalert("-->"); -->\n\n   </script>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyJS: true }), input);

  input = '<script type="text/javascript"> \n <!--\nalert("-->");\n -->\n\n   </script>';
  assert.equal(minify(input), input);
  output = '<script type="text/javascript">alert("--\\x3e")</script>';
  assert.equal(minify(input, { minifyJS: true }), output);

  input = '<script> //   <!--   \n  alert(1)   //  --> </script>';
  assert.equal(minify(input), input);
  output = '<script>alert(1)</script>';
  assert.equal(minify(input, { minifyJS: true }), output);

  input = '<script type="text/html">\n<div>\n</div>\n<!-- aa -->\n</script>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyJS: true }), input);
});

QUnit.test('remove comments from styles', function(assert) {
  var input, output;

  input = '<style><!--\np.a{background:red}\n--></style>';
  assert.equal(minify(input), input);
  output = '<style>p.a{background:red}</style>';
  assert.equal(minify(input, { minifyCSS: true }), output);

  input = '<style><!--p.b{background:red}--></style>';
  assert.equal(minify(input), input);
  output = '<style>p.b{background:red}</style>';
  assert.equal(minify(input, { minifyCSS: true }), output);

  input = '<style><!--p.c{background:red}\n--></style>';
  assert.equal(minify(input), input);
  output = '<style>p.c{background:red}</style>';
  assert.equal(minify(input, { minifyCSS: true }), output);

  input = '<style><!--\np.d{background:red}--></style>';
  assert.equal(minify(input), input);
  output = '<style>p.d{background:red}</style>';
  assert.equal(minify(input, { minifyCSS: true }), output);

  input = '<style><!--p.e{background:red}\np.f{background:red}\np.g{background:red}--></style>';
  assert.equal(minify(input), input);
  output = '<style>p.e{background:red}p.f{background:red}p.g{background:red}</style>';
  assert.equal(minify(input, { minifyCSS: true }), output);

  input = '<style>p.h{background:red}<!--\np.i{background:red}\n-->p.j{background:red}</style>';
  assert.equal(minify(input), input);
  output = '<style>p.h{background:red}p.i{background:red}p.j{background:red}</style>';
  assert.equal(minify(input, { minifyCSS: true }), output);

  input = '<style type="text/css"><!-- p { color: red } --></style>';
  assert.equal(minify(input), input);
  output = '<style type="text/css">p{color:red}</style>';
  assert.equal(minify(input, { minifyCSS: true }), output);

  input = '<style type="text/css">p::before { content: "<!--" }</style>';
  assert.equal(minify(input), input);
  output = '<style type="text/css">p::before{content:"<!--"}</style>';
  assert.equal(minify(input, { minifyCSS: true }), output);

  input = '<style type="text/html">\n<div>\n</div>\n<!-- aa -->\n</style>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: true }), input);
});

QUnit.test('remove CDATA sections from scripts/styles', function(assert) {
  var input, output;

  input = '<script><![CDATA[\nalert(1)\n]]></script>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyJS: true }), input);

  input = '<script><![CDATA[alert(2)]]></script>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyJS: true }), input);

  input = '<script><![CDATA[alert(3)\n]]></script>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyJS: true }), input);

  input = '<script><![CDATA[\nalert(4)]]></script>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyJS: true }), input);

  input = '<script><![CDATA[alert(5)\nalert(6)\nalert(7)]]></script>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyJS: true }), input);

  input = '<script>/*<![CDATA[*/alert(8)/*]]>*/</script>';
  assert.equal(minify(input), input);
  output = '<script>alert(8)</script>';
  assert.equal(minify(input, { minifyJS: true }), output);

  input = '<script>//<![CDATA[\nalert(9)\n//]]></script>';
  assert.equal(minify(input), input);
  output = '<script>alert(9)</script>';
  assert.equal(minify(input, { minifyJS: true }), output);

  input = '<script type="text/javascript"> /* \n\t  <![CDATA[  */ alert(10) /*  ]]>  */ \n </script>';
  assert.equal(minify(input), input);
  output = '<script type="text/javascript">alert(10)</script>';
  assert.equal(minify(input, { minifyJS: true }), output);

  input = '<script>\n\n//<![CDATA[\nalert(11)//]]></script>';
  assert.equal(minify(input), input);
  output = '<script>alert(11)</script>';
  assert.equal(minify(input, { minifyJS: true }), output);

  input = '<style><![CDATA[\np.a{background:red}\n]]></style>';
  assert.equal(minify(input), input);
  output = '<style></style>';
  assert.equal(minify(input, { minifyCSS: true }), output);

  input = '<style><![CDATA[p.b{background:red}]]></style>';
  assert.equal(minify(input), input);
  output = '<style></style>';
  assert.equal(minify(input, { minifyCSS: true }), output);

  input = '<style><![CDATA[p.c{background:red}\n]]></style>';
  assert.equal(minify(input), input);
  output = '<style></style>';
  assert.equal(minify(input, { minifyCSS: true }), output);

  input = '<style><![CDATA[\np.d{background:red}]]></style>';
  assert.equal(minify(input), input);
  output = '<style></style>';
  assert.equal(minify(input, { minifyCSS: true }), output);

  input = '<style><![CDATA[p.e{background:red}\np.f{background:red}\np.g{background:red}]]></style>';
  assert.equal(minify(input), input);
  output = '<style>p.f{background:red}p.g{background:red}</style>';
  assert.equal(minify(input, { minifyCSS: true }), output);

  input = '<style>p.h{background:red}<![CDATA[\np.i{background:red}\n]]>p.j{background:red}</style>';
  assert.equal(minify(input), input);
  output = '<style>p.h{background:red}]]>p.j{background:red}</style>';
  assert.equal(minify(input, { minifyCSS: true }), output);

  input = '<style>/* <![CDATA[ */p { color: red } // ]]></style>';
  assert.equal(minify(input), input);
  output = '<style>p{color:red}</style>';
  assert.equal(minify(input, { minifyCSS: true }), output);

  input = '<style type="text/html">\n<div>\n</div>\n<![CDATA[ aa ]]>\n</style>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: true }), input);
});

QUnit.test('custom processors', function(assert) {
  var input, output;

  function css(text, type) {
    return (type || 'Normal') + ' CSS';
  }

  input = '<style>\n.foo { font: 12pt "bar" } </style>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: null }), input);
  assert.equal(minify(input, { minifyCSS: false }), input);
  output = '<style>Normal CSS</style>';
  assert.equal(minify(input, { minifyCSS: css }), output);

  input = '<p style="font: 12pt \'bar\'"></p>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: null }), input);
  assert.equal(minify(input, { minifyCSS: false }), input);
  output = '<p style="inline CSS"></p>';
  assert.equal(minify(input, { minifyCSS: css }), output);

  input = '<link rel="stylesheet" href="css/style-mobile.css" media="(max-width: 737px)">';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: null }), input);
  assert.equal(minify(input, { minifyCSS: false }), input);
  output = '<link rel="stylesheet" href="css/style-mobile.css" media="media CSS">';
  assert.equal(minify(input, { minifyCSS: css }), output);

  input = '<style media="(max-width: 737px)"></style>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: null }), input);
  assert.equal(minify(input, { minifyCSS: false }), input);
  output = '<style media="media CSS">Normal CSS</style>';
  assert.equal(minify(input, { minifyCSS: css }), output);

  function js(text, inline) {
    return inline ? 'Inline JS' : 'Normal JS';
  }

  input = '<script>\nalert(1); </script>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyJS: null }), input);
  assert.equal(minify(input, { minifyJS: false }), input);
  output = '<script>Normal JS</script>';
  assert.equal(minify(input, { minifyJS: js }), output);

  input = '<p onload="alert(1);"></p>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyJS: null }), input);
  assert.equal(minify(input, { minifyJS: false }), input);
  output = '<p onload="Inline JS"></p>';
  assert.equal(minify(input, { minifyJS: js }), output);

  function url() {
    return 'URL';
  }

  input = '<a href="http://site.com/foo">bar</a>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyURLs: null }), input);
  assert.equal(minify(input, { minifyURLs: false }), input);
  output = '<a href="URL">bar</a>';
  assert.equal(minify(input, { minifyURLs: url }), output);

  input = '<style>\n.foo { background: url("http://site.com/foo") } </style>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyURLs: null }), input);
  assert.equal(minify(input, { minifyURLs: false }), input);
  assert.equal(minify(input, { minifyURLs: url }), input);
  output = '<style>.foo{background:url(URL)}</style>';
  assert.equal(minify(input, { minifyCSS: true, minifyURLs: url }), output);
});

QUnit.test('empty attributes', function(assert) {
  var input;

  input = '<p id="" class="" STYLE=" " title="\n" lang="" dir="">x</p>';
  assert.equal(minify(input, { removeEmptyAttributes: true }), '<p>x</p>');

  input = '<p onclick=""   ondblclick=" " onmousedown="" ONMOUSEUP="" onmouseover=" " onmousemove="" onmouseout="" ' +
          'onkeypress=\n\n  "\n     " onkeydown=\n"" onkeyup\n="">x</p>';
  assert.equal(minify(input, { removeEmptyAttributes: true }), '<p>x</p>');

  input = '<input onfocus="" onblur="" onchange=" " value=" boo ">';
  assert.equal(minify(input, { removeEmptyAttributes: true }), '<input value=" boo ">');

  input = '<input value="" name="foo">';
  assert.equal(minify(input, { removeEmptyAttributes: true }), '<input name="foo">');

  input = '<img src="" alt="">';
  assert.equal(minify(input, { removeEmptyAttributes: true }), '<img src="" alt="">');

  // preserve unrecognized attribute
  // remove recognized attrs with unspecified values
  input = '<div data-foo class id style title lang dir onfocus onblur onchange onclick ondblclick onmousedown onmouseup onmouseover onmousemove onmouseout onkeypress onkeydown onkeyup></div>';
  assert.equal(minify(input, { removeEmptyAttributes: true }), '<div data-foo></div>');

  // additional remove attributes
  input = '<img src="" alt="">';
  assert.equal(minify(input, { removeEmptyAttributes: function(attrName, tag) { return tag === 'img' && attrName === 'src'; } }), '<img alt="">');
});

QUnit.test('cleaning class/style attributes', function(assert) {
  var input, output;

  input = '<p class=" foo bar  ">foo bar baz</p>';
  assert.equal(minify(input), '<p class="foo bar">foo bar baz</p>');

  input = '<p class=" foo      ">foo bar baz</p>';
  assert.equal(minify(input), '<p class="foo">foo bar baz</p>');
  assert.equal(minify(input, { removeAttributeQuotes: true }), '<p class=foo>foo bar baz</p>');

  input = '<p class="\n  \n foo   \n\n\t  \t\n   ">foo bar baz</p>';
  output = '<p class="foo">foo bar baz</p>';
  assert.equal(minify(input), output);

  input = '<p class="\n  \n foo   \n\n\t  \t\n  class1 class-23 ">foo bar baz</p>';
  output = '<p class="foo class1 class-23">foo bar baz</p>';
  assert.equal(minify(input), output);

  input = '<p style="    color: red; background-color: rgb(100, 75, 200);  "></p>';
  output = '<p style="color: red; background-color: rgb(100, 75, 200);"></p>';
  assert.equal(minify(input), output);

  input = '<p style="font-weight: bold  ; "></p>';
  output = '<p style="font-weight: bold;"></p>';
  assert.equal(minify(input), output);
});

QUnit.test('cleaning URI-based attributes', function(assert) {
  var input, output;

  input = '<a href="   http://example.com  ">x</a>';
  output = '<a href="http://example.com">x</a>';
  assert.equal(minify(input), output);

  input = '<a href="  \t\t  \n \t  ">x</a>';
  output = '<a href="">x</a>';
  assert.equal(minify(input), output);

  input = '<img src="   http://example.com  " title="bleh   " longdesc="  http://example.com/longdesc \n\n   \t ">';
  output = '<img src="http://example.com" title="bleh   " longdesc="http://example.com/longdesc">';
  assert.equal(minify(input), output);

  input = '<img src="" usemap="   http://example.com  ">';
  output = '<img src="" usemap="http://example.com">';
  assert.equal(minify(input), output);

  input = '<form action="  somePath/someSubPath/someAction?foo=bar&baz=qux     "></form>';
  output = '<form action="somePath/someSubPath/someAction?foo=bar&baz=qux"></form>';
  assert.equal(minify(input), output);

  input = '<BLOCKQUOTE cite=" \n\n\n http://www.mycom.com/tolkien/twotowers.html     "><P>foobar</P></BLOCKQUOTE>';
  output = '<blockquote cite="http://www.mycom.com/tolkien/twotowers.html"><p>foobar</p></blockquote>';
  assert.equal(minify(input), output);

  input = '<head profile="       http://gmpg.org/xfn/11    "></head>';
  output = '<head profile="http://gmpg.org/xfn/11"></head>';
  assert.equal(minify(input), output);

  input = '<object codebase="   http://example.com  "></object>';
  output = '<object codebase="http://example.com"></object>';
  assert.equal(minify(input), output);

  input = '<span profile="   1, 2, 3  ">foo</span>';
  assert.equal(minify(input), input);

  input = '<div action="  foo-bar-baz ">blah</div>';
  assert.equal(minify(input), input);
});

QUnit.test('cleaning Number-based attributes', function(assert) {
  var input, output;

  input = '<a href="#" tabindex="   1  ">x</a><button tabindex="   2  ">y</button>';
  output = '<a href="#" tabindex="1">x</a><button tabindex="2">y</button>';
  assert.equal(minify(input), output);

  input = '<input value="" maxlength="     5 ">';
  output = '<input value="" maxlength="5">';
  assert.equal(minify(input), output);

  input = '<select size="  10   \t\t "><option>x</option></select>';
  output = '<select size="10"><option>x</option></select>';
  assert.equal(minify(input), output);

  input = '<textarea rows="   20  " cols="  30      "></textarea>';
  output = '<textarea rows="20" cols="30"></textarea>';
  assert.equal(minify(input), output);

  input = '<COLGROUP span="   40  "><COL span="  39 "></COLGROUP>';
  output = '<colgroup span="40"><col span="39"></colgroup>';
  assert.equal(minify(input), output);

  input = '<tr><td colspan="    2   ">x</td><td rowspan="   3 "></td></tr>';
  output = '<tr><td colspan="2">x</td><td rowspan="3"></td></tr>';
  assert.equal(minify(input), output);
});

QUnit.test('cleaning other attributes', function(assert) {
  var input, output;

  input = '<a href="#" onclick="  window.prompt(\'boo\'); " onmouseover=" \n\n alert(123)  \t \n\t  ">blah</a>';
  output = '<a href="#" onclick="window.prompt(\'boo\');" onmouseover="alert(123)">blah</a>';
  assert.equal(minify(input), output);

  input = '<body onload="  foo();   bar() ;  "><p>x</body>';
  output = '<body onload="foo();   bar() ;"><p>x</p></body>';
  assert.equal(minify(input), output);
});

QUnit.test('removing redundant attributes (&lt;form method="get" ...>)', function(assert) {
  var input;

  input = '<form method="get">hello world</form>';
  assert.equal(minify(input, { removeRedundantAttributes: true }), '<form>hello world</form>');

  input = '<form method="post">hello world</form>';
  assert.equal(minify(input, { removeRedundantAttributes: true }), '<form method="post">hello world</form>');
});

QUnit.test('removing redundant attributes (&lt;input type="text" ...>)', function(assert) {
  var input;

  input = '<input type="text">';
  assert.equal(minify(input, { removeRedundantAttributes: true }), '<input>');

  input = '<input type="  TEXT  " value="foo">';
  assert.equal(minify(input, { removeRedundantAttributes: true }), '<input value="foo">');

  input = '<input type="checkbox">';
  assert.equal(minify(input, { removeRedundantAttributes: true }), '<input type="checkbox">');
});

QUnit.test('removing redundant attributes (&lt;a name="..." id="..." ...>)', function(assert) {
  var input;

  input = '<a id="foo" name="foo">blah</a>';
  assert.equal(minify(input, { removeRedundantAttributes: true }), '<a id="foo">blah</a>');

  input = '<input id="foo" name="foo">';
  assert.equal(minify(input, { removeRedundantAttributes: true }), input);

  input = '<a name="foo">blah</a>';
  assert.equal(minify(input, { removeRedundantAttributes: true }), input);

  input = '<a href="..." name="  bar  " id="bar" >blah</a>';
  assert.equal(minify(input, { removeRedundantAttributes: true }), '<a href="..." id="bar">blah</a>');
});

QUnit.test('removing redundant attributes (&lt;script src="..." charset="...">)', function(assert) {
  var input, output;

  input = '<script type="text/javascript" charset="UTF-8">alert(222);</script>';
  output = '<script type="text/javascript">alert(222);</script>';
  assert.equal(minify(input, { removeRedundantAttributes: true }), output);

  input = '<script type="text/javascript" src="http://example.com" charset="UTF-8">alert(222);</script>';
  assert.equal(minify(input, { removeRedundantAttributes: true }), input);

  input = '<script CHARSET=" ... ">alert(222);</script>';
  output = '<script>alert(222);</script>';
  assert.equal(minify(input, { removeRedundantAttributes: true }), output);
});

QUnit.test('removing redundant attributes (&lt;... language="javascript" ...>)', function(assert) {
  var input;

  input = '<script language="Javascript">x=2,y=4</script>';
  assert.equal(minify(input, { removeRedundantAttributes: true }), '<script>x=2,y=4</script>');

  input = '<script LANGUAGE = "  javaScript  ">x=2,y=4</script>';
  assert.equal(minify(input, { removeRedundantAttributes: true }), '<script>x=2,y=4</script>');
});

QUnit.test('removing redundant attributes (&lt;area shape="rect" ...>)', function(assert) {
  var input = '<area shape="rect" coords="696,25,958,47" href="#" title="foo">';
  var output = '<area coords="696,25,958,47" href="#" title="foo">';
  assert.equal(minify(input, { removeRedundantAttributes: true }), output);
});

QUnit.test('removing redundant attributes (&lt;... = "javascript: ..." ...>)', function(assert) {
  var input;

  input = '<p onclick="javascript:alert(1)">x</p>';
  assert.equal(minify(input), '<p onclick="alert(1)">x</p>');

  input = '<p onclick="javascript:x">x</p>';
  assert.equal(minify(input, { removeAttributeQuotes: true }), '<p onclick=x>x</p>');

  input = '<p onclick=" JavaScript: x">x</p>';
  assert.equal(minify(input), '<p onclick="x">x</p>');

  input = '<p title="javascript:(function() { /* some stuff here */ })()">x</p>';
  assert.equal(minify(input), input);
});

QUnit.test('removing javascript type attributes', function(assert) {
  var input, output;

  input = '<script type="">alert(1)</script>';
  assert.equal(minify(input, { removeScriptTypeAttributes: false }), input);
  output = '<script>alert(1)</script>';
  assert.equal(minify(input, { removeScriptTypeAttributes: true }), output);

  input = '<script type="text/javascript">alert(1)</script>';
  assert.equal(minify(input, { removeScriptTypeAttributes: false }), input);
  output = '<script>alert(1)</script>';
  assert.equal(minify(input, { removeScriptTypeAttributes: true }), output);

  input = '<SCRIPT TYPE="  text/javascript ">alert(1)</script>';
  output = '<script>alert(1)</script>';
  assert.equal(minify(input, { removeScriptTypeAttributes: true }), output);

  input = '<script type="application/javascript;version=1.8">alert(1)</script>';
  output = '<script>alert(1)</script>';
  assert.equal(minify(input, { removeScriptTypeAttributes: true }), output);

  input = '<script type="text/vbscript">MsgBox("foo bar")</script>';
  output = '<script type="text/vbscript">MsgBox("foo bar")</script>';
  assert.equal(minify(input, { removeScriptTypeAttributes: true }), output);
});

QUnit.test('removing type="text/css" attributes', function(assert) {
  var input, output;

  input = '<style type="">.foo { color: red }</style>';
  assert.equal(minify(input, { removeStyleLinkTypeAttributes: false }), input);
  output = '<style>.foo { color: red }</style>';
  assert.equal(minify(input, { removeStyleLinkTypeAttributes: true }), output);

  input = '<style type="text/css">.foo { color: red }</style>';
  assert.equal(minify(input, { removeStyleLinkTypeAttributes: false }), input);
  output = '<style>.foo { color: red }</style>';
  assert.equal(minify(input, { removeStyleLinkTypeAttributes: true }), output);

  input = '<STYLE TYPE = "  text/CSS ">body { font-size: 1.75em }</style>';
  output = '<style>body { font-size: 1.75em }</style>';
  assert.equal(minify(input, { removeStyleLinkTypeAttributes: true }), output);

  input = '<style type="text/plain">.foo { background: green }</style>';
  assert.equal(minify(input, { removeStyleLinkTypeAttributes: true }), input);

  input = '<link rel="stylesheet" type="text/css" href="http://example.com">';
  output = '<link rel="stylesheet" href="http://example.com">';
  assert.equal(minify(input, { removeStyleLinkTypeAttributes: true }), output);

  input = '<link rel="alternate" type="application/atom+xml" href="data.xml">';
  assert.equal(minify(input, { removeStyleLinkTypeAttributes: true }), input);
});

QUnit.test('removing attribute quotes', function(assert) {
  var input;

  input = '<p title="blah" class="a23B-foo.bar_baz:qux" id="moo">foo</p>';
  assert.equal(minify(input, { removeAttributeQuotes: true }), '<p title=blah class=a23B-foo.bar_baz:qux id=moo>foo</p>');

  input = '<input value="hello world">';
  assert.equal(minify(input, { removeAttributeQuotes: true }), '<input value="hello world">');

  input = '<a href="#" title="foo#bar">x</a>';
  assert.equal(minify(input, { removeAttributeQuotes: true }), '<a href=# title=foo#bar>x</a>');

  input = '<a href="http://example.com/" title="blah">\nfoo\n\n</a>';
  assert.equal(minify(input, { removeAttributeQuotes: true }), '<a href=http://example.com/ title=blah>\nfoo\n\n</a>');

  input = '<a title="blah" href="http://example.com/">\nfoo\n\n</a>';
  assert.equal(minify(input, { removeAttributeQuotes: true }), '<a title=blah href=http://example.com/ >\nfoo\n\n</a>');

  input = '<a href="http://example.com/" title="">\nfoo\n\n</a>';
  assert.equal(minify(input, { removeAttributeQuotes: true, removeEmptyAttributes: true }), '<a href=http://example.com/ >\nfoo\n\n</a>');

  input = '<p class=foo|bar:baz></p>';
  assert.equal(minify(input, { removeAttributeQuotes: true }), '<p class=foo|bar:baz></p>');
});

QUnit.test('preserving custom attribute-wrapping markup', function(assert) {
  var input, customAttrOptions;

  // With a single rule
  customAttrOptions = {
    customAttrSurround: [[/\{\{#if\s+\w+\}\}/, /\{\{\/if\}\}/]]
  };

  input = '<input {{#if value}}checked="checked"{{/if}}>';
  assert.equal(minify(input, customAttrOptions), input);

  input = '<input checked="checked">';
  assert.equal(minify(input, customAttrOptions), input);

  // With multiple rules
  customAttrOptions = {
    customAttrSurround: [
      [/\{\{#if\s+\w+\}\}/, /\{\{\/if\}\}/],
      [/\{\{#unless\s+\w+\}\}/, /\{\{\/unless\}\}/]
    ]
  };

  input = '<input {{#if value}}checked="checked"{{/if}}>';
  assert.equal(minify(input, customAttrOptions), input);

  input = '<input {{#unless value}}checked="checked"{{/unless}}>';
  assert.equal(minify(input, customAttrOptions), input);

  input = '<input {{#if value1}}data-attr="example" {{/if}}{{#unless value2}}checked="checked"{{/unless}}>';
  assert.equal(minify(input, customAttrOptions), input);

  input = '<input checked="checked">';
  assert.equal(minify(input, customAttrOptions), input);

  // With multiple rules and richer options
  customAttrOptions = {
    customAttrSurround: [
      [/\{\{#if\s+\w+\}\}/, /\{\{\/if\}\}/],
      [/\{\{#unless\s+\w+\}\}/, /\{\{\/unless\}\}/]
    ],
    collapseBooleanAttributes: true,
    removeAttributeQuotes: true
  };

  input = '<input {{#if value}}checked="checked"{{/if}}>';
  assert.equal(minify(input, customAttrOptions), '<input {{#if value}}checked{{/if}}>');

  input = '<input {{#if value1}}checked="checked"{{/if}} {{#if value2}}data-attr="foo"{{/if}}/>';
  assert.equal(minify(input, customAttrOptions), '<input {{#if value1}}checked {{/if}}{{#if value2}}data-attr=foo{{/if}}>');

  customAttrOptions.keepClosingSlash = true;
  assert.equal(minify(input, customAttrOptions), '<input {{#if value1}}checked {{/if}}{{#if value2}}data-attr=foo {{/if}}/>');
});

QUnit.test('preserving custom attribute-joining markup', function(assert) {
  var input;
  var polymerConditionalAttributeJoin = /\?=/;
  var customAttrOptions = {
    customAttrAssign: [polymerConditionalAttributeJoin]
  };
  input = '<div flex?="{{mode != cover}}"></div>';
  assert.equal(minify(input, customAttrOptions), input);
  input = '<div flex?="{{mode != cover}}" class="foo"></div>';
  assert.equal(minify(input, customAttrOptions), input);
});

QUnit.test('collapsing whitespace', function(assert) {
  var input, output;

  input = '<script type="text/javascript">  \n\t   alert(1) \n\n\n  \t </script>';
  output = '<script type="text/javascript">alert(1)</script>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);

  input = '<p>foo</p>    <p> bar</p>\n\n   \n\t\t  <div title="quz">baz  </div>';
  output = '<p>foo</p><p>bar</p><div title="quz">baz</div>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);

  input = '<p> foo    bar</p>';
  output = '<p>foo bar</p>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);

  input = '<p>foo\nbar</p>';
  output = '<p>foo bar</p>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);

  input = '<p> foo    <span>  blah     <i>   22</i>    </span> bar <img src=""></p>';
  output = '<p>foo <span>blah <i>22</i> </span>bar <img src=""></p>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);

  input = '<textarea> foo bar     baz \n\n   x \t    y </textarea>';
  output = '<textarea> foo bar     baz \n\n   x \t    y </textarea>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);

  input = '<div><textarea></textarea>    </div>';
  output = '<div><textarea></textarea></div>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);

  input = '<div><pRe> $foo = "baz"; </pRe>    </div>';
  output = '<div><pre> $foo = "baz"; </pre></div>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  output = '<div><pRe>$foo = "baz";</pRe></div>';
  assert.equal(minify(input, { collapseWhitespace: true, caseSensitive: true }), output);

  input = '<script type="text/javascript">var = "hello";</script>\r\n\r\n\r\n' +
          '<style type="text/css">#foo { color: red;        }          </style>\r\n\r\n\r\n' +
          '<div>\r\n  <div>\r\n    <div><!-- hello -->\r\n      <div>' +
          '<!--! hello -->\r\n        <div>\r\n          <div class="">\r\n\r\n            ' +
          '<textarea disabled="disabled">     this is a textarea </textarea>\r\n          ' +
          '</div>\r\n        </div>\r\n      </div>\r\n    </div>\r\n  </div>\r\n</div>' +
          '<pre>       \r\nxxxx</pre><span>x</span> <span>Hello</span> <b>billy</b>     \r\n' +
          '<input type="text">\r\n<textarea></textarea>\r\n<pre></pre>';
  output = '<script type="text/javascript">var = "hello";</script>' +
           '<style type="text/css">#foo { color: red;        }</style>' +
           '<div><div><div>' +
           '<!-- hello --><div><!--! hello --><div><div class="">' +
           '<textarea disabled="disabled">     this is a textarea </textarea>' +
           '</div></div></div></div></div></div>' +
           '<pre>       \r\nxxxx</pre><span>x</span> <span>Hello</span> <b>billy</b> ' +
           '<input type="text"> <textarea></textarea><pre></pre>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);

  input = '<pre title="some title...">   hello     world </pre>';
  output = '<pre title="some title...">   hello     world </pre>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);

  input = '<pre title="some title..."><code>   hello     world </code></pre>';
  output = '<pre title="some title..."><code>   hello     world </code></pre>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);

  input = '<script>alert("foo     bar")    </script>';
  output = '<script>alert("foo     bar")</script>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);

  input = '<style>alert("foo     bar")    </style>';
  output = '<style>alert("foo     bar")</style>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
});

QUnit.test('removing empty elements', function(assert) {
  var input, output;

  assert.equal(minify('<p>x</p>', { removeEmptyElements: true }), '<p>x</p>');
  assert.equal(minify('<p></p>', { removeEmptyElements: true }), '');

  input = '<p>foo<span>bar</span><span></span></p>';
  output = '<p>foo<span>bar</span></p>';
  assert.equal(minify(input, { removeEmptyElements: true }), output);

  input = '<a href="http://example/com" title="hello world"></a>';
  output = '';
  assert.equal(minify(input, { removeEmptyElements: true }), output);

  input = '<iframe></iframe>';
  output = '';
  assert.equal(minify(input, { removeEmptyElements: true }), output);

  input = '<iframe src="page.html"></iframe>';
  assert.equal(minify(input, { removeEmptyElements: true }), input);

  input = '<iframe srcdoc="<h1>Foo</h1>"></iframe>';
  assert.equal(minify(input, { removeEmptyElements: true }), input);

  input = '<video></video>';
  output = '';
  assert.equal(minify(input, { removeEmptyElements: true }), output);

  input = '<video src="preview.ogg"></video>';
  assert.equal(minify(input, { removeEmptyElements: true }), input);

  input = '<audio autoplay></audio>';
  output = '';
  assert.equal(minify(input, { removeEmptyElements: true }), output);

  input = '<audio src="startup.mp3" autoplay></audio>';
  assert.equal(minify(input, { removeEmptyElements: true }), input);

  input = '<object type="application/x-shockwave-flash"></object>';
  output = '';
  assert.equal(minify(input, { removeEmptyElements: true }), output);

  input = '<object data="game.swf" type="application/x-shockwave-flash"></object>';
  assert.equal(minify(input, { removeEmptyElements: true }), input);

  input = '<applet archive="game.zip" width="250" height="150"></applet>';
  output = '';
  assert.equal(minify(input, { removeEmptyElements: true }), output);

  input = '<applet code="game.class" archive="game.zip" width="250" height="150"></applet>';
  assert.equal(minify(input, { removeEmptyElements: true }), input);

  input = '<textarea cols="10" rows="10"></textarea>';
  assert.equal(minify(input, { removeEmptyElements: true }), input);

  input = '<div>hello<span>world</span></div>';
  assert.equal(minify(input, { removeEmptyElements: true }), input);

  input = '<p>x<span title="<" class="blah-moo"></span></p>';
  output = '<p>x</p>';
  assert.equal(minify(input, { removeEmptyElements: true }), output);

  input = '<div>x<div>y <div>blah</div><div></div>foo</div>z</div>';
  output = '<div>x<div>y <div>blah</div>foo</div>z</div>';
  assert.equal(minify(input, { removeEmptyElements: true }), output);

  input = '<img src="">';
  assert.equal(minify(input, { removeEmptyElements: true }), input);

  input = '<p><!-- x --></p>';
  output = '';
  assert.equal(minify(input, { removeEmptyElements: true }), output);

  input = '<script src="foo.js"></script>';
  assert.equal(minify(input, { removeEmptyElements: true }), input);
  input = '<script></script>';
  assert.equal(minify(input, { removeEmptyElements: true }), '');

  input = '<div>after<span></span> </div>';
  output = '<div>after </div>';
  assert.equal(minify(input, { removeEmptyElements: true }), output);
  output = '<div>after</div>';
  assert.equal(minify(input, { collapseWhitespace: true, removeEmptyElements: true }), output);

  input = '<div>before <span></span></div>';
  output = '<div>before </div>';
  assert.equal(minify(input, { removeEmptyElements: true }), output);
  output = '<div>before</div>';
  assert.equal(minify(input, { collapseWhitespace: true, removeEmptyElements: true }), output);

  input = '<div>both <span></span> </div>';
  output = '<div>both  </div>';
  assert.equal(minify(input, { removeEmptyElements: true }), output);
  output = '<div>both</div>';
  assert.equal(minify(input, { collapseWhitespace: true, removeEmptyElements: true }), output);

  input = '<div>unary <span></span><link></div>';
  output = '<div>unary <link></div>';
  assert.equal(minify(input, { removeEmptyElements: true }), output);
  output = '<div>unary<link></div>';
  assert.equal(minify(input, { collapseWhitespace: true, removeEmptyElements: true }), output);

  input = '<div>Empty <!-- NOT --> </div>';
  assert.equal(minify(input, { removeEmptyElements: true }), input);
  output = '<div>Empty<!-- NOT --></div>';
  assert.equal(minify(input, { collapseWhitespace: true, removeEmptyElements: true }), output);
});

QUnit.test('collapsing boolean attributes', function(assert) {
  var input, output;

  input = '<input disabled="disabled">';
  assert.equal(minify(input, { collapseBooleanAttributes: true }), '<input disabled>');

  input = '<input CHECKED = "checked" readonly="readonly">';
  assert.equal(minify(input, { collapseBooleanAttributes: true }), '<input checked readonly>');

  input = '<option name="blah" selected="selected">moo</option>';
  assert.equal(minify(input, { collapseBooleanAttributes: true }), '<option name="blah" selected>moo</option>');

  input = '<input autofocus="autofocus">';
  assert.equal(minify(input, { collapseBooleanAttributes: true }), '<input autofocus>');

  input = '<input required="required">';
  assert.equal(minify(input, { collapseBooleanAttributes: true }), '<input required>');

  input = '<input multiple="multiple">';
  assert.equal(minify(input, { collapseBooleanAttributes: true }), '<input multiple>');

  input = '<div Allowfullscreen=foo Async=foo Autofocus=foo Autoplay=foo Checked=foo Compact=foo Controls=foo ' +
    'Declare=foo Default=foo Defaultchecked=foo Defaultmuted=foo Defaultselected=foo Defer=foo Disabled=foo ' +
    'Enabled=foo Formnovalidate=foo Hidden=foo Indeterminate=foo Inert=foo Ismap=foo Itemscope=foo ' +
    'Loop=foo Multiple=foo Muted=foo Nohref=foo Noresize=foo Noshade=foo Novalidate=foo Nowrap=foo Open=foo ' +
    'Pauseonexit=foo Readonly=foo Required=foo Reversed=foo Scoped=foo Seamless=foo Selected=foo Sortable=foo ' +
    'Truespeed=foo Typemustmatch=foo Visible=foo></div>';
  output = '<div allowfullscreen async autofocus autoplay checked compact controls declare default defaultchecked ' +
    'defaultmuted defaultselected defer disabled enabled formnovalidate hidden indeterminate inert ' +
    'ismap itemscope loop multiple muted nohref noresize noshade novalidate nowrap open pauseonexit readonly ' +
    'required reversed scoped seamless selected sortable truespeed typemustmatch visible></div>';
  assert.equal(minify(input, { collapseBooleanAttributes: true }), output);
  output = '<div Allowfullscreen Async Autofocus Autoplay Checked Compact Controls Declare Default Defaultchecked ' +
    'Defaultmuted Defaultselected Defer Disabled Enabled Formnovalidate Hidden Indeterminate Inert ' +
    'Ismap Itemscope Loop Multiple Muted Nohref Noresize Noshade Novalidate Nowrap Open Pauseonexit Readonly ' +
    'Required Reversed Scoped Seamless Selected Sortable Truespeed Typemustmatch Visible></div>';
  assert.equal(minify(input, { collapseBooleanAttributes: true, caseSensitive: true }), output);
});

QUnit.test('collapsing enumerated attributes', function(assert) {
  assert.equal(minify('<div draggable="auto"></div>', { collapseBooleanAttributes: true }), '<div draggable></div>');
  assert.equal(minify('<div draggable="true"></div>', { collapseBooleanAttributes: true }), '<div draggable="true"></div>');
  assert.equal(minify('<div draggable="false"></div>', { collapseBooleanAttributes: true }), '<div draggable="false"></div>');
  assert.equal(minify('<div draggable="foo"></div>', { collapseBooleanAttributes: true }), '<div draggable></div>');
  assert.equal(minify('<div draggable></div>', { collapseBooleanAttributes: true }), '<div draggable></div>');
  assert.equal(minify('<div Draggable="auto"></div>', { collapseBooleanAttributes: true }), '<div draggable></div>');
  assert.equal(minify('<div Draggable="true"></div>', { collapseBooleanAttributes: true }), '<div draggable="true"></div>');
  assert.equal(minify('<div Draggable="false"></div>', { collapseBooleanAttributes: true }), '<div draggable="false"></div>');
  assert.equal(minify('<div Draggable="foo"></div>', { collapseBooleanAttributes: true }), '<div draggable></div>');
  assert.equal(minify('<div Draggable></div>', { collapseBooleanAttributes: true }), '<div draggable></div>');
  assert.equal(minify('<div draggable="Auto"></div>', { collapseBooleanAttributes: true }), '<div draggable></div>');
});

QUnit.test('keeping trailing slashes in tags', function(assert) {
  assert.equal(minify('<img src="test"/>', { keepClosingSlash: true }), '<img src="test"/>');
  // https://github.com/kangax/html-minifier/issues/233
  assert.equal(minify('<img src="test"/>', { keepClosingSlash: true, removeAttributeQuotes: true }), '<img src=test />');
  assert.equal(minify('<img src="test" id=""/>', { keepClosingSlash: true, removeAttributeQuotes: true, removeEmptyAttributes: true }), '<img src=test />');
  assert.equal(minify('<img title="foo" src="test"/>', { keepClosingSlash: true, removeAttributeQuotes: true }), '<img title=foo src=test />');
});

QUnit.test('removing optional tags', function(assert) {
  var input, output;

  input = '<p>foo';
  assert.equal(minify(input, { removeOptionalTags: true }), input);

  input = '</p>';
  output = '<p>';
  assert.equal(minify(input, { removeOptionalTags: true }), output);

  input = '<body></body>';
  output = '';
  assert.equal(minify(input, { removeOptionalTags: true }), output);
  assert.equal(minify(input, { removeOptionalTags: true, removeEmptyElements: true }), output);

  input = '<html><head></head><body></body></html>';
  output = '';
  assert.equal(minify(input, { removeOptionalTags: true }), output);
  assert.equal(minify(input, { removeOptionalTags: true, removeEmptyElements: true }), output);

  input = ' <html></html>';
  output = ' ';
  assert.equal(minify(input, { removeOptionalTags: true }), output);
  output = '';
  assert.equal(minify(input, { collapseWhitespace: true, removeOptionalTags: true }), output);

  input = '<html> </html>';
  output = ' ';
  assert.equal(minify(input, { removeOptionalTags: true }), output);
  output = '';
  assert.equal(minify(input, { collapseWhitespace: true, removeOptionalTags: true }), output);

  input = '<html></html> ';
  output = ' ';
  assert.equal(minify(input, { removeOptionalTags: true }), output);
  output = '';
  assert.equal(minify(input, { collapseWhitespace: true, removeOptionalTags: true }), output);

  input = ' <html><body></body></html>';
  output = ' ';
  assert.equal(minify(input, { removeOptionalTags: true }), output);
  output = '';
  assert.equal(minify(input, { collapseWhitespace: true, removeOptionalTags: true }), output);

  input = '<html> <body></body></html>';
  output = ' ';
  assert.equal(minify(input, { removeOptionalTags: true }), output);
  output = '';
  assert.equal(minify(input, { collapseWhitespace: true, removeOptionalTags: true }), output);

  input = '<html><body> </body></html>';
  output = '<body> ';
  assert.equal(minify(input, { removeOptionalTags: true }), output);
  output = '';
  assert.equal(minify(input, { collapseWhitespace: true, removeOptionalTags: true }), output);

  input = '<html><body></body> </html>';
  output = ' ';
  assert.equal(minify(input, { removeOptionalTags: true }), output);
  output = '';
  assert.equal(minify(input, { collapseWhitespace: true, removeOptionalTags: true }), output);

  input = '<html><body></body></html> ';
  output = ' ';
  assert.equal(minify(input, { removeOptionalTags: true }), output);
  output = '';
  assert.equal(minify(input, { collapseWhitespace: true, removeOptionalTags: true }), output);

  input = '<html><head><title>hello</title></head><body><p>foo<span>bar</span></p></body></html>';
  assert.equal(minify(input), input);
  output = '<title>hello</title><p>foo<span>bar</span>';
  assert.equal(minify(input, { removeOptionalTags: true }), output);

  input = '<html lang=""><head><title>hello</title></head><body style=""><p>foo<span>bar</span></p></body></html>';
  output = '<html lang=""><title>hello</title><body style=""><p>foo<span>bar</span>';
  assert.equal(minify(input, { removeOptionalTags: true }), output);
  output = '<title>hello</title><p>foo<span>bar</span>';
  assert.equal(minify(input, { removeOptionalTags: true, removeEmptyAttributes: true }), output);

  input = '<html><head><title>a</title><link href="b.css" rel="stylesheet"/></head><body><a href="c.html"></a><div class="d"><input value="e"/></div></body></html>';
  output = '<title>a</title><link href="b.css" rel="stylesheet"><a href="c.html"></a><div class="d"><input value="e"></div>';
  assert.equal(minify(input, { removeOptionalTags: true }), output);

  input = '<!DOCTYPE html><html><head><title>Blah</title></head><body><div><p>This is some text in a div</p><details>Followed by some details</details></div><div><p>This is some more text in a div</p></div></body></html>';
  output = '<!DOCTYPE html><title>Blah</title><div><p>This is some text in a div<details>Followed by some details</details></div><div><p>This is some more text in a div</div>';
  assert.equal(minify(input, { removeOptionalTags: true }), output);

  input = '<!DOCTYPE html><html><head><title>Blah</title></head><body><noscript><p>This is some text in a noscript</p><details>Followed by some details</details></noscript><noscript><p>This is some more text in a noscript</p></noscript></body></html>';
  output = '<!DOCTYPE html><title>Blah</title><body><noscript><p>This is some text in a noscript<details>Followed by some details</details></noscript><noscript><p>This is some more text in a noscript</p></noscript>';
  assert.equal(minify(input, { removeOptionalTags: true }), output);

  input = '<md-list-item ui-sref=".app-config"><md-icon md-font-icon="mdi-settings"></md-icon><p translate>Configure</p></md-list-item>';
  assert.equal(minify(input, { removeOptionalTags: true }), input);
});

QUnit.test('removing optional tags in tables', function(assert) {
  var input, output;

  input = '<table>' +
            '<thead><tr><th>foo</th><th>bar</th> <th>baz</th></tr></thead> ' +
            '<tbody><tr><td>boo</td><td>moo</td><td>loo</td></tr> </tbody>' +
            '<tfoot><tr><th>baz</th> <th>qux</th><td>boo</td></tr></tfoot>' +
          '</table>';
  assert.equal(minify(input), input);

  output = '<table>' +
             '<thead><tr><th>foo<th>bar</th> <th>baz</thead> ' +
             '<tr><td>boo<td>moo<td>loo</tr> ' +
             '<tfoot><tr><th>baz</th> <th>qux<td>boo' +
           '</table>';
  assert.equal(minify(input, { removeOptionalTags: true }), output);

  output = '<table>' +
             '<thead><tr><th>foo<th>bar<th>baz' +
             '<tbody><tr><td>boo<td>moo<td>loo' +
             '<tfoot><tr><th>baz<th>qux<td>boo' +
           '</table>';
  assert.equal(minify(input, { collapseWhitespace: true, removeOptionalTags: true }), output);
  assert.equal(minify(output, { collapseWhitespace: true, removeOptionalTags: true }), output);

  input = '<table>' +
            '<caption>foo</caption>' +
            '<!-- blah -->' +
            '<colgroup><col span="2"><col></colgroup>' +
            '<!-- blah -->' +
            '<tbody><tr><th>bar</th><td>baz</td><th>qux</th></tr></tbody>' +
          '</table>';
  assert.equal(minify(input), input);

  output = '<table>' +
             '<caption>foo</caption>' +
             '<!-- blah -->' +
             '<col span="2"><col></colgroup>' +
             '<!-- blah -->' +
             '<tr><th>bar<td>baz<th>qux' +
           '</table>';
  assert.equal(minify(input, { removeOptionalTags: true }), output);
  assert.equal(minify(output, { removeOptionalTags: true }), output);

  output = '<table>' +
             '<caption>foo' +
             '<col span="2"><col>' +
             '<tr><th>bar<td>baz<th>qux' +
           '</table>';
  assert.equal(minify(input, { removeComments: true, removeOptionalTags: true }), output);

  input = '<table>' +
            '<tbody></tbody>' +
          '</table>';
  assert.equal(minify(input), input);

  output = '<table><tbody></table>';
  assert.equal(minify(input, { removeOptionalTags: true }), output);
});

QUnit.test('removing optional tags in options', function(assert) {
  var input, output;

  input = '<select><option>foo</option><option>bar</option></select>';
  output = '<select><option>foo<option>bar</select>';
  assert.equal(minify(input, { removeOptionalTags: true }), output);

  input = '<select>\n' +
          '  <option>foo</option>\n' +
          '  <option>bar</option>\n' +
          '</select>';
  assert.equal(minify(input, { removeOptionalTags: true }), input);
  output = '<select><option>foo<option>bar</select>';
  assert.equal(minify(input, { removeOptionalTags: true, collapseWhitespace: true }), output);
  output = '<select> <option>foo</option> <option>bar</option> </select>';
  assert.equal(minify(input, { removeOptionalTags: true, collapseWhitespace: true, conservativeCollapse: true }), output);

  // example from htmldog.com
  input = '<select name="catsndogs">' +
            '<optgroup label="Cats">' +
              '<option>Tiger</option><option>Leopard</option><option>Lynx</option>' +
            '</optgroup>' +
            '<optgroup label="Dogs">' +
              '<option>Grey Wolf</option><option>Red Fox</option><option>Fennec</option>' +
            '</optgroup>' +
          '</select>';

  output = '<select name="catsndogs">' +
             '<optgroup label="Cats">' +
               '<option>Tiger<option>Leopard<option>Lynx' +
             '<optgroup label="Dogs">' +
               '<option>Grey Wolf<option>Red Fox<option>Fennec' +
           '</select>';

  assert.equal(minify(input, { removeOptionalTags: true }), output);
});

QUnit.test('custom components', function(assert) {
  var input = '<custom-component>Oh, my.</custom-component>';
  var output = '<custom-component>Oh, my.</custom-component>';
  assert.equal(minify(input), output);
});

QUnit.test('HTML4: anchor with inline elements', function(assert) {
  var input = '<a href="#"><span>Well, look at me! I\'m a span!</span></a>';
  assert.equal(minify(input, { html5: false }), input);
});

QUnit.test('HTML5: anchor with inline elements', function(assert) {
  var input = '<a href="#"><span>Well, look at me! I\'m a span!</span></a>';
  assert.equal(minify(input, { html5: true }), input);
});

QUnit.test('HTML4: anchor with block elements', function(assert) {
  var input = '<a href="#"><div>Well, look at me! I\'m a div!</div></a>';
  var output = '<a href="#"></a><div>Well, look at me! I\'m a div!</div>';
  assert.equal(minify(input, { html5: false }), output);
});

QUnit.test('HTML5: anchor with block elements', function(assert) {
  var input = '<a href="#"><div>Well, look at me! I\'m a div!</div></a>';
  var output = '<a href="#"><div>Well, look at me! I\'m a div!</div></a>';
  assert.equal(minify(input, { html5: true }), output);
});

QUnit.test('HTML5: enabled by default', function(assert) {
  var input = '<a href="#"><div>Well, look at me! I\'m a div!</div></a>';
  assert.equal(minify(input, { html5: true }), minify(input));
});

QUnit.test('phrasing content', function(assert) {
  var input, output;

  input = '<p>a<div>b</div>';
  output = '<p>a</p><div>b</div>';
  assert.equal(minify(input, { html5: true }), output);
  output = '<p>a<div>b</div></p>';
  assert.equal(minify(input, { html5: false }), output);

  input = '<label>a<div>b</div>c</label>';
  assert.equal(minify(input, { html5: true }), input);
});

// https://github.com/kangax/html-minifier/issues/888
QUnit.test('ul/ol should be phrasing content', function(assert) {
  var input, output;

  input = '<p>a<ul><li>item</li></ul>';
  output = '<p>a</p><ul><li>item</li></ul>';
  assert.equal(minify(input, { html5: true }), output);

  output = '<p>a<ul><li>item</ul>';
  assert.equal(minify(input, { html5: true, removeOptionalTags: true }), output);

  output = '<p>a<ul><li>item</li></ul></p>';
  assert.equal(minify(input, { html5: false }), output);

  input = '<p>a<ol><li>item</li></ol></p>';
  output = '<p>a</p><ol><li>item</li></ol><p></p>';
  assert.equal(minify(input, { html5: true }), output);

  output = '<p>a<ol><li>item</ol><p>';
  assert.equal(minify(input, { html5: true, removeOptionalTags: true }), output);

  output = '<p>a</p><ol><li>item</li></ol>';
  assert.equal(minify(input, { html5: true, removeEmptyElements: true }), output);
});

QUnit.test('phrasing content with Web Components', function(assert) {
  var input = '<span><phrasing-element></phrasing-element></span>';
  var output = '<span><phrasing-element></phrasing-element></span>';
  assert.equal(minify(input, { html5: true }), output);
});

// https://github.com/kangax/html-minifier/issues/10
QUnit.test('Ignore custom fragments', function(assert) {
  var input, output;
  var reFragments = [/<\?[^?]+\?>/, /<%[^%]+%>/, /\{\{[^}]*\}\}/];

  input = 'This is the start. <% ... %>\r\n<%= ... %>\r\n<? ... ?>\r\n<!-- This is the middle, and a comment. -->\r\nNo comment, but middle.\r\n{{ ... }}\r\n<?php ... ?>\r\n<?xml ... ?>\r\nHello, this is the end!';
  output = 'This is the start. <% ... %> <%= ... %> <? ... ?> No comment, but middle. {{ ... }} <?php ... ?> <?xml ... ?> Hello, this is the end!';
  assert.equal(minify(input, {}), input);
  assert.equal(minify(input, { removeComments: true, collapseWhitespace: true }), output);
  assert.equal(minify(input, {
    removeComments: true,
    collapseWhitespace: true,
    ignoreCustomFragments: reFragments
  }), output);

  output = 'This is the start. <% ... %>\n<%= ... %>\n<? ... ?>\nNo comment, but middle. {{ ... }}\n<?php ... ?>\n<?xml ... ?>\nHello, this is the end!';
  assert.equal(minify(input, {
    removeComments: true,
    collapseWhitespace: true,
    preserveLineBreaks: true
  }), output);

  output = 'This is the start. <% ... %>\n<%= ... %>\n<? ... ?>\nNo comment, but middle.\n{{ ... }}\n<?php ... ?>\n<?xml ... ?>\nHello, this is the end!';
  assert.equal(minify(input, {
    removeComments: true,
    collapseWhitespace: true,
    preserveLineBreaks: true,
    ignoreCustomFragments: reFragments
  }), output);

  input = '{{ if foo? }}\r\n  <div class="bar">\r\n    ...\r\n  </div>\r\n{{ end \n}}';
  output = '{{ if foo? }}<div class="bar">...</div>{{ end }}';
  assert.equal(minify(input, {}), input);
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  assert.equal(minify(input, { collapseWhitespace: true, ignoreCustomFragments: [] }), output);

  output = '{{ if foo? }} <div class="bar">...</div> {{ end \n}}';
  assert.equal(minify(input, { collapseWhitespace: true, ignoreCustomFragments: reFragments }), output);

  output = '{{ if foo? }}\n<div class="bar">\n...\n</div>\n{{ end \n}}';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    preserveLineBreaks: true,
    ignoreCustomFragments: reFragments
  }), output);

  input = '<a class="<% if foo? %>bar<% end %> {{ ... }}"></a>';
  assert.equal(minify(input, {}), input);
  assert.equal(minify(input, { ignoreCustomFragments: reFragments }), input);

  input = '<img src="{% static "images/logo.png" %}">';
  output = '<img src="{% static "images/logo.png" %}">';
  assert.equal(minify(input, { ignoreCustomFragments: [/\{%[^%]*?%\}/g] }), output);

  input = '<p{% if form.name.errors %}class=\'error\'{% endif %}>' +
            '{{ form.name.label_tag }}' +
            '{{ form.name }}' +
            ' <label>{{ label }}</label> ' +
            '{% if form.name.errors %}' +
            '{% for error in form.name.errors %}' +
            '<span class=\'error_msg\' style=\'color:#ff0000\'>{{ error }}</span>' +
            '{% endfor %}' +
            '{% endif %}' +
          '</p>';
  assert.equal(minify(input, {
    ignoreCustomFragments: [
      /\{%[\s\S]*?%\}/g,
      /\{\{[\s\S]*?\}\}/g
    ],
    quoteCharacter: '\''
  }), input);
  output = '<p {% if form.name.errors %} class=\'error\' {% endif %}>' +
             '{{ form.name.label_tag }}' +
             '{{ form.name }}' +
             ' <label>{{ label }}</label> ' +
             '{% if form.name.errors %}' +
             '{% for error in form.name.errors %}' +
             '<span class=\'error_msg\' style=\'color:#ff0000\'>{{ error }}</span>' +
             '{% endfor %}' +
             '{% endif %}' +
           '</p>';
  assert.equal(minify(input, {
    ignoreCustomFragments: [
      /\{%[\s\S]*?%\}/g,
      /\{\{[\s\S]*?\}\}/g
    ],
    quoteCharacter: '\'',
    collapseWhitespace: true
  }), output);

  input = '<a href="/legal.htm"<?php echo e(Request::path() == \'/\' ? \' rel="nofollow"\':\'\'); ?>>Legal Notices</a>';
  assert.equal(minify(input, {
    ignoreCustomFragments: [
      /<\?php[\s\S]*?\?>/g
    ]
  }), input);

  input = '<input type="checkbox"<%= (model.isChecked ? \'checked="checked"\' : \'\') %>>';
  assert.equal(minify(input, {
    ignoreCustomFragments: [
      /<%=[\s\S]*?%>/g
    ]
  }), input);

  input = '<div' +
            '{{IF text}}' +
            'data-yashareDescription="{{shorted(text, 300)}}"' +
            '{{END IF}}></div>';
  assert.equal(minify(input, {
    ignoreCustomFragments: [
      /\{\{[\s\S]*?\}\}/g
    ],
    caseSensitive: true
  }), input);

  input = '<img class="{% foo %} {% bar %}">';
  assert.equal(minify(input, {
    ignoreCustomFragments: [
      /\{%[^%]*?%\}/g
    ]
  }), input);
  // trimCustomFragments withOUT collapseWhitespace, does
  // not break the "{% foo %} {% bar %}" test
  assert.equal(minify(input, {
    ignoreCustomFragments: [
      /\{%[^%]*?%\}/g
    ],
    trimCustomFragments: true
  }), input);
  // trimCustomFragments WITH collapseWhitespace, changes output
  output = '<img class="{% foo %}{% bar %}">';
  assert.equal(minify(input, {
    ignoreCustomFragments: [
      /\{%[^%]*?%\}/g
    ],
    collapseWhitespace: true,
    trimCustomFragments: true
  }), output);

  input = '<img class="titi.<%=tsItem_[0]%>">';
  assert.equal(minify(input), input);
  assert.equal(minify(input, {
    collapseWhitespace: true
  }), input);

  input = '<table id="<?php echo $this->escapeHtmlAttr($this->table_id); ?>"></table>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, {
    collapseWhitespace: true
  }), input);

  input = '<!--{{comment}}-->{{if a}}<div>b</div>{{/if}}';
  assert.equal(minify(input), input);
  output = '{{if a}}<div>b</div>{{/if}}';
  assert.equal(minify(input, {
    removeComments: true,
    ignoreCustomFragments: [
      /\{\{.*?\}\}/g
    ]
  }), output);

  // https://github.com/kangax/html-minifier/issues/722
  input = '<? echo "foo"; ?> <span>bar</span>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, {
    collapseWhitespace: true
  }), input);
  output = '<? echo "foo"; ?><span>bar</span>';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    trimCustomFragments: true
  }), output);

  input = ' <? echo "foo"; ?> bar';
  assert.equal(minify(input), input);
  output = '<? echo "foo"; ?> bar';
  assert.equal(minify(input, {
    collapseWhitespace: true
  }), output);
  output = '<? echo "foo"; ?>bar';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    trimCustomFragments: true
  }), output);

  input = '<span>foo</span> <? echo "bar"; ?> baz';
  assert.equal(minify(input), input);
  assert.equal(minify(input, {
    collapseWhitespace: true
  }), input);
  output = '<span>foo</span><? echo "bar"; ?>baz';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    trimCustomFragments: true
  }), output);

  input = '<span>foo</span> <? echo "bar"; ?> <? echo "baz"; ?> <span>foo</span>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, {
    collapseWhitespace: true
  }), input);
  output = '<span>foo</span><? echo "bar"; ?><? echo "baz"; ?><span>foo</span>';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    trimCustomFragments: true
  }), output);

  input = 'foo <WC@bar> baz moo </WC@bar> loo';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    ignoreCustomFragments: [
      /<(WC@[\s\S]*?)>(.*?)<\/\1>/
    ]
  }), input);
  output = 'foo<wc @bar>baz moo</wc>loo';
  assert.equal(minify(input, {
    collapseWhitespace: true
  }), output);

  input = '<link href="<?php echo \'http://foo/\' ?>">';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { removeAttributeQuotes: true }), input);

  input = '<pre>\nfoo\n<? bar ?>\nbaz\n</pre>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { collapseWhitespace: true }), input);

  input = '<script>var value="<?php ?>+<?php ?>0"</script>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyJS: true }), input);

  input = '<style>body{font-size:<%=1%>2pt}</style>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: true }), input);
});

QUnit.test('bootstrap\'s span > button > span', function(assert) {
  var input = '<span class="input-group-btn">' +
                '\n  <button class="btn btn-default" type="button">' +
                  '\n    <span class="glyphicon glyphicon-search"></span>' +
                '\n  </button>' +
              '</span>';
  var output = '<span class=input-group-btn><button class="btn btn-default" type=button><span class="glyphicon glyphicon-search"></span></button></span>';
  assert.equal(minify(input, { collapseWhitespace: true, removeAttributeQuotes: true }), output);
});

QUnit.test('caseSensitive', function(assert) {
  var input = '<div mixedCaseAttribute="value"></div>';
  var caseSensitiveOutput = '<div mixedCaseAttribute="value"></div>';
  var caseInSensitiveOutput = '<div mixedcaseattribute="value"></div>';
  assert.equal(minify(input), caseInSensitiveOutput);
  assert.equal(minify(input, { caseSensitive: true }), caseSensitiveOutput);
});

QUnit.test('source & track', function(assert) {
  var input = '<audio controls="controls">' +
                '<source src="foo.wav">' +
                '<source src="far.wav">' +
                '<source src="foobar.wav">' +
                '<track kind="captions" src="sampleCaptions.vtt" srclang="en">' +
              '</audio>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { removeOptionalTags: true }), input);
});

QUnit.test('mixed html and svg', function(assert) {
  var input = '<html><body>\n' +
    '  <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\n' +
    '     width="612px" height="502.174px" viewBox="0 65.326 612 502.174" enable-background="new 0 65.326 612 502.174"\n' +
    '     xml:space="preserve" class="logo">' +
    '' +
    '    <ellipse class="ground" cx="283.5" cy="487.5" rx="259" ry="80"/>' +
    '    <polygon points="100,10 40,198 190,78 10,78 160,198"\n' +
    '      style="fill:lime;stroke:purple;stroke-width:5;fill-rule:evenodd;" />\n' +
    '    <filter id="pictureFilter">\n' +
    '      <feGaussianBlur stdDeviation="15" />\n' +
    '    </filter>\n' +
    '  </svg>\n' +
    '</body></html>';
  var output = '<html><body>' +
    '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="612px" height="502.174px" viewBox="0 65.326 612 502.174" enable-background="new 0 65.326 612 502.174" xml:space="preserve" class="logo">' +
    '<ellipse class="ground" cx="283.5" cy="487.5" rx="259" ry="80"/>' +
    '<polygon points="100,10 40,198 190,78 10,78 160,198" style="fill:lime;stroke:purple;stroke-width:5;fill-rule:evenodd;"/>' +
    '<filter id="pictureFilter"><feGaussianBlur stdDeviation="15"/></filter>' +
    '</svg>' +
    '</body></html>';
  // Should preserve case-sensitivity and closing slashes within svg tags
  assert.equal(minify(input, { collapseWhitespace: true }), output);
});

QUnit.test('nested quotes', function(assert) {
  var input, output;

  input = '<div data=\'{"test":"\\"test\\""}\'></div>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { quoteCharacter: '\'' }), input);

  output = '<div data="{&#34;test&#34;:&#34;\\&#34;test\\&#34;&#34;}"></div>';
  assert.equal(minify(input, { quoteCharacter: '"' }), output);
});

QUnit.test('script minification', function(assert) {
  var input, output;

  input = '<script></script>(function(){ var foo = 1; var bar = 2; alert(foo + " " + bar); })()';

  assert.equal(minify(input, { minifyJS: true }), input);

  input = '<script>(function(){ var foo = 1; var bar = 2; alert(foo + " " + bar); })()</script>';
  output = '<script>alert("1 2")</script>';

  assert.equal(minify(input, { minifyJS: true }), output);

  input = '<script type="text/JavaScript">(function(){ var foo = 1; var bar = 2; alert(foo + " " + bar); })()</script>';
  output = '<script type="text/JavaScript">alert("1 2")</script>';

  assert.equal(minify(input, { minifyJS: true }), output);

  input = '<script type="application/javascript;version=1.8">(function(){ var foo = 1; var bar = 2; alert(foo + " " + bar); })()</script>';
  output = '<script type="application/javascript;version=1.8">alert("1 2")</script>';

  assert.equal(minify(input, { minifyJS: true }), output);

  input = '<script type=" application/javascript  ; charset=utf-8 ">(function(){ var foo = 1; var bar = 2; alert(foo + " " + bar); })()</script>';
  output = '<script type="application/javascript;charset=utf-8">alert("1 2")</script>';

  assert.equal(minify(input, { minifyJS: true }), output);

  input = '<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({\'gtm.start\':new Date().getTime(),event:\'gtm.js\'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!=\'dataLayer\'?\'&l=\'+l:\'\';j.async=true;j.src=\'//www.googletagmanager.com/gtm.js?id=\'+i+dl;f.parentNode.insertBefore(j,f);})(window,document,\'script\',\'dataLayer\',\'GTM-67NT\');</script>';
  output = '<script>!function(w,d,s,l,i){w[l]=w[l]||[],w[l].push({"gtm.start":(new Date).getTime(),event:"gtm.js"});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=!0,j.src="//www.googletagmanager.com/gtm.js?id=GTM-67NT",f.parentNode.insertBefore(j,f)}(window,document,"script","dataLayer")</script>';

  assert.equal(minify(input, { minifyJS: { mangle: false } }), output);

  input = '<script>\n' +
          '  <!--\n' +
          '    Platform.Mobile.Bootstrap.init(function () {\n' +
          '      Platform.Mobile.Core.Navigation.go("Login", {\n' +
          '        "error": ""\n' +
          '      });\n' +
          '    });\n' +
          '  //-->\n' +
          '</script>';
  output = '<script>Platform.Mobile.Bootstrap.init(function(){Platform.Mobile.Core.Navigation.go("Login",{error:""})})</script>';

  assert.equal(minify(input, { minifyJS: true }), output);
});

QUnit.test('minification of scripts with different mimetypes', function(assert) {
  var input, output;

  input = '<script type="">function f(){  return 1  }</script>';
  output = '<script type="">function f(){return 1}</script>';
  assert.equal(minify(input, { minifyJS: true }), output);

  input = '<script type="text/javascript">function f(){  return 1  }</script>';
  output = '<script type="text/javascript">function f(){return 1}</script>';
  assert.equal(minify(input, { minifyJS: true }), output);

  input = '<script foo="bar">function f(){  return 1  }</script>';
  output = '<script foo="bar">function f(){return 1}</script>';
  assert.equal(minify(input, { minifyJS: true }), output);

  input = '<script type="text/ecmascript">function f(){  return 1  }</script>';
  output = '<script type="text/ecmascript">function f(){return 1}</script>';
  assert.equal(minify(input, { minifyJS: true }), output);

  input = '<script type="application/javascript">function f(){  return 1  }</script>';
  output = '<script type="application/javascript">function f(){return 1}</script>';
  assert.equal(minify(input, { minifyJS: true }), output);

  input = '<script type="boo">function f(){  return 1  }</script>';
  assert.equal(minify(input, { minifyJS: true }), input);

  input = '<script type="text/html"><!-- ko if: true -->\n\n\n<div></div>\n\n\n<!-- /ko --></script>';
  assert.equal(minify(input, { minifyJS: true }), input);
});

QUnit.test('minification of scripts with custom fragments', function(assert) {
  var input, output;

  input = '<script><?php ?></script>';
  assert.equal(minify(input, { minifyJS: true }), input);
  assert.equal(minify(input, { collapseWhitespace: true, minifyJS: true }), input);
  assert.equal(minify(input, {
    collapseWhitespace: true,
    minifyJS: true,
    preserveLineBreaks: true
  }), input);

  input = '<script>\n<?php ?></script>';
  assert.equal(minify(input, { minifyJS: true }), input);
  output = '<script> <?php ?></script>';
  assert.equal(minify(input, { collapseWhitespace: true, minifyJS: true }), output);
  assert.equal(minify(input, {
    collapseWhitespace: true,
    minifyJS: true,
    preserveLineBreaks: true
  }), input);

  input = '<script><?php ?>\n</script>';
  assert.equal(minify(input, { minifyJS: true }), input);
  output = '<script><?php ?> </script>';
  assert.equal(minify(input, { collapseWhitespace: true, minifyJS: true }), output);
  assert.equal(minify(input, {
    collapseWhitespace: true,
    minifyJS: true,
    preserveLineBreaks: true
  }), input);

  input = '<script>\n<?php ?>\n</script>';
  assert.equal(minify(input, { minifyJS: true }), input);
  output = '<script> <?php ?> </script>';
  assert.equal(minify(input, { collapseWhitespace: true, minifyJS: true }), output);
  assert.equal(minify(input, {
    collapseWhitespace: true,
    minifyJS: true,
    preserveLineBreaks: true
  }), input);

  input = '<script>// <% ... %></script>';
  output = '<script></script>';
  assert.equal(minify(input, { minifyJS: true }), output);
  assert.equal(minify(input, { collapseWhitespace: true, minifyJS: true }), output);
  assert.equal(minify(input, {
    collapseWhitespace: true,
    minifyJS: true,
    preserveLineBreaks: true
  }), output);

  input = '<script>// \n<% ... %></script>';
  output = '<script> \n<% ... %></script>';
  assert.equal(minify(input, { minifyJS: true }), output);
  output = '<script> <% ... %></script>';
  assert.equal(minify(input, { collapseWhitespace: true, minifyJS: true }), output);
  output = '<script>\n<% ... %></script>';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    minifyJS: true,
    preserveLineBreaks: true
  }), output);

  input = '<script>// <% ... %>\n</script>';
  output = '<script></script>';
  assert.equal(minify(input, { minifyJS: true }), output);
  assert.equal(minify(input, { collapseWhitespace: true, minifyJS: true }), output);
  assert.equal(minify(input, {
    collapseWhitespace: true,
    minifyJS: true,
    preserveLineBreaks: true
  }), output);

  input = '<script>// \n<% ... %>\n</script>';
  output = '<script> \n<% ... %>\n</script>';
  assert.equal(minify(input, { minifyJS: true }), output);
  output = '<script> <% ... %> </script>';
  assert.equal(minify(input, { collapseWhitespace: true, minifyJS: true }), output);
  output = '<script>\n<% ... %>\n</script>';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    minifyJS: true,
    preserveLineBreaks: true
  }), output);

  input = '<script>function f(){  return <?php ?>  }</script>';
  output = '<script>function f(){return <?php ?>  }</script>';
  assert.equal(minify(input, { minifyJS: true }), output);
  output = '<script>function f(){return <?php ?> }</script>';
  assert.equal(minify(input, { collapseWhitespace: true, minifyJS: true }), output);

  input = '<script>function f(){  return "<?php ?>"  }</script>';
  output = '<script>function f(){return"<?php ?>"}</script>';
  assert.equal(minify(input, { minifyJS: true }), output);
  assert.equal(minify(input, { collapseWhitespace: true, minifyJS: true }), output);
});

QUnit.test('event minification', function(assert) {
  var input, output;

  input = '<div only="alert(a + b)" one=";return false;"></div>';
  assert.equal(minify(input, { minifyJS: true }), input);

  input = '<div onclick="alert(a + b)"></div>';
  output = '<div onclick="alert(a+b)"></div>';
  assert.equal(minify(input, { minifyJS: true }), output);

  input = '<a href="/" onclick="this.href = getUpdatedURL (this.href);return true;">test</a>';
  output = '<a href="/" onclick="return this.href=getUpdatedURL(this.href),!0">test</a>';
  assert.equal(minify(input, { minifyJS: true }), output);

  input = '<a onclick="try{ dcsMultiTrack(\'DCS.dcsuri\',\'USPS\',\'WT.ti\') }catch(e){}"> foobar</a>';
  output = '<a onclick=\'try{dcsMultiTrack("DCS.dcsuri","USPS","WT.ti")}catch(e){}\'> foobar</a>';
  assert.equal(minify(input, { minifyJS: { mangle: false } }), output);
  assert.equal(minify(input, { minifyJS: { mangle: false }, quoteCharacter: '\'' }), output);

  input = '<a onclick="try{ dcsMultiTrack(\'DCS.dcsuri\',\'USPS\',\'WT.ti\') }catch(e){}"> foobar</a>';
  output = '<a onclick="try{dcsMultiTrack(&#34;DCS.dcsuri&#34;,&#34;USPS&#34;,&#34;WT.ti&#34;)}catch(e){}"> foobar</a>';
  assert.equal(minify(input, { minifyJS: { mangle: false }, quoteCharacter: '"' }), output);

  input = '<a onClick="_gaq.push([\'_trackEvent\', \'FGF\', \'banner_click\']);"></a>';
  output = '<a onclick=\'_gaq.push(["_trackEvent","FGF","banner_click"])\'></a>';
  assert.equal(minify(input, { minifyJS: true }), output);
  assert.equal(minify(input, { minifyJS: true, quoteCharacter: '\'' }), output);

  input = '<a onClick="_gaq.push([\'_trackEvent\', \'FGF\', \'banner_click\']);"></a>';
  output = '<a onclick="_gaq.push([&#34;_trackEvent&#34;,&#34;FGF&#34;,&#34;banner_click&#34;])"></a>';
  assert.equal(minify(input, { minifyJS: true, quoteCharacter: '"' }), output);

  input = '<button type="button" onclick=";return false;" id="appbar-guide-button"></button>';
  output = '<button type="button" onclick="return!1" id="appbar-guide-button"></button>';
  assert.equal(minify(input, { minifyJS: true }), output);

  input = '<button type="button" onclick=";return false;" ng-click="a(1 + 2)" data-click="a(1 + 2)"></button>';
  output = '<button type="button" onclick="return!1" ng-click="a(1 + 2)" data-click="a(1 + 2)"></button>';
  assert.equal(minify(input, { minifyJS: true }), output);
  assert.equal(minify(input, { minifyJS: true, customEventAttributes: [] }), input);
  output = '<button type="button" onclick=";return false;" ng-click="a(3)" data-click="a(1 + 2)"></button>';
  assert.equal(minify(input, { minifyJS: true, customEventAttributes: [/^ng-/] }), output);
  output = '<button type="button" onclick="return!1" ng-click="a(3)" data-click="a(1 + 2)"></button>';
  assert.equal(minify(input, { minifyJS: true, customEventAttributes: [/^on/, /^ng-/] }), output);

  input = '<div onclick="<?= b ?>"></div>';
  assert.equal(minify(input, { minifyJS: true }), input);

  input = '<div onclick="alert(a + <?= b ?>)"></div>';
  output = '<div onclick="alert(a+ <?= b ?>)"></div>';
  assert.equal(minify(input, { minifyJS: true }), output);

  input = '<div onclick="alert(a + \'<?= b ?>\')"></div>';
  output = '<div onclick=\'alert(a+"<?= b ?>")\'></div>';
  assert.equal(minify(input, { minifyJS: true }), output);
});

QUnit.test('escaping closing script tag', function(assert) {
  var input = '<script>window.jQuery || document.write(\'<script src="jquery.js"><\\/script>\')</script>';
  var output = '<script>window.jQuery||document.write(\'<script src="jquery.js"><\\/script>\')</script>';
  assert.equal(minify(input, { minifyJS: true }), output);
});

QUnit.test('style minification', function(assert) {
  var input, output;

  input = '<style></style>div#foo { background-color: red; color: white }';
  assert.equal(minify(input, { minifyCSS: true }), input);

  input = '<style>div#foo { background-color: red; color: white }</style>';
  output = '<style>div#foo{background-color:red;color:#fff}</style>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: true }), output);

  input = '<style>div > p.foo + span { border: 10px solid black }</style>';
  output = '<style>div>p.foo+span{border:10px solid #000}</style>';
  assert.equal(minify(input, { minifyCSS: true }), output);

  input = '<div style="background: url(images/<% image %>);"></div>';
  assert.equal(minify(input), input);
  output = '<div style="background:url(images/<% image %>)"></div>';
  assert.equal(minify(input, { minifyCSS: true }), output);
  assert.equal(minify(input, {
    collapseWhitespace: true,
    minifyCSS: true
  }), output);

  input = '<div style="background: url(\'images/<% image %>\')"></div>';
  assert.equal(minify(input), input);
  output = '<div style="background:url(images/<% image %>)"></div>';
  assert.equal(minify(input, { minifyCSS: true }), output);
  assert.equal(minify(input, {
    collapseWhitespace: true,
    minifyCSS: true
  }), output);

  input = '<style>\np {\n  background: url(images/<% image %>);\n}\n</style>';
  assert.equal(minify(input), input);
  output = '<style>p{background:url(images/<% image %>)}</style>';
  assert.equal(minify(input, { minifyCSS: true }), output);
  assert.equal(minify(input, {
    collapseWhitespace: true,
    minifyCSS: true
  }), output);

  input = '<style>p { background: url("images/<% image %>") }</style>';
  assert.equal(minify(input), input);
  output = '<style>p{background:url(images/<% image %>)}</style>';
  assert.equal(minify(input, { minifyCSS: true }), output);
  assert.equal(minify(input, {
    collapseWhitespace: true,
    minifyCSS: true
  }), output);

  input = '<link rel="stylesheet" href="css/style-mobile.css" media="(max-width: 737px)">';
  assert.equal(minify(input), input);
  output = '<link rel="stylesheet" href="css/style-mobile.css" media="(max-width:737px)">';
  assert.equal(minify(input, { minifyCSS: true }), output);
  output = '<link rel=stylesheet href=css/style-mobile.css media=(max-width:737px)>';
  assert.equal(minify(input, {
    minifyCSS: true,
    removeAttributeQuotes: true
  }), output);

  input = '<style media="(max-width: 737px)"></style>';
  assert.equal(minify(input), input);
  output = '<style media="(max-width:737px)"></style>';
  assert.equal(minify(input, { minifyCSS: true }), output);
  output = '<style media=(max-width:737px)></style>';
  assert.equal(minify(input, {
    minifyCSS: true,
    removeAttributeQuotes: true
  }), output);
});

QUnit.test('style attribute minification', function(assert) {
  var input = '<div style="color: red; background-color: yellow; font-family: Verdana, Arial, sans-serif;"></div>';
  var output = '<div style="color:red;background-color:#ff0;font-family:Verdana,Arial,sans-serif"></div>';
  assert.equal(minify(input, { minifyCSS: true }), output);
});

QUnit.test('minification of style with custom fragments', function(assert) {
  var input;

  input = '<style><?foo?></style>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: true }), input);

  input = '<style>\t<?foo?>\t</style>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: true }), input);

  input = '<style><?foo?>{color:red}</style>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: true }), input);

  input = '<style>\t<?foo?>\t{color:red}</style>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: true }), input);

  input = '<style>body{<?foo?>}</style>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: true }), input);

  input = '<style>body{\t<?foo?>\t}</style>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: true }), input);

  input = '<style><?foo?>body{color:red}</style>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: true }), input);

  input = '<style>\t<?foo?>\tbody{color:red}</style>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: true }), input);

  input = '<style>body{<?foo?>color:red}</style>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: true }), input);

  input = '<style>body{\t<?foo?>\tcolor:red}</style>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: true }), input);

  input = '<style>body{color:red<?foo?>}</style>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: true }), input);

  input = '<style>body{color:red\t<?foo?>\t}</style>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: true }), input);

  input = '<style>body{color:red;<?foo?>}</style>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: true }), input);

  input = '<style>body{color:red;\t<?foo?>\t}</style>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: true }), input);

  input = '<style>body{color:red}<?foo?></style>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: true }), input);

  input = '<style>body{color:red}\t<?foo?>\t</style>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { minifyCSS: true }), input);
});

QUnit.test('url attribute minification', function(assert) {
  var input, output;

  input = '<link rel="stylesheet" href="http://website.com/style.css"><form action="http://website.com/folder/folder2/index.html"><a href="http://website.com/folder/file.html">link</a></form>';
  output = '<link rel="stylesheet" href="/style.css"><form action="folder2/"><a href="file.html">link</a></form>';
  assert.equal(minify(input, { minifyURLs: 'http://website.com/folder/' }), output);
  assert.equal(minify(input, { minifyURLs: { site: 'http://website.com/folder/' } }), output);

  input = '<link rel="canonical" href="http://website.com/">';
  assert.equal(minify(input, { minifyURLs: 'http://website.com/' }), input);
  assert.equal(minify(input, { minifyURLs: { site: 'http://website.com/' } }), input);

  input = '<style>body { background: url(\'http://website.com/bg.png\') }</style>';
  assert.equal(minify(input, { minifyURLs: 'http://website.com/' }), input);
  assert.equal(minify(input, { minifyURLs: { site: 'http://website.com/' } }), input);
  output = '<style>body{background:url(http://website.com/bg.png)}</style>';
  assert.equal(minify(input, { minifyCSS: true }), output);
  output = '<style>body{background:url(bg.png)}</style>';
  assert.equal(minify(input, {
    minifyCSS: true,
    minifyURLs: 'http://website.com/'
  }), output);
  assert.equal(minify(input, {
    minifyCSS: true,
    minifyURLs: { site: 'http://website.com/' }
  }), output);

  input = '<style>body { background: url("http://website.com/foo bar/bg.png") }</style>';
  assert.equal(minify(input, { minifyURLs: { site: 'http://website.com/foo bar/' } }), input);
  output = '<style>body{background:url("http://website.com/foo bar/bg.png")}</style>';
  assert.equal(minify(input, { minifyCSS: true }), output);
  output = '<style>body{background:url(bg.png)}</style>';
  assert.equal(minify(input, {
    minifyCSS: true,
    minifyURLs: { site: 'http://website.com/foo bar/' }
  }), output);

  input = '<style>body { background: url("http://website.com/foo bar/(baz)/bg.png") }</style>';
  assert.equal(minify(input, { minifyURLs: { site: 'http://website.com/' } }), input);
  assert.equal(minify(input, { minifyURLs: { site: 'http://website.com/foo%20bar/' } }), input);
  assert.equal(minify(input, { minifyURLs: { site: 'http://website.com/foo%20bar/(baz)/' } }), input);
  output = '<style>body{background:url("foo%20bar/(baz)/bg.png")}</style>';
  assert.equal(minify(input, {
    minifyCSS: true,
    minifyURLs: { site: 'http://website.com/' }
  }), output);
  output = '<style>body{background:url("(baz)/bg.png")}</style>';
  assert.equal(minify(input, {
    minifyCSS: true,
    minifyURLs: { site: 'http://website.com/foo%20bar/' }
  }), output);
  output = '<style>body{background:url(bg.png)}</style>';
  assert.equal(minify(input, {
    minifyCSS: true,
    minifyURLs: { site: 'http://website.com/foo%20bar/(baz)/' }
  }), output);

  input = '<img src="http://cdn.site.com/foo.png">';
  output = '<img src="//cdn.site.com/foo.png">';
  assert.equal(minify(input, { minifyURLs: { site: 'http://site.com/' } }), output);
});

QUnit.test('srcset attribute minification', function(assert) {
  var input, output;
  input = '<source srcset="http://site.com/foo.gif ,http://site.com/bar.jpg 1x, baz moo 42w,' +
          '\n\n\n\n\n\t    http://site.com/zo om.png 1.00x">';
  output = '<source srcset="http://site.com/foo.gif, http://site.com/bar.jpg, baz moo 42w, http://site.com/zo om.png">';
  assert.equal(minify(input), output);
  output = '<source srcset="foo.gif, bar.jpg, baz%20moo 42w, zo%20om.png">';
  assert.equal(minify(input, { minifyURLs: { site: 'http://site.com/' } }), output);
});

QUnit.test('valueless attributes', function(assert) {
  var input = '<br foo>';
  assert.equal(minify(input), input);
});

QUnit.test('newlines becoming whitespaces', function(assert) {
  var input = 'test\n\n<input>\n\ntest';
  var output = 'test <input> test';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
});

QUnit.test('conservative collapse', function(assert) {
  var input, output;

  input = '<b>   foo \n\n</b>';
  output = '<b> foo </b>';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    conservativeCollapse: true
  }), output);

  input = '<html>\n\n<!--test-->\n\n</html>';
  output = '<html> </html>';
  assert.equal(minify(input, {
    removeComments: true,
    collapseWhitespace: true,
    conservativeCollapse: true
  }), output);

  input = '<p>\u00A0</p>';
  assert.equal(minify(input, { collapseWhitespace: true }), input);
  assert.equal(minify(input, {
    collapseWhitespace: true,
    conservativeCollapse: true
  }), input);

  input = '<p> \u00A0</p>';
  output = '<p>\u00A0</p>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  assert.equal(minify(input, {
    collapseWhitespace: true,
    conservativeCollapse: true
  }), output);

  input = '<p>\u00A0 </p>';
  output = '<p>\u00A0</p>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  assert.equal(minify(input, {
    collapseWhitespace: true,
    conservativeCollapse: true
  }), output);

  input = '<p> \u00A0 </p>';
  output = '<p>\u00A0</p>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  assert.equal(minify(input, {
    collapseWhitespace: true,
    conservativeCollapse: true
  }), output);

  input = '<p>  \u00A0\u00A0  \u00A0  </p>';
  output = '<p>\u00A0\u00A0 \u00A0</p>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  assert.equal(minify(input, {
    collapseWhitespace: true,
    conservativeCollapse: true
  }), output);

  input = '<p>foo  \u00A0\u00A0  \u00A0  </p>';
  output = '<p>foo \u00A0\u00A0 \u00A0</p>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  assert.equal(minify(input, {
    collapseWhitespace: true,
    conservativeCollapse: true
  }), output);

  input = '<p>  \u00A0\u00A0  \u00A0  bar</p>';
  output = '<p>\u00A0\u00A0 \u00A0 bar</p>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  assert.equal(minify(input, {
    collapseWhitespace: true,
    conservativeCollapse: true
  }), output);

  input = '<p>foo  \u00A0\u00A0  \u00A0  bar</p>';
  output = '<p>foo \u00A0\u00A0 \u00A0 bar</p>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  assert.equal(minify(input, {
    collapseWhitespace: true,
    conservativeCollapse: true
  }), output);

  input = '<p> \u00A0foo\u00A0\t</p>';
  output = '<p>\u00A0foo\u00A0</p>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  assert.equal(minify(input, {
    collapseWhitespace: true,
    conservativeCollapse: true
  }), output);


  input = '<p> \u00A0\nfoo\u00A0\t</p>';
  output = '<p>\u00A0 foo\u00A0</p>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  assert.equal(minify(input, {
    collapseWhitespace: true,
    conservativeCollapse: true
  }), output);


  input = '<p> \u00A0foo \u00A0\t</p>';
  output = '<p>\u00A0foo \u00A0</p>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  assert.equal(minify(input, {
    collapseWhitespace: true,
    conservativeCollapse: true
  }), output);

  input = '<p> \u00A0\nfoo \u00A0\t</p>';
  output = '<p>\u00A0 foo \u00A0</p>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);
  assert.equal(minify(input, {
    collapseWhitespace: true,
    conservativeCollapse: true
  }), output);
});

QUnit.test('collapse preseving a line break', function(assert) {
  var input, output;

  input = '\n\n\n<!DOCTYPE html>   \n<html lang="en" class="no-js">\n' +
          '  <head>\n    <meta charset="utf-8">\n    <meta http-equiv="X-UA-Compatible" content="IE=edge">\n\n\n\n' +
          '\t<!-- Copyright Notice -->\n' +
          '    <title>Carbon</title>\n\n\t<meta name="title" content="Carbon">\n\t\n\n' +
          '\t<meta name="description" content="A front-end framework.">\n' +
          '    <meta name="apple-mobile-web-app-capable" content="yes">\n' +
          '    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n' +
          '    <meta name="viewport" content="width=device-width, initial-scale=1">\n\n' +
          '<link href="stylesheets/application.css" rel="stylesheet">\n' +
          '    <script src="scripts/application.js"></script>\n' +
          '    <link href="images/icn-32x32.png" rel="shortcut icon">\n' +
          '    <link href="images/icn-152x152.png" rel="apple-touch-icon">\n  </head>\n  <body><p>\n   test test\n\ttest\n\n</p></body>\n</html>';
  output = '\n<!DOCTYPE html>\n<html lang="en" class="no-js">\n' +
           '<head>\n<meta charset="utf-8">\n<meta http-equiv="X-UA-Compatible" content="IE=edge">\n' +
           '<!-- Copyright Notice -->\n' +
           '<title>Carbon</title>\n<meta name="title" content="Carbon">\n' +
           '<meta name="description" content="A front-end framework.">\n' +
           '<meta name="apple-mobile-web-app-capable" content="yes">\n' +
           '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n' +
           '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
           '<link href="stylesheets/application.css" rel="stylesheet">\n' +
           '<script src="scripts/application.js"></script>\n' +
           '<link href="images/icn-32x32.png" rel="shortcut icon">\n' +
           '<link href="images/icn-152x152.png" rel="apple-touch-icon">\n</head>\n<body><p>\ntest test test\n</p></body>\n</html>';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    preserveLineBreaks: true
  }), output);
  assert.equal(minify(input, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    preserveLineBreaks: true
  }), output);
  output = '\n<!DOCTYPE html>\n<html lang="en" class="no-js">\n' +
           '<head>\n<meta charset="utf-8">\n<meta http-equiv="X-UA-Compatible" content="IE=edge">\n' +
           '<title>Carbon</title>\n<meta name="title" content="Carbon">\n' +
           '<meta name="description" content="A front-end framework.">\n' +
           '<meta name="apple-mobile-web-app-capable" content="yes">\n' +
           '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n' +
           '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
           '<link href="stylesheets/application.css" rel="stylesheet">\n' +
           '<script src="scripts/application.js"></script>\n' +
           '<link href="images/icn-32x32.png" rel="shortcut icon">\n' +
           '<link href="images/icn-152x152.png" rel="apple-touch-icon">\n</head>\n<body><p>\ntest test test\n</p></body>\n</html>';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    preserveLineBreaks: true,
    removeComments: true
  }), output);

  input = '<div> text <span>\n text</span> \n</div>';
  output = '<div>text <span>\ntext</span>\n</div>';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    preserveLineBreaks: true
  }), output);

  input = '<div>  text \n </div>';
  output = '<div>text\n</div>';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    preserveLineBreaks: true
  }), output);
  output = '<div> text\n</div>';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    preserveLineBreaks: true
  }), output);

  input = '<div>\ntext  </div>';
  output = '<div>\ntext</div>';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    preserveLineBreaks: true
  }), output);
  output = '<div>\ntext </div>';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    preserveLineBreaks: true
  }), output);

  input = 'This is the start. <% ... %>\r\n<%= ... %>\r\n<? ... ?>\r\n<!-- This is the middle, and a comment. -->\r\nNo comment, but middle.\r\n<?= ... ?>\r\n<?php ... ?>\r\n<?xml ... ?>\r\nHello, this is the end!';
  output = 'This is the start. <% ... %>\n<%= ... %>\n<? ... ?>\nNo comment, but middle.\n<?= ... ?>\n<?php ... ?>\n<?xml ... ?>\nHello, this is the end!';
  assert.equal(minify(input, {
    removeComments: true,
    collapseWhitespace: true,
    preserveLineBreaks: true
  }), output);
});

QUnit.test('collapse inline tag whitespace', function(assert) {
  var input, output;

  input = '<button>a</button> <button>b</button>';
  assert.equal(minify(input, {
    collapseWhitespace: true
  }), input);

  output = '<button>a</button><button>b</button>';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    collapseInlineTagWhitespace: true
  }), output);

  input = '<p>where <math> <mi>R</mi> </math> is the Rici tensor.</p>';
  output = '<p>where <math><mi>R</mi></math> is the Rici tensor.</p>';
  assert.equal(minify(input, {
    collapseWhitespace: true
  }), output);

  output = '<p>where<math><mi>R</mi></math>is the Rici tensor.</p>';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    collapseInlineTagWhitespace: true
  }), output);
});

QUnit.test('ignore custom comments', function(assert) {
  var input, output;

  input = '<!--! test -->';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { removeComments: true }), input);
  assert.equal(minify(input, { ignoreCustomComments: false }), input);
  assert.equal(minify(input, {
    removeComments: true,
    ignoreCustomComments: []
  }), '');
  assert.equal(minify(input, {
    removeComments: true,
    ignoreCustomComments: false
  }), '');

  input = '<!-- htmlmin:ignore -->test<!-- htmlmin:ignore -->';
  output = 'test';
  assert.equal(minify(input), output);
  assert.equal(minify(input, { removeComments: true }), output);
  assert.equal(minify(input, { ignoreCustomComments: false }), output);
  assert.equal(minify(input, {
    removeComments: true,
    ignoreCustomComments: []
  }), output);
  assert.equal(minify(input, {
    removeComments: true,
    ignoreCustomComments: false
  }), output);

  input = '<!-- ko if: someExpressionGoesHere --><li>test</li><!-- /ko -->';
  assert.equal(minify(input, {
    removeComments: true,
    // ignore knockout comments
    ignoreCustomComments: [
      /^\s+ko/,
      /\/ko\s+$/
    ]
  }), input);

  input = '<!--#include virtual="/cgi-bin/counter.pl" -->';
  assert.equal(minify(input, {
    removeComments: true,
    // ignore Apache SSI includes
    ignoreCustomComments: [
      /^\s*#/
    ]
  }), input);
});

QUnit.test('processScripts', function(assert) {
  var input = '<script type="text/ng-template"><!--test--><div>   <span> foobar </span> \n\n</div></script>';
  var output = '<script type="text/ng-template"><div><span>foobar</span></div></script>';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    removeComments: true,
    processScripts: ['text/ng-template']
  }), output);
});

QUnit.test('ignore', function(assert) {
  var input, output;

  input = '<!-- htmlmin:ignore --><div class="blah" style="color: red">\n   test   <span> <input disabled/>  foo </span>\n\n   </div><!-- htmlmin:ignore -->' +
          '<div class="blah" style="color: red">\n   test   <span> <input disabled/>  foo </span>\n\n   </div>';
  output = '<div class="blah" style="color: red">\n   test   <span> <input disabled/>  foo </span>\n\n   </div>' +
           '<div class="blah" style="color: red">test <span><input disabled="disabled"> foo</span></div>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);

  input = '<!-- htmlmin:ignore --><!-- htmlmin:ignore -->';
  assert.equal(minify(input), '');

  input = '<p>.....</p><!-- htmlmin:ignore -->' +
          '@for( $i = 0 ; $i < $criterions->count() ; $i++ )' +
              '<h1>{{ $criterions[$i]->value }}</h1>' +
          '@endfor' +
          '<!-- htmlmin:ignore --><p>....</p>';
  output = '<p>.....</p>' +
           '@for( $i = 0 ; $i < $criterions->count() ; $i++ )' +
               '<h1>{{ $criterions[$i]->value }}</h1>' +
           '@endfor' +
           '<p>....</p>';
  assert.equal(minify(input, { removeComments: true }), output);

  input = '<!-- htmlmin:ignore --> <p class="logged"|cond="$is_logged === true" id="foo"> bar</p> <!-- htmlmin:ignore -->';
  output = ' <p class="logged"|cond="$is_logged === true" id="foo"> bar</p> ';
  assert.equal(minify(input), output);

  input = '<!-- htmlmin:ignore --><body <?php body_class(); ?>><!-- htmlmin:ignore -->';
  output = '<body <?php body_class(); ?>>';
  assert.equal(minify(input, { ignoreCustomFragments: [/<\?php[\s\S]*?\?>/] }), output);

  input = 'a\n<!-- htmlmin:ignore -->b<!-- htmlmin:ignore -->';
  output = 'a b';
  assert.equal(minify(input, { collapseWhitespace: true }), output);

  input = '<p>foo <!-- htmlmin:ignore --><span>\n\tbar\n</span><!-- htmlmin:ignore -->.</p>';
  output = '<p>foo <span>\n\tbar\n</span>.</p>';
  assert.equal(minify(input, { collapseWhitespace: true }), output);

  input = '<!-- htmlmin:ignore -->+<!-- htmlmin:ignore -->0';
  assert.equal(minify(input), '+0');
});

QUnit.test('meta viewport', function(assert) {
  var input, output;

  input = '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
  output = '<meta name="viewport" content="width=device-width,initial-scale=1">';
  assert.equal(minify(input), output);

  input = '<meta name="viewport" content="initial-scale=1, maximum-scale=1.0">';
  output = '<meta name="viewport" content="initial-scale=1,maximum-scale=1">';
  assert.equal(minify(input), output);

  input = '<meta name="viewport" content="width= 500 ,  initial-scale=1">';
  output = '<meta name="viewport" content="width=500,initial-scale=1">';
  assert.equal(minify(input), output);

  input = '<meta name="viewport" content="width=device-width, initial-scale=1.0001, maximum-scale=3.140000">';
  output = '<meta name="viewport" content="width=device-width,initial-scale=1.0001,maximum-scale=3.14">';
  assert.equal(minify(input), output);
});

QUnit.test('downlevel-revealed conditional comments', function(assert) {
  var input = '<![if !IE]><link href="non-ie.css" rel="stylesheet"><![endif]>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { removeComments: true }), input);
});

QUnit.test('noscript', function(assert) {
  var input;

  input = '<SCRIPT SRC="x"></SCRIPT><NOSCRIPT>x</NOSCRIPT>';
  assert.equal(minify(input), '<script src="x"></script><noscript>x</noscript>');

  input = '<noscript>\n<!-- anchor linking to external file -->\n' +
          '<a href="#" onclick="javascript:">External Link</a>\n</noscript>';
  assert.equal(minify(input, { removeComments: true, collapseWhitespace: true, removeEmptyAttributes: true }),
    '<noscript><a href="#">External Link</a></noscript>');
});

QUnit.test('max line length', function(assert) {
  var input;
  var options = { maxLineLength: 25 };

  input = '123456789012345678901234567890';
  assert.equal(minify(input, options), input);

  input = '<div data-attr="foo"></div>';
  assert.equal(minify(input, options), '<div data-attr="foo">\n</div>');

  input = [
    '<code>    hello   world   ',
    '    world   hello  </code>'
  ].join('\n');
  assert.equal(minify(input), input);
  assert.equal(minify(input, options), [
    '<code>',
    '    hello   world   ',
    '    world   hello  ',
    '</code>'
  ].join('\n'));

  assert.equal(minify('<p title="</p>">x</p>'), '<p title="</p>">x</p>');
  assert.equal(minify('<p title=" <!-- hello world --> ">x</p>'), '<p title=" <!-- hello world --> ">x</p>');
  assert.equal(minify('<p title=" <![CDATA[ \n\n foobar baz ]]> ">x</p>'), '<p title=" <![CDATA[ \n\n foobar baz ]]> ">x</p>');
  assert.equal(minify('<p foo-bar=baz>xxx</p>'), '<p foo-bar="baz">xxx</p>');
  assert.equal(minify('<p foo:bar=baz>xxx</p>'), '<p foo:bar="baz">xxx</p>');

  input = [
    '<div><div><div><div><div>',
    '<div><div><div><div><div>',
    'i\'m 10 levels deep</div>',
    '</div></div></div></div>',
    '</div></div></div></div>',
    '</div>'
  ];
  assert.equal(minify(input.join('')), input.join(''));
  assert.equal(minify(input.join(''), options), input.join('\n'));

  input = [
    '<div><div><?foo?><div>',
    '<div><div><?bar?><div>',
    '<div><div>',
    'i\'m 9 levels deep</div>',
    '</div></div><%baz%></div>',
    '</div></div><%moo%></div>',
    '</div>'
  ];
  assert.equal(minify(input.join('')), input.join(''));
  assert.equal(minify(input.join(''), options), input.join('\n'));

  assert.equal(minify('<script>alert(\'<!--\')</script>', options), '<script>alert(\'<!--\')\n</script>');
  input = '<script>\nalert(\'<!-- foo -->\')\n</script>';
  assert.equal(minify('<script>alert(\'<!-- foo -->\')</script>', options), input);
  assert.equal(minify(input, options), input);
  assert.equal(minify('<script>alert(\'-->\')</script>', options), '<script>alert(\'-->\')\n</script>');

  assert.equal(minify('<a title="x"href=" ">foo</a>', options), '<a title="x" href="">foo\n</a>');
  assert.equal(minify('<p id=""class=""title="">x', options), '<p id="" class="" \ntitle="">x</p>');
  assert.equal(minify('<p x="x\'"">x</p>', options), '<p x="x\'">x</p>', 'trailing quote should be ignored');
  assert.equal(minify('<a href="#"><p>Click me</p></a>', options), '<a href="#"><p>Click me\n</p></a>');
  input = '<span><button>Hit me\n</button></span>';
  assert.equal(minify('<span><button>Hit me</button></span>', options), input);
  assert.equal(minify(input, options), input);
  assert.equal(minify('<object type="image/svg+xml" data="image.svg"><div>[fallback image]</div></object>', options),
    '<object \ntype="image/svg+xml" \ndata="image.svg"><div>\n[fallback image]</div>\n</object>'
  );

  assert.equal(minify('<ng-include src="x"></ng-include>', options), '<ng-include src="x">\n</ng-include>');
  assert.equal(minify('<ng:include src="x"></ng:include>', options), '<ng:include src="x">\n</ng:include>');
  assert.equal(minify('<ng-include src="\'views/partial-notification.html\'"></ng-include><div ng-view=""></div>', options),
    '<ng-include \nsrc="\'views/partial-notification.html\'">\n</ng-include><div \nng-view=""></div>'
  );

  input = [
    '<some-tag-1></some-tag-1>',
    '<some-tag-2></some-tag-2>',
    '<some-tag-3>4',
    '</some-tag-3>'
  ];
  assert.equal(minify(input.join('')), input.join(''));
  assert.equal(minify(input.join(''), options), input.join('\n'));

  assert.equal(minify('[\']["]', options), '[\']["]');
  assert.equal(minify('<a href="/test.html"><div>hey</div></a>', options), '<a href="/test.html">\n<div>hey</div></a>');
  assert.equal(minify(':) <a href="http://example.com">link</a>', options), ':) <a \nhref="http://example.com">\nlink</a>');
  assert.equal(minify(':) <a href="http://example.com">\nlink</a>', options), ':) <a \nhref="http://example.com">\nlink</a>');
  assert.equal(minify(':) <a href="http://example.com">\n\nlink</a>', options), ':) <a \nhref="http://example.com">\n\nlink</a>');

  assert.equal(minify('<a href>ok</a>', options), '<a href>ok</a>');
});

QUnit.test('custom attribute collapse', function(assert) {
  var input, output;

  input = '<div data-bind="\n' +
            'css: {\n' +
              'fadeIn: selected(),\n' +
              'fadeOut: !selected()\n' +
            '},\n' +
            'visible: function () {\n' +
              'return pageWeAreOn() == \'home\';\n' +
            '}\n' +
          '">foo</div>';
  output = '<div data-bind="css: {fadeIn: selected(),fadeOut: !selected()},visible: function () {return pageWeAreOn() == \'home\';}">foo</div>';

  assert.equal(minify(input), input);
  assert.equal(minify(input, { customAttrCollapse: /data-bind/ }), output);

  input = '<div style="' +
            'color: red;' +
            'font-size: 100em;' +
          '">bar</div>';
  output = '<div style="color: red;font-size: 100em;">bar</div>';
  assert.equal(minify(input, { customAttrCollapse: /style/ }), output);

  input = '<div ' +
    'class="fragment square" ' +
    'ng-hide="square1.hide" ' +
    'ng-class="{ \n\n' +
      '\'bounceInDown\': !square1.hide, ' +
      '\'bounceOutDown\': square1.hide ' +
    '}" ' +
  '> ' +
  '</div>';
  output = '<div class="fragment square" ng-hide="square1.hide" ng-class="{\'bounceInDown\': !square1.hide, \'bounceOutDown\': square1.hide }"> </div>';
  assert.equal(minify(input, { customAttrCollapse: /ng-class/ }), output);
});

QUnit.test('custom attribute collapse with empty attribute value', function(assert) {
  var input = '<div ng-some\n\n></div>';
  var output = '<div ng-some></div>';
  assert.equal(minify(input, { customAttrCollapse: /.+/ }), output);
});

QUnit.test('custom attribute collapse with newlines, whitespace, and carriage returns', function(assert) {
  var input = '<div ng-class="{ \n\r' +
          '               value:true, \n\r' +
          '               value2:false \n\r' +
          '               }"></div>';
  var output = '<div ng-class="{value:true,value2:false}"></div>';
  assert.equal(minify(input, { customAttrCollapse: /ng-class/ }), output);
});

QUnit.test('do not escape attribute value', function(assert) {
  var input, output;

  input = '<div data=\'{\n' +
          '\t"element": "<div class=\\"test\\"></div>\n"' +
          '}\'></div>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { preventAttributesEscaping: true }), input);

  input = '<div foo bar=\'\' baz="" moo=1 loo=\'2\' haa="3"></div>';
  assert.equal(minify(input, { preventAttributesEscaping: true }), input);
  output = '<div foo bar="" baz="" moo="1" loo="2" haa="3"></div>';
  assert.equal(minify(input), output);
});

QUnit.test('quoteCharacter is single quote', function(assert) {
  assert.equal(minify('<div class=\'bar\'>foo</div>', { quoteCharacter: '\'' }), '<div class=\'bar\'>foo</div>');
  assert.equal(minify('<div class="bar">foo</div>', { quoteCharacter: '\'' }), '<div class=\'bar\'>foo</div>');
});

QUnit.test('quoteCharacter is not single quote or double quote', function(assert) {
  assert.equal(minify('<div class=\'bar\'>foo</div>', { quoteCharacter: 'm' }), '<div class="bar">foo</div>');
  assert.equal(minify('<div class="bar">foo</div>', { quoteCharacter: 'm' }), '<div class="bar">foo</div>');
});

QUnit.test('remove space between attributes', function(assert) {
  var input, output;
  var options = {
    collapseBooleanAttributes: true,
    keepClosingSlash: true,
    removeAttributeQuotes: true,
    removeTagWhitespace: true
  };

  input = '<input data-attr="example" value="hello world!" checked="checked">';
  output = '<input data-attr=example value="hello world!"checked>';
  assert.equal(minify(input, options), output);

  input = '<input checked="checked" value="hello world!" data-attr="example">';
  output = '<input checked value="hello world!"data-attr=example>';
  assert.equal(minify(input, options), output);

  input = '<input checked="checked" data-attr="example" value="hello world!">';
  output = '<input checked data-attr=example value="hello world!">';
  assert.equal(minify(input, options), output);

  input = '<input data-attr="example" value="hello world!" checked="checked"/>';
  output = '<input data-attr=example value="hello world!"checked/>';
  assert.equal(minify(input, options), output);

  input = '<input checked="checked" value="hello world!" data-attr="example"/>';
  output = '<input checked value="hello world!"data-attr=example />';
  assert.equal(minify(input, options), output);

  input = '<input checked="checked" data-attr="example" value="hello world!"/>';
  output = '<input checked data-attr=example value="hello world!"/>';
  assert.equal(minify(input, options), output);
});

QUnit.test('markups from Angular 2', function(assert) {
  var input, output;
  input = '<template ngFor #hero [ngForOf]="heroes">\n' +
          '  <hero-detail *ngIf="hero" [hero]="hero"></hero-detail>\n' +
          '</template>\n' +
          '<form (ngSubmit)="onSubmit(theForm)" #theForm="ngForm">\n' +
          '  <div class="form-group">\n' +
          '    <label for="name">Name</label>\n' +
          '    <input class="form-control" required ngControl="firstName"\n' +
          '      [(ngModel)]="currentHero.firstName">\n' +
          '  </div>\n' +
          '  <button type="submit" [disabled]="!theForm.form.valid">Submit</button>\n' +
          '</form>';
  output = '<template ngFor #hero [ngForOf]="heroes">\n' +
           '  <hero-detail *ngIf="hero" [hero]="hero"></hero-detail>\n' +
           '</template>\n' +
           '<form (ngSubmit)="onSubmit(theForm)" #theForm="ngForm">\n' +
           '  <div class="form-group">\n' +
           '    <label for="name">Name</label>\n' +
           '    <input class="form-control" required ngControl="firstName" [(ngModel)]="currentHero.firstName">\n' +
           '  </div>\n' +
           '  <button type="submit" [disabled]="!theForm.form.valid">Submit</button>\n' +
           '</form>';
  assert.equal(minify(input, { caseSensitive: true }), output);
  output = '<template ngFor #hero [ngForOf]=heroes>' +
           '<hero-detail *ngIf=hero [hero]=hero></hero-detail>' +
           '</template>' +
           '<form (ngSubmit)=onSubmit(theForm) #theForm=ngForm>' +
           '<div class=form-group>' +
           '<label for=name>Name</label>' +
           ' <input class=form-control required ngControl=firstName [(ngModel)]=currentHero.firstName>' +
           '</div>' +
           '<button type=submit [disabled]=!theForm.form.valid>Submit</button>' +
           '</form>';
  assert.equal(minify(input, {
    caseSensitive: true,
    collapseBooleanAttributes: true,
    collapseWhitespace: true,
    removeAttributeQuotes: true,
    removeComments: true,
    removeEmptyAttributes: true,
    removeOptionalTags: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    removeTagWhitespace: true,
    useShortDoctype: true
  }), output);
});

QUnit.test('auto-generated tags', function(assert) {
  var input, output;

  input = '</p>';
  assert.equal(minify(input, { includeAutoGeneratedTags: false }), input);

  input = '<p id=""class=""title="">x';
  output = '<p id="" class="" title="">x';
  assert.equal(minify(input, { includeAutoGeneratedTags: false }), output);
  output = '<p id="" class="" title="">x</p>';
  assert.equal(minify(input), output);
  assert.equal(minify(input, { includeAutoGeneratedTags: true }), output);

  input = '<body onload="  foo();   bar() ;  "><p>x</body>';
  output = '<body onload="foo();   bar() ;"><p>x</body>';
  assert.equal(minify(input, { includeAutoGeneratedTags: false }), output);

  input = '<a href="#"><div>Well, look at me! I\'m a div!</div></a>';
  output = '<a href="#"><div>Well, look at me! I\'m a div!</div>';
  assert.equal(minify(input, { html5: false, includeAutoGeneratedTags: false }), output);
  assert.equal(minify('<p id=""class=""title="">x', {
    maxLineLength: 25,
    includeAutoGeneratedTags: false
  }), '<p id="" class="" \ntitle="">x');

  input = '<p>foo';
  assert.equal(minify(input, { includeAutoGeneratedTags: false }), input);
  assert.equal(minify(input, {
    includeAutoGeneratedTags: false,
    removeOptionalTags: true
  }), input);

  input = '</p>';
  assert.equal(minify(input, { includeAutoGeneratedTags: false }), input);
  output = '';
  assert.equal(minify(input, {
    includeAutoGeneratedTags: false,
    removeOptionalTags: true
  }), output);

  input = '<select><option>foo<option>bar</select>';
  assert.equal(minify(input, { includeAutoGeneratedTags: false }), input);
  output = '<select><option>foo</option><option>bar</option></select>';
  assert.equal(minify(input, { includeAutoGeneratedTags: true }), output);

  input = '<datalist><option label="A" value="1"><option label="B" value="2"></datalist>';
  assert.equal(minify(input, { includeAutoGeneratedTags: false }), input);
  output = '<datalist><option label="A" value="1"></option><option label="B" value="2"></option></datalist>';
  assert.equal(minify(input, { includeAutoGeneratedTags: true }), output);
});

QUnit.test('sort attributes', function(assert) {
  var input, output;

  input = '<link href="foo">' +
          '<link rel="bar" href="baz">' +
          '<link type="text/css" href="app.css" rel="stylesheet" async>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { sortAttributes: false }), input);
  output = '<link href="foo">' +
           '<link href="baz" rel="bar">' +
           '<link href="app.css" rel="stylesheet" async type="text/css">';
  assert.equal(minify(input, { sortAttributes: true }), output);

  input = '<link href="foo">' +
          '<link rel="bar" href="baz">' +
          '<script type="text/html"><link type="text/css" href="app.css" rel="stylesheet" async></script>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { sortAttributes: false }), input);
  output = '<link href="foo">' +
           '<link href="baz" rel="bar">' +
           '<script type="text/html"><link type="text/css" href="app.css" rel="stylesheet" async></script>';
  assert.equal(minify(input, { sortAttributes: true }), output);
  output = '<link href="foo">' +
           '<link href="baz" rel="bar">' +
           '<script type="text/html"><link href="app.css" rel="stylesheet" async type="text/css"></script>';
  assert.equal(minify(input, {
    processScripts: [
      'text/html'
    ],
    sortAttributes: true
  }), output);

  input = '<link type="text/css" href="foo.css">' +
          '<link rel="stylesheet" type="text/abc" href="bar.css">' +
          '<link href="baz.css">';
  output = '<link href="foo.css" type="text/css">' +
           '<link href="bar.css" type="text/abc" rel="stylesheet">' +
           '<link href="baz.css">';
  assert.equal(minify(input, { sortAttributes: true }), output);
  output = '<link href="foo.css">' +
           '<link href="bar.css" rel="stylesheet" type="text/abc">' +
           '<link href="baz.css">';
  assert.equal(minify(input, {
    removeStyleLinkTypeAttributes: true,
    sortAttributes: true
  }), output);

  input = '<a foo moo></a>' +
          '<a bar foo></a>' +
          '<a baz bar foo></a>' +
          '<a baz foo moo></a>' +
          '<a moo baz></a>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { sortAttributes: false }), input);
  output = '<a foo moo></a>' +
           '<a foo bar></a>' +
           '<a foo bar baz></a>' +
           '<a foo baz moo></a>' +
           '<a baz moo></a>';
  assert.equal(minify(input, { sortAttributes: true }), output);

  input = '<span nav_sv_fo_v_column <#=(j === 0) ? \'nav_sv_fo_v_first\' : \'\' #> foo_bar></span>';
  assert.equal(minify(input, {
    ignoreCustomFragments: [/<#[\s\S]*?#>/]
  }), input);
  assert.equal(minify(input, {
    ignoreCustomFragments: [/<#[\s\S]*?#>/],
    sortAttributes: false
  }), input);
  output = '<span foo_bar nav_sv_fo_v_column <#=(j === 0) ? \'nav_sv_fo_v_first\' : \'\' #> ></span>';
  assert.equal(minify(input, {
    ignoreCustomFragments: [/<#[\s\S]*?#>/],
    sortAttributes: true
  }), output);

  input = '<a 0 1 2 3 4 5 6 7 8 9 a b c d e f g h i j k l m n o p q r s t u v w x y z></a>';
  assert.equal(minify(input, { sortAttributes: true }), input);
});

QUnit.test('sort style classes', function(assert) {
  var input, output;

  input = '<a class="foo moo"></a>' +
          '<b class="bar foo"></b>' +
          '<i class="baz bar foo"></i>' +
          '<s class="baz foo moo"></s>' +
          '<u class="moo baz"></u>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { sortClassName: false }), input);
  output = '<a class="foo moo"></a>' +
           '<b class="foo bar"></b>' +
           '<i class="foo bar baz"></i>' +
           '<s class="foo baz moo"></s>' +
           '<u class="baz moo"></u>';
  assert.equal(minify(input, { sortClassName: true }), output);

  input = '<a class="moo <!-- htmlmin:ignore -->bar<!-- htmlmin:ignore --> foo baz"></a>';
  output = '<a class="moo bar foo baz"></a>';
  assert.equal(minify(input), output);
  assert.equal(minify(input, { sortClassName: false }), output);
  output = '<a class="baz foo moo bar"></a>';
  assert.equal(minify(input, { sortClassName: true }), output);

  input = '<div class="nav_sv_fo_v_column <#=(j === 0) ? \'nav_sv_fo_v_first\' : \'\' #> foo_bar"></div>';
  assert.equal(minify(input, {
    ignoreCustomFragments: [/<#[\s\S]*?#>/]
  }), input);
  assert.equal(minify(input, {
    ignoreCustomFragments: [/<#[\s\S]*?#>/],
    sortClassName: false
  }), input);
  assert.equal(minify(input, {
    ignoreCustomFragments: [/<#[\s\S]*?#>/],
    sortClassName: true
  }), input);

  input = '<a class="0 1 2 3 4 5 6 7 8 9 a b c d e f g h i j k l m n o p q r s t u v w x y z"></a>';
  assert.equal(minify(input, { sortClassName: false }), input);
  assert.equal(minify(input, { sortClassName: true }), input);

  input = '<a class="add sort keys createSorter"></a>';
  assert.equal(minify(input, { sortClassName: false }), input);
  output = '<a class="add createSorter keys sort"></a>';
  assert.equal(minify(input, { sortClassName: true }), output);

  input = '<span class="sprite sprite-{{sprite}}"></span>';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    ignoreCustomFragments: [/{{.*?}}/],
    removeAttributeQuotes: true,
    sortClassName: true
  }), input);

  input = '<span class="{{sprite}}-sprite sprite"></span>';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    ignoreCustomFragments: [/{{.*?}}/],
    removeAttributeQuotes: true,
    sortClassName: true
  }), input);

  input = '<span class="sprite-{{sprite}}-sprite"></span>';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    ignoreCustomFragments: [/{{.*?}}/],
    removeAttributeQuotes: true,
    sortClassName: true
  }), input);

  input = '<span class="{{sprite}}"></span>';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    ignoreCustomFragments: [/{{.*?}}/],
    removeAttributeQuotes: true,
    sortClassName: true
  }), input);

  input = '<span class={{sprite}}></span>';
  output = '<span class="{{sprite}}"></span>';
  assert.equal(minify(input, {
    collapseWhitespace: true,
    ignoreCustomFragments: [/{{.*?}}/],
    removeAttributeQuotes: true,
    sortClassName: true
  }), output);

  input = '<div class></div>';
  assert.equal(minify(input, { sortClassName: false }), input);
  assert.equal(minify(input, { sortClassName: true }), input);
});

QUnit.test('decode entity characters', function(assert) {
  var input, output;

  input = '<!-- &ne; -->';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { decodeEntities: false }), input);
  assert.equal(minify(input, { decodeEntities: true }), input);

  // https://github.com/kangax/html-minifier/issues/964
  input = '&amp;xxx; &amp;xxx &ampthorn; &ampthorn &ampcurren;t &ampcurrent';
  output = '&ampxxx; &xxx &ampthorn; &ampthorn &ampcurren;t &ampcurrent';
  assert.equal(minify(input, { decodeEntities: true }), output);

  input = '<script type="text/html">&colon;</script>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { decodeEntities: false }), input);
  assert.equal(minify(input, { decodeEntities: true }), input);
  output = '<script type="text/html">:</script>';
  assert.equal(minify(input, { decodeEntities: true, processScripts: ['text/html'] }), output);

  input = '<div style="font: &quot;monospace&#34;">foo&dollar;</div>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { decodeEntities: false }), input);
  output = '<div style=\'font: "monospace"\'>foo$</div>';
  assert.equal(minify(input, { decodeEntities: true }), output);
  output = '<div style="font:&quot">foo&dollar;</div>';
  assert.equal(minify(input, { minifyCSS: true }), output);
  assert.equal(minify(input, { decodeEntities: false, minifyCSS: true }), output);
  output = '<div style="font:monospace">foo$</div>';
  assert.equal(minify(input, { decodeEntities: true, minifyCSS: true }), output);

  input = '<a href="/?foo=1&amp;bar=&lt;2&gt;">baz&lt;moo&gt;&copy;</a>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { decodeEntities: false }), input);
  output = '<a href="/?foo=1&bar=<2>">baz&lt;moo>\u00a9</a>';
  assert.equal(minify(input, { decodeEntities: true }), output);

  input = '<? &amp; ?>&amp;<pre><? &amp; ?>&amp;</pre>';
  assert.equal(minify(input), input);
  assert.equal(minify(input, { collapseWhitespace: false, decodeEntities: false }), input);
  assert.equal(minify(input, { collapseWhitespace: true, decodeEntities: false }), input);
  output = '<? &amp; ?>&<pre><? &amp; ?>&</pre>';
  assert.equal(minify(input, { collapseWhitespace: false, decodeEntities: true }), output);
  assert.equal(minify(input, { collapseWhitespace: true, decodeEntities: true }), output);
});

QUnit.test('tests from PHPTAL', function(assert) {
  [
    // trailing </p> removed by minifier, but not by PHPTAL
    ['<p>foo bar baz', '<p>foo     \t bar\n\n\n baz</p>'],
    ['<p>foo bar<pre>  \tfoo\t   \nbar   </pre>', '<p>foo   \t\n bar</p><pre>  \tfoo\t   \nbar   </pre>'],
    ['<p>foo <a href="">bar </a>baz', '<p>foo <a href=""> bar </a> baz  </p>'],
    ['<p>foo <a href="">bar </a>baz', ' <p>foo <a href=""> bar </a>baz </p>'],
    ['<p>foo<a href=""> bar </a>baz', ' <p> foo<a href=""> bar </a>baz </p>  '],
    ['<p>foo <a href="">bar</a> baz', ' <p> foo <a href="">bar</a> baz</p>'],
    ['<p>foo<br>', '<p>foo <br/></p>'],
    // PHPTAL remove whitespace after 'foo' - problematic if <span> is used as icon font
    ['<p>foo <span></span>', '<p>foo <span></span></p>'],
    ['<p>foo <span></span>', '<p>foo <span></span> </p>'],
    // comments removed by minifier, but not by PHPTAL
    ['<p>foo', '<p>foo <!-- --> </p>'],
    ['<div>a<div>b</div>c<div>d</div>e</div>', '<div>a <div>b</div> c <div> d </div> e </div>'],
    // unary slashes removed by minifier, but not by PHPTAL
    ['<div><img></div>', '<div> <img/> </div>'],
    ['<div>x <img></div>', '<div> x <img/> </div>'],
    ['<div>x <img> y</div>', '<div> x <img/> y </div>'],
    ['<div><img> y</div>', '<div><img/> y </div>'],
    ['<div><button>Z</button></div>', '<div> <button>Z</button> </div>'],
    ['<div>x <button>Z</button></div>', '<div> x <button>Z</button> </div>'],
    ['<div>x <button>Z</button> y</div>', '<div> x <button>Z</button> y </div>'],
    ['<div><button>Z</button> y</div>', '<div><button>Z</button> y </div>'],
    ['<div><button>Z</button></div>', '<div> <button> Z </button> </div>'],
    ['<div>x <button>Z</button></div>', '<div> x <button> Z </button> </div>'],
    ['<div>x <button>Z</button> y</div>', '<div> x <button> Z </button> y </div>'],
    ['<div><button>Z</button> y</div>', '<div><button> Z </button> y </div>'],
    ['<script>//foo\nbar()</script>', '<script>//foo\nbar()</script>'],
    // optional tags removed by minifier, but not by PHPTAL
    // parser cannot handle <script/>
    [
      '<title></title><link><script>" ";</script><script></script><meta><style></style>',
      '<html >\n' +
      '<head > <title > </title > <link /> <script >" ";</script> <script>\n</script>\n' +
      ' <meta /> <style\n' +
      '  > </style >\n' +
      '   </head > </html>'
    ],
    ['<div><p>test 123<p>456<ul><li>x</ul></div>', '<div> <p> test 123 </p> <p> 456 </p> <ul> <li>x</li> </ul> </div>'],
    ['<div><p>test 123<pre> 456 </pre><p>x</div>', '<div> <p> test 123 </p> <pre> 456 </pre> <p> x </p> </div>'],
    /* minifier does not assume <li> as "display: inline"
    ['<div><ul><li><a>a </a></li><li>b </li><li>c</li></ul></div>', '<div> <ul> <li> <a> a </a> </li> <li> b </li> <li> c </li> </ul> </div>'],*/
    ['<table>x<tr>x<td>foo</td>x</tr>x</table>', '<table> x <tr> x <td> foo </td> x </tr> x </table>'],
    ['<select>x<option></option>x<optgroup>x<option></option>x</optgroup>x</select>', '<select> x <option> </option> x <optgroup> x <option> </option> x </optgroup> x </select> '],
    // closing slash and optional attribute quotes removed by minifier, but not by PHPTAL
    // attribute ordering differences between minifier and PHPTAL
    ['<img alt=x height=5 src=foo width=10>', '<img width="10" height="5" src="foo" alt="x" />'],
    ['<img alpha=1 beta=2 gamma=3>', '<img gamma="3" alpha="1" beta="2" />'],
    ['<pre>\n\n\ntest</pre>', '<pre>\n\n\ntest</pre>'],
    /* single line-break preceding <pre> is redundant, assuming <pre> is block element
    ['<pre>test</pre>', '<pre>\ntest</pre>'],*/
    // closing slash and optional attribute quotes removed by minifier, but not by PHPTAL
    // attribute ordering differences between minifier and PHPTAL
    // redundant inter-attribute spacing removed by minifier, but not by PHPTAL
    ['<meta content="text/plain;charset=UTF-8"http-equiv=Content-Type>', '<meta http-equiv=\'Content-Type\' content=\'text/plain;charset=UTF-8\'/>'],
    /* minifier does not optimise <meta/> in HTML5 mode
    ['<meta charset=utf-8>', '<meta http-equiv=\'Content-Type\' content=\'text/plain;charset=UTF-8\'/>'],*/
    /* minifier does not optimise <script/> in HTML5 mode
    [
      '<script></script><style></style>',
      '<script type=\'text/javascript ;charset=utf-8\'\n' +
      'language=\'javascript\'></script><style type=\'text/css\'></style>'
    ],*/
    // minifier removes more javascript type attributes than PHPTAL
    ['<script></script><script type=text/hack></script>', '<script type="text/javascript;e4x=1"></script><script type="text/hack"></script>']
    /* trim "title" attribute value in <a>
    [
      '<title>Foo</title><p><a title="x"href=test>x </a>xu</p><br>foo',
      '<html> <head> <title> Foo </title> </head>\n' +
      '<body>\n' +
      '<p>\n' +
      '<a title="   x " href=" test "> x </a> xu\n' +
      '</p>\n' +
      '<br/>\n' +
      'foo</body> </html>  <!-- bla -->'
    ]*/
  ].forEach(function(tokens) {
    assert.equal(minify(tokens[1], {
      collapseBooleanAttributes: true,
      collapseWhitespace: true,
      removeAttributeQuotes: true,
      removeComments: true,
      removeEmptyAttributes: true,
      removeOptionalTags: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      removeTagWhitespace: true,
      sortAttributes: true,
      useShortDoctype: true
    }), tokens[0]);
  });
});

QUnit.test('canCollapseWhitespace and canTrimWhitespace hooks', function(assert) {
  function canCollapseAndTrimWhitespace(tagName, attrs, defaultFn) {
    if ((attrs || []).some(function(attr) { return attr.name === 'class' && attr.value === 'leaveAlone'; })) {
      return false;
    }
    return defaultFn(tagName, attrs);
  }

  var input = '<div class="leaveAlone"><span> </span> foo  bar</div>';
  var output = '<div class="leaveAlone"><span> </span> foo  bar</div>';

  assert.equal(minify(input, {
    collapseWhitespace: true,
    canTrimWhitespace: canCollapseAndTrimWhitespace,
    canCollapseWhitespace: canCollapseAndTrimWhitespace
  }), output);

  // Regression test: Previously the first </div> would clear the internal
  // stackNo{Collapse,Trim}Whitespace, so that ' foo  bar' turned into ' foo bar'
  input = '<div class="leaveAlone"><div></div><span> </span> foo  bar</div>';
  output = '<div class="leaveAlone"><div></div><span> </span> foo  bar</div>';

  assert.equal(minify(input, {
    collapseWhitespace: true,
    canTrimWhitespace: canCollapseAndTrimWhitespace,
    canCollapseWhitespace: canCollapseAndTrimWhitespace
  }), output);

  // Make sure that the stack does get reset when leaving the element for which
  // the hooks returned false:
  input = '<div class="leaveAlone"></div><div> foo  bar </div>';
  output = '<div class="leaveAlone"></div><div>foo bar</div>';

  assert.equal(minify(input, {
    collapseWhitespace: true,
    canTrimWhitespace: canCollapseAndTrimWhitespace,
    canCollapseWhitespace: canCollapseAndTrimWhitespace
  }), output);
});

QUnit.test('minify Content-Security-Policy', function(assert) {
  var input, output;

  input = '<meta Http-Equiv="Content-Security-Policy"\t\t\t\tContent="default-src \'self\';\n\n\t\timg-src https://*;">';
  output = '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; img-src https://*;">';
  assert.equal(minify(input), output);

  input = '<meta http-equiv="content-security-policy"\t\t\t\tcontent="default-src \'self\';\n\n\t\timg-src https://*;">';
  output = '<meta http-equiv="content-security-policy" content="default-src \'self\'; img-src https://*;">';
  assert.equal(minify(input), output);

  input = '<meta http-equiv="content-security-policy" content="default-src \'self\'; img-src https://*;">';
  assert.equal(minify(input), input);
});
