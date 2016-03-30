 /* global minify */
'use strict';

if (typeof minify === 'undefined') {
  self.minify = require('html-minifier').minify;
}
var input, output;

test('`minifiy` exists', function() {
  ok(minify);
});

test('parsing non-trivial markup', function() {
  equal(minify('</td>'), '');
  equal(minify('</p>'), '<p></p>');
  equal(minify('</br>'), '<br>');
  equal(minify('<br>x</br>'), '<br>x<br>');
  equal(minify('<p title="</p>">x</p>'), '<p title="</p>">x</p>');
  equal(minify('<p title=" <!-- hello world --> ">x</p>'), '<p title=" <!-- hello world --> ">x</p>');
  equal(minify('<p title=" <![CDATA[ \n\n foobar baz ]]> ">x</p>'), '<p title=" <![CDATA[ \n\n foobar baz ]]> ">x</p>');
  equal(minify('<p foo-bar=baz>xxx</p>'), '<p foo-bar="baz">xxx</p>');
  equal(minify('<p foo:bar=baz>xxx</p>'), '<p foo:bar="baz">xxx</p>');
  equal(minify('<p foo.bar=baz>xxx</p>'), '<p foo.bar="baz">xxx</p>');

  input = '<div><div><div><div><div><div><div><div><div><div>' +
                'i\'m 10 levels deep' +
              '</div></div></div></div></div></div></div></div></div></div>';

  equal(minify(input), input);

  equal(minify('<script>alert(\'<!--\')<\/script>'), '<script>alert(\'<!--\')<\/script>');
  equal(minify('<script>alert(\'<!-- foo -->\')<\/script>'), '<script>alert(\'<!-- foo -->\')<\/script>');
  equal(minify('<script>alert(\'-->\')<\/script>'), '<script>alert(\'-->\')<\/script>');

  equal(minify('<a title="x"href=" ">foo</a>'), '<a title="x" href="">foo</a>');
  equal(minify('<p id=""class=""title="">x'), '<p id="" class="" title="">x</p>');
  equal(minify('<p x="x\'"">x</p>'), '<p x="x\'">x</p>', 'trailing quote should be ignored');
  equal(minify('<a href="#"><p>Click me</p></a>'), '<a href="#"><p>Click me</p></a>');
  equal(minify('<span><button>Hit me</button></span>'), '<span><button>Hit me</button></span>');
  equal(minify('<object type="image/svg+xml" data="image.svg"><div>[fallback image]</div></object>'),
    '<object type="image/svg+xml" data="image.svg"><div>[fallback image]</div></object>'
  );

  equal(minify('<ng-include src="x"></ng-include>'), '<ng-include src="x"></ng-include>');
  equal(minify('<ng:include src="x"></ng:include>'), '<ng:include src="x"></ng:include>');
  equal(minify('<ng-include src="\'views/partial-notification.html\'"></ng-include><div ng-view=""></div>'),
    '<ng-include src="\'views/partial-notification.html\'"></ng-include><div ng-view=""></div>'
  );

  // will cause test to time-out if fail
  input = '<p>For more information, read <a href=https://stackoverflow.com/questions/17408815/fieldset-resizes-wrong-appears-to-have-unremovable-min-width-min-content/17863685#17863685>this Stack Overflow answer</a>.</p>';
  output = '<p>For more information, read <a href="https://stackoverflow.com/questions/17408815/fieldset-resizes-wrong-appears-to-have-unremovable-min-width-min-content/17863685#17863685">this Stack Overflow answer</a>.</p>';
  equal(minify(input), output);

  input = '<html ⚡></html>';
  equal(minify(input), input);

  input = '<h:ællæ></h:ællæ>';
  equal(minify(input), input);

  input = '<$unicorn>';
  throws(function() {
    minify(input);
  }, 'Invalid tag name');

  input = '<begriffs.pagination ng-init="perPage=20" collection="logs" url="\'/api/logs?user=-1\'" per-page="perPage" per-page-presets="[10,20,50,100]" template-url="/assets/paginate-anything.html"></begriffs.pagination>';
  equal(minify(input), input);

  // https://github.com/kangax/html-minifier/issues/41
  equal(minify('<some-tag-1></some-tag-1><some-tag-2></some-tag-2>'),
    '<some-tag-1></some-tag-1><some-tag-2></some-tag-2>'
  );

  // https://github.com/kangax/html-minifier/issues/40
  equal(minify('[\']["]'), '[\']["]');

  // https://github.com/kangax/html-minifier/issues/21
  equal(minify('<a href="test.html"><div>hey</div></a>'), '<a href="test.html"><div>hey</div></a>');

  // https://github.com/kangax/html-minifier/issues/17
  equal(minify(':) <a href="http://example.com">link</a>'), ':) <a href="http://example.com">link</a>');

  // https://github.com/kangax/html-minifier/issues/169
  equal(minify('<a href>ok</a>'), '<a href>ok</a>');

  equal(minify('<a onclick></a>'), '<a onclick></a>');

  // https://github.com/kangax/html-minifier/issues/229
  equal(minify('<CUSTOM-TAG></CUSTOM-TAG><div>Hello :)</div>'), '<custom-tag></custom-tag><div>Hello :)</div>');

  // https://github.com/kangax/html-minifier/issues/507
  input = '<tag v-ref:vm_pv :imgs=" objpicsurl_ "></tag>';
  equal(minify(input), input);
  throws(function() {
    minify('<tag v-ref:vm_pv :imgs=" objpicsurl_ " ss"123></tag>');
  }, 'invalid attribute name');

  // https://github.com/kangax/html-minifier/issues/512
  input = '<input class="form-control" type="text" style="" id="{{vm.formInputName}}" name="{{vm.formInputName}}"'
    + ' placeholder="YYYY-MM-DD"'
    + ' date-range-picker'
    + ' data-ng-model="vm.value"'
    + ' data-ng-model-options="{ debounce: 1000 }"'
    + ' data-ng-pattern="vm.options.format"'
    + ' data-options="vm.datepickerOptions">';
  equal(minify(input), input);
  throws(function() {
    minify(
      '<input class="form-control" type="text" style="" id="{{vm.formInputName}}" name="{{vm.formInputName}}"'
      + ' <!--FIXME hardcoded placeholder - dates may not be used for service required fields yet. -->'
      + ' placeholder="YYYY-MM-DD"'
      + ' date-range-picker'
      + ' data-ng-model="vm.value"'
      + ' data-ng-model-options="{ debounce: 1000 }"'
      + ' data-ng-pattern="vm.options.format"'
      + ' data-options="vm.datepickerOptions">'
    );
  }, 'HTML comment inside tag');
});

test('options', function() {
  input = '<p>blah<span>blah 2<span>blah 3</span></span></p>';
  equal(minify(input), input);
  equal(minify(input, {}), input);
});

test('case normalization', function() {
  equal(minify('<P>foo</p>'), '<p>foo</p>');
  equal(minify('<DIV>boo</DIV>'), '<div>boo</div>');
  equal(minify('<DIV title="moo">boo</DiV>'), '<div title="moo">boo</div>');
  equal(minify('<DIV TITLE="blah">boo</DIV>'), '<div title="blah">boo</div>');
  equal(minify('<DIV tItLe="blah">boo</DIV>'), '<div title="blah">boo</div>');
  equal(minify('<DiV tItLe="blah">boo</DIV>'), '<div title="blah">boo</div>');
});

test('space normalization between attributes', function() {
  equal(minify('<p title="bar">foo</p>'), '<p title="bar">foo</p>');
  equal(minify('<img src="test"/>'), '<img src="test">');
  equal(minify('<p title = "bar">foo</p>'), '<p title="bar">foo</p>');
  equal(minify('<p title\n\n\t  =\n     "bar">foo</p>'), '<p title="bar">foo</p>');
  equal(minify('<img src="test" \n\t />'), '<img src="test">');
  equal(minify('<input title="bar"       id="boo"    value="hello world">'), '<input title="bar" id="boo" value="hello world">');
});

test('space normalization around text', function() {
  input = '   <p>blah</p>\n\n\n   ';
  equal(minify(input), input);
  output = '<p>blah</p>';
  equal(minify(input, { collapseWhitespace: true }), output);
  // tags from collapseWhitespaceSmart()
  [
    'a', 'abbr', 'acronym', 'b', 'big', 'del', 'em', 'font', 'i', 'ins', 'kbd',
    'mark', 's', 'samp', 'small', 'span', 'strike', 'strong', 'sub', 'sup',
    'time', 'tt', 'u', 'var'
  ].forEach(function(el) {
    equal(minify('<div>foo <' + el + '>baz</' + el + '> bar</div>', { collapseWhitespace: true }), '<div>foo <' + el + '>baz</' + el + '> bar</div>');
    equal(minify('<div>foo<' + el + '>baz</' + el + '>bar</div>', { collapseWhitespace: true }), '<div>foo<' + el + '>baz</' + el + '>bar</div>');
    equal(minify('<div>foo <' + el + '>baz</' + el + '>bar</div>', { collapseWhitespace: true }), '<div>foo <' + el + '>baz</' + el + '>bar</div>');
    equal(minify('<div>foo<' + el + '>baz</' + el + '> bar</div>', { collapseWhitespace: true }), '<div>foo<' + el + '>baz</' + el + '> bar</div>');
    equal(minify('<div>foo <' + el + '> baz </' + el + '> bar</div>', { collapseWhitespace: true }), '<div>foo <' + el + '>baz </' + el + '>bar</div>');
    equal(minify('<div>foo<' + el + '> baz </' + el + '>bar</div>', { collapseWhitespace: true }), '<div>foo<' + el + '> baz </' + el + '>bar</div>');
    equal(minify('<div>foo <' + el + '> baz </' + el + '>bar</div>', { collapseWhitespace: true }), '<div>foo <' + el + '>baz </' + el + '>bar</div>');
    equal(minify('<div>foo<' + el + '> baz </' + el + '> bar</div>', { collapseWhitespace: true }), '<div>foo<' + el + '> baz </' + el + '>bar</div>');
  });
  [
    'bdi', 'bdo', 'button', 'cite', 'code', 'dfn', 'math', 'q', 'rt', 'rp', 'svg'
  ].forEach(function(el) {
    equal(minify('<div>foo <' + el + '>baz</' + el + '> bar</div>', { collapseWhitespace: true }), '<div>foo <' + el + '>baz</' + el + '> bar</div>');
    equal(minify('<div>foo<' + el + '>baz</' + el + '>bar</div>', { collapseWhitespace: true }), '<div>foo<' + el + '>baz</' + el + '>bar</div>');
    equal(minify('<div>foo <' + el + '>baz</' + el + '>bar</div>', { collapseWhitespace: true }), '<div>foo <' + el + '>baz</' + el + '>bar</div>');
    equal(minify('<div>foo<' + el + '>baz</' + el + '> bar</div>', { collapseWhitespace: true }), '<div>foo<' + el + '>baz</' + el + '> bar</div>');
    equal(minify('<div>foo <' + el + '> baz </' + el + '> bar</div>', { collapseWhitespace: true }), '<div>foo <' + el + '>baz</' + el + '> bar</div>');
    equal(minify('<div>foo<' + el + '> baz </' + el + '>bar</div>', { collapseWhitespace: true }), '<div>foo<' + el + '>baz</' + el + '>bar</div>');
    equal(minify('<div>foo <' + el + '> baz </' + el + '>bar</div>', { collapseWhitespace: true }), '<div>foo <' + el + '>baz</' + el + '>bar</div>');
    equal(minify('<div>foo<' + el + '> baz </' + el + '> bar</div>', { collapseWhitespace: true }), '<div>foo<' + el + '>baz</' + el + '> bar</div>');
  });
  equal(minify('<p>foo <img> bar</p>', { collapseWhitespace: true }), '<p>foo <img> bar</p>');
  equal(minify('<p>foo<img>bar</p>', { collapseWhitespace: true }), '<p>foo<img>bar</p>');
  equal(minify('<p>foo <img>bar</p>', { collapseWhitespace: true }), '<p>foo <img>bar</p>');
  equal(minify('<p>foo<img> bar</p>', { collapseWhitespace: true }), '<p>foo<img> bar</p>');
  equal(minify('<p>  <a href="#">  <code>foo</code></a> bar</p>', { collapseWhitespace: true }), '<p><a href="#"><code>foo</code></a> bar</p>');
  equal(minify('<p><a href="#"><code>foo  </code></a> bar</p>', { collapseWhitespace: true }), '<p><a href="#"><code>foo</code></a> bar</p>');
  equal(minify('<p>  <a href="#">  <code>   foo</code></a> bar   </p>', { collapseWhitespace: true }), '<p><a href="#"><code>foo</code></a> bar</p>');
  equal(minify('<div> Empty <!-- or --> not </div>', { collapseWhitespace: true }), '<div>Empty<!-- or --> not</div>');
  equal(minify('<div> a <input><!-- b --> c </div>', { removeComments: true, collapseWhitespace: true }), '<div>a <input> c</div>');
  [
    '  a  <? b ?>  c  ',
    '<!-- d -->  a  <? b ?>  c  ',
    '  <!-- d -->a  <? b ?>  c  ',
    '  a<!-- d -->  <? b ?>  c  ',
    '  a  <!-- d --><? b ?>  c  ',
    '  a  <? b ?><!-- d -->  c  ',
    '  a  <? b ?>  <!-- d -->c  ',
    '  a  <? b ?>  c<!-- d -->  ',
    '  a  <? b ?>  c  <!-- d -->'
  ].forEach(function(input, index) {
    input = input.replace(/b/, 'b' + index);
    equal(minify(input, { removeComments: true, collapseWhitespace: true }), 'a <? b' + index + ' ?> c');
    equal(minify('<p>' + input + '</p>', { removeComments: true, collapseWhitespace: true }), '<p>a <? b' + index + ' ?> c</p>');
  });
  input = '<li><i></i> <b></b> foo</li>';
  output = '<li><i></i> <b></b> foo</li>';
  equal(minify(input, { collapseWhitespace: true }), output);
  input = '<li><i> </i> <b></b> foo</li>';
  equal(minify(input, { collapseWhitespace: true }), output);
  input = '<li> <i></i> <b></b> foo</li>';
  equal(minify(input, { collapseWhitespace: true }), output);
  input = '<li><i></i> <b> </b> foo</li>';
  equal(minify(input, { collapseWhitespace: true }), output);
  input = '<li> <i> </i> <b> </b> foo</li>';
  equal(minify(input, { collapseWhitespace: true }), output);
  input = '<div> <a href="#"> <span> <b> foo </b> <i> bar </i> </span> </a> </div>';
  output = '<div><a href="#"><span><b>foo </b><i>bar</i></span></a></div>';
  equal(minify(input, { collapseWhitespace: true }), output);
  input = '<head> <!-- a --> <!-- b --><link> </head>';
  output = '<head><!-- a --><!-- b --><link></head>';
  equal(minify(input, { collapseWhitespace: true }), output);
  input = '<head> <!-- a --> <!-- b --> <!-- c --><link> </head>';
  output = '<head><!-- a --><!-- b --><!-- c --><link></head>';
  equal(minify(input, { collapseWhitespace: true }), output);
});

test('doctype normalization', function() {
  input = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN"\n    "http://www.w3.org/TR/html4/strict.dtd">';
  equal(minify(input, { useShortDoctype: true }), '<!DOCTYPE html>');

  input = '<!DOCTYPE html>';
  equal(minify(input, { useShortDoctype: true }), input);

  input = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">';
  equal(minify(input, { useShortDoctype: false }), input);
});

test('removing comments', function() {
  input = '<!-- test -->';
  equal(minify(input, { removeComments: true }), '');

  input = '<!-- foo --><div>baz</div><!-- bar\n\n moo -->';
  equal(minify(input, { removeComments: true }), '<div>baz</div>');
  equal(minify(input, { removeComments: false }), input);

  input = '<p title="<!-- comment in attribute -->">foo</p>';
  equal(minify(input, { removeComments: true }), input);

  input = '<script><!-- alert(1) --><\/script>';
  equal(minify(input, { removeComments: true }), input);

  input = '<STYLE><!-- alert(1) --><\/STYLE>';
  equal(minify(input, { removeComments: true }), '<style><!-- alert(1) --><\/style>');
});

test('ignoring comments', function() {
  input = '<!--! test -->';
  equal(minify(input, { removeComments: true }), input);
  equal(minify(input, { removeComments: false }), input);

  input = '<!--! foo --><div>baz</div><!--! bar\n\n moo -->';
  equal(minify(input, { removeComments: true }), input);
  equal(minify(input, { removeComments: false }), input);

  input = '<!--! foo --><div>baz</div><!-- bar\n\n moo -->';
  equal(minify(input, { removeComments: true }), '<!--! foo --><div>baz</div>');
  equal(minify(input, { removeComments: false }), input);

  input = '<!-- ! test -->';
  equal(minify(input, { removeComments: true }), '');
  equal(minify(input, { removeComments: false }), input);

  input = '<div>\n\n   \t<div><div>\n\n<p>\n\n<!--!      \t\n\nbar\n\n moo         -->      \n\n</p>\n\n        </div>  </div></div>';
  output = '<div><div><div><p><!--!      \t\n\nbar\n\n moo         --></p></div></div></div>';
  equal(minify(input, { removeComments: true }), input);
  equal(minify(input, { removeComments: true, collapseWhitespace: true }), output);
  equal(minify(input, { removeComments: false }), input);
  equal(minify(input, { removeComments: false, collapseWhitespace: true }), output);

  input = '<p rel="<!-- comment in attribute -->" title="<!--! ignored comment in attribute -->">foo</p>';
  equal(minify(input, { removeComments: true }), input);
});

test('conditional comments', function() {
  input = '<![if IE 5]>test<![endif]>';
  equal(minify(input, { removeComments: true }), input);

  input = '<!--[if IE 6]>test<![endif]-->';
  equal(minify(input, { removeComments: true }), input);

  input = '<!--[if IE 7]>-->test<!--<![endif]-->';
  equal(minify(input, { removeComments: true }), input);

  input = '<!--[if IE 8]><!-->test<!--<![endif]-->';
  equal(minify(input, { removeComments: true }), input);

  input = '<!--[if lt IE 5.5]>test<![endif]-->';
  equal(minify(input, { removeComments: true }), input);

  input = '<!--[if (gt IE 5)&(lt IE 7)]>test<![endif]-->';
  equal(minify(input, { removeComments: true }), input);

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
  equal(minify(input, {
    minifyJS: true,
    removeComments: true,
    collapseWhitespace: true,
    removeOptionalTags: true,
    removeScriptTypeAttributes: true
  }), output);
  output = '<head><!--[if lte IE 8]><script>alert("ie8!")</script><![endif]-->';
  equal(minify(input, {
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
  equal(minify(input, {
    removeComments: true,
    collapseWhitespace: true
  }), output);
  equal(minify(input, {
    removeComments: true,
    collapseWhitespace: true,
    processConditionalComments: true
  }), output);
});

test('collapsing space in conditional comments', function() {
  input = '<!--[if IE 7]>\n\n   \t\n   \t\t ' +
            '<link rel="stylesheet" href="/css/ie7-fixes.css" type="text/css" />\n\t' +
          '<![endif]-->';
  equal(minify(input, { removeComments: true }), input);
  equal(minify(input, { removeComments: true, collapseWhitespace: true }), input);
  output = '<!--[if IE 7]>\n\n   \t\n   \t\t ' +
             '<link rel="stylesheet" href="/css/ie7-fixes.css" type="text/css">\n\t' +
           '<![endif]-->';
  equal(minify(input, { removeComments: true, processConditionalComments: true }), output);
  output = '<!--[if IE 7]>' +
             '<link rel="stylesheet" href="/css/ie7-fixes.css" type="text/css">' +
           '<![endif]-->';
  equal(minify(input, {
    removeComments: true,
    collapseWhitespace: true,
    processConditionalComments: true
  }), output);

  input = '<!--[if lte IE 6]>\n    \n   \n\n\n\t' +
            '<p title=" sigificant     whitespace   ">blah blah</p>' +
          '<![endif]-->';
  equal(minify(input, { removeComments: true }), input);
  equal(minify(input, { removeComments: true, collapseWhitespace: true }), input);
  output = '<!--[if lte IE 6]>' +
             '<p title=" sigificant     whitespace   ">blah blah</p>' +
           '<![endif]-->';
  equal(minify(input, {
    removeComments: true,
    collapseWhitespace: true,
    processConditionalComments: true
  }), output);
});

test('remove comments from scripts', function() {
  input = '<script><!--\nalert(1);\n--><\/script>';
  equal(minify(input), input);
  output = '<script>alert(1)<\/script>';
  equal(minify(input, { minifyJS: true }), output);

  input = '<script><!--alert(2);--><\/script>';
  equal(minify(input), input);
  output = '<script><\/script>';
  equal(minify(input, { minifyJS: true }), output);

  input = '<script><!--alert(3);\n--><\/script>';
  equal(minify(input), input);
  output = '<script><\/script>';
  equal(minify(input, { minifyJS: true }), output);

  input = '<script><!--\nalert(4);--><\/script>';
  equal(minify(input), input);
  equal(minify(input, { minifyJS: true }), input);

  input = '<script><!--alert(5);\nalert(6);\nalert(7);--><\/script>';
  equal(minify(input), input);
  equal(minify(input, { minifyJS: true }), input);

  input = '<script><!--alert(8)<\/script>';
  equal(minify(input), input);
  output = '<script><\/script>';
  equal(minify(input, { minifyJS: true }), output);

  input = '<script type="text/javascript"> \n <!--\nalert("-->"); -->\n\n   <\/script>';
  equal(minify(input), input);
  equal(minify(input, { minifyJS: true }), input);

  input = '<script type="text/javascript"> \n <!--\nalert("-->");\n -->\n\n   <\/script>';
  equal(minify(input), input);
  output = '<script type="text/javascript">alert("--\\x3e")<\/script>';
  equal(minify(input, { minifyJS: true }), output);

  input = '<script> //   <!--   \n  alert(1)   //  --> <\/script>';
  equal(minify(input), input);
  output = '<script>alert(1)<\/script>';
  equal(minify(input, { minifyJS: true }), output);

  input = '<script type="text/html">\n<div>\n</div>\n<!-- aa -->\n<\/script>';
  equal(minify(input), input);
  equal(minify(input, { minifyJS: true }), input);
});

test('remove comments from styles', function() {
  input = '<style><!--\np.a{background:red}\n--></style>';
  equal(minify(input), input);
  output = '<style>p.a{background:red}</style>';
  equal(minify(input, { minifyCSS: true }), output);

  input = '<style><!--p.b{background:red}--></style>';
  equal(minify(input), input);
  output = '<style>p.b{background:red}</style>';
  equal(minify(input, { minifyCSS: true }), output);

  input = '<style><!--p.c{background:red}\n--></style>';
  equal(minify(input), input);
  output = '<style>p.c{background:red}</style>';
  equal(minify(input, { minifyCSS: true }), output);

  input = '<style><!--\np.d{background:red}--></style>';
  equal(minify(input), input);
  output = '<style>p.d{background:red}</style>';
  equal(minify(input, { minifyCSS: true }), output);

  input = '<style><!--p.e{background:red}\np.f{background:red}\np.g{background:red}--></style>';
  equal(minify(input), input);
  output = '<style>p.e{background:red}p.f{background:red}p.g{background:red}</style>';
  equal(minify(input, { minifyCSS: true }), output);

  input = '<style>p.h{background:red}<!--\np.i{background:red}\n-->p.j{background:red}</style>';
  equal(minify(input), input);
  output = '<style>p.h{background:red}<!-- p.i{background:red}-->p.j{background:red}</style>';
  equal(minify(input, { minifyCSS: true }), output);

  input = '<style type="text/css"><!-- p { color: red } --><\/style>';
  equal(minify(input), input);
  output = '<style type="text/css">p{color:red}<\/style>';
  equal(minify(input, { minifyCSS: true }), output);

  input = '<style type="text/css">p::before { content: "<!--" }<\/style>';
  equal(minify(input), input);
  output = '<style type="text/css">p::before{content:"<!--"}<\/style>';
  equal(minify(input, { minifyCSS: true }), output);

  input = '<style type="text/html">\n<div>\n</div>\n<!-- aa -->\n<\/style>';
  equal(minify(input), input);
  equal(minify(input, { minifyCSS: true }), input);
});

test('remove CDATA sections from scripts/styles', function() {
  input = '<script><![CDATA[\nalert(1)\n]]><\/script>';
  equal(minify(input), input);
  equal(minify(input, { minifyJS: true }), input);

  input = '<script><![CDATA[alert(2)]]><\/script>';
  equal(minify(input), input);
  equal(minify(input, { minifyJS: true }), input);

  input = '<script><![CDATA[alert(3)\n]]><\/script>';
  equal(minify(input), input);
  equal(minify(input, { minifyJS: true }), input);

  input = '<script><![CDATA[\nalert(4)]]><\/script>';
  equal(minify(input), input);
  equal(minify(input, { minifyJS: true }), input);

  input = '<script><![CDATA[alert(5)\nalert(6)\nalert(7)]]><\/script>';
  equal(minify(input), input);
  equal(minify(input, { minifyJS: true }), input);

  input = '<script>/*<![CDATA[*/alert(8)/*]]>*/<\/script>';
  equal(minify(input), input);
  output = '<script>alert(8)<\/script>';
  equal(minify(input, { minifyJS: true }), output);

  input = '<script>//<![CDATA[\nalert(9)\n//]]><\/script>';
  equal(minify(input), input);
  output = '<script>alert(9)<\/script>';
  equal(minify(input, { minifyJS: true }), output);

  input = '<script type="text/javascript"> /* \n\t  <![CDATA[  */ alert(10) /*  ]]>  */ \n <\/script>';
  equal(minify(input), input);
  output = '<script type="text/javascript">alert(10)<\/script>';
  equal(minify(input, { minifyJS: true }), output);

  input = '<script>\n\n//<![CDATA[\nalert(11)//]]><\/script>';
  equal(minify(input), input);
  output = '<script>alert(11)<\/script>';
  equal(minify(input, { minifyJS: true }), output);

  input = '<style><![CDATA[\np.a{backgourd:red}\n]]><\/style>';
  equal(minify(input), input);
  output = '<style><![CDATA[ p.a{backgourd:red}\n]]><\/style>';
  equal(minify(input, { minifyCSS: true }), output);

  input = '<style><![CDATA[p.b{backgourd:red}]]><\/style>';
  equal(minify(input), input);
  output = '<style><![CDATA[p.b{backgourd:red}]]><\/style>';
  equal(minify(input, { minifyCSS: true }), output);

  input = '<style><![CDATA[p.c{backgourd:red}\n]]><\/style>';
  equal(minify(input), input);
  output = '<style><![CDATA[p.c{backgourd:red}\n]]><\/style>';
  equal(minify(input, { minifyCSS: true }), output);

  input = '<style><![CDATA[\np.d{backgourd:red}]]><\/style>';
  equal(minify(input), input);
  output = '<style><![CDATA[ p.d{backgourd:red}]]><\/style>';
  equal(minify(input, { minifyCSS: true }), output);

  input = '<style><![CDATA[p.e{backgourd:red}\np.f{backgourd:red}\np.g{backgourd:red}]]><\/style>';
  equal(minify(input), input);
  output = '<style><![CDATA[p.e{backgourd:red}p.f{backgourd:red}p.g{backgourd:red}]]><\/style>';
  equal(minify(input, { minifyCSS: true }), output);

  input = '<style>p.h{backgourd:red}<![CDATA[\np.i{backgourd:red}\n]]>p.j{backgourd:red}<\/style>';
  equal(minify(input), input);
  output = '<style>p.h{backgourd:red}<![CDATA[ p.i{backgourd:red}]]>p.j{backgourd:red}<\/style>';
  equal(minify(input, { minifyCSS: true }), output);

  input = '<style>/* <![CDATA[ */p { color: red } // ]]><\/style>';
  equal(minify(input), input);
  output = '<style>p{color:red} // ]]><\/style>';
  equal(minify(input, { minifyCSS: true }), output);

  input = '<style type="text/html">\n<div>\n</div>\n<![CDATA[ aa ]]>\n<\/style>';
  equal(minify(input), input);
  equal(minify(input, { minifyCSS: true }), input);
});

test('empty attributes', function() {
  input = '<p id="" class="" STYLE=" " title="\n" lang="" dir="">x</p>';
  equal(minify(input, { removeEmptyAttributes: true }), '<p>x</p>');

  input = '<p onclick=""   ondblclick=" " onmousedown="" ONMOUSEUP="" onmouseover=" " onmousemove="" onmouseout="" ' +
          'onkeypress=\n\n  "\n     " onkeydown=\n"" onkeyup\n="">x</p>';
  equal(minify(input, { removeEmptyAttributes: true }), '<p>x</p>');

  input = '<input onfocus="" onblur="" onchange=" " value=" boo ">';
  equal(minify(input, { removeEmptyAttributes: true }), '<input value=" boo ">');

  input = '<input value="" name="foo">';
  equal(minify(input, { removeEmptyAttributes: true }), '<input name="foo">');

  input = '<img src="" alt="">';
  equal(minify(input, { removeEmptyAttributes: true }), '<img src="" alt="">');

  // preserve unrecognized attribute
  // remove recognized attrs with unspecified values
  input = '<div data-foo class id style title lang dir onfocus onblur onchange onclick ondblclick onmousedown onmouseup onmouseover onmousemove onmouseout onkeypress onkeydown onkeyup></div>';
  equal(minify(input, { removeEmptyAttributes: true }), '<div data-foo></div>');
});

test('cleaning class/style attributes', function() {
  input = '<p class=" foo bar  ">foo bar baz</p>';
  equal(minify(input), '<p class="foo bar">foo bar baz</p>');

  input = '<p class=" foo      ">foo bar baz</p>';
  equal(minify(input), '<p class="foo">foo bar baz</p>');
  equal(minify(input, { removeAttributeQuotes: true }), '<p class=foo>foo bar baz</p>');

  input = '<p class="\n  \n foo   \n\n\t  \t\n   ">foo bar baz</p>';
  output = '<p class="foo">foo bar baz</p>';
  equal(minify(input), output);

  input = '<p class="\n  \n foo   \n\n\t  \t\n  class1 class-23 ">foo bar baz</p>';
  output = '<p class="foo class1 class-23">foo bar baz</p>';
  equal(minify(input), output);

  input = '<p style="    color: red; background-color: rgb(100, 75, 200);  "></p>';
  output = '<p style="color: red; background-color: rgb(100, 75, 200)"></p>';
  equal(minify(input), output);

  input = '<p style="font-weight: bold  ; "></p>';
  output = '<p style="font-weight: bold"></p>';
  equal(minify(input), output);
});

test('cleaning URI-based attributes', function() {
  input = '<a href="   http://example.com  ">x</a>';
  output = '<a href="http://example.com">x</a>';
  equal(minify(input), output);

  input = '<a href="  \t\t  \n \t  ">x</a>';
  output = '<a href="">x</a>';
  equal(minify(input), output);

  input = '<img src="   http://example.com  " title="bleh   " longdesc="  http://example.com/longdesc \n\n   \t ">';
  output = '<img src="http://example.com" title="bleh   " longdesc="http://example.com/longdesc">';
  equal(minify(input), output);

  input = '<img src="" usemap="   http://example.com  ">';
  output = '<img src="" usemap="http://example.com">';
  equal(minify(input), output);

  input = '<form action="  somePath/someSubPath/someAction?foo=bar&baz=qux     "></form>';
  output = '<form action="somePath/someSubPath/someAction?foo=bar&baz=qux"></form>';
  equal(minify(input), output);

  input = '<BLOCKQUOTE cite=" \n\n\n http://www.mycom.com/tolkien/twotowers.html     "><P>foobar</P></BLOCKQUOTE>';
  output = '<blockquote cite="http://www.mycom.com/tolkien/twotowers.html"><p>foobar</p></blockquote>';
  equal(minify(input), output);

  input = '<head profile="       http://gmpg.org/xfn/11    "></head>';
  output = '<head profile="http://gmpg.org/xfn/11"></head>';
  equal(minify(input), output);

  input = '<object codebase="   http://example.com  "></object>';
  output = '<object codebase="http://example.com"></object>';
  equal(minify(input), output);

  input = '<span profile="   1, 2, 3  ">foo</span>';
  equal(minify(input), input);

  input = '<div action="  foo-bar-baz ">blah</div>';
  equal(minify(input), input);
});

test('cleaning Number-based attributes', function() {
  input = '<a href="#" tabindex="   1  ">x</a><button tabindex="   2  ">y</button>';
  output = '<a href="#" tabindex="1">x</a><button tabindex="2">y</button>';
  equal(minify(input), output);

  input = '<input value="" maxlength="     5 ">';
  output = '<input value="" maxlength="5">';
  equal(minify(input), output);

  input = '<select size="  10   \t\t "><option>x</option></select>';
  output = '<select size="10"><option>x</option></select>';
  equal(minify(input), output);

  input = '<textarea rows="   20  " cols="  30      "></textarea>';
  output = '<textarea rows="20" cols="30"></textarea>';
  equal(minify(input), output);

  input = '<COLGROUP span="   40  "><COL span="  39 "></COLGROUP>';
  output = '<colgroup span="40"><col span="39"></colgroup>';
  equal(minify(input), output);

  input = '<tr><td colspan="    2   ">x</td><td rowspan="   3 "></td></tr>';
  output = '<tr><td colspan="2">x</td><td rowspan="3"></td></tr>';
  equal(minify(input), output);
});

test('cleaning other attributes', function() {
  input = '<a href="#" onclick="  window.prompt(\'boo\'); " onmouseover=" \n\n alert(123)  \t \n\t  ">blah</a>';
  output = '<a href="#" onclick="window.prompt(\'boo\')" onmouseover="alert(123)">blah</a>';
  equal(minify(input), output);

  input = '<body onload="  foo();   bar() ;  "><p>x</body>';
  output = '<body onload="foo();   bar()"><p>x</p></body>';
  equal(minify(input), output);
});

test('removing redundant attributes (&lt;form method="get" ...>)', function() {
  input = '<form method="get">hello world</form>';
  equal(minify(input, { removeRedundantAttributes: true }), '<form>hello world</form>');

  input = '<form method="post">hello world</form>';
  equal(minify(input, { removeRedundantAttributes: true }), '<form method="post">hello world</form>');
});

test('removing redundant attributes (&lt;input type="text" ...>)', function() {
  input = '<input type="text">';
  equal(minify(input, { removeRedundantAttributes: true }), '<input>');

  input = '<input type="  TEXT  " value="foo">';
  equal(minify(input, { removeRedundantAttributes: true }), '<input value="foo">');

  input = '<input type="checkbox">';
  equal(minify(input, { removeRedundantAttributes: true }), '<input type="checkbox">');
});

test('removing redundant attributes (&lt;a name="..." id="..." ...>)', function() {
  input = '<a id="foo" name="foo">blah</a>';
  equal(minify(input, { removeRedundantAttributes: true }), '<a id="foo">blah</a>');

  input = '<input id="foo" name="foo">';
  equal(minify(input, { removeRedundantAttributes: true }), input);

  input = '<a name="foo">blah</a>';
  equal(minify(input, { removeRedundantAttributes: true }), input);

  input = '<a href="..." name="  bar  " id="bar" >blah</a>';
  equal(minify(input, { removeRedundantAttributes: true }), '<a href="..." id="bar">blah</a>');
});

test('removing redundant attributes (&lt;script src="..." charset="...">)', function() {
  input = '<script type="text/javascript" charset="UTF-8">alert(222);<\/script>';
  output = '<script type="text/javascript">alert(222);<\/script>';
  equal(minify(input, { removeRedundantAttributes: true }), output);

  input = '<script type="text/javascript" src="http://example.com" charset="UTF-8">alert(222);<\/script>';
  equal(minify(input, { removeRedundantAttributes: true }), input);

  input = '<script CHARSET=" ... ">alert(222);<\/script>';
  output = '<script>alert(222);<\/script>';
  equal(minify(input, { removeRedundantAttributes: true }), output);
});

test('removing redundant attributes (&lt;... language="javascript" ...>)', function() {
  input = '<script language="Javascript">x=2,y=4<\/script>';
  equal(minify(input, { removeRedundantAttributes: true }), '<script>x=2,y=4<\/script>');

  input = '<script LANGUAGE = "  javaScript  ">x=2,y=4<\/script>';
  equal(minify(input, { removeRedundantAttributes: true }), '<script>x=2,y=4<\/script>');
});

test('removing redundant attributes (&lt;area shape="rect" ...>)', function() {
  input = '<area shape="rect" coords="696,25,958,47" href="#" title="foo">';
  output = '<area coords="696,25,958,47" href="#" title="foo">';
  equal(minify(input, { removeRedundantAttributes: true }), output);
});

test('removing redundant attributes (&lt;... = "javascript: ..." ...>)', function() {
  input = '<p onclick="javascript:alert(1)">x</p>';
  equal(minify(input), '<p onclick="alert(1)">x</p>');

  input = '<p onclick="javascript:x">x</p>';
  equal(minify(input, { removeAttributeQuotes: true }), '<p onclick=x>x</p>');

  input = '<p onclick=" JavaScript: x">x</p>';
  equal(minify(input), '<p onclick="x">x</p>');

  input = '<p title="javascript:(function() { /* some stuff here */ })()">x</p>';
  equal(minify(input), input);
});

test('removing type="text/javascript" attributes', function() {
  input = '<script type="text/javascript">alert(1)<\/script>';
  output = '<script>alert(1)<\/script>';

  equal(minify(input, { removeScriptTypeAttributes: true }), output);
  equal(minify(input, { removeScriptTypeAttributes: false }), input);

  input = '<SCRIPT TYPE="  text/javascript ">alert(1)<\/script>';
  output = '<script>alert(1)<\/script>';

  equal(minify(input, { removeScriptTypeAttributes: true }), output);

  input = '<script type="application/javascript;version=1.8">alert(1)<\/script>';
  output = '<script type="application/javascript;version=1.8">alert(1)<\/script>';

  equal(minify(input, { removeScriptTypeAttributes: true }), output);

  input = '<script type="text/vbscript">MsgBox("foo bar")<\/script>';
  output = '<script type="text/vbscript">MsgBox("foo bar")<\/script>';

  equal(minify(input, { removeScriptTypeAttributes: true }), output);
});

test('removing type="text/css" attributes', function() {
  input = '<style type="text/css">.foo { color: red }<\/style>';
  output = '<style>.foo { color: red }<\/style>';

  equal(minify(input, { removeStyleLinkTypeAttributes: true }), output);
  equal(minify(input, { removeStyleLinkTypeAttributes: false }), input);

  input = '<STYLE TYPE = "  text/CSS ">body { font-size: 1.75em }<\/style>';
  output = '<style>body { font-size: 1.75em }<\/style>';

  equal(minify(input, { removeStyleLinkTypeAttributes: true }), output);

  input = '<style type="text/plain">.foo { background: green }<\/style>';
  output = '<style type="text/plain">.foo { background: green }<\/style>';

  equal(minify(input, { removeStyleLinkTypeAttributes: true }), output);

  input = '<link rel="stylesheet" type="text/css" href="http://example.com">';
  output = '<link rel="stylesheet" href="http://example.com">';

  equal(minify(input, { removeStyleLinkTypeAttributes: true }), output);

  input = '<link rel="alternate" type="application/atom+xml" href="data.xml">';

  equal(minify(input, { removeStyleLinkTypeAttributes: true }), input);
});

test('removing attribute quotes', function() {
  input = '<p title="blah" class="a23B-foo.bar_baz:qux" id="moo">foo</p>';
  equal(minify(input, { removeAttributeQuotes: true }), '<p title=blah class=a23B-foo.bar_baz:qux id=moo>foo</p>');

  input = '<input value="hello world">';
  equal(minify(input, { removeAttributeQuotes: true }), '<input value="hello world">');

  input = '<a href="#" title="foo#bar">x</a>';
  equal(minify(input, { removeAttributeQuotes: true }), '<a href=# title=foo#bar>x</a>');

  input = '<a href="http://example.com/" title="blah">\nfoo\n\n</a>';
  equal(minify(input, { removeAttributeQuotes: true }), '<a href=http://example.com/ title=blah>\nfoo\n\n</a>');

  input = '<a title="blah" href="http://example.com/">\nfoo\n\n</a>';
  equal(minify(input, { removeAttributeQuotes: true }), '<a title=blah href=http://example.com/ >\nfoo\n\n</a>');

  input = '<a href="http://example.com/" title="">\nfoo\n\n</a>';
  equal(minify(input, { removeAttributeQuotes: true, removeEmptyAttributes: true }), '<a href=http://example.com/ >\nfoo\n\n</a>');

  input = '<p class=foo|bar:baz></p>';
  equal(minify(input, { removeAttributeQuotes: true }), '<p class=foo|bar:baz></p>');
});

test('preserving custom attribute-wrapping markup', function() {
  var customAttrOptions;

  // With a single rule
  customAttrOptions = {
    customAttrSurround: [ [ /\{\{#if\s+\w+\}\}/, /\{\{\/if\}\}/ ] ]
  };

  input = '<input {{#if value}}checked="checked"{{/if}}>';
  equal(minify(input, customAttrOptions), input);

  input = '<input checked="checked">';
  equal(minify(input, customAttrOptions), input);

  // With multiple rules
  customAttrOptions = {
    customAttrSurround: [
      [ /\{\{#if\s+\w+\}\}/, /\{\{\/if\}\}/ ],
      [ /\{\{#unless\s+\w+\}\}/, /\{\{\/unless\}\}/ ]
    ]
  };

  input = '<input {{#if value}}checked="checked"{{/if}}>';
  equal(minify(input, customAttrOptions), input);

  input = '<input {{#unless value}}checked="checked"{{/unless}}>';
  equal(minify(input, customAttrOptions), input);

  input = '<input {{#if value1}}data-attr="example" {{/if}}{{#unless value2}}checked="checked"{{/unless}}>';
  equal(minify(input, customAttrOptions), input);

  input = '<input checked="checked">';
  equal(minify(input, customAttrOptions), input);

  // With multiple rules and richer options
  customAttrOptions = {
    customAttrSurround: [
      [ /\{\{#if\s+\w+\}\}/, /\{\{\/if\}\}/ ],
      [ /\{\{#unless\s+\w+\}\}/, /\{\{\/unless\}\}/ ]
    ],
    collapseBooleanAttributes: true,
    removeAttributeQuotes: true
  };

  input = '<input {{#if value}}checked="checked"{{/if}}>';
  equal(minify(input, customAttrOptions), '<input {{#if value}}checked{{/if}}>');

  input = '<input {{#if value1}}checked="checked"{{/if}} {{#if value2}}data-attr="foo"{{/if}}/>';
  equal(minify(input, customAttrOptions), '<input {{#if value1}}checked {{/if}}{{#if value2}}data-attr=foo{{/if}}>');

  customAttrOptions.keepClosingSlash = true;
  equal(minify(input, customAttrOptions), '<input {{#if value1}}checked {{/if}}{{#if value2}}data-attr=foo {{/if}}/>');
});

test('preserving custom attribute-joining markup', function() {
  var polymerConditionalAttributeJoin = /\?=/;
  var customAttrOptions = {
    customAttrAssign: [ polymerConditionalAttributeJoin ]
  };

  input = '<div flex?="{{mode != cover}}"></div>';

  equal(minify(input, customAttrOptions), input);

  input = '<div flex?="{{mode != cover}}" class="foo"></div>';

  equal(minify(input, customAttrOptions), input);
});

test('collapsing whitespace', function() {
  input = '<script type="text/javascript">  \n\t   alert(1) \n\n\n  \t <\/script>';
  output = '<script type="text/javascript">alert(1)<\/script>';
  equal(minify(input, { collapseWhitespace: true }), output);

  input = '<p>foo</p>    <p> bar</p>\n\n   \n\t\t  <div title="quz">baz  </div>';
  output = '<p>foo</p><p>bar</p><div title="quz">baz</div>';
  equal(minify(input, { collapseWhitespace: true }), output);

  input = '<p> foo    bar</p>';
  output = '<p>foo bar</p>';
  equal(minify(input, { collapseWhitespace: true }), output);

  input = '<p>foo\nbar</p>';
  output = '<p>foo bar</p>';
  equal(minify(input, { collapseWhitespace: true }), output);

  input = '<p> foo    <span>  blah     <i>   22</i>    </span> bar <img src=""></p>';
  output = '<p>foo <span>blah <i>22</i> </span>bar <img src=""></p>';
  equal(minify(input, { collapseWhitespace: true }), output);

  input = '<textarea> foo bar     baz \n\n   x \t    y </textarea>';
  output = '<textarea> foo bar     baz \n\n   x \t    y </textarea>';
  equal(minify(input, { collapseWhitespace: true }), output);

  input = '<div><textarea></textarea>    </div>';
  output = '<div><textarea></textarea></div>';
  equal(minify(input, { collapseWhitespace: true }), output);

  input = '<div><pRe> $foo = "baz"; </pRe>    </div>';
  output = '<div><pre> $foo = "baz"; </pre></div>';
  equal(minify(input, { collapseWhitespace: true }), output);
  output = '<div><pRe>$foo = "baz";</pRe></div>';
  equal(minify(input, { collapseWhitespace: true, caseSensitive: true }), output);

  input = '<script type=\"text\/javascript\">var = \"hello\";<\/script>\r\n\r\n\r\n' +
          '<style type=\"text\/css\">#foo { color: red;        }          <\/style>\r\n\r\n\r\n' +
          '<div>\r\n  <div>\r\n    <div><!-- hello -->\r\n      <div>' +
          '<!--! hello -->\r\n        <div>\r\n          <div class=\"\">\r\n\r\n            ' +
          '<textarea disabled=\"disabled\">     this is a textarea <\/textarea>\r\n          ' +
          '<\/div>\r\n        <\/div>\r\n      <\/div>\r\n    <\/div>\r\n  <\/div>\r\n<\/div>' +
          '<pre>       \r\nxxxx<\/pre><span>x<\/span> <span>Hello<\/span> <b>billy<\/b>     \r\n' +
          '<input type=\"text\">\r\n<textarea><\/textarea>\r\n<pre><\/pre>';
  output = '<script type="text/javascript">var = "hello";</script>' +
           '<style type="text/css">#foo { color: red;        }</style>'+
           '<div><div><div>' +
           '<!-- hello --><div><!--! hello --><div><div class="">' +
           '<textarea disabled="disabled">     this is a textarea </textarea>' +
           '</div></div></div></div></div></div>' +
           '<pre>       \r\nxxxx</pre><span>x</span> <span>Hello</span> <b>billy</b> ' +
           '<input type="text"><textarea></textarea><pre></pre>';
  equal(minify(input, { collapseWhitespace: true }), output);

  input = '<pre title="some title...">   hello     world </pre>';
  output = '<pre title="some title...">   hello     world </pre>';
  equal(minify(input, { collapseWhitespace: true }), output);

  input = '<pre title="some title..."><code>   hello     world </code></pre>';
  output = '<pre title="some title..."><code>   hello     world </code></pre>';
  equal(minify(input, { collapseWhitespace: true }), output);

  input = '<script>alert("foo     bar")    <\/script>';
  output = '<script>alert("foo     bar")<\/script>';
  equal(minify(input, { collapseWhitespace: true }), output);

  input = '<style>alert("foo     bar")    <\/style>';
  output = '<style>alert("foo     bar")<\/style>';
  equal(minify(input, { collapseWhitespace: true }), output);
});

test('removing empty elements', function() {
  equal(minify('<p>x</p>', { removeEmptyElements: true }), '<p>x</p>');
  equal(minify('<p></p>', { removeEmptyElements: true }), '');

  input = '<p>foo<span>bar</span><span></span></p>';
  output = '<p>foo<span>bar</span></p>';
  equal(minify(input, { removeEmptyElements: true }), output);

  input = '<a href="http://example/com" title="hello world"></a>';
  output = '';
  equal(minify(input, { removeEmptyElements: true }), output);

  input = '<iframe></iframe>';
  output = '';
  equal(minify(input, { removeEmptyElements: true }), output);

  input = '<iframe src="page.html"></iframe>';
  equal(minify(input, { removeEmptyElements: true }), input);

  input = '<iframe srcdoc="<h1>Foo</h1>"></iframe>';
  equal(minify(input, { removeEmptyElements: true }), input);

  input = '<video></video>';
  output = '';
  equal(minify(input, { removeEmptyElements: true }), output);

  input = '<video src="preview.ogg"></video>';
  equal(minify(input, { removeEmptyElements: true }), input);

  input = '<audio autoplay></audio>';
  output = '';
  equal(minify(input, { removeEmptyElements: true }), output);

  input = '<audio src="startup.mp3" autoplay></audio>';
  equal(minify(input, { removeEmptyElements: true }), input);

  input = '<object type="application/x-shockwave-flash"></object>';
  output = '';
  equal(minify(input, { removeEmptyElements: true }), output);

  input = '<object data="game.swf" type="application/x-shockwave-flash"></object>';
  equal(minify(input, { removeEmptyElements: true }), input);

  input = '<applet archive="game.zip" width="250" height="150"></applet>';
  output = '';
  equal(minify(input, { removeEmptyElements: true }), output);

  input = '<applet code="game.class" archive="game.zip" width="250" height="150"></applet>';
  equal(minify(input, { removeEmptyElements: true }), input);

  input = '<textarea cols="10" rows="10"></textarea>';
  equal(minify(input, { removeEmptyElements: true }), input);

  input = '<div>hello<span>world</span></div>';
  equal(minify(input, { removeEmptyElements: true }), input);

  input = '<p>x<span title="<" class="blah-moo"></span></p>';
  output = '<p>x</p>';
  equal(minify(input, { removeEmptyElements: true }), output);

  input = '<div>x<div>y <div>blah</div><div></div>foo</div>z</div>';
  output = '<div>x<div>y <div>blah</div>foo</div>z</div>';
  equal(minify(input, { removeEmptyElements: true }), output);

  input = '<img src="">';
  equal(minify(input, { removeEmptyElements: true }), input);

  input = '<p><!-- x --></p>';
  output = '';
  equal(minify(input, { removeEmptyElements: true }), output);

  input = '<script src="foo.js"></script>';
  equal(minify(input, { removeEmptyElements: true }), input);
  input = '<script></script>';
  equal(minify(input, { removeEmptyElements: true }), '');

  input = '<div>after<span></span> </div>';
  output = '<div>after </div>';
  equal(minify(input, { removeEmptyElements: true }), output);
  output = '<div>after</div>';
  equal(minify(input, { collapseWhitespace: true, removeEmptyElements: true }), output);

  input = '<div>before <span></span></div>';
  output = '<div>before </div>';
  equal(minify(input, { removeEmptyElements: true }), output);
  output = '<div>before</div>';
  equal(minify(input, { collapseWhitespace: true, removeEmptyElements: true }), output);

  input = '<div>both <span></span> </div>';
  output = '<div>both  </div>';
  equal(minify(input, { removeEmptyElements: true }), output);
  output = '<div>both</div>';
  equal(minify(input, { collapseWhitespace: true, removeEmptyElements: true }), output);

  input = '<div>unary <span></span><link></div>';
  output = '<div>unary <link></div>';
  equal(minify(input, { removeEmptyElements: true }), output);
  output = '<div>unary<link></div>';
  equal(minify(input, { collapseWhitespace: true, removeEmptyElements: true }), output);

  input = '<div>Empty <!-- NOT --> </div>';
  equal(minify(input, { removeEmptyElements: true }), input);
  output = '<div>Empty<!-- NOT --></div>';
  equal(minify(input, { collapseWhitespace: true, removeEmptyElements: true }), output);
});

test('collapsing boolean attributes', function() {
  input = '<input disabled="disabled">';
  equal(minify(input, { collapseBooleanAttributes: true }), '<input disabled>');

  input = '<input CHECKED = "checked" readonly="readonly">';
  equal(minify(input, { collapseBooleanAttributes: true }), '<input checked readonly>');

  input = '<option name="blah" selected="selected">moo</option>';
  equal(minify(input, { collapseBooleanAttributes: true }), '<option name="blah" selected>moo</option>');

  input = '<input autofocus="autofocus">';
  equal(minify(input, { collapseBooleanAttributes: true }), '<input autofocus>');

  input = '<input required="required">';
  equal(minify(input, { collapseBooleanAttributes: true }), '<input required>');

  input = '<input multiple="multiple">';
  equal(minify(input, { collapseBooleanAttributes: true }), '<input multiple>');

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
  equal(minify(input, { collapseBooleanAttributes: true }), output);
  output = '<div Allowfullscreen Async Autofocus Autoplay Checked Compact Controls Declare Default Defaultchecked ' +
    'Defaultmuted Defaultselected Defer Disabled Enabled Formnovalidate Hidden Indeterminate Inert ' +
    'Ismap Itemscope Loop Multiple Muted Nohref Noresize Noshade Novalidate Nowrap Open Pauseonexit Readonly ' +
    'Required Reversed Scoped Seamless Selected Sortable Truespeed Typemustmatch Visible></div>';
  equal(minify(input, { collapseBooleanAttributes: true, caseSensitive: true }), output);
});

test('collapsing enumerated attributes', function() {
  equal(minify('<div draggable="auto"></div>', { collapseBooleanAttributes: true }), '<div draggable></div>');
  equal(minify('<div draggable="true"></div>', { collapseBooleanAttributes: true }), '<div draggable="true"></div>');
  equal(minify('<div draggable="false"></div>', { collapseBooleanAttributes: true }), '<div draggable="false"></div>');
  equal(minify('<div draggable="foo"></div>', { collapseBooleanAttributes: true }), '<div draggable></div>');
  equal(minify('<div draggable></div>', { collapseBooleanAttributes: true }), '<div draggable></div>');
  equal(minify('<div Draggable="auto"></div>', { collapseBooleanAttributes: true }), '<div draggable></div>');
  equal(minify('<div Draggable="true"></div>', { collapseBooleanAttributes: true }), '<div draggable="true"></div>');
  equal(minify('<div Draggable="false"></div>', { collapseBooleanAttributes: true }), '<div draggable="false"></div>');
  equal(minify('<div Draggable="foo"></div>', { collapseBooleanAttributes: true }), '<div draggable></div>');
  equal(minify('<div Draggable></div>', { collapseBooleanAttributes: true }), '<div draggable></div>');
  equal(minify('<div draggable="Auto"></div>', { collapseBooleanAttributes: true }), '<div draggable></div>');
});

test('keeping trailing slashes in tags', function() {
  equal(minify('<img src="test"/>', { keepClosingSlash: true }), '<img src="test"/>');
  // https://github.com/kangax/html-minifier/issues/233
  equal(minify('<img src="test"/>', { keepClosingSlash: true, removeAttributeQuotes: true }), '<img src=test />');
  equal(minify('<img src="test" id=""/>', { keepClosingSlash: true, removeAttributeQuotes: true, removeEmptyAttributes: true }), '<img src=test />');
  equal(minify('<img title="foo" src="test"/>', { keepClosingSlash: true, removeAttributeQuotes: true }), '<img title=foo src=test />');
});

test('removing optional tags', function() {
  input = '<body></body>';
  output = '';
  equal(minify(input, { removeOptionalTags: true }), output);
  equal(minify(input, { removeOptionalTags: true, removeEmptyElements: true }), output);

  input = '<html><head></head><body></body></html>';
  output = '';
  equal(minify(input, { removeOptionalTags: true }), output);
  equal(minify(input, { removeOptionalTags: true, removeEmptyElements: true }), output);

  input = ' <html></html>';
  output = ' ';
  equal(minify(input, { removeOptionalTags: true }), output);
  output = '';
  equal(minify(input, { collapseWhitespace: true, removeOptionalTags: true }), output);

  input = '<html> </html>';
  output = ' ';
  equal(minify(input, { removeOptionalTags: true }), output);
  output = '';
  equal(minify(input, { collapseWhitespace: true, removeOptionalTags: true }), output);

  input = '<html></html> ';
  output = ' ';
  equal(minify(input, { removeOptionalTags: true }), output);
  output = '';
  equal(minify(input, { collapseWhitespace: true, removeOptionalTags: true }), output);

  input = ' <html><body></body></html>';
  output = ' ';
  equal(minify(input, { removeOptionalTags: true }), output);
  output = '';
  equal(minify(input, { collapseWhitespace: true, removeOptionalTags: true }), output);

  input = '<html> <body></body></html>';
  output = ' ';
  equal(minify(input, { removeOptionalTags: true }), output);
  output = '';
  equal(minify(input, { collapseWhitespace: true, removeOptionalTags: true }), output);

  input = '<html><body> </body></html>';
  output = '<body> ';
  equal(minify(input, { removeOptionalTags: true }), output);
  output = '';
  equal(minify(input, { collapseWhitespace: true, removeOptionalTags: true }), output);

  input = '<html><body></body> </html>';
  output = ' ';
  equal(minify(input, { removeOptionalTags: true }), output);
  output = '';
  equal(minify(input, { collapseWhitespace: true, removeOptionalTags: true }), output);

  input = '<html><body></body></html> ';
  output = ' ';
  equal(minify(input, { removeOptionalTags: true }), output);
  output = '';
  equal(minify(input, { collapseWhitespace: true, removeOptionalTags: true }), output);

  input = '<html><head><title>hello</title></head><body><p>foo<span>bar</span></p></body></html>';
  equal(minify(input), input);
  output = '<title>hello</title><p>foo<span>bar</span>';
  equal(minify(input, { removeOptionalTags: true }), output);

  input = '<html lang=""><head><title>hello</title></head><body style=""><p>foo<span>bar</span></p></body></html>';
  output = '<html lang=""><title>hello</title><body style=""><p>foo<span>bar</span>';
  equal(minify(input, { removeOptionalTags: true }), output);
  output = '<title>hello</title><p>foo<span>bar</span>';
  equal(minify(input, { removeOptionalTags: true, removeEmptyAttributes: true }), output);

  input = '<html><head><title>a</title><link href="b.css" rel="stylesheet"/></head><body><a href="c.html"></a><div class="d"><input value="e"/></div></body></html>';
  output = '<title>a</title><link href="b.css" rel="stylesheet"><a href="c.html"></a><div class="d"><input value="e"></div>';
  equal(minify(input, { removeOptionalTags: true }), output);

  input = '<!DOCTYPE html><html><head><title>Blah</title></head><body><div><p>This is some text in a div</p><details>Followed by some details</details></div><div><p>This is some more text in a div</p></div></body></html>';
  output = '<!DOCTYPE html><title>Blah</title><div><p>This is some text in a div<details>Followed by some details</details></div><div><p>This is some more text in a div</div>';
  equal(minify(input, { removeOptionalTags: true }), output);

  input = '<!DOCTYPE html><html><head><title>Blah</title></head><body><noscript><p>This is some text in a noscript</p><details>Followed by some details</details></noscript><noscript><p>This is some more text in a noscript</p></noscript></body></html>';
  output = '<!DOCTYPE html><title>Blah</title><body><noscript><p>This is some text in a noscript<details>Followed by some details</details></noscript><noscript><p>This is some more text in a noscript</p></noscript>';
  equal(minify(input, { removeOptionalTags: true }), output);

  input = '<md-list-item ui-sref=".app-config"><md-icon md-font-icon="mdi-settings"></md-icon><p translate>Configure</p></md-list-item>';
  equal(minify(input, { removeOptionalTags: true }), input);
});

test('removing optional tags in tables', function() {
  input = '<table>' +
            '<thead><tr><th>foo</th><th>bar</th> <th>baz</th></tr></thead> ' +
            '<tbody><tr><td>boo</td><td>moo</td><td>loo</td></tr> </tbody>' +
            '<tfoot><tr><th>baz</th> <th>qux</th><td>boo</td></tr></tfoot>' +
          '</table>';
  equal(minify(input), input);

  output = '<table>' +
             '<thead><tr><th>foo<th>bar</th> <th>baz</thead> ' +
             '<tr><td>boo<td>moo<td>loo</tr> ' +
             '<tfoot><tr><th>baz</th> <th>qux<td>boo' +
           '</table>';
  equal(minify(input, { removeOptionalTags: true }), output);

  output = '<table>' +
             '<thead><tr><th>foo<th>bar<th>baz' +
             '<tbody><tr><td>boo<td>moo<td>loo' +
             '<tfoot><tr><th>baz<th>qux<td>boo' +
           '</table>';
  equal(minify(input, { collapseWhitespace: true, removeOptionalTags: true }), output);

  input = '<table>' +
            '<caption>foo</caption>' +
            '<!-- blah -->' +
            '<colgroup><col span="2"><col></colgroup>' +
            '<!-- blah -->' +
            '<tbody><tr><th>bar</th><td>baz</td><th>qux</th></tr></tbody>' +
          '</table>';
  equal(minify(input), input);

  output = '<table>' +
             '<caption>foo</caption>' +
             '<!-- blah -->' +
             '<col span="2"><col></colgroup>' +
             '<!-- blah -->' +
             '<tr><th>bar<td>baz<th>qux' +
           '</table>';
  equal(minify(input, { removeOptionalTags: true }), output);

  output = '<table>' +
             '<caption>foo' +
             '<col span="2"><col>' +
             '<tr><th>bar<td>baz<th>qux' +
           '</table>';
  equal(minify(input, { removeComments: true, removeOptionalTags: true }), output);

  input = '<table>' +
            '<tbody></tbody>' +
          '</table>';
  equal(minify(input), input);

  output = '<table><tbody></table>';
  equal(minify(input, { removeOptionalTags: true }), output);
});

test('removing optional tags in options', function() {
  input = '<select><option>foo</option><option>bar</option></select>';
  output = '<select><option>foo<option>bar</select>';
  equal(minify(input, { removeOptionalTags: true }), output);

  input = '<select>\n' +
          '  <option>foo</option>\n' +
          '  <option>bar</option>\n' +
          '</select>';
  equal(minify(input, { removeOptionalTags: true }), input);
  output = '<select><option>foo<option>bar</select>';
  equal(minify(input, { removeOptionalTags: true, collapseWhitespace: true }), output);
  output = '<select> <option>foo</option> <option>bar</option> </select>';
  equal(minify(input, { removeOptionalTags: true, collapseWhitespace: true, conservativeCollapse: true }), output);

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

  equal(minify(input, { removeOptionalTags: true }), output);
});

test('custom components', function() {
  input = '<custom-component>Oh, my.</custom-component>';
  output = '<custom-component>Oh, my.</custom-component>';

  equal(minify(input), output);
});

test('HTML4: anchor with block elements', function() {
  input = '<a href="#"><div>Well, look at me! I\'m a div!</div></a>';
  output = '<a href="#"></a><div>Well, look at me! I\'m a div!</div>';

  equal(minify(input, { html5: false }), output);
});

test('HTML5: anchor with block elements', function() {
  input = '<a href="#"><div>Well, look at me! I\'m a div!</div></a>';
  output = '<a href="#"><div>Well, look at me! I\'m a div!</div></a>';

  equal(minify(input, { html5: true }), output);
});

test('HTML5: enabled by default', function() {
  input = '<a href="#"><div>Well, look at me! I\'m a div!</div></a>';

  equal(minify(input, { html5: true }), minify(input));
});

test('phrasing content', function() {
  input = '<p>a<div>b</div>';
  output = '<p>a</p><div>b</div>';
  equal(minify(input, { html5: true }), output);
  output = '<p>a<div>b</div></p>';
  equal(minify(input, { html5: false }), output);

  input = '<label>a<div>b</div>c</label>';
  equal(minify(input, { html5: true }), input);
});

test('phrasing content with Web Components', function() {
  input = '<span><phrasing-element></phrasing-element></span>';
  output = '<span><phrasing-element></phrasing-element></span>';
  equal(minify(input, { html5: true }), output);
});

// https://github.com/kangax/html-minifier/issues/10
test('Ignore custom fragments', function() {
  var reFragments = [ /<\?[^\?]+\?>/, /<%[^%]+%>/, /\{\{[^\}]*\}\}/ ];

  input = 'This is the start. <% ... %>\r\n<%= ... %>\r\n<? ... ?>\r\n<!-- This is the middle, and a comment. -->\r\nNo comment, but middle.\r\n{{ ... }}\r\n<?php ... ?>\r\n<?xml ... ?>\r\nHello, this is the end!';
  output = 'This is the start. <% ... %> <%= ... %> <? ... ?> No comment, but middle. {{ ... }} <?php ... ?> <?xml ... ?> Hello, this is the end!';

  equal(minify(input, {}), input);
  equal(minify(input, { removeComments: true, collapseWhitespace: true }), output);
  equal(minify(input, {
    removeComments: true,
    collapseWhitespace: true,
    ignoreCustomFragments: reFragments
  }), output);

  output = 'This is the start. <% ... %>\n<%= ... %>\n<? ... ?>\nNo comment, but middle. {{ ... }}\n<?php ... ?>\n<?xml ... ?>\nHello, this is the end!';

  equal(minify(input, {
    removeComments: true,
    collapseWhitespace: true,
    preserveLineBreaks: true
  }), output);

  output = 'This is the start. <% ... %>\n<%= ... %>\n<? ... ?>\nNo comment, but middle.\n{{ ... }}\n<?php ... ?>\n<?xml ... ?>\nHello, this is the end!';

  equal(minify(input, {
    removeComments: true,
    collapseWhitespace: true,
    preserveLineBreaks: true,
    ignoreCustomFragments: reFragments
  }), output);

  input = '{{ if foo? }}\r\n  <div class="bar">\r\n    ...\r\n  </div>\r\n{{ end \n}}';
  output = '{{ if foo? }}<div class="bar">...</div>{{ end }}';

  equal(minify(input, {}), input);
  equal(minify(input, { collapseWhitespace: true }), output);
  equal(minify(input, { collapseWhitespace: true, ignoreCustomFragments: [] }), output);

  output = '{{ if foo? }} <div class="bar">...</div> {{ end \n}}';

  equal(minify(input, { collapseWhitespace: true, ignoreCustomFragments: reFragments }), output);

  output = '{{ if foo? }}\n<div class="bar">\n...\n</div>\n{{ end \n}}';

  equal(minify(input, {
    collapseWhitespace: true,
    preserveLineBreaks: true,
    ignoreCustomFragments: reFragments
  }), output);

  input = '<a class="<% if foo? %>bar<% end %> {{ ... }}"></a>';
  equal(minify(input, {}), input);
  equal(minify(input, { ignoreCustomFragments: reFragments }), input);

  input = '<img src="{% static "images/logo.png" %}">';
  output = '<img src="{% static "images/logo.png" %}">';

  equal(minify(input, { ignoreCustomFragments: [ (/\{\%[^\%]*?\%\}/g) ] }), output);

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
  equal(minify(input, {
    ignoreCustomFragments: [
      /\{\%[\s\S]*?\%\}/g,
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
  equal(minify(input, {
    ignoreCustomFragments: [
      /\{\%[\s\S]*?\%\}/g,
      /\{\{[\s\S]*?\}\}/g
    ],
    quoteCharacter: '\'',
    collapseWhitespace: true
  }), output);

  input = '<a href="/legal.htm"<?php echo e(Request::path() == \'/\' ? \' rel="nofollow"\':\'\'); ?>>Legal Notices</a>';
  equal(minify(input, {
    ignoreCustomFragments: [
      /<\?php[\s\S]*?\?>/g
    ]
  }), input);

  input = '<input type="checkbox"<%= (model.isChecked ? \'checked="checked"\' : \'\') %>>';
  equal(minify(input, {
    ignoreCustomFragments: [
      /<\%=[\s\S]*?%>/g
    ]
  }), input);

  input = '<div' +
            '{{IF text}}' +
            'data-yashareDescription="{{shorted(text, 300)}}"' +
            '{{END IF}}></div>';
  equal(minify(input, {
    ignoreCustomFragments: [
      /\{\{[\s\S]*?\}\}/g
    ],
    caseSensitive: true
  }), input);

  input = '<img class="{% foo %} {% bar %}">';
  equal(minify(input, {
    ignoreCustomFragments: [
      /\{\%[^\%]*?\%\}/g
    ]
  }), input);

  input = '<img class="titi.<%=tsItem_[0]%>">';
  equal(minify(input), input);
  equal(minify(input, {
    collapseWhitespace: true
  }), input);

  input = '<table id="<?php echo $this->escapeHtmlAttr($this->table_id); ?>"></table>';
  equal(minify(input), input);
  equal(minify(input, {
    collapseWhitespace: true
  }), input);

  input = '<!--{{comment}}-->{{if a}}<div>b</div>{{/if}}';
  equal(minify(input), input);
  output = '{{if a}}<div>b</div>{{/if}}';
  equal(minify(input, {
    removeComments: true,
    ignoreCustomFragments: [
      /\{\{.*?\}\}/g
    ]
  }), output);
});

test('bootstrap\'s span > button > span', function() {
  input = '<span class="input-group-btn">' +
    '\n  <button class="btn btn-default" type="button">' +
      '\n    <span class="glyphicon glyphicon-search"></span>' +
    '\n  </button>' +
  '</span>';

  output = '<span class=input-group-btn><button class="btn btn-default" type=button><span class="glyphicon glyphicon-search"></span></button></span>';

  equal(minify(input, { collapseWhitespace: true, removeAttributeQuotes: true }), output);
});

test('caseSensitive', function() {
  input = '<div mixedCaseAttribute="value"></div>';

  var caseSensitiveOutput = '<div mixedCaseAttribute="value"></div>';
  var caseInSensitiveOutput = '<div mixedcaseattribute="value"></div>';

  equal(minify(input), caseInSensitiveOutput);
  equal(minify(input, { caseSensitive: true }), caseSensitiveOutput);
});

test('source & track', function() {
  input = '<audio controls="controls">' +
            '<source src="foo.wav">' +
            '<source src="far.wav">' +
            '<source src="foobar.wav">' +
            '<track kind="captions" src="sampleCaptions.vtt" srclang="en">' +
          '</audio>';
  equal(minify(input), input);
  equal(minify(input, { removeOptionalTags: true }), input);
});

test('mixed html and svg', function() {
  input = '<html><body>\n' +
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

  output = '<html><body>' +
    '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="612px" height="502.174px" viewBox="0 65.326 612 502.174" enable-background="new 0 65.326 612 502.174" xml:space="preserve" class="logo">' +
    '<ellipse class="ground" cx="283.5" cy="487.5" rx="259" ry="80"/>' +
    '<polygon points="100,10 40,198 190,78 10,78 160,198" style="fill:lime;stroke:purple;stroke-width:5;fill-rule:evenodd"/>' +
    '<filter id="pictureFilter"><feGaussianBlur stdDeviation="15"/></filter>' +
    '</svg>' +
    '</body></html>';

  // Should preserve case-sensitivity and closing slashes within svg tags
  equal(minify(input, { collapseWhitespace: true }), output);
});

test('nested quotes', function() {
  input = '<div data=\'{"test":"\\"test\\""}\'></div>';
  equal(minify(input), input);
  equal(minify(input, { quoteCharacter: '\'' }), input);

  output = '<div data="{&#34;test&#34;:&#34;\\&#34;test\\&#34;&#34;}"></div>';
  equal(minify(input, { quoteCharacter: '"' }), output);
});

test('script minification', function() {
  input = '<script></script>(function(){ var foo = 1; var bar = 2; alert(foo + " " + bar); })()';

  equal(minify(input, { minifyJS: true }), input);

  input = '<script>(function(){ var foo = 1; var bar = 2; alert(foo + " " + bar); })()</script>';
  output = '<script>!function(){var a=1,n=2;alert(a+" "+n)}()</script>';

  equal(minify(input, { minifyJS: true }), output);

  input = '<script type="text/JavaScript">(function(){ var foo = 1; var bar = 2; alert(foo + " " + bar); })()</script>';
  output = '<script type="text/JavaScript">!function(){var a=1,n=2;alert(a+" "+n)}()</script>';

  equal(minify(input, { minifyJS: true }), output);

  input = '<script type="application/javascript;version=1.8">(function(){ var foo = 1; var bar = 2; alert(foo + " " + bar); })()</script>';
  output = '<script type="application/javascript;version=1.8">!function(){var a=1,n=2;alert(a+" "+n)}()</script>';

  equal(minify(input, { minifyJS: true }), output);

  input = '<script type=" application/javascript  ; charset=utf-8 ">(function(){ var foo = 1; var bar = 2; alert(foo + " " + bar); })()</script>';
  output = '<script type="application/javascript;charset=utf-8">!function(){var a=1,n=2;alert(a+" "+n)}()</script>';

  equal(minify(input, { minifyJS: true }), output);

  input = '<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({\'gtm.start\':new Date().getTime(),event:\'gtm.js\'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!=\'dataLayer\'?\'&l=\'+l:\'\';j.async=true;j.src=\'//www.googletagmanager.com/gtm.js?id=\'+i+dl;f.parentNode.insertBefore(j,f);})(window,document,\'script\',\'dataLayer\',\'GTM-67NT\');</script>';
  output = '<script>!function(w,d,s,l,i){w[l]=w[l]||[],w[l].push({"gtm.start":(new Date).getTime(),event:"gtm.js"});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl="dataLayer"!=l?"&l="+l:"";j.async=!0,j.src="//www.googletagmanager.com/gtm.js?id="+i+dl,f.parentNode.insertBefore(j,f)}(window,document,"script","dataLayer","GTM-67NT")</script>';

  equal(minify(input, { minifyJS: { mangle: false } }), output);

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

  equal(minify(input, { minifyJS: true }), output);
});

test('minification of scripts with different mimetypes', function() {
  input = '<script type="">function f(){  return 1  }</script>';
  output = '<script type="">function f(){return 1}</script>';

  equal(minify(input, { minifyJS: true }), output);

  input = '<script type="text/javascript">function f(){  return 1  }</script>';
  output = '<script type="text/javascript">function f(){return 1}</script>';

  equal(minify(input, { minifyJS: true }), output);

  input = '<script foo="bar">function f(){  return 1  }</script>';
  output = '<script foo="bar">function f(){return 1}</script>';

  equal(minify(input, { minifyJS: true }), output);

  input = '<script type="text/ecmascript">function f(){  return 1  }</script>';
  output = '<script type="text/ecmascript">function f(){return 1}</script>';

  equal(minify(input, { minifyJS: true }), output);

  input = '<script type="application/javascript">function f(){  return 1  }</script>';
  output = '<script type="application/javascript">function f(){return 1}</script>';

  equal(minify(input, { minifyJS: true }), output);

  input = '<script type="boo">function f(){  return 1  }</script>';

  equal(minify(input, { minifyJS: true }), input);

  input = '<script type="text/html"><!-- ko if: true -->\n\n\n<div></div>\n\n\n<!-- /ko --></script>';

  equal(minify(input, { minifyJS: true }), input);
});

test('event minification', function() {
  input = '<div only="alert(a + b)" one=";return false;"></div>';

  equal(minify(input, { minifyJS: true }), input);

  input = '<div onclick="alert(a + b)"></div>';
  output = '<div onclick="alert(a+b)"></div>';

  equal(minify(input, { minifyJS: true }), output);

  input = '<a href="/" onclick="this.href = getUpdatedURL (this.href);return true;">test</a>';
  output = '<a href="/" onclick="return this.href=getUpdatedURL(this.href),!0">test</a>';

  equal(minify(input, { minifyJS: true }), output);

  input = '<a onclick="try{ dcsMultiTrack(\'DCS.dcsuri\',\'USPS\',\'WT.ti\') }catch(e){}"> foobar</a>';
  output = '<a onclick=\'try{dcsMultiTrack("DCS.dcsuri","USPS","WT.ti")}catch(e){}\'> foobar</a>';

  equal(minify(input, { minifyJS: { mangle: false } }), output);
  equal(minify(input, { minifyJS: { mangle: false }, quoteCharacter: '\'' }), output);

  input = '<a onclick="try{ dcsMultiTrack(\'DCS.dcsuri\',\'USPS\',\'WT.ti\') }catch(e){}"> foobar</a>';
  output = '<a onclick="try{dcsMultiTrack(&#34;DCS.dcsuri&#34;,&#34;USPS&#34;,&#34;WT.ti&#34;)}catch(e){}"> foobar</a>';

  equal(minify(input, { minifyJS: { mangle: false }, quoteCharacter: '"' }), output);

  input = '<a onClick="_gaq.push([\'_trackEvent\', \'FGF\', \'banner_click\']);"></a>';
  output = '<a onclick=\'_gaq.push(["_trackEvent","FGF","banner_click"])\'></a>';

  equal(minify(input, { minifyJS: true }), output);
  equal(minify(input, { minifyJS: true, quoteCharacter: '\'' }), output);

  input = '<a onClick="_gaq.push([\'_trackEvent\', \'FGF\', \'banner_click\']);"></a>';
  output = '<a onclick="_gaq.push([&#34;_trackEvent&#34;,&#34;FGF&#34;,&#34;banner_click&#34;])"></a>';

  equal(minify(input, { minifyJS: true, quoteCharacter: '"' }), output);

  input = '<button type="button" onclick=";return false;" id="appbar-guide-button"></button>';
  output = '<button type="button" onclick="return!1" id="appbar-guide-button"></button>';

  equal(minify(input, { minifyJS: true }), output);

  input = '<button type="button" onclick=";return false;" ng-click="a(1 + 2)" data-click="a(1 + 2)"></button>';
  output = '<button type="button" onclick="return!1" ng-click="a(1 + 2)" data-click="a(1 + 2)"></button>';

  equal(minify(input, { minifyJS: true }), output);
  equal(minify(input, { minifyJS: true, customEventAttributes: [ ] }), input);

  output = '<button type="button" onclick=";return false;" ng-click="a(3)" data-click="a(1 + 2)"></button>';

  equal(minify(input, { minifyJS: true, customEventAttributes: [ /^ng-/ ] }), output);

  output = '<button type="button" onclick="return!1" ng-click="a(3)" data-click="a(1 + 2)"></button>';

  equal(minify(input, { minifyJS: true, customEventAttributes: [ /^on/, /^ng-/ ] }), output);
});

test('escaping closing script tag', function() {
  var input = '<script>window.jQuery || document.write(\'<script src="jquery.js"><\\/script>\')</script>';
  var output = '<script>window.jQuery||document.write(\'<script src="jquery.js"><\\/script>\')</script>';

  equal(minify(input, { minifyJS: true }), output);
});

test('style minification', function() {
  input = '<style></style>div#foo { background-color: red; color: white }';

  equal(minify(input, { minifyCSS: true }), input);

  input = '<style>div#foo { background-color: red; color: white }</style>';
  output = '<style>div#foo{background-color:red;color:#fff}</style>';

  equal(minify(input), input);
  equal(minify(input, { minifyCSS: true }), output);

  input = '<style>div > p.foo + span { border: 10px solid black }</style>';
  output = '<style>div>p.foo+span{border:10px solid #000}</style>';

  equal(minify(input, { minifyCSS: true }), output);
});

test('style attribute minification', function() {
  input = '<div style="color: red; background-color: yellow; font-family: Verdana, Arial, sans-serif;"></div>';
  output = '<div style="color:red;background-color:#ff0;font-family:Verdana,Arial,sans-serif"></div>';

  equal(minify(input, { minifyCSS: true }), output);
});

test('url attribute minification', function() {
  input = '<link rel="stylesheet" href="http://website.com/style.css"><form action="http://website.com/folder/folder2/index.html"><a href="http://website.com/folder/file.html">link</a></form>';
  output = '<link rel="stylesheet" href="/style.css"><form action="folder2/"><a href="file.html">link</a></form>';

  equal(minify(input, { minifyURLs: { site: 'http://website.com/folder/' } }), output);

  input = '<link rel="canonical" href="http://website.com/">';

  equal(minify(input, { minifyURLs: { site: 'http://website.com/' } }), input);
});

test('valueless attributes', function() {
  input = '<br foo>';
  equal(minify(input), input);
});

test('newlines becoming whitespaces', function() {
  input = 'test\n\n<input>\n\ntest';
  output = 'test <input> test';
  equal(minify(input, { collapseWhitespace: true }), output);
});

test('conservative collapse', function() {
  input = '<b>   foo \n\n</b>';
  output = '<b> foo </b>';
  equal(minify(input, {
    collapseWhitespace: true,
    conservativeCollapse: true
  }), output);

  input = '<html>\n\n<!--test-->\n\n</html>';
  output = '<html> </html>';
  equal(minify(input, {
    removeComments: true,
    collapseWhitespace: true,
    conservativeCollapse: true
  }), output);
});

test('collapse preseving a line break', function() {
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
  output = '<!DOCTYPE html>\n<html lang="en" class="no-js">\n' +
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
  equal(minify(input, {
    collapseWhitespace: true,
    preserveLineBreaks: true
  }), output);
  equal(minify(input, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    preserveLineBreaks: true
  }), output);

  input = '<div> text <span>\n text</span> \n</div>';
  output = '<div>text <span>\ntext</span>\n</div>';
  equal(minify(input, {
    collapseWhitespace: true,
    preserveLineBreaks: true
  }), output);

  input = '<div>  text \n </div>';
  output = '<div>text\n</div>';
  equal(minify(input, {
    collapseWhitespace: true,
    preserveLineBreaks: true
  }), output);
  output = '<div> text\n</div>';
  equal(minify(input, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    preserveLineBreaks: true
  }), output);

  input = '<div>\ntext  </div>';
  output = '<div>\ntext</div>';
  equal(minify(input, {
    collapseWhitespace: true,
    preserveLineBreaks: true
  }), output);
  output = '<div>\ntext </div>';
  equal(minify(input, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    preserveLineBreaks: true
  }), output);

  input = 'This is the start. <% ... %>\r\n<%= ... %>\r\n<? ... ?>\r\n<!-- This is the middle, and a comment. -->\r\nNo comment, but middle.\r\n<?= ... ?>\r\n<?php ... ?>\r\n<?xml ... ?>\r\nHello, this is the end!';
  output = 'This is the start. <% ... %>\n<%= ... %>\n<? ... ?>\nNo comment, but middle.\n<?= ... ?>\n<?php ... ?>\n<?xml ... ?>\nHello, this is the end!';
  equal(minify(input, {
    removeComments: true,
    collapseWhitespace: true,
    preserveLineBreaks: true
  }), output);
});

test('collapse inline tag whitespace', function() {
  input = '<button>a</button> <button>b</button>';
  equal(minify(input, {
    collapseWhitespace: true
  }), input);

  output = '<button>a</button><button>b</button>';
  equal(minify(input, {
    collapseWhitespace: true,
    collapseInlineTagWhitespace: true
  }), output);

  input = '<p>where <math> <mi>R</mi> </math> is the Rici tensor.</p>';
  output = '<p>where <math><mi>R</mi></math> is the Rici tensor.</p>';
  equal(minify(input, {
    collapseWhitespace: true
  }), output);

  output = '<p>where<math><mi>R</mi></math>is the Rici tensor.</p>';
  equal(minify(input, {
    collapseWhitespace: true,
    collapseInlineTagWhitespace: true
  }), output);
});

test('ignore custom comments', function() {
  input = '<!-- ko if: someExpressionGoesHere --><li>test</li><!-- /ko -->';

  equal(minify(input, {
    removeComments: true,
    // ignore knockout comments
    ignoreCustomComments: [
      /^\s+ko/,
      /\/ko\s+$/
    ]
  }), input);

  input = '<!--#include virtual="/cgi-bin/counter.pl" -->';

  equal(minify(input, {
    removeComments: true,
    // ignore Apache SSI includes
    ignoreCustomComments: [
      /^\s*#/
    ]
  }), input);
});

test('processScripts', function() {
  input = '<script type="text/ng-template"><!--test--><div>   <span> foobar </span> \n\n</div></script>';
  output = '<script type="text/ng-template"><div><span>foobar</span></div></script>';

  equal(minify(input, {
    collapseWhitespace: true,
    removeComments: true,
    processScripts: [ 'text/ng-template' ]
  }), output);
});

test('ignore', function() {
  input = '<!-- htmlmin:ignore --><div class="blah" style="color: red">\n   test   <span> <input disabled/>  foo </span>\n\n   </div><!-- htmlmin:ignore -->' +
          '<div class="blah" style="color: red">\n   test   <span> <input disabled/>  foo </span>\n\n   </div>';

  output = '<div class="blah" style="color: red">\n   test   <span> <input disabled/>  foo </span>\n\n   </div>' +
          '<div class="blah" style="color: red">test <span><input disabled="disabled"> foo</span></div>';

  equal(minify(input, { collapseWhitespace: true }), output);

  input = '<!-- htmlmin:ignore --><!-- htmlmin:ignore -->';
  equal(minify(input), '');

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

  equal(minify(input, { removeComments: true }), output);

  input = '<!-- htmlmin:ignore --> <p class="logged"|cond="$is_logged === true" id="foo"> bar</p> <!-- htmlmin:ignore -->';
  output = ' <p class="logged"|cond="$is_logged === true" id="foo"> bar</p> ';

  equal(minify(input), output);

  input = '<!-- htmlmin:ignore --><body <?php body_class(); ?>><!-- htmlmin:ignore -->';
  output = '<body <?php body_class(); ?>>';

  equal(minify(input, { ignoreCustomFragments: [ /<\?php[\s\S]*?\?>/ ] }), output);

  input = 'a\n<!-- htmlmin:ignore -->b<!-- htmlmin:ignore -->';
  output = 'a b';

  equal(minify(input, { collapseWhitespace: true }), output);
});

test('meta viewport', function() {
  input = '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
  output = '<meta name="viewport" content="width=device-width,initial-scale=1">';

  equal(minify(input), output);

  input = '<meta name="viewport" content="initial-scale=1, maximum-scale=1.0">';
  output = '<meta name="viewport" content="initial-scale=1,maximum-scale=1">';

  equal(minify(input), output);

  input = '<meta name="viewport" content="width= 500 ,  initial-scale=1">';
  output = '<meta name="viewport" content="width=500,initial-scale=1">';

  equal(minify(input), output);

  input = '<meta name="viewport" content="width=device-width, initial-scale=1.0001, maximum-scale=3.140000">';
  output = '<meta name="viewport" content="width=device-width,initial-scale=1.0001,maximum-scale=3.14">';

  equal(minify(input), output);
});

test('downlevel-revealed conditional comments', function() {
  input = '<![if !IE]><link href="non-ie.css" rel="stylesheet"><![endif]>';
  equal(minify(input), input);
  equal(minify(input, { removeComments: true }), input);
});

test('noscript', function() {
  input = '<SCRIPT SRC="x"></SCRIPT><NOSCRIPT>x</NOSCRIPT>';
  equal(minify(input), '<script src="x"></script><noscript>x</noscript>');

  input = '<noscript>\n<!-- anchor linking to external file -->\n' +
          '<a href="#" onclick="javascript:">External Link</a>\n</noscript>';
  equal(minify(input, { removeComments: true, collapseWhitespace: true, removeEmptyAttributes: true }),
    '<noscript><a href="#">External Link</a></noscript>');
});

test('max line length', function() {
  var options = { maxLineLength: 25 };

  input = '<div data-attr="foo"></div>';
  equal(minify(input, options), '<div data-attr="foo">\n</div>');

  input = '<code>    hello   world  \n    world   hello  </code>';
  equal(minify(input, options), '<code>\n    hello   world  \n    world   hello  \n</code>');

  equal(minify('<p title="</p>">x</p>'), '<p title="</p>">x</p>');
  equal(minify('<p title=" <!-- hello world --> ">x</p>'), '<p title=" <!-- hello world --> ">x</p>');
  equal(minify('<p title=" <![CDATA[ \n\n foobar baz ]]> ">x</p>'), '<p title=" <![CDATA[ \n\n foobar baz ]]> ">x</p>');
  equal(minify('<p foo-bar=baz>xxx</p>'), '<p foo-bar="baz">xxx</p>');
  equal(minify('<p foo:bar=baz>xxx</p>'), '<p foo:bar="baz">xxx</p>');

  input = '<div><div><div><div><div><div><div><div><div><div>' +
            'i\'m 10 levels deep' +
          '</div></div></div></div></div></div></div></div></div></div>';

  equal(minify(input), input);

  equal(minify('<script>alert(\'<!--\')<\/script>', options), '<script>alert(\'<!--\')\n<\/script>');
  equal(minify('<script>alert(\'<!-- foo -->\')<\/script>', options), '<script>\nalert(\'<!-- foo -->\')\n<\/script>');
  equal(minify('<script>alert(\'-->\')<\/script>', options), '<script>alert(\'-->\')\n<\/script>');

  equal(minify('<a title="x"href=" ">foo</a>', options), '<a title="x" href="">foo\n</a>');
  equal(minify('<p id=""class=""title="">x', options), '<p id="" class="" \ntitle="">x</p>');
  equal(minify('<p x="x\'"">x</p>', options), '<p x="x\'">x</p>', 'trailing quote should be ignored');
  equal(minify('<a href="#"><p>Click me</p></a>', options), '<a href="#"><p>Click me\n</p></a>');
  equal(minify('<span><button>Hit me</button></span>', options), '<span><button>Hit me\n</button></span>');
  equal(minify('<object type="image/svg+xml" data="image.svg"><div>[fallback image]</div></object>', options),
    '<object \ntype="image/svg+xml" \ndata="image.svg"><div>\n[fallback image]</div>\n</object>'
  );

  equal(minify('<ng-include src="x"></ng-include>', options), '<ng-include src="x">\n</ng-include>');
  equal(minify('<ng:include src="x"></ng:include>', options), '<ng:include src="x">\n</ng:include>');
  equal(minify('<ng-include src="\'views/partial-notification.html\'"></ng-include><div ng-view=""></div>', options),
    '<ng-include \nsrc="\'views/partial-notification.html\'">\n</ng-include><div \nng-view=""></div>'
  );
  equal(minify('<some-tag-1></some-tag-1><some-tag-2></some-tag-2>', options),
    '<some-tag-1>\n</some-tag-1>\n<some-tag-2>\n</some-tag-2>'
  );
  equal(minify('[\']["]', options), '[\']["]');
  equal(minify('<a href="test.html"><div>hey</div></a>', options), '<a href="test.html">\n<div>hey</div></a>');
  equal(minify(':) <a href="http://example.com">link</a>', options), ':) <a \nhref="http://example.com">\nlink</a>');

  equal(minify('<a href>ok</a>', options), '<a href>ok</a>');
});

test('custom attribute collapse', function() {
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

  equal(minify(input), input);
  equal(minify(input, { customAttrCollapse: /data\-bind/ }), output);

  input = '<div style="' +
            'color: red;' +
            'font-size: 100em;' +
          '">bar</div>';
  output = '<div style="color: red;font-size: 100em">bar</div>';
  equal(minify(input, { customAttrCollapse: /style/ }), output);

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

  equal(minify(input, { customAttrCollapse: /ng\-class/ }), output);
});

test('custom attribute collapse with empty attribute value', function() {
  input = '<div ng-some\n\n></div>';
  output = '<div ng-some></div>';

  equal(minify( input, { customAttrCollapse: /.+/ }), output);
});

test('custom attribute collapse with newlines, whitespace, and carriage returns', function() {
  input = '<div ng-class="{ \n\r' +
          '               value:true, \n\r' +
          '               value2:false \n\r' +
          '               }"></div>';
  output = '<div ng-class="{value:true,value2:false}"></div>';

  equal(minify(input, { customAttrCollapse: /ng\-class/ }), output);
});

test('do not escape attribute value', function() {
  input = '<div data=\'{\n' +
  '\t"element": "<div class=\"test\"></div>\n"' +
  '}\'></div>';

  equal(minify(input, { preventAttributesEscaping: true }), input);
});

test('quoteCharacter is single quote', function() {
  equal(minify('<div class=\'bar\'>foo</div>', { quoteCharacter: '\'' }), '<div class=\'bar\'>foo</div>');
  equal(minify('<div class="bar">foo</div>', { quoteCharacter: '\'' }), '<div class=\'bar\'>foo</div>');
});

test('quoteCharacter is not single quote or double quote', function() {
  equal(minify('<div class=\'bar\'>foo</div>', { quoteCharacter: 'm' }), '<div class="bar">foo</div>');
  equal(minify('<div class="bar">foo</div>', { quoteCharacter: 'm' }), '<div class="bar">foo</div>');
});

test('remove space between attributes', function() {
  var input, output;
  var options = {
    collapseBooleanAttributes: true,
    keepClosingSlash: true,
    removeAttributeQuotes: true,
    removeTagWhitespace: true
  };

  input = '<input data-attr="example" value="hello world!" checked="checked">';
  output = '<input data-attr=example value="hello world!"checked>';
  equal(minify(input, options), output);

  input = '<input checked="checked" value="hello world!" data-attr="example">';
  output = '<input checked value="hello world!"data-attr=example>';
  equal(minify(input, options), output);

  input = '<input checked="checked" data-attr="example" value="hello world!">';
  output = '<input checked data-attr=example value="hello world!">';
  equal(minify(input, options), output);

  input = '<input data-attr="example" value="hello world!" checked="checked"/>';
  output = '<input data-attr=example value="hello world!"checked/>';
  equal(minify(input, options), output);

  input = '<input checked="checked" value="hello world!" data-attr="example"/>';
  output = '<input checked value="hello world!"data-attr=example />';
  equal(minify(input, options), output);

  input = '<input checked="checked" data-attr="example" value="hello world!"/>';
  output = '<input checked data-attr=example value="hello world!"/>';
  equal(minify(input, options), output);
});

test('markups from Angular 2', function() {
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
  equal(minify(input, { caseSensitive: true }), output);
  output = '<template ngFor #hero [ngForOf]=heroes>' +
           '<hero-detail *ngIf=hero [hero]=hero></hero-detail>' +
           '</template>' +
           '<form (ngSubmit)=onSubmit(theForm) #theForm=ngForm>' +
           '<div class=form-group>' +
           '<label for=name>Name</label>' +
           '<input class=form-control required ngControl=firstName [(ngModel)]=currentHero.firstName>' +
           '</div>' +
           '<button type=submit [disabled]=!theForm.form.valid>Submit</button>' +
           '</form>';
  equal(minify(input, {
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

test('auto-generated tags', function() {
  input = '</p>';
  equal(minify(input, { includeAutoGeneratedTags: false }), input);

  input = '<p id=""class=""title="">x';
  output = '<p id="" class="" title="">x';
  equal(minify(input, { includeAutoGeneratedTags: false }), output);
  output = '<p id="" class="" title="">x</p>';
  equal(minify(input), output);
  equal(minify(input, { includeAutoGeneratedTags: true }), output);

  input = '<body onload="  foo();   bar() ;  "><p>x</body>';
  output = '<body onload="foo();   bar()"><p>x</body>';
  equal(minify(input, { includeAutoGeneratedTags: false }), output);

  input = '<a href="#"><div>Well, look at me! I\'m a div!</div></a>';
  output = '<a href="#"><div>Well, look at me! I\'m a div!</div>';

  equal(minify(input, { html5: false, includeAutoGeneratedTags: false }), output);

  var options = { maxLineLength: 25, includeAutoGeneratedTags: false };
  equal(minify('<p id=""class=""title="">x', options), '<p id="" class="" \ntitle="">x');
});

test('tests from PHPTAL', function() {
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
    ['<div><ul><li><a>a </a></li><li>b </li><li>c</li></ul></div>', '<div> <ul> <li> <a> a </a> </li> <li> b </li> <li> c </li> </ul> </div>'],
      */
    ['<table>x<tr>x<td>foo</td>x</tr>x</table>', '<table> x <tr> x <td> foo </td> x </tr> x </table>'],
    ['<select>x<option></option>x<optgroup>x<option></option>x</optgroup>x</select>', '<select> x <option> </option> x <optgroup> x <option> </option> x </optgroup> x </select> '],
    /* minifier does not reorder attributes
    ['<img src="foo" width="10" height="5" alt="x"/>', '<img width="10" height="5" src="foo" alt="x" />'],
    ['<img alpha="1" beta="2" gamma="3"/>', '<img gamma="3" alpha="1" beta="2" />'],
      */
    ['<pre>\n\n\ntest</pre>', '<pre>\n\n\ntest</pre>'],
    /* single line-break preceding <pre> is redundant, assuming <pre> is block element
    ['<pre>test</pre>', '<pre>\ntest</pre>'],
      */
    // optional attribute quotes removed by minifier, but not by PHPTAL
    ['<meta http-equiv=Content-Type content="text/plain;charset=UTF-8">', '<meta http-equiv=\'Content-Type\' content=\'text/plain;charset=UTF-8\'/>'],
    /* minifier does not optimise <meta/> in HTML5 mode
    ['<meta charset=utf-8>', '<meta http-equiv=\'Content-Type\' content=\'text/plain;charset=UTF-8\'/>'],
      */
    /* minifier does not optimise <script/> in HTML5 mode
    [
      '<script></script><style></style>',
      '<script type=\'text/javascript ;charset=utf-8\'\n' +
      'language=\'javascript\'></script><style type=\'text/css\'></style>'
    ],
      */
    ['<script type="text/javascript;e4x=1"></script><script type=text/hack></script>', '<script type="text/javascript;e4x=1"></script><script type="text/hack"></script>']
    /* trim "title" attribute value in <a>
    [
      '<title>Foo</title><p><a title=\"x\"href=test>x </a>xu</p><br>foo',
      '<html> <head> <title> Foo </title> </head>\n' +
      '<body>\n' +
      '<p>\n' +
      '<a title="   x " href=" test "> x </a> xu\n' +
      '</p>\n' +
      '<br/>\n' +
      'foo</body> </html>  <!-- bla -->'
    ]
      */
  ].forEach(function(tokens) {
    equal(minify(tokens[1], {
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
    }), tokens[0]);
  });
});
