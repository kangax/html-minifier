/* global minify */
'use strict';

QUnit.config.autostart = false;
if (typeof minify === 'undefined') {
  self.minify = require('html-minifier').minify;
}

QUnit.test('`minifiy` exists', function(assert) {
  assert.ok(minify);
});

/**
 * Converts the options in the given object to use callbacks where possible.
 *
 * @param {?Object} options
 * @param {boolean} [async=false]
 * @returns {Object}
 */
function convertOptionsCallbacks(options, async) {
  var convertedOptions = {};

  if (options) {
    for (var i in options) {
      convertedOptions[i] = options[i];
    }

    if (typeof options.minifyJS === 'function') {
      convertedOptions.minifyJS = function(text, inline, cb) {
        function runMinifyJS() {
          var result = options.minifyJS(text, inline, cb);
          if (typeof result !== 'undefined') {
            cb(result);
          }
        }

        if (async) {
          setTimeout(function() {
            runMinifyJS();
          }, 1);
        }
        else {
          runMinifyJS();
        }
      };
    }
    if (typeof options.minifyCSS === 'function') {
      convertedOptions.minifyCSS = function(text, type, cb) {
        function runMinifyCSS() {
          var result = options.minifyCSS(text, type, cb);
          if (typeof result !== 'undefined') {
            cb(result);
          }
        }

        if (async) {
          setTimeout(function() {
            runMinifyCSS();
          }, 1);
        }
        else {
          runMinifyCSS();
        }
      };
    }
  }

  return convertedOptions;
}

/**
 * Test the minify function.
 *
 * @param {Assert} assert
 * @param {string} input
 * @param {string} output
 * @param {Object} [inputOptions]
 * @param {string} [description=input]
 * @param {boolean} [asyncOnly=false]
 */
function test_minify(assert, input, output, inputOptions, description, asyncOnly) {
  // Set default description.
  if (description === null || typeof description === 'undefined') {
    description = input;
  }

  // Set default asyncOnly.
  if (asyncOnly === null || typeof asyncOnly === 'undefined') {
    asyncOnly = false;
  }

  // Safety Checks - ensure this function was called with the correct var types.
  if (typeof input !== 'string') {
    throw new Error('Bad input: ' + input);
  }
  if (typeof output !== 'string') {
    throw new Error('Bad output: ' + output);
  }
  if (inputOptions !== null && typeof inputOptions !== 'undefined' && typeof inputOptions !== 'object') {
    throw new Error('Bad inputOptions: ' + inputOptions);
  }
  if (typeof description !== 'string') {
    throw new Error('Bad description: ' + description);
  }
  if (typeof asyncOnly !== 'boolean') {
    throw new Error('Bad asyncOnly: ' + asyncOnly);
  }

  // Standard test.
  if (!asyncOnly) {
    var descriptionPrefix = 'Standard Test: ';
    assert.equal(minify(input, inputOptions), output, descriptionPrefix + description);
  }

  // Callback tests.
  var callbackTests = [];

  if (!asyncOnly) {
    // Sync callback test.
    callbackTests.push({
      options: convertOptionsCallbacks(inputOptions, false),
      async: false,
      done: assert.async(),
      descriptionPrefix: 'Synchronous Callback Test: '
    });
  }

  // Async callback test.
  callbackTests.push({
    options: asyncOnly ? inputOptions : convertOptionsCallbacks(inputOptions, true),
    async: true,
    done: assert.async(),
    descriptionPrefix: 'Asynchronous Callback Test: '
  });

  // Run callback tests.
  assert.timeout(100);
  callbackTests.forEach(function(test) {
    var callbackTestFinished = false;
    assert.notOk(minify(input, test.options, function(error, result) {
      if (!callbackTestFinished) {
        var stackTrace = '';
        if (error && error instanceof Error) {
          stackTrace = error.stack;
        }

        assert.equal(error, null, test.descriptionPrefix + 'An error occurred - stack trace:\n' + stackTrace);
        assert.equal(result, output, test.descriptionPrefix + description);

        callbackTestFinished = true;
        test.done();
      }
    }));

    // If callback test didn't finish synchronously.
    if (!callbackTestFinished && !test.async) {
      assert.ok(false, test.descriptionPrefix + 'Didn\'t finish synchronously.');
      callbackTestFinished = true;
      test.done();
    }
  });
}

/**
 * Test the minify function for an expected error.
 *
 * @param {Assert} assert
 * @param {string} input
 * @param {Object} [inputOptions]
 * @param {Error|function(new:Error)|RegExp|function(boolean)} [errorMatcher]
 * @param {string} [description=input]
 * @param {boolean} [asyncOnly=false]
 */
function test_minify_error(assert, input, inputOptions, errorMatcher, description, asyncOnly) {
  // Set default description.
  if (description === null || typeof description === 'undefined') {
    description = input;
  }

  // Set default asyncOnly.
  if (asyncOnly === null || typeof asyncOnly === 'undefined') {
    asyncOnly = false;
  }

  // Standard test.
  var descriptionPrefix = 'Standard Test: ';
  assert.throws(
    function() {
      minify(input, inputOptions);
    },
    errorMatcher,
    descriptionPrefix + description
  );

  // Callback tests.
  var callbackTests = [];

  if (!asyncOnly) {
    // Sync callback test.
    callbackTests.push({
      options: convertOptionsCallbacks(inputOptions, false),
      async: false,
      done: assert.async(),
      descriptionPrefix: 'Synchronous Callback Test: '
    });
  }

  // Async callback test.
  callbackTests.push({
    options: asyncOnly ? inputOptions : convertOptionsCallbacks(inputOptions, true),
    async: true,
    done: assert.async(),
    descriptionPrefix: 'Asynchronous Callback Test: '
  });

  // Run callback tests.
  callbackTests.forEach(function(test) {
    var callbackTestFinished = false;
    try {
      assert.timeout(100);
      assert.notOk(minify(input, test.options, function(error, result) {
        if (!callbackTestFinished) {
          assert.ok(error, descriptionPrefix + 'An error should have occurred.');
          assert.ok(error instanceof Error, descriptionPrefix + '"' + error + '" was returned as an error.');
          assert.throws(function() { throw error; }, errorMatcher, descriptionPrefix + description);
          assert.notOk(result);

          callbackTestFinished = true;
          test.done();
        }
      }));

      // If callback test didn't finish synchronously.
      if (!callbackTestFinished && !test.async) {
        assert.ok(false, test.descriptionPrefix + 'Didn\'t finish synchronously.');
        callbackTestFinished = true;
        test.done();
      }
    }
    catch (error) {
      callbackTestFinished = true;
      if (error && error instanceof Error) {
        assert.ok(false, test.descriptionPrefix + 'threw an error - stack trace:\n' + error.stack);
      }
      else {
        assert.ok(false, test.descriptionPrefix + 'threw an error - "' + error + '"');
      }
    }
  });
}

QUnit.test('parsing non-trivial markup', function(assert) {
  var input, output;

  test_minify(assert, '</td>', '');
  test_minify(assert, '</p>', '<p></p>');
  test_minify(assert, '</br>', '<br>');
  test_minify(assert, '<br>x</br>', '<br>x<br>');
  test_minify(assert, '<p title="</p>">x</p>', '<p title="</p>">x</p>');
  test_minify(assert, '<p title=" <!-- hello world --> ">x</p>', '<p title=" <!-- hello world --> ">x</p>');
  test_minify(assert, '<p title=" <![CDATA[ \n\n foobar baz ]]> ">x</p>', '<p title=" <![CDATA[ \n\n foobar baz ]]> ">x</p>');
  test_minify(assert, '<p foo-bar=baz>xxx</p>', '<p foo-bar="baz">xxx</p>');
  test_minify(assert, '<p foo:bar=baz>xxx</p>', '<p foo:bar="baz">xxx</p>');
  test_minify(assert, '<p foo.bar=baz>xxx</p>', '<p foo.bar="baz">xxx</p>');

  input = '<div><div><div><div><div><div><div><div><div><div>' +
            'i\'m 10 levels deep' +
          '</div></div></div></div></div></div></div></div></div></div>';

  test_minify(assert, input, input);

  test_minify(assert, '<script>alert(\'<!--\')</script>', '<script>alert(\'<!--\')</script>');
  test_minify(assert, '<script>alert(\'<!-- foo -->\')</script>', '<script>alert(\'<!-- foo -->\')</script>');
  test_minify(assert, '<script>alert(\'-->\')</script>', '<script>alert(\'-->\')</script>');

  test_minify(assert, '<a title="x"href=" ">foo</a>', '<a title="x" href="">foo</a>');
  test_minify(assert, '<p id=""class=""title="">x', '<p id="" class="" title="">x</p>');
  test_minify(assert, '<p x="x\'"">x</p>', '<p x="x\'">x</p>', null, 'trailing quote should be ignored');
  test_minify(assert, '<a href="#"><p>Click me</p></a>', '<a href="#"><p>Click me</p></a>');
  test_minify(assert, '<span><button>Hit me</button></span>', '<span><button>Hit me</button></span>');
  test_minify(assert, '<object type="image/svg+xml" data="image.svg"><div>[fallback image]</div></object>', '<object type="image/svg+xml" data="image.svg"><div>[fallback image]</div></object>');

  test_minify(assert, '<ng-include src="x"></ng-include>', '<ng-include src="x"></ng-include>');
  test_minify(assert, '<ng:include src="x"></ng:include>', '<ng:include src="x"></ng:include>');
  test_minify(assert, '<ng-include src="\'views/partial-notification.html\'"></ng-include><div ng-view=""></div>', '<ng-include src="\'views/partial-notification.html\'"></ng-include><div ng-view=""></div>');

  // will cause test to time-out if fail
  input = '<p>For more information, read <a href=https://stackoverflow.com/questions/17408815/fieldset-resizes-wrong-appears-to-have-unremovable-min-width-min-content/17863685#17863685>this Stack Overflow answer</a>.</p>';
  output = '<p>For more information, read <a href="https://stackoverflow.com/questions/17408815/fieldset-resizes-wrong-appears-to-have-unremovable-min-width-min-content/17863685#17863685">this Stack Overflow answer</a>.</p>';
  test_minify(assert, input, output);

  input = '<html ⚡></html>';
  test_minify(assert, input, input);

  input = '<h:ællæ></h:ællæ>';
  test_minify(assert, input, input);

  input = '<$unicorn>';
  test_minify_error(assert, input, null, null, 'Invalid tag name');

  input = '<begriffs.pagination ng-init="perPage=20" collection="logs" url="\'/api/logs?user=-1\'" per-page="perPage" per-page-presets="[10,20,50,100]" template-url="/assets/paginate-anything.html"></begriffs.pagination>';
  test_minify(assert, input, input);

  // https://github.com/kangax/html-minifier/issues/41
  test_minify(assert, '<some-tag-1></some-tag-1><some-tag-2></some-tag-2>', '<some-tag-1></some-tag-1><some-tag-2></some-tag-2>');

  // https://github.com/kangax/html-minifier/issues/40
  test_minify(assert, '[\']["]', '[\']["]');

  // https://github.com/kangax/html-minifier/issues/21
  test_minify(assert, '<a href="test.html"><div>hey</div></a>', '<a href="test.html"><div>hey</div></a>');

  // https://github.com/kangax/html-minifier/issues/17
  test_minify(assert, ':) <a href="http://example.com">link</a>', ':) <a href="http://example.com">link</a>');

  // https://github.com/kangax/html-minifier/issues/169
  test_minify(assert, '<a href>ok</a>', '<a href>ok</a>');

  test_minify(assert, '<a onclick></a>', '<a onclick></a>');

  // https://github.com/kangax/html-minifier/issues/229
  test_minify(assert, '<CUSTOM-TAG></CUSTOM-TAG><div>Hello :)</div>', '<custom-tag></custom-tag><div>Hello :)</div>');

  // https://github.com/kangax/html-minifier/issues/507
  input = '<tag v-ref:vm_pv :imgs=" objpicsurl_ "></tag>';
  test_minify(assert, input, input);
  test_minify_error(assert, '<tag v-ref:vm_pv :imgs=" objpicsurl_ " ss"123></tag>', null, null, 'invalid attribute name');

  // https://github.com/kangax/html-minifier/issues/512
  input = '<input class="form-control" type="text" style="" id="{{vm.formInputName}}" name="{{vm.formInputName}}"' +
          ' placeholder="YYYY-MM-DD"' +
          ' date-range-picker' +
          ' data-ng-model="vm.value"' +
          ' data-ng-model-options="{ debounce: 1000 }"' +
          ' data-ng-pattern="vm.options.format"' +
          ' data-options="vm.datepickerOptions">';
  test_minify(assert, input, input);
  test_minify_error(assert, '<input class="form-control" type="text" style="" id="{{vm.formInputName}}" name="{{vm.formInputName}}"' +
      ' <!--FIXME hardcoded placeholder - dates may not be used for service required fields yet. -->' +
      ' placeholder="YYYY-MM-DD"' +
      ' date-range-picker' +
      ' data-ng-model="vm.value"' +
      ' data-ng-model-options="{ debounce: 1000 }"' +
      ' data-ng-pattern="vm.options.format"' +
      ' data-options="vm.datepickerOptions">', null, null, 'HTML comment inside tag');

  input = '<br a=\u00A0 b="&nbsp;" c="\u00A0">';
  output = '<br a="\u00A0" b="&nbsp;" c="\u00A0">';
  test_minify(assert, input, output);
  output = '<br a="\u00A0"b="\u00A0"c="\u00A0">';
  test_minify(assert, input, output, {
    decodeEntities: true,
    removeTagWhitespace: true,
  });
  output = '<br a=\u00A0 b=\u00A0 c=\u00A0>';
  test_minify(assert, input, output, {
    decodeEntities: true,
    removeAttributeQuotes: true
  });
  test_minify(assert, input, output, {
    decodeEntities: true,
    removeAttributeQuotes: true,
    removeTagWhitespace: true,
  });
});

QUnit.test('options', function(assert) {
  var input = '<p>blah<span>blah 2<span>blah 3</span></span></p>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, {});
});

QUnit.test('case normalization', function(assert) {
  test_minify(assert, '<P>foo</p>', '<p>foo</p>');
  test_minify(assert, '<DIV>boo</DIV>', '<div>boo</div>');
  test_minify(assert, '<DIV title="moo">boo</DiV>', '<div title="moo">boo</div>');
  test_minify(assert, '<DIV TITLE="blah">boo</DIV>', '<div title="blah">boo</div>');
  test_minify(assert, '<DIV tItLe="blah">boo</DIV>', '<div title="blah">boo</div>');
  test_minify(assert, '<DiV tItLe="blah">boo</DIV>', '<div title="blah">boo</div>');
});

QUnit.test('space normalization between attributes', function(assert) {
  test_minify(assert, '<p title="bar">foo</p>', '<p title="bar">foo</p>');
  test_minify(assert, '<img src="test"/>', '<img src="test">');
  test_minify(assert, '<p title = "bar">foo</p>', '<p title="bar">foo</p>');
  test_minify(assert, '<p title\n\n\t  =\n     "bar">foo</p>', '<p title="bar">foo</p>');
  test_minify(assert, '<img src="test" \n\t />', '<img src="test">');
  test_minify(assert, '<input title="bar"       id="boo"    value="hello world">', '<input title="bar" id="boo" value="hello world">');
});

QUnit.test('space normalization around text', function(assert) {
  var input, output;
  input = '   <p>blah</p>\n\n\n   ';
  test_minify(assert, input, input);
  output = '<p>blah</p>';
  test_minify(assert, input, output, { collapseWhitespace: true });
  output = ' <p>blah</p> ';
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    conservativeCollapse: true
  });
  output = '<p>blah</p>\n';
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    preserveLineBreaks: true
  });
  output = ' <p>blah</p>\n';
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    preserveLineBreaks: true
  });
  [
    'a', 'abbr', 'acronym', 'b', 'big', 'del', 'em', 'font', 'i', 'ins', 'kbd',
    'mark', 's', 'samp', 'small', 'span', 'strike', 'strong', 'sub', 'sup',
    'time', 'tt', 'u', 'var'
  ].forEach(function(el) {
    test_minify(assert, 'foo <' + el + '>baz</' + el + '> bar', 'foo <' + el + '>baz</' + el + '> bar', { collapseWhitespace: true });
    test_minify(assert, 'foo<' + el + '>baz</' + el + '>bar', 'foo<' + el + '>baz</' + el + '>bar', { collapseWhitespace: true });
    test_minify(assert, 'foo <' + el + '>baz</' + el + '>bar', 'foo <' + el + '>baz</' + el + '>bar', { collapseWhitespace: true });
    test_minify(assert, 'foo<' + el + '>baz</' + el + '> bar', 'foo<' + el + '>baz</' + el + '> bar', { collapseWhitespace: true });
    test_minify(assert, 'foo <' + el + '> baz </' + el + '> bar', 'foo <' + el + '>baz </' + el + '>bar', { collapseWhitespace: true });
    test_minify(assert, 'foo<' + el + '> baz </' + el + '>bar', 'foo<' + el + '> baz </' + el + '>bar', { collapseWhitespace: true });
    test_minify(assert, 'foo <' + el + '> baz </' + el + '>bar', 'foo <' + el + '>baz </' + el + '>bar', { collapseWhitespace: true });
    test_minify(assert, 'foo<' + el + '> baz </' + el + '> bar', 'foo<' + el + '> baz </' + el + '>bar', { collapseWhitespace: true });
    test_minify(assert, '<div>foo <' + el + '>baz</' + el + '> bar</div>', '<div>foo <' + el + '>baz</' + el + '> bar</div>', { collapseWhitespace: true });
    test_minify(assert, '<div>foo<' + el + '>baz</' + el + '>bar</div>', '<div>foo<' + el + '>baz</' + el + '>bar</div>', { collapseWhitespace: true });
    test_minify(assert, '<div>foo <' + el + '>baz</' + el + '>bar</div>', '<div>foo <' + el + '>baz</' + el + '>bar</div>', { collapseWhitespace: true });
    test_minify(assert, '<div>foo<' + el + '>baz</' + el + '> bar</div>', '<div>foo<' + el + '>baz</' + el + '> bar</div>', { collapseWhitespace: true });
    test_minify(assert, '<div>foo <' + el + '> baz </' + el + '> bar</div>', '<div>foo <' + el + '>baz </' + el + '>bar</div>', { collapseWhitespace: true });
    test_minify(assert, '<div>foo<' + el + '> baz </' + el + '>bar</div>', '<div>foo<' + el + '> baz </' + el + '>bar</div>', { collapseWhitespace: true });
    test_minify(assert, '<div>foo <' + el + '> baz </' + el + '>bar</div>', '<div>foo <' + el + '>baz </' + el + '>bar</div>', { collapseWhitespace: true });
    test_minify(assert, '<div>foo<' + el + '> baz </' + el + '> bar</div>', '<div>foo<' + el + '> baz </' + el + '>bar</div>', { collapseWhitespace: true });
  });
  // Don't trim whitespace around element, but do trim within
  [
    'bdi', 'bdo', 'button', 'cite', 'code', 'dfn', 'math', 'q', 'rt', 'rtc', 'ruby', 'svg'
  ].forEach(function(el) {
    test_minify(assert, 'foo <' + el + '>baz</' + el + '> bar', 'foo <' + el + '>baz</' + el + '> bar', { collapseWhitespace: true });
    test_minify(assert, 'foo<' + el + '>baz</' + el + '>bar', 'foo<' + el + '>baz</' + el + '>bar', { collapseWhitespace: true });
    test_minify(assert, 'foo <' + el + '>baz</' + el + '>bar', 'foo <' + el + '>baz</' + el + '>bar', { collapseWhitespace: true });
    test_minify(assert, 'foo<' + el + '>baz</' + el + '> bar', 'foo<' + el + '>baz</' + el + '> bar', { collapseWhitespace: true });
    test_minify(assert, 'foo <' + el + '> baz </' + el + '> bar', 'foo <' + el + '>baz</' + el + '> bar', { collapseWhitespace: true });
    test_minify(assert, 'foo<' + el + '> baz </' + el + '>bar', 'foo<' + el + '>baz</' + el + '>bar', { collapseWhitespace: true });
    test_minify(assert, 'foo <' + el + '> baz </' + el + '>bar', 'foo <' + el + '>baz</' + el + '>bar', { collapseWhitespace: true });
    test_minify(assert, 'foo<' + el + '> baz </' + el + '> bar', 'foo<' + el + '>baz</' + el + '> bar', { collapseWhitespace: true });
    test_minify(assert, '<div>foo <' + el + '>baz</' + el + '> bar</div>', '<div>foo <' + el + '>baz</' + el + '> bar</div>', { collapseWhitespace: true });
    test_minify(assert, '<div>foo<' + el + '>baz</' + el + '>bar</div>', '<div>foo<' + el + '>baz</' + el + '>bar</div>', { collapseWhitespace: true });
    test_minify(assert, '<div>foo <' + el + '>baz</' + el + '>bar</div>', '<div>foo <' + el + '>baz</' + el + '>bar</div>', { collapseWhitespace: true });
    test_minify(assert, '<div>foo<' + el + '>baz</' + el + '> bar</div>', '<div>foo<' + el + '>baz</' + el + '> bar</div>', { collapseWhitespace: true });
    test_minify(assert, '<div>foo <' + el + '> baz </' + el + '> bar</div>', '<div>foo <' + el + '>baz</' + el + '> bar</div>', { collapseWhitespace: true });
    test_minify(assert, '<div>foo<' + el + '> baz </' + el + '>bar</div>', '<div>foo<' + el + '>baz</' + el + '>bar</div>', { collapseWhitespace: true });
    test_minify(assert, '<div>foo <' + el + '> baz </' + el + '>bar</div>', '<div>foo <' + el + '>baz</' + el + '>bar</div>', { collapseWhitespace: true });
    test_minify(assert, '<div>foo<' + el + '> baz </' + el + '> bar</div>', '<div>foo<' + el + '>baz</' + el + '> bar</div>', { collapseWhitespace: true });
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
    test_minify(assert, inputs[0], inputs[0], {
      collapseWhitespace: true,
      conservativeCollapse: true
    }, inputs[0]);
    test_minify(assert, inputs[0], inputs[1], { collapseWhitespace: true }, inputs[0]);
    var input = '<div>' + inputs[0] + '</div>';
    test_minify(assert, input, input, {
      collapseWhitespace: true,
      conservativeCollapse: true
    }, input);
    var output = '<div>' + inputs[1] + '</div>';
    test_minify(assert, input, output, { collapseWhitespace: true }, input);
  });
  test_minify(assert, '<p>foo <img> bar</p>', '<p>foo <img> bar</p>', { collapseWhitespace: true });
  test_minify(assert, '<p>foo<img>bar</p>', '<p>foo<img>bar</p>', { collapseWhitespace: true });
  test_minify(assert, '<p>foo <img>bar</p>', '<p>foo <img>bar</p>', { collapseWhitespace: true });
  test_minify(assert, '<p>foo<img> bar</p>', '<p>foo<img> bar</p>', { collapseWhitespace: true });
  test_minify(assert, '<p>foo <wbr> bar</p>', '<p>foo<wbr> bar</p>', { collapseWhitespace: true });
  test_minify(assert, '<p>foo<wbr>bar</p>', '<p>foo<wbr>bar</p>', { collapseWhitespace: true });
  test_minify(assert, '<p>foo <wbr>bar</p>', '<p>foo <wbr>bar</p>', { collapseWhitespace: true });
  test_minify(assert, '<p>foo<wbr> bar</p>', '<p>foo<wbr> bar</p>', { collapseWhitespace: true });
  test_minify(assert, '<p>foo <wbr baz moo=""> bar</p>', '<p>foo<wbr baz moo=""> bar</p>', { collapseWhitespace: true });
  test_minify(assert, '<p>foo<wbr baz moo="">bar</p>', '<p>foo<wbr baz moo="">bar</p>', { collapseWhitespace: true });
  test_minify(assert, '<p>foo <wbr baz moo="">bar</p>', '<p>foo <wbr baz moo="">bar</p>', { collapseWhitespace: true });
  test_minify(assert, '<p>foo<wbr baz moo=""> bar</p>', '<p>foo<wbr baz moo=""> bar</p>', { collapseWhitespace: true });
  test_minify(assert, '<p>  <a href="#">  <code>foo</code></a> bar</p>', '<p><a href="#"><code>foo</code></a> bar</p>', { collapseWhitespace: true });
  test_minify(assert, '<p><a href="#"><code>foo  </code></a> bar</p>', '<p><a href="#"><code>foo</code></a> bar</p>', { collapseWhitespace: true });
  test_minify(assert, '<p>  <a href="#">  <code>   foo</code></a> bar   </p>', '<p><a href="#"><code>foo</code></a> bar</p>', { collapseWhitespace: true });
  test_minify(assert, '<div> Empty <!-- or --> not </div>', '<div>Empty<!-- or --> not</div>', { collapseWhitespace: true });
  test_minify(assert, '<div> a <input><!-- b --> c </div>', '<div>a <input> c</div>', {
    collapseWhitespace: true,
    removeComments: true
  });
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
    test_minify(assert, input, input, {
      collapseWhitespace: true,
      conservativeCollapse: true
    }, input);
    test_minify(assert, input, 'a <? b ?> c', {
      collapseWhitespace: true,
      removeComments: true
    }, input);
    test_minify(assert, input, ' a <? b ?> c ', {
      collapseWhitespace: true,
      conservativeCollapse: true,
      removeComments: true
    }, input);
    input = '<p>' + input + '</p>';
    test_minify(assert, input, input, {
      collapseWhitespace: true,
      conservativeCollapse: true
    }, input);
    test_minify(assert, input, '<p>a <? b ?> c</p>', {
      collapseWhitespace: true,
      removeComments: true
    }, input);
    test_minify(assert, input, '<p> a <? b ?> c </p>', {
      collapseWhitespace: true,
      conservativeCollapse: true,
      removeComments: true
    }, input);
  });
  input = '<li><i></i> <b></b> foo</li>';
  output = '<li><i></i> <b></b> foo</li>';
  test_minify(assert, input, output, { collapseWhitespace: true });
  input = '<li><i> </i> <b></b> foo</li>';
  test_minify(assert, input, output, { collapseWhitespace: true });
  input = '<li> <i></i> <b></b> foo</li>';
  test_minify(assert, input, output, { collapseWhitespace: true });
  input = '<li><i></i> <b> </b> foo</li>';
  test_minify(assert, input, output, { collapseWhitespace: true });
  input = '<li> <i> </i> <b> </b> foo</li>';
  test_minify(assert, input, output, { collapseWhitespace: true });
  input = '<div> <a href="#"> <span> <b> foo </b> <i> bar </i> </span> </a> </div>';
  output = '<div><a href="#"><span><b>foo </b><i>bar</i></span></a></div>';
  test_minify(assert, input, output, { collapseWhitespace: true });
  input = '<head> <!-- a --> <!-- b --><link> </head>';
  output = '<head><!-- a --><!-- b --><link></head>';
  test_minify(assert, input, output, { collapseWhitespace: true });
  input = '<head> <!-- a --> <!-- b --> <!-- c --><link> </head>';
  output = '<head><!-- a --><!-- b --><!-- c --><link></head>';
  test_minify(assert, input, output, { collapseWhitespace: true });
  input = '<p> foo\u00A0bar\nbaz  \u00A0\nmoo\t</p>';
  output = '<p>foo\u00A0bar baz \u00A0 moo</p>';
  test_minify(assert, input, output, { collapseWhitespace: true });
  input = '<label> foo </label>\n' +
          '<input>\n' +
          '<object> bar </object>\n' +
          '<select> baz </select>\n' +
          '<textarea> moo </textarea>\n';
  output = '<label>foo</label> <input> <object>bar</object> <select>baz</select> <textarea> moo </textarea>';
  test_minify(assert, input, output, { collapseWhitespace: true });
  input = '<pre>\n' +
          'foo\n' +
          '<br>\n' +
          'bar\n' +
          '</pre>\n' +
          'baz\n';
  output = '<pre>\nfoo\n<br>\nbar\n</pre>baz';
  test_minify(assert, input, output, { collapseWhitespace: true });
});

QUnit.test('types of whitespace that should always be preserved', function(assert) {
  // Hair space:
  var input = '<div>\u200afo\u200ao\u200a</div>';
  test_minify(assert, input, input, { collapseWhitespace: true });

  // Hair space passed as HTML entity:
  var inputWithEntities = '<div>&#8202;fo&#8202;o&#8202;</div>';
  test_minify(assert, inputWithEntities, inputWithEntities, { collapseWhitespace: true });

  // Hair space passed as HTML entity, in decodeEntities:true mode:
  test_minify(assert, inputWithEntities, input, { collapseWhitespace: true, decodeEntities: true });


  // Non-breaking space:
  input = '<div>\xa0fo\xa0o\xa0</div>';
  test_minify(assert, input, input, { collapseWhitespace: true });

  // Non-breaking space passed as HTML entity:
  inputWithEntities = '<div>&nbsp;fo&nbsp;o&nbsp;</div>';
  test_minify(assert, inputWithEntities, inputWithEntities, { collapseWhitespace: true });

  // Non-breaking space passed as HTML entity, in decodeEntities:true mode:
  test_minify(assert, inputWithEntities, input, { collapseWhitespace: true, decodeEntities: true });

  // Do not remove hair space when preserving line breaks between tags:
  input = '<p></p>\u200a\n<p></p>\n';
  test_minify(assert, input, input, { collapseWhitespace: true, preserveLineBreaks: true });

  // Preserve hair space in attributes:
  input = '<p class="foo\u200abar"></p>';
  test_minify(assert, input, input, { collapseWhitespace: true });

  // Preserve hair space in class names when deduplicating and reordering:
  input = '<a class="0 1\u200a3 2 3"></a>';
  test_minify(assert, input, input, { sortClassName: false });
  test_minify(assert, input, input, { sortClassName: true });
});

QUnit.test('doctype normalization', function(assert) {
  var input;

  input = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN"\n    "http://www.w3.org/TR/html4/strict.dtd">';
  test_minify(assert, input, '<!DOCTYPE html>', { useShortDoctype: true });

  input = '<!DOCTYPE html>';
  test_minify(assert, input, input, { useShortDoctype: true });

  input = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">';
  test_minify(assert, input, input, { useShortDoctype: false });
});

QUnit.test('removing comments', function(assert) {
  var input;

  input = '<!-- test -->';
  test_minify(assert, input, '', { removeComments: true });

  input = '<!-- foo --><div>baz</div><!-- bar\n\n moo -->';
  test_minify(assert, input, '<div>baz</div>', { removeComments: true });
  test_minify(assert, input, input, { removeComments: false });

  input = '<p title="<!-- comment in attribute -->">foo</p>';
  test_minify(assert, input, input, { removeComments: true });

  input = '<script><!-- alert(1) --></script>';
  test_minify(assert, input, input, { removeComments: true });

  input = '<STYLE><!-- alert(1) --></STYLE>';
  test_minify(assert, input, '<style><!-- alert(1) --></style>', { removeComments: true });
});

QUnit.test('ignoring comments', function(assert) {
  var input, output;

  input = '<!--! test -->';
  test_minify(assert, input, input, { removeComments: true });
  test_minify(assert, input, input, { removeComments: false });

  input = '<!--! foo --><div>baz</div><!--! bar\n\n moo -->';
  test_minify(assert, input, input, { removeComments: true });
  test_minify(assert, input, input, { removeComments: false });

  input = '<!--! foo --><div>baz</div><!-- bar\n\n moo -->';
  test_minify(assert, input, '<!--! foo --><div>baz</div>', { removeComments: true });
  test_minify(assert, input, input, { removeComments: false });

  input = '<!-- ! test -->';
  test_minify(assert, input, '', { removeComments: true });
  test_minify(assert, input, input, { removeComments: false });

  input = '<div>\n\n   \t<div><div>\n\n<p>\n\n<!--!      \t\n\nbar\n\n moo         -->      \n\n</p>\n\n        </div>  </div></div>';
  output = '<div><div><div><p><!--!      \t\n\nbar\n\n moo         --></p></div></div></div>';
  test_minify(assert, input, input, { removeComments: true });
  test_minify(assert, input, output, { removeComments: true, collapseWhitespace: true });
  test_minify(assert, input, input, { removeComments: false });
  test_minify(assert, input, output, { removeComments: false, collapseWhitespace: true });

  input = '<p rel="<!-- comment in attribute -->" title="<!--! ignored comment in attribute -->">foo</p>';
  test_minify(assert, input, input, { removeComments: true });
});

QUnit.test('conditional comments', function(assert) {
  var input, output;

  input = '<![if IE 5]>test<![endif]>';
  test_minify(assert, input, input, { removeComments: true });

  input = '<!--[if IE 6]>test<![endif]-->';
  test_minify(assert, input, input, { removeComments: true });

  input = '<!--[if IE 7]>-->test<!--<![endif]-->';
  test_minify(assert, input, input, { removeComments: true });

  input = '<!--[if IE 8]><!-->test<!--<![endif]-->';
  test_minify(assert, input, input, { removeComments: true });

  input = '<!--[if lt IE 5.5]>test<![endif]-->';
  test_minify(assert, input, input, { removeComments: true });

  input = '<!--[if (gt IE 5)&(lt IE 7)]>test<![endif]-->';
  test_minify(assert, input, input, { removeComments: true });

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
  test_minify(assert, input, output, {
    minifyJS: true,
    removeComments: true,
    collapseWhitespace: true,
    removeOptionalTags: true,
    removeScriptTypeAttributes: true
  });
  output = '<head><!--[if lte IE 8]><script>alert("ie8!")</script><![endif]-->';
  test_minify(assert, input, output, {
    minifyJS: true,
    removeComments: true,
    collapseWhitespace: true,
    removeOptionalTags: true,
    removeScriptTypeAttributes: true,
    processConditionalComments: true
  });

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
  test_minify(assert, input, output, {
    removeComments: true,
    collapseWhitespace: true
  });
  test_minify(assert, input, output, {
    removeComments: true,
    collapseWhitespace: true,
    processConditionalComments: true
  });
});

QUnit.test('collapsing space in conditional comments', function(assert) {
  var input, output;

  input = '<!--[if IE 7]>\n\n   \t\n   \t\t ' +
            '<link rel="stylesheet" href="/css/ie7-fixes.css" type="text/css" />\n\t' +
          '<![endif]-->';
  test_minify(assert, input, input, { removeComments: true });
  test_minify(assert, input, input, { removeComments: true, collapseWhitespace: true });
  output = '<!--[if IE 7]>\n\n   \t\n   \t\t ' +
             '<link rel="stylesheet" href="/css/ie7-fixes.css" type="text/css">\n\t' +
           '<![endif]-->';
  test_minify(assert, input, output, { removeComments: true, processConditionalComments: true });
  output = '<!--[if IE 7]>' +
             '<link rel="stylesheet" href="/css/ie7-fixes.css" type="text/css">' +
           '<![endif]-->';
  test_minify(assert, input, output, {
    removeComments: true,
    collapseWhitespace: true,
    processConditionalComments: true
  });

  input = '<!--[if lte IE 6]>\n    \n   \n\n\n\t' +
            '<p title=" sigificant     whitespace   ">blah blah</p>' +
          '<![endif]-->';
  test_minify(assert, input, input, { removeComments: true });
  test_minify(assert, input, input, { removeComments: true, collapseWhitespace: true });
  output = '<!--[if lte IE 6]>' +
             '<p title=" sigificant     whitespace   ">blah blah</p>' +
           '<![endif]-->';
  test_minify(assert, input, output, {
    removeComments: true,
    collapseWhitespace: true,
    processConditionalComments: true
  });
});

QUnit.test('remove comments from scripts', function(assert) {
  var input, output;

  input = '<script><!--\nalert(1);\n--></script>';
  test_minify(assert, input, input);
  output = '<script>alert(1)</script>';
  test_minify(assert, input, output, { minifyJS: true });

  input = '<script><!--alert(2);--></script>';
  test_minify(assert, input, input);
  output = '<script></script>';
  test_minify(assert, input, output, { minifyJS: true });

  input = '<script><!--alert(3);\n--></script>';
  test_minify(assert, input, input);
  output = '<script></script>';
  test_minify(assert, input, output, { minifyJS: true });

  input = '<script><!--\nalert(4);--></script>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { minifyJS: true });

  input = '<script><!--alert(5);\nalert(6);\nalert(7);--></script>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { minifyJS: true });

  input = '<script><!--alert(8)</script>';
  test_minify(assert, input, input);
  output = '<script></script>';
  test_minify(assert, input, output, { minifyJS: true });

  input = '<script type="text/javascript"> \n <!--\nalert("-->"); -->\n\n   </script>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { minifyJS: true });

  input = '<script type="text/javascript"> \n <!--\nalert("-->");\n -->\n\n   </script>';
  test_minify(assert, input, input);
  output = '<script type="text/javascript">alert("--\\x3e")</script>';
  test_minify(assert, input, output, { minifyJS: true });

  input = '<script> //   <!--   \n  alert(1)   //  --> </script>';
  test_minify(assert, input, input);
  output = '<script>alert(1)</script>';
  test_minify(assert, input, output, { minifyJS: true });

  input = '<script type="text/html">\n<div>\n</div>\n<!-- aa -->\n</script>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { minifyJS: true });
});

QUnit.test('remove comments from styles', function(assert) {
  var input, output;

  input = '<style><!--\np.a{background:red}\n--></style>';
  test_minify(assert, input, input);
  output = '<style>p.a{background:red}</style>';
  test_minify(assert, input, output, { minifyCSS: true });

  input = '<style><!--p.b{background:red}--></style>';
  test_minify(assert, input, input);
  output = '<style>p.b{background:red}</style>';
  test_minify(assert, input, output, { minifyCSS: true });

  input = '<style><!--p.c{background:red}\n--></style>';
  test_minify(assert, input, input);
  output = '<style>p.c{background:red}</style>';
  test_minify(assert, input, output, { minifyCSS: true });

  input = '<style><!--\np.d{background:red}--></style>';
  test_minify(assert, input, input);
  output = '<style>p.d{background:red}</style>';
  test_minify(assert, input, output, { minifyCSS: true });

  input = '<style><!--p.e{background:red}\np.f{background:red}\np.g{background:red}--></style>';
  test_minify(assert, input, input);
  output = '<style>p.e{background:red}p.f{background:red}p.g{background:red}</style>';
  test_minify(assert, input, output, { minifyCSS: true });

  input = '<style>p.h{background:red}<!--\np.i{background:red}\n-->p.j{background:red}</style>';
  test_minify(assert, input, input);
  output = '<style>p.h{background:red}p.i{background:red}p.j{background:red}</style>';
  test_minify(assert, input, output, { minifyCSS: true });

  input = '<style type="text/css"><!-- p { color: red } --></style>';
  test_minify(assert, input, input);
  output = '<style type="text/css">p{color:red}</style>';
  test_minify(assert, input, output, { minifyCSS: true });

  input = '<style type="text/css">p::before { content: "<!--" }</style>';
  test_minify(assert, input, input);
  output = '<style type="text/css">p::before{content:"<!--"}</style>';
  test_minify(assert, input, output, { minifyCSS: true });

  input = '<style type="text/html">\n<div>\n</div>\n<!-- aa -->\n</style>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { minifyCSS: true });
});

QUnit.test('remove CDATA sections from scripts/styles', function(assert) {
  var input, output;

  input = '<script><![CDATA[\nalert(1)\n]]></script>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { minifyJS: true });

  input = '<script><![CDATA[alert(2)]]></script>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { minifyJS: true });

  input = '<script><![CDATA[alert(3)\n]]></script>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { minifyJS: true });

  input = '<script><![CDATA[\nalert(4)]]></script>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { minifyJS: true });

  input = '<script><![CDATA[alert(5)\nalert(6)\nalert(7)]]></script>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { minifyJS: true });

  input = '<script>/*<![CDATA[*/alert(8)/*]]>*/</script>';
  test_minify(assert, input, input);
  output = '<script>alert(8)</script>';
  test_minify(assert, input, output, { minifyJS: true });

  input = '<script>//<![CDATA[\nalert(9)\n//]]></script>';
  test_minify(assert, input, input);
  output = '<script>alert(9)</script>';
  test_minify(assert, input, output, { minifyJS: true });

  input = '<script type="text/javascript"> /* \n\t  <![CDATA[  */ alert(10) /*  ]]>  */ \n </script>';
  test_minify(assert, input, input);
  output = '<script type="text/javascript">alert(10)</script>';
  test_minify(assert, input, output, { minifyJS: true });

  input = '<script>\n\n//<![CDATA[\nalert(11)//]]></script>';
  test_minify(assert, input, input);
  output = '<script>alert(11)</script>';
  test_minify(assert, input, output, { minifyJS: true });

  input = '<style><![CDATA[\np.a{background:red}\n]]></style>';
  test_minify(assert, input, input);
  output = '<style></style>';
  test_minify(assert, input, output, { minifyCSS: true });

  input = '<style><![CDATA[p.b{background:red}]]></style>';
  test_minify(assert, input, input);
  output = '<style></style>';
  test_minify(assert, input, output, { minifyCSS: true });

  input = '<style><![CDATA[p.c{background:red}\n]]></style>';
  test_minify(assert, input, input);
  output = '<style></style>';
  test_minify(assert, input, output, { minifyCSS: true });

  input = '<style><![CDATA[\np.d{background:red}]]></style>';
  test_minify(assert, input, input);
  output = '<style></style>';
  test_minify(assert, input, output, { minifyCSS: true });

  input = '<style><![CDATA[p.e{background:red}\np.f{background:red}\np.g{background:red}]]></style>';
  test_minify(assert, input, input);
  output = '<style>p.f{background:red}p.g{background:red}</style>';
  test_minify(assert, input, output, { minifyCSS: true });

  input = '<style>p.h{background:red}<![CDATA[\np.i{background:red}\n]]>p.j{background:red}</style>';
  test_minify(assert, input, input);
  output = '<style>p.h{background:red}]]>p.j{background:red}</style>';
  test_minify(assert, input, output, { minifyCSS: true });

  input = '<style>/* <![CDATA[ */p { color: red } // ]]></style>';
  test_minify(assert, input, input);
  output = '<style>p{color:red}</style>';
  test_minify(assert, input, output, { minifyCSS: true });

  input = '<style type="text/html">\n<div>\n</div>\n<![CDATA[ aa ]]>\n</style>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { minifyCSS: true });
});

QUnit.test('custom processors', function(assert) {
  var input, output;

  function css(text, type) {
    return (type || 'Normal') + ' CSS';
  }

  input = '<style>\n.foo { font: 12pt "bar" } </style>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { minifyCSS: null });
  test_minify(assert, input, input, { minifyCSS: false });
  output = '<style>Normal CSS</style>';
  test_minify(assert, input, output, { minifyCSS: css });

  input = '<p style="font: 12pt \'bar\'"></p>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { minifyCSS: null });
  test_minify(assert, input, input, { minifyCSS: false });
  output = '<p style="inline CSS"></p>';
  test_minify(assert, input, output, { minifyCSS: css });

  input = '<link rel="stylesheet" href="css/style-mobile.css" media="(max-width: 737px)">';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { minifyCSS: null });
  test_minify(assert, input, input, { minifyCSS: false });
  output = '<link rel="stylesheet" href="css/style-mobile.css" media="media CSS">';
  test_minify(assert, input, output, { minifyCSS: css });

  input = '<style media="(max-width: 737px)"></style>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { minifyCSS: null });
  test_minify(assert, input, input, { minifyCSS: false });
  output = '<style media="media CSS">Normal CSS</style>';
  test_minify(assert, input, output, { minifyCSS: css });

  function js(text, inline) {
    return inline ? 'Inline JS' : 'Normal JS';
  }

  input = '<script>\nalert(1); </script>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { minifyJS: null });
  test_minify(assert, input, input, { minifyJS: false });
  output = '<script>Normal JS</script>';
  test_minify(assert, input, output, { minifyJS: js });

  input = '<p onload="alert(1);"></p>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { minifyJS: null });
  test_minify(assert, input, input, { minifyJS: false });
  output = '<p onload="Inline JS"></p>';
  test_minify(assert, input, output, { minifyJS: js });

  function url() {
    return 'URL';
  }

  input = '<a href="http://site.com/foo">bar</a>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { minifyURLs: null });
  test_minify(assert, input, input, { minifyURLs: false });
  output = '<a href="URL">bar</a>';
  test_minify(assert, input, output, { minifyURLs: url });

  input = '<style>\n.foo { background: url("http://site.com/foo") } </style>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { minifyURLs: null });
  test_minify(assert, input, input, { minifyURLs: false });
  test_minify(assert, input, input, { minifyURLs: url });
  output = '<style>.foo{background:url(URL)}</style>';
  test_minify(assert, input, output, { minifyCSS: true, minifyURLs: url });
});

QUnit.test('empty attributes', function(assert) {
  var input;

  input = '<p id="" class="" STYLE=" " title="\n" lang="" dir="">x</p>';
  test_minify(assert, input, '<p>x</p>', { removeEmptyAttributes: true });

  input = '<p onclick=""   ondblclick=" " onmousedown="" ONMOUSEUP="" onmouseover=" " onmousemove="" onmouseout="" ' +
          'onkeypress=\n\n  "\n     " onkeydown=\n"" onkeyup\n="">x</p>';
  test_minify(assert, input, '<p>x</p>', { removeEmptyAttributes: true });

  input = '<input onfocus="" onblur="" onchange=" " value=" boo ">';
  test_minify(assert, input, '<input value=" boo ">', { removeEmptyAttributes: true });

  input = '<input value="" name="foo">';
  test_minify(assert, input, '<input name="foo">', { removeEmptyAttributes: true });

  input = '<img src="" alt="">';
  test_minify(assert, input, '<img src="" alt="">', { removeEmptyAttributes: true });

  // preserve unrecognized attribute
  // remove recognized attrs with unspecified values
  input = '<div data-foo class id style title lang dir onfocus onblur onchange onclick ondblclick onmousedown onmouseup onmouseover onmousemove onmouseout onkeypress onkeydown onkeyup></div>';
  test_minify(assert, input, '<div data-foo></div>', { removeEmptyAttributes: true });

  // additional remove attributes
  input = '<img src="" alt="">';
  test_minify(assert, input, '<img alt="">', { removeEmptyAttributes: function(attrName, tag) { return tag === 'img' && attrName === 'src'; } });
});

QUnit.test('cleaning class/style attributes', function(assert) {
  var input, output;

  input = '<p class=" foo bar  ">foo bar baz</p>';
  test_minify(assert, input, '<p class="foo bar">foo bar baz</p>');

  input = '<p class=" foo      ">foo bar baz</p>';
  test_minify(assert, input, '<p class="foo">foo bar baz</p>');
  test_minify(assert, input, '<p class=foo>foo bar baz</p>', { removeAttributeQuotes: true });

  input = '<p class="\n  \n foo   \n\n\t  \t\n   ">foo bar baz</p>';
  output = '<p class="foo">foo bar baz</p>';
  test_minify(assert, input, output);

  input = '<p class="\n  \n foo   \n\n\t  \t\n  class1 class-23 ">foo bar baz</p>';
  output = '<p class="foo class1 class-23">foo bar baz</p>';
  test_minify(assert, input, output);

  input = '<p style="    color: red; background-color: rgb(100, 75, 200);  "></p>';
  output = '<p style="color: red; background-color: rgb(100, 75, 200);"></p>';
  test_minify(assert, input, output);

  input = '<p style="font-weight: bold  ; "></p>';
  output = '<p style="font-weight: bold;"></p>';
  test_minify(assert, input, output);
});

QUnit.test('cleaning URI-based attributes', function(assert) {
  var input, output;

  input = '<a href="   http://example.com  ">x</a>';
  output = '<a href="http://example.com">x</a>';
  test_minify(assert, input, output);

  input = '<a href="  \t\t  \n \t  ">x</a>';
  output = '<a href="">x</a>';
  test_minify(assert, input, output);

  input = '<img src="   http://example.com  " title="bleh   " longdesc="  http://example.com/longdesc \n\n   \t ">';
  output = '<img src="http://example.com" title="bleh   " longdesc="http://example.com/longdesc">';
  test_minify(assert, input, output);

  input = '<img src="" usemap="   http://example.com  ">';
  output = '<img src="" usemap="http://example.com">';
  test_minify(assert, input, output);

  input = '<form action="  somePath/someSubPath/someAction?foo=bar&baz=qux     "></form>';
  output = '<form action="somePath/someSubPath/someAction?foo=bar&baz=qux"></form>';
  test_minify(assert, input, output);

  input = '<BLOCKQUOTE cite=" \n\n\n http://www.mycom.com/tolkien/twotowers.html     "><P>foobar</P></BLOCKQUOTE>';
  output = '<blockquote cite="http://www.mycom.com/tolkien/twotowers.html"><p>foobar</p></blockquote>';
  test_minify(assert, input, output);

  input = '<head profile="       http://gmpg.org/xfn/11    "></head>';
  output = '<head profile="http://gmpg.org/xfn/11"></head>';
  test_minify(assert, input, output);

  input = '<object codebase="   http://example.com  "></object>';
  output = '<object codebase="http://example.com"></object>';
  test_minify(assert, input, output);

  input = '<span profile="   1, 2, 3  ">foo</span>';
  test_minify(assert, input, input);

  input = '<div action="  foo-bar-baz ">blah</div>';
  test_minify(assert, input, input);
});

QUnit.test('cleaning Number-based attributes', function(assert) {
  var input, output;

  input = '<a href="#" tabindex="   1  ">x</a><button tabindex="   2  ">y</button>';
  output = '<a href="#" tabindex="1">x</a><button tabindex="2">y</button>';
  test_minify(assert, input, output);

  input = '<input value="" maxlength="     5 ">';
  output = '<input value="" maxlength="5">';
  test_minify(assert, input, output);

  input = '<select size="  10   \t\t "><option>x</option></select>';
  output = '<select size="10"><option>x</option></select>';
  test_minify(assert, input, output);

  input = '<textarea rows="   20  " cols="  30      "></textarea>';
  output = '<textarea rows="20" cols="30"></textarea>';
  test_minify(assert, input, output);

  input = '<COLGROUP span="   40  "><COL span="  39 "></COLGROUP>';
  output = '<colgroup span="40"><col span="39"></colgroup>';
  test_minify(assert, input, output);

  input = '<tr><td colspan="    2   ">x</td><td rowspan="   3 "></td></tr>';
  output = '<tr><td colspan="2">x</td><td rowspan="3"></td></tr>';
  test_minify(assert, input, output);
});

QUnit.test('cleaning other attributes', function(assert) {
  var input, output;

  input = '<a href="#" onclick="  window.prompt(\'boo\'); " onmouseover=" \n\n alert(123)  \t \n\t  ">blah</a>';
  output = '<a href="#" onclick="window.prompt(\'boo\');" onmouseover="alert(123)">blah</a>';
  test_minify(assert, input, output);

  input = '<body onload="  foo();   bar() ;  "><p>x</body>';
  output = '<body onload="foo();   bar() ;"><p>x</p></body>';
  test_minify(assert, input, output);
});

QUnit.test('removing redundant attributes (&lt;form method="get" ...>)', function(assert) {
  var input;

  input = '<form method="get">hello world</form>';
  test_minify(assert, input, '<form>hello world</form>', { removeRedundantAttributes: true });

  input = '<form method="post">hello world</form>';
  test_minify(assert, input, '<form method="post">hello world</form>', { removeRedundantAttributes: true });
});

QUnit.test('removing redundant attributes (&lt;input type="text" ...>)', function(assert) {
  var input;

  input = '<input type="text">';
  test_minify(assert, input, '<input>', { removeRedundantAttributes: true });

  input = '<input type="  TEXT  " value="foo">';
  test_minify(assert, input, '<input value="foo">', { removeRedundantAttributes: true });

  input = '<input type="checkbox">';
  test_minify(assert, input, '<input type="checkbox">', { removeRedundantAttributes: true });
});

QUnit.test('removing redundant attributes (&lt;a name="..." id="..." ...>)', function(assert) {
  var input;

  input = '<a id="foo" name="foo">blah</a>';
  test_minify(assert, input, '<a id="foo">blah</a>', { removeRedundantAttributes: true });

  input = '<input id="foo" name="foo">';
  test_minify(assert, input, input, { removeRedundantAttributes: true });

  input = '<a name="foo">blah</a>';
  test_minify(assert, input, input, { removeRedundantAttributes: true });

  input = '<a href="..." name="  bar  " id="bar" >blah</a>';
  test_minify(assert, input, '<a href="..." id="bar">blah</a>', { removeRedundantAttributes: true });
});

QUnit.test('removing redundant attributes (&lt;script src="..." charset="...">)', function(assert) {
  var input, output;

  input = '<script type="text/javascript" charset="UTF-8">alert(222);</script>';
  output = '<script type="text/javascript">alert(222);</script>';
  test_minify(assert, input, output, { removeRedundantAttributes: true });

  input = '<script type="text/javascript" src="http://example.com" charset="UTF-8">alert(222);</script>';
  test_minify(assert, input, input, { removeRedundantAttributes: true });

  input = '<script CHARSET=" ... ">alert(222);</script>';
  output = '<script>alert(222);</script>';
  test_minify(assert, input, output, { removeRedundantAttributes: true });
});

QUnit.test('removing redundant attributes (&lt;... language="javascript" ...>)', function(assert) {
  var input;

  input = '<script language="Javascript">x=2,y=4</script>';
  test_minify(assert, input, '<script>x=2,y=4</script>', { removeRedundantAttributes: true });

  input = '<script LANGUAGE = "  javaScript  ">x=2,y=4</script>';
  test_minify(assert, input, '<script>x=2,y=4</script>', { removeRedundantAttributes: true });
});

QUnit.test('removing redundant attributes (&lt;area shape="rect" ...>)', function(assert) {
  var input = '<area shape="rect" coords="696,25,958,47" href="#" title="foo">';
  var output = '<area coords="696,25,958,47" href="#" title="foo">';
  test_minify(assert, input, output, { removeRedundantAttributes: true });
});

QUnit.test('removing redundant attributes (&lt;... = "javascript: ..." ...>)', function(assert) {
  var input;

  input = '<p onclick="javascript:alert(1)">x</p>';
  test_minify(assert, input, '<p onclick="alert(1)">x</p>');

  input = '<p onclick="javascript:x">x</p>';
  test_minify(assert, input, '<p onclick=x>x</p>', { removeAttributeQuotes: true });

  input = '<p onclick=" JavaScript: x">x</p>';
  test_minify(assert, input, '<p onclick="x">x</p>');

  input = '<p title="javascript:(function() { /* some stuff here */ })()">x</p>';
  test_minify(assert, input, input);
});

QUnit.test('removing javascript type attributes', function(assert) {
  var input, output;

  input = '<script type="">alert(1)</script>';
  test_minify(assert, input, input, { removeScriptTypeAttributes: false });
  output = '<script>alert(1)</script>';
  test_minify(assert, input, output, { removeScriptTypeAttributes: true });

  input = '<script type="text/javascript">alert(1)</script>';
  test_minify(assert, input, input, { removeScriptTypeAttributes: false });
  output = '<script>alert(1)</script>';
  test_minify(assert, input, output, { removeScriptTypeAttributes: true });

  input = '<SCRIPT TYPE="  text/javascript ">alert(1)</script>';
  output = '<script>alert(1)</script>';
  test_minify(assert, input, output, { removeScriptTypeAttributes: true });

  input = '<script type="application/javascript;version=1.8">alert(1)</script>';
  output = '<script>alert(1)</script>';
  test_minify(assert, input, output, { removeScriptTypeAttributes: true });

  input = '<script type="text/vbscript">MsgBox("foo bar")</script>';
  output = '<script type="text/vbscript">MsgBox("foo bar")</script>';
  test_minify(assert, input, output, { removeScriptTypeAttributes: true });
});

QUnit.test('removing type="text/css" attributes', function(assert) {
  var input, output;

  input = '<style type="">.foo { color: red }</style>';
  test_minify(assert, input, input, { removeStyleLinkTypeAttributes: false });
  output = '<style>.foo { color: red }</style>';
  test_minify(assert, input, output, { removeStyleLinkTypeAttributes: true });

  input = '<style type="text/css">.foo { color: red }</style>';
  test_minify(assert, input, input, { removeStyleLinkTypeAttributes: false });
  output = '<style>.foo { color: red }</style>';
  test_minify(assert, input, output, { removeStyleLinkTypeAttributes: true });

  input = '<STYLE TYPE = "  text/CSS ">body { font-size: 1.75em }</style>';
  output = '<style>body { font-size: 1.75em }</style>';
  test_minify(assert, input, output, { removeStyleLinkTypeAttributes: true });

  input = '<style type="text/plain">.foo { background: green }</style>';
  test_minify(assert, input, input, { removeStyleLinkTypeAttributes: true });

  input = '<link rel="stylesheet" type="text/css" href="http://example.com">';
  output = '<link rel="stylesheet" href="http://example.com">';
  test_minify(assert, input, output, { removeStyleLinkTypeAttributes: true });

  input = '<link rel="alternate" type="application/atom+xml" href="data.xml">';
  test_minify(assert, input, input, { removeStyleLinkTypeAttributes: true });
});

QUnit.test('removing attribute quotes', function(assert) {
  var input;

  input = '<p title="blah" class="a23B-foo.bar_baz:qux" id="moo">foo</p>';
  test_minify(assert, input, '<p title=blah class=a23B-foo.bar_baz:qux id=moo>foo</p>', { removeAttributeQuotes: true });

  input = '<input value="hello world">';
  test_minify(assert, input, '<input value="hello world">', { removeAttributeQuotes: true });

  input = '<a href="#" title="foo#bar">x</a>';
  test_minify(assert, input, '<a href=# title=foo#bar>x</a>', { removeAttributeQuotes: true });

  input = '<a href="http://example.com/" title="blah">\nfoo\n\n</a>';
  test_minify(assert, input, '<a href=http://example.com/ title=blah>\nfoo\n\n</a>', { removeAttributeQuotes: true });

  input = '<a title="blah" href="http://example.com/">\nfoo\n\n</a>';
  test_minify(assert, input, '<a title=blah href=http://example.com/ >\nfoo\n\n</a>', { removeAttributeQuotes: true });

  input = '<a href="http://example.com/" title="">\nfoo\n\n</a>';
  test_minify(assert, input, '<a href=http://example.com/ >\nfoo\n\n</a>', { removeAttributeQuotes: true, removeEmptyAttributes: true });

  input = '<p class=foo|bar:baz></p>';
  test_minify(assert, input, '<p class=foo|bar:baz></p>', { removeAttributeQuotes: true });
});

QUnit.test('preserving custom attribute-wrapping markup', function(assert) {
  var input, customAttrOptions;

  // With a single rule
  customAttrOptions = {
    customAttrSurround: [[/\{\{#if\s+\w+\}\}/, /\{\{\/if\}\}/]]
  };

  input = '<input {{#if value}}checked="checked"{{/if}}>';
  test_minify(assert, input, input, customAttrOptions);

  input = '<input checked="checked">';
  test_minify(assert, input, input, customAttrOptions);

  // With multiple rules
  customAttrOptions = {
    customAttrSurround: [
      [/\{\{#if\s+\w+\}\}/, /\{\{\/if\}\}/],
      [/\{\{#unless\s+\w+\}\}/, /\{\{\/unless\}\}/]
    ]
  };

  input = '<input {{#if value}}checked="checked"{{/if}}>';
  test_minify(assert, input, input, customAttrOptions);

  input = '<input {{#unless value}}checked="checked"{{/unless}}>';
  test_minify(assert, input, input, customAttrOptions);

  input = '<input {{#if value1}}data-attr="example" {{/if}}{{#unless value2}}checked="checked"{{/unless}}>';
  test_minify(assert, input, input, customAttrOptions);

  input = '<input checked="checked">';
  test_minify(assert, input, input, customAttrOptions);

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
  test_minify(assert, input, '<input {{#if value}}checked{{/if}}>', customAttrOptions);

  input = '<input {{#if value1}}checked="checked"{{/if}} {{#if value2}}data-attr="foo"{{/if}}/>';
  test_minify(assert, input, '<input {{#if value1}}checked {{/if}}{{#if value2}}data-attr=foo{{/if}}>', customAttrOptions);

  customAttrOptions.keepClosingSlash = true;
  test_minify(assert, input, '<input {{#if value1}}checked {{/if}}{{#if value2}}data-attr=foo {{/if}}/>', customAttrOptions);
});

QUnit.test('preserving custom attribute-joining markup', function(assert) {
  var input;
  var polymerConditionalAttributeJoin = /\?=/;
  var customAttrOptions = {
    customAttrAssign: [polymerConditionalAttributeJoin]
  };
  input = '<div flex?="{{mode != cover}}"></div>';
  test_minify(assert, input, input, customAttrOptions);
  input = '<div flex?="{{mode != cover}}" class="foo"></div>';
  test_minify(assert, input, input, customAttrOptions);
});

QUnit.test('collapsing whitespace', function(assert) {
  var input, output;

  input = '<script type="text/javascript">  \n\t   alert(1) \n\n\n  \t </script>';
  output = '<script type="text/javascript">alert(1)</script>';
  test_minify(assert, input, output, { collapseWhitespace: true });

  input = '<p>foo</p>    <p> bar</p>\n\n   \n\t\t  <div title="quz">baz  </div>';
  output = '<p>foo</p><p>bar</p><div title="quz">baz</div>';
  test_minify(assert, input, output, { collapseWhitespace: true });

  input = '<p> foo    bar</p>';
  output = '<p>foo bar</p>';
  test_minify(assert, input, output, { collapseWhitespace: true });

  input = '<p>foo\nbar</p>';
  output = '<p>foo bar</p>';
  test_minify(assert, input, output, { collapseWhitespace: true });

  input = '<p> foo    <span>  blah     <i>   22</i>    </span> bar <img src=""></p>';
  output = '<p>foo <span>blah <i>22</i> </span>bar <img src=""></p>';
  test_minify(assert, input, output, { collapseWhitespace: true });

  input = '<textarea> foo bar     baz \n\n   x \t    y </textarea>';
  output = '<textarea> foo bar     baz \n\n   x \t    y </textarea>';
  test_minify(assert, input, output, { collapseWhitespace: true });

  input = '<div><textarea></textarea>    </div>';
  output = '<div><textarea></textarea></div>';
  test_minify(assert, input, output, { collapseWhitespace: true });

  input = '<div><pRe> $foo = "baz"; </pRe>    </div>';
  output = '<div><pre> $foo = "baz"; </pre></div>';
  test_minify(assert, input, output, { collapseWhitespace: true });
  output = '<div><pRe>$foo = "baz";</pRe></div>';
  test_minify(assert, input, output, { collapseWhitespace: true, caseSensitive: true });

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
  test_minify(assert, input, output, { collapseWhitespace: true });

  input = '<pre title="some title...">   hello     world </pre>';
  output = '<pre title="some title...">   hello     world </pre>';
  test_minify(assert, input, output, { collapseWhitespace: true });

  input = '<pre title="some title..."><code>   hello     world </code></pre>';
  output = '<pre title="some title..."><code>   hello     world </code></pre>';
  test_minify(assert, input, output, { collapseWhitespace: true });

  input = '<script>alert("foo     bar")    </script>';
  output = '<script>alert("foo     bar")</script>';
  test_minify(assert, input, output, { collapseWhitespace: true });

  input = '<style>alert("foo     bar")    </style>';
  output = '<style>alert("foo     bar")</style>';
  test_minify(assert, input, output, { collapseWhitespace: true });
});

QUnit.test('removing empty elements', function(assert) {
  var input, output;

  test_minify(assert, '<p>x</p>', '<p>x</p>', { removeEmptyElements: true });
  test_minify(assert, '<p></p>', '', { removeEmptyElements: true });

  input = '<p>foo<span>bar</span><span></span></p>';
  output = '<p>foo<span>bar</span></p>';
  test_minify(assert, input, output, { removeEmptyElements: true });

  input = '<a href="http://example/com" title="hello world"></a>';
  output = '';
  test_minify(assert, input, output, { removeEmptyElements: true });

  input = '<iframe></iframe>';
  output = '';
  test_minify(assert, input, output, { removeEmptyElements: true });

  input = '<iframe src="page.html"></iframe>';
  test_minify(assert, input, input, { removeEmptyElements: true });

  input = '<iframe srcdoc="<h1>Foo</h1>"></iframe>';
  test_minify(assert, input, input, { removeEmptyElements: true });

  input = '<video></video>';
  output = '';
  test_minify(assert, input, output, { removeEmptyElements: true });

  input = '<video src="preview.ogg"></video>';
  test_minify(assert, input, input, { removeEmptyElements: true });

  input = '<audio autoplay></audio>';
  output = '';
  test_minify(assert, input, output, { removeEmptyElements: true });

  input = '<audio src="startup.mp3" autoplay></audio>';
  test_minify(assert, input, input, { removeEmptyElements: true });

  input = '<object type="application/x-shockwave-flash"></object>';
  output = '';
  test_minify(assert, input, output, { removeEmptyElements: true });

  input = '<object data="game.swf" type="application/x-shockwave-flash"></object>';
  test_minify(assert, input, input, { removeEmptyElements: true });

  input = '<applet archive="game.zip" width="250" height="150"></applet>';
  output = '';
  test_minify(assert, input, output, { removeEmptyElements: true });

  input = '<applet code="game.class" archive="game.zip" width="250" height="150"></applet>';
  test_minify(assert, input, input, { removeEmptyElements: true });

  input = '<textarea cols="10" rows="10"></textarea>';
  test_minify(assert, input, input, { removeEmptyElements: true });

  input = '<div>hello<span>world</span></div>';
  test_minify(assert, input, input, { removeEmptyElements: true });

  input = '<p>x<span title="<" class="blah-moo"></span></p>';
  output = '<p>x</p>';
  test_minify(assert, input, output, { removeEmptyElements: true });

  input = '<div>x<div>y <div>blah</div><div></div>foo</div>z</div>';
  output = '<div>x<div>y <div>blah</div>foo</div>z</div>';
  test_minify(assert, input, output, { removeEmptyElements: true });

  input = '<img src="">';
  test_minify(assert, input, input, { removeEmptyElements: true });

  input = '<p><!-- x --></p>';
  output = '';
  test_minify(assert, input, output, { removeEmptyElements: true });

  input = '<script src="foo.js"></script>';
  test_minify(assert, input, input, { removeEmptyElements: true });
  input = '<script></script>';
  test_minify(assert, input, '', { removeEmptyElements: true });

  input = '<div>after<span></span> </div>';
  output = '<div>after </div>';
  test_minify(assert, input, output, { removeEmptyElements: true });
  output = '<div>after</div>';
  test_minify(assert, input, output, { collapseWhitespace: true, removeEmptyElements: true });

  input = '<div>before <span></span></div>';
  output = '<div>before </div>';
  test_minify(assert, input, output, { removeEmptyElements: true });
  output = '<div>before</div>';
  test_minify(assert, input, output, { collapseWhitespace: true, removeEmptyElements: true });

  input = '<div>both <span></span> </div>';
  output = '<div>both  </div>';
  test_minify(assert, input, output, { removeEmptyElements: true });
  output = '<div>both</div>';
  test_minify(assert, input, output, { collapseWhitespace: true, removeEmptyElements: true });

  input = '<div>unary <span></span><link></div>';
  output = '<div>unary <link></div>';
  test_minify(assert, input, output, { removeEmptyElements: true });
  output = '<div>unary<link></div>';
  test_minify(assert, input, output, { collapseWhitespace: true, removeEmptyElements: true });

  input = '<div>Empty <!-- NOT --> </div>';
  test_minify(assert, input, input, { removeEmptyElements: true });
  output = '<div>Empty<!-- NOT --></div>';
  test_minify(assert, input, output, { collapseWhitespace: true, removeEmptyElements: true });
});

QUnit.test('collapsing boolean attributes', function(assert) {
  var input, output;

  input = '<input disabled="disabled">';
  test_minify(assert, input, '<input disabled>', { collapseBooleanAttributes: true });

  input = '<input CHECKED = "checked" readonly="readonly">';
  test_minify(assert, input, '<input checked readonly>', { collapseBooleanAttributes: true });

  input = '<option name="blah" selected="selected">moo</option>';
  test_minify(assert, input, '<option name="blah" selected>moo</option>', { collapseBooleanAttributes: true });

  input = '<input autofocus="autofocus">';
  test_minify(assert, input, '<input autofocus>', { collapseBooleanAttributes: true });

  input = '<input required="required">';
  test_minify(assert, input, '<input required>', { collapseBooleanAttributes: true });

  input = '<input multiple="multiple">';
  test_minify(assert, input, '<input multiple>', { collapseBooleanAttributes: true });

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
  test_minify(assert, input, output, { collapseBooleanAttributes: true });
  output = '<div Allowfullscreen Async Autofocus Autoplay Checked Compact Controls Declare Default Defaultchecked ' +
    'Defaultmuted Defaultselected Defer Disabled Enabled Formnovalidate Hidden Indeterminate Inert ' +
    'Ismap Itemscope Loop Multiple Muted Nohref Noresize Noshade Novalidate Nowrap Open Pauseonexit Readonly ' +
    'Required Reversed Scoped Seamless Selected Sortable Truespeed Typemustmatch Visible></div>';
  test_minify(assert, input, output, { collapseBooleanAttributes: true, caseSensitive: true });
});

QUnit.test('collapsing enumerated attributes', function(assert) {
  test_minify(assert, '<div draggable="auto"></div>', '<div draggable></div>', { collapseBooleanAttributes: true });
  test_minify(assert, '<div draggable="true"></div>', '<div draggable="true"></div>', { collapseBooleanAttributes: true });
  test_minify(assert, '<div draggable="false"></div>', '<div draggable="false"></div>', { collapseBooleanAttributes: true });
  test_minify(assert, '<div draggable="foo"></div>', '<div draggable></div>', { collapseBooleanAttributes: true });
  test_minify(assert, '<div draggable></div>', '<div draggable></div>', { collapseBooleanAttributes: true });
  test_minify(assert, '<div Draggable="auto"></div>', '<div draggable></div>', { collapseBooleanAttributes: true });
  test_minify(assert, '<div Draggable="true"></div>', '<div draggable="true"></div>', { collapseBooleanAttributes: true });
  test_minify(assert, '<div Draggable="false"></div>', '<div draggable="false"></div>', { collapseBooleanAttributes: true });
  test_minify(assert, '<div Draggable="foo"></div>', '<div draggable></div>', { collapseBooleanAttributes: true });
  test_minify(assert, '<div Draggable></div>', '<div draggable></div>', { collapseBooleanAttributes: true });
  test_minify(assert, '<div draggable="Auto"></div>', '<div draggable></div>', { collapseBooleanAttributes: true });
});

QUnit.test('keeping trailing slashes in tags', function(assert) {
  test_minify(assert, '<img src="test"/>', '<img src="test"/>', { keepClosingSlash: true });
  // https://github.com/kangax/html-minifier/issues/233
  test_minify(assert, '<img src="test"/>', '<img src=test />', { keepClosingSlash: true, removeAttributeQuotes: true });
  test_minify(assert, '<img src="test" id=""/>', '<img src=test />', { keepClosingSlash: true, removeAttributeQuotes: true, removeEmptyAttributes: true });
  test_minify(assert, '<img title="foo" src="test"/>', '<img title=foo src=test />', { keepClosingSlash: true, removeAttributeQuotes: true });
});

QUnit.test('removing optional tags', function(assert) {
  var input, output;

  input = '<p>foo';
  test_minify(assert, input, input, { removeOptionalTags: true });

  input = '</p>';
  output = '<p>';
  test_minify(assert, input, output, { removeOptionalTags: true });

  input = '<body></body>';
  output = '';
  test_minify(assert, input, output, { removeOptionalTags: true });
  test_minify(assert, input, output, { removeOptionalTags: true, removeEmptyElements: true });

  input = '<html><head></head><body></body></html>';
  output = '';
  test_minify(assert, input, output, { removeOptionalTags: true });
  test_minify(assert, input, output, { removeOptionalTags: true, removeEmptyElements: true });

  input = ' <html></html>';
  output = ' ';
  test_minify(assert, input, output, { removeOptionalTags: true });
  output = '';
  test_minify(assert, input, output, { collapseWhitespace: true, removeOptionalTags: true });

  input = '<html> </html>';
  output = ' ';
  test_minify(assert, input, output, { removeOptionalTags: true });
  output = '';
  test_minify(assert, input, output, { collapseWhitespace: true, removeOptionalTags: true });

  input = '<html></html> ';
  output = ' ';
  test_minify(assert, input, output, { removeOptionalTags: true });
  output = '';
  test_minify(assert, input, output, { collapseWhitespace: true, removeOptionalTags: true });

  input = ' <html><body></body></html>';
  output = ' ';
  test_minify(assert, input, output, { removeOptionalTags: true });
  output = '';
  test_minify(assert, input, output, { collapseWhitespace: true, removeOptionalTags: true });

  input = '<html> <body></body></html>';
  output = ' ';
  test_minify(assert, input, output, { removeOptionalTags: true });
  output = '';
  test_minify(assert, input, output, { collapseWhitespace: true, removeOptionalTags: true });

  input = '<html><body> </body></html>';
  output = '<body> ';
  test_minify(assert, input, output, { removeOptionalTags: true });
  output = '';
  test_minify(assert, input, output, { collapseWhitespace: true, removeOptionalTags: true });

  input = '<html><body></body> </html>';
  output = ' ';
  test_minify(assert, input, output, { removeOptionalTags: true });
  output = '';
  test_minify(assert, input, output, { collapseWhitespace: true, removeOptionalTags: true });

  input = '<html><body></body></html> ';
  output = ' ';
  test_minify(assert, input, output, { removeOptionalTags: true });
  output = '';
  test_minify(assert, input, output, { collapseWhitespace: true, removeOptionalTags: true });

  input = '<html><head><title>hello</title></head><body><p>foo<span>bar</span></p></body></html>';
  test_minify(assert, input, input);
  output = '<title>hello</title><p>foo<span>bar</span>';
  test_minify(assert, input, output, { removeOptionalTags: true });

  input = '<html lang=""><head><title>hello</title></head><body style=""><p>foo<span>bar</span></p></body></html>';
  output = '<html lang=""><title>hello</title><body style=""><p>foo<span>bar</span>';
  test_minify(assert, input, output, { removeOptionalTags: true });
  output = '<title>hello</title><p>foo<span>bar</span>';
  test_minify(assert, input, output, { removeOptionalTags: true, removeEmptyAttributes: true });

  input = '<html><head><title>a</title><link href="b.css" rel="stylesheet"/></head><body><a href="c.html"></a><div class="d"><input value="e"/></div></body></html>';
  output = '<title>a</title><link href="b.css" rel="stylesheet"><a href="c.html"></a><div class="d"><input value="e"></div>';
  test_minify(assert, input, output, { removeOptionalTags: true });

  input = '<!DOCTYPE html><html><head><title>Blah</title></head><body><div><p>This is some text in a div</p><details>Followed by some details</details></div><div><p>This is some more text in a div</p></div></body></html>';
  output = '<!DOCTYPE html><title>Blah</title><div><p>This is some text in a div<details>Followed by some details</details></div><div><p>This is some more text in a div</div>';
  test_minify(assert, input, output, { removeOptionalTags: true });

  input = '<!DOCTYPE html><html><head><title>Blah</title></head><body><noscript><p>This is some text in a noscript</p><details>Followed by some details</details></noscript><noscript><p>This is some more text in a noscript</p></noscript></body></html>';
  output = '<!DOCTYPE html><title>Blah</title><body><noscript><p>This is some text in a noscript<details>Followed by some details</details></noscript><noscript><p>This is some more text in a noscript</p></noscript>';
  test_minify(assert, input, output, { removeOptionalTags: true });

  input = '<md-list-item ui-sref=".app-config"><md-icon md-font-icon="mdi-settings"></md-icon><p translate>Configure</p></md-list-item>';
  test_minify(assert, input, input, { removeOptionalTags: true });
});

QUnit.test('removing optional tags in tables', function(assert) {
  var input, output;

  input = '<table>' +
            '<thead><tr><th>foo</th><th>bar</th> <th>baz</th></tr></thead> ' +
            '<tbody><tr><td>boo</td><td>moo</td><td>loo</td></tr> </tbody>' +
            '<tfoot><tr><th>baz</th> <th>qux</th><td>boo</td></tr></tfoot>' +
          '</table>';
  test_minify(assert, input, input);

  output = '<table>' +
             '<thead><tr><th>foo<th>bar</th> <th>baz</thead> ' +
             '<tr><td>boo<td>moo<td>loo</tr> ' +
             '<tfoot><tr><th>baz</th> <th>qux<td>boo' +
           '</table>';
  test_minify(assert, input, output, { removeOptionalTags: true });

  output = '<table>' +
             '<thead><tr><th>foo<th>bar<th>baz' +
             '<tbody><tr><td>boo<td>moo<td>loo' +
             '<tfoot><tr><th>baz<th>qux<td>boo' +
           '</table>';
  test_minify(assert, input, output, { collapseWhitespace: true, removeOptionalTags: true });
  test_minify(assert, output, output, { collapseWhitespace: true, removeOptionalTags: true });

  input = '<table>' +
            '<caption>foo</caption>' +
            '<!-- blah -->' +
            '<colgroup><col span="2"><col></colgroup>' +
            '<!-- blah -->' +
            '<tbody><tr><th>bar</th><td>baz</td><th>qux</th></tr></tbody>' +
          '</table>';
  test_minify(assert, input, input);

  output = '<table>' +
             '<caption>foo</caption>' +
             '<!-- blah -->' +
             '<col span="2"><col></colgroup>' +
             '<!-- blah -->' +
             '<tr><th>bar<td>baz<th>qux' +
           '</table>';
  test_minify(assert, input, output, { removeOptionalTags: true });
  test_minify(assert, output, output, { removeOptionalTags: true });

  output = '<table>' +
             '<caption>foo' +
             '<col span="2"><col>' +
             '<tr><th>bar<td>baz<th>qux' +
           '</table>';
  test_minify(assert, input, output, { removeComments: true, removeOptionalTags: true });

  input = '<table>' +
            '<tbody></tbody>' +
          '</table>';
  test_minify(assert, input, input);

  output = '<table><tbody></table>';
  test_minify(assert, input, output, { removeOptionalTags: true });
});

QUnit.test('removing optional tags in options', function(assert) {
  var input, output;

  input = '<select><option>foo</option><option>bar</option></select>';
  output = '<select><option>foo<option>bar</select>';
  test_minify(assert, input, output, { removeOptionalTags: true });

  input = '<select>\n' +
          '  <option>foo</option>\n' +
          '  <option>bar</option>\n' +
          '</select>';
  test_minify(assert, input, input, { removeOptionalTags: true });
  output = '<select><option>foo<option>bar</select>';
  test_minify(assert, input, output, { removeOptionalTags: true, collapseWhitespace: true });
  output = '<select> <option>foo</option> <option>bar</option> </select>';
  test_minify(assert, input, output, { removeOptionalTags: true, collapseWhitespace: true, conservativeCollapse: true });

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

  test_minify(assert, input, output, { removeOptionalTags: true });
});

QUnit.test('custom components', function(assert) {
  var input = '<custom-component>Oh, my.</custom-component>';
  var output = '<custom-component>Oh, my.</custom-component>';
  test_minify(assert, input, output);
});

QUnit.test('HTML4: anchor with inline elements', function(assert) {
  var input = '<a href="#"><span>Well, look at me! I\'m a span!</span></a>';
  test_minify(assert, input, input, { html5: false });
});

QUnit.test('HTML5: anchor with inline elements', function(assert) {
  var input = '<a href="#"><span>Well, look at me! I\'m a span!</span></a>';
  test_minify(assert, input, input, { html5: true });
});

QUnit.test('HTML4: anchor with block elements', function(assert) {
  var input = '<a href="#"><div>Well, look at me! I\'m a div!</div></a>';
  var output = '<a href="#"></a><div>Well, look at me! I\'m a div!</div>';
  test_minify(assert, input, output, { html5: false });
});

QUnit.test('HTML5: anchor with block elements', function(assert) {
  var input = '<a href="#"><div>Well, look at me! I\'m a div!</div></a>';
  var output = '<a href="#"><div>Well, look at me! I\'m a div!</div></a>';
  test_minify(assert, input, output, { html5: true });
});

QUnit.test('HTML5: enabled by default', function(assert) {
  var input = '<a href="#"><div>Well, look at me! I\'m a div!</div></a>';
  test_minify(assert, input, minify(input), { html5: true });
});

QUnit.test('phrasing content', function(assert) {
  var input, output;

  input = '<p>a<div>b</div>';
  output = '<p>a</p><div>b</div>';
  test_minify(assert, input, output, { html5: true });
  output = '<p>a<div>b</div></p>';
  test_minify(assert, input, output, { html5: false });

  input = '<label>a<div>b</div>c</label>';
  test_minify(assert, input, input, { html5: true });
});

// https://github.com/kangax/html-minifier/issues/888
QUnit.test('ul/ol should be phrasing content', function(assert) {
  var input, output;

  input = '<p>a<ul><li>item</li></ul>';
  output = '<p>a</p><ul><li>item</li></ul>';
  test_minify(assert, input, output, { html5: true });

  output = '<p>a<ul><li>item</ul>';
  test_minify(assert, input, output, { html5: true, removeOptionalTags: true });

  output = '<p>a<ul><li>item</li></ul></p>';
  test_minify(assert, input, output, { html5: false });

  input = '<p>a<ol><li>item</li></ol></p>';
  output = '<p>a</p><ol><li>item</li></ol><p></p>';
  test_minify(assert, input, output, { html5: true });

  output = '<p>a<ol><li>item</ol><p>';
  test_minify(assert, input, output, { html5: true, removeOptionalTags: true });

  output = '<p>a</p><ol><li>item</li></ol>';
  test_minify(assert, input, output, { html5: true, removeEmptyElements: true });
});

QUnit.test('phrasing content with Web Components', function(assert) {
  var input = '<span><phrasing-element></phrasing-element></span>';
  var output = '<span><phrasing-element></phrasing-element></span>';
  test_minify(assert, input, output, { html5: true });
});

// https://github.com/kangax/html-minifier/issues/10
QUnit.test('Ignore custom fragments', function(assert) {
  var input, output;
  var reFragments = [/<\?[^?]+\?>/, /<%[^%]+%>/, /\{\{[^}]*\}\}/];

  input = 'This is the start. <% ... %>\r\n<%= ... %>\r\n<? ... ?>\r\n<!-- This is the middle, and a comment. -->\r\nNo comment, but middle.\r\n{{ ... }}\r\n<?php ... ?>\r\n<?xml ... ?>\r\nHello, this is the end!';
  output = 'This is the start. <% ... %> <%= ... %> <? ... ?> No comment, but middle. {{ ... }} <?php ... ?> <?xml ... ?> Hello, this is the end!';
  test_minify(assert, input, input, {});
  test_minify(assert, input, output, { removeComments: true, collapseWhitespace: true });
  test_minify(assert, input, output, {
    removeComments: true,
    collapseWhitespace: true,
    ignoreCustomFragments: reFragments
  });

  output = 'This is the start. <% ... %>\n<%= ... %>\n<? ... ?>\nNo comment, but middle. {{ ... }}\n<?php ... ?>\n<?xml ... ?>\nHello, this is the end!';
  test_minify(assert, input, output, {
    removeComments: true,
    collapseWhitespace: true,
    preserveLineBreaks: true
  });

  output = 'This is the start. <% ... %>\n<%= ... %>\n<? ... ?>\nNo comment, but middle.\n{{ ... }}\n<?php ... ?>\n<?xml ... ?>\nHello, this is the end!';
  test_minify(assert, input, output, {
    removeComments: true,
    collapseWhitespace: true,
    preserveLineBreaks: true,
    ignoreCustomFragments: reFragments
  });

  input = '{{ if foo? }}\r\n  <div class="bar">\r\n    ...\r\n  </div>\r\n{{ end \n}}';
  output = '{{ if foo? }}<div class="bar">...</div>{{ end }}';
  test_minify(assert, input, input, {});
  test_minify(assert, input, output, { collapseWhitespace: true });
  test_minify(assert, input, output, { collapseWhitespace: true, ignoreCustomFragments: [] });

  output = '{{ if foo? }} <div class="bar">...</div> {{ end \n}}';
  test_minify(assert, input, output, { collapseWhitespace: true, ignoreCustomFragments: reFragments });

  output = '{{ if foo? }}\n<div class="bar">\n...\n</div>\n{{ end \n}}';
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    preserveLineBreaks: true,
    ignoreCustomFragments: reFragments
  });

  input = '<a class="<% if foo? %>bar<% end %> {{ ... }}"></a>';
  test_minify(assert, input, input, {});
  test_minify(assert, input, input, { ignoreCustomFragments: reFragments });

  input = '<img src="{% static "images/logo.png" %}">';
  output = '<img src="{% static "images/logo.png" %}">';
  test_minify(assert, input, output, { ignoreCustomFragments: [/\{%[^%]*?%\}/g] });

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
  test_minify(assert, input, input, {
    ignoreCustomFragments: [
      /\{%[\s\S]*?%\}/g,
      /\{\{[\s\S]*?\}\}/g
    ],
    quoteCharacter: '\''
  });
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
  test_minify(assert, input, output, {
    ignoreCustomFragments: [
      /\{%[\s\S]*?%\}/g,
      /\{\{[\s\S]*?\}\}/g
    ],
    quoteCharacter: '\'',
    collapseWhitespace: true
  });

  input = '<a href="/legal.htm"<?php echo e(Request::path() == \'/\' ? \' rel="nofollow"\':\'\'); ?>>Legal Notices</a>';
  test_minify(assert, input, input, {
    ignoreCustomFragments: [
      /<\?php[\s\S]*?\?>/g
    ]
  });

  input = '<input type="checkbox"<%= (model.isChecked ? \'checked="checked"\' : \'\') %>>';
  test_minify(assert, input, input, {
    ignoreCustomFragments: [
      /<%=[\s\S]*?%>/g
    ]
  });

  input = '<div' +
            '{{IF text}}' +
            'data-yashareDescription="{{shorted(text, 300)}}"' +
            '{{END IF}}></div>';
  test_minify(assert, input, input, {
    ignoreCustomFragments: [
      /\{\{[\s\S]*?\}\}/g
    ],
    caseSensitive: true
  });

  input = '<img class="{% foo %} {% bar %}">';
  test_minify(assert, input, input, {
    ignoreCustomFragments: [
      /\{%[^%]*?%\}/g
    ]
  });
  // trimCustomFragments withOUT collapseWhitespace, does
  // not break the "{% foo %} {% bar %}" test
  test_minify(assert, input, input, {
    ignoreCustomFragments: [
      /\{%[^%]*?%\}/g
    ],
    trimCustomFragments: true
  });
  // trimCustomFragments WITH collapseWhitespace, changes output
  output = '<img class="{% foo %}{% bar %}">';
  test_minify(assert, input, output, {
    ignoreCustomFragments: [
      /\{%[^%]*?%\}/g
    ],
    collapseWhitespace: true,
    trimCustomFragments: true
  });

  input = '<img class="titi.<%=tsItem_[0]%>">';
  test_minify(assert, input, input);
  test_minify(assert, input, input, {
    collapseWhitespace: true
  });

  input = '<table id="<?php echo $this->escapeHtmlAttr($this->table_id); ?>"></table>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, {
    collapseWhitespace: true
  });

  input = '<!--{{comment}}-->{{if a}}<div>b</div>{{/if}}';
  test_minify(assert, input, input);
  output = '{{if a}}<div>b</div>{{/if}}';
  test_minify(assert, input, output, {
    removeComments: true,
    ignoreCustomFragments: [
      /\{\{.*?\}\}/g
    ]
  });

  // https://github.com/kangax/html-minifier/issues/722
  input = '<? echo "foo"; ?> <span>bar</span>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, {
    collapseWhitespace: true
  });
  output = '<? echo "foo"; ?><span>bar</span>';
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    trimCustomFragments: true
  });

  input = ' <? echo "foo"; ?> bar';
  test_minify(assert, input, input);
  output = '<? echo "foo"; ?> bar';
  test_minify(assert, input, output, {
    collapseWhitespace: true
  });
  output = '<? echo "foo"; ?>bar';
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    trimCustomFragments: true
  });

  input = '<span>foo</span> <? echo "bar"; ?> baz';
  test_minify(assert, input, input);
  test_minify(assert, input, input, {
    collapseWhitespace: true
  });
  output = '<span>foo</span><? echo "bar"; ?>baz';
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    trimCustomFragments: true
  });

  input = '<span>foo</span> <? echo "bar"; ?> <? echo "baz"; ?> <span>foo</span>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, {
    collapseWhitespace: true
  });
  output = '<span>foo</span><? echo "bar"; ?><? echo "baz"; ?><span>foo</span>';
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    trimCustomFragments: true
  });

  input = 'foo <WC@bar> baz moo </WC@bar> loo';
  test_minify(assert, input, input, {
    collapseWhitespace: true,
    ignoreCustomFragments: [
      /<(WC@[\s\S]*?)>(.*?)<\/\1>/
    ]
  });
  output = 'foo<wc @bar>baz moo</wc>loo';
  test_minify(assert, input, output, {
    collapseWhitespace: true
  });

  input = '<link href="<?php echo \'http://foo/\' ?>">';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { removeAttributeQuotes: true });

  input = '<pre>\nfoo\n<? bar ?>\nbaz\n</pre>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { collapseWhitespace: true });
});

QUnit.test('bootstrap\'s span > button > span', function(assert) {
  var input = '<span class="input-group-btn">' +
                '\n  <button class="btn btn-default" type="button">' +
                  '\n    <span class="glyphicon glyphicon-search"></span>' +
                '\n  </button>' +
              '</span>';
  var output = '<span class=input-group-btn><button class="btn btn-default" type=button><span class="glyphicon glyphicon-search"></span></button></span>';
  test_minify(assert, input, output, { collapseWhitespace: true, removeAttributeQuotes: true });
});

QUnit.test('caseSensitive', function(assert) {
  var input = '<div mixedCaseAttribute="value"></div>';
  var caseSensitiveOutput = '<div mixedCaseAttribute="value"></div>';
  var caseInSensitiveOutput = '<div mixedcaseattribute="value"></div>';
  test_minify(assert, input, caseInSensitiveOutput);
  test_minify(assert, input, caseSensitiveOutput, { caseSensitive: true });
});

QUnit.test('source & track', function(assert) {
  var input = '<audio controls="controls">' +
                '<source src="foo.wav">' +
                '<source src="far.wav">' +
                '<source src="foobar.wav">' +
                '<track kind="captions" src="sampleCaptions.vtt" srclang="en">' +
              '</audio>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { removeOptionalTags: true });
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
  test_minify(assert, input, output, { collapseWhitespace: true });
});

QUnit.test('nested quotes', function(assert) {
  var input, output;

  input = '<div data=\'{"test":"\\"test\\""}\'></div>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { quoteCharacter: '\'' });

  output = '<div data="{&#34;test&#34;:&#34;\\&#34;test\\&#34;&#34;}"></div>';
  test_minify(assert, input, output, { quoteCharacter: '"' });
});

QUnit.test('script minification', function(assert) {
  var input, output;

  input = '<script></script>(function(){ var foo = 1; var bar = 2; alert(foo + " " + bar); })()';

  test_minify(assert, input, input, { minifyJS: true });

  input = '<script>(function(){ var foo = 1; var bar = 2; alert(foo + " " + bar); })()</script>';
  output = '<script>alert("1 2")</script>';

  test_minify(assert, input, output, { minifyJS: true });

  input = '<script type="text/JavaScript">(function(){ var foo = 1; var bar = 2; alert(foo + " " + bar); })()</script>';
  output = '<script type="text/JavaScript">alert("1 2")</script>';

  test_minify(assert, input, output, { minifyJS: true });

  input = '<script type="application/javascript;version=1.8">(function(){ var foo = 1; var bar = 2; alert(foo + " " + bar); })()</script>';
  output = '<script type="application/javascript;version=1.8">alert("1 2")</script>';

  test_minify(assert, input, output, { minifyJS: true });

  input = '<script type=" application/javascript  ; charset=utf-8 ">(function(){ var foo = 1; var bar = 2; alert(foo + " " + bar); })()</script>';
  output = '<script type="application/javascript;charset=utf-8">alert("1 2")</script>';

  test_minify(assert, input, output, { minifyJS: true });

  input = '<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({\'gtm.start\':new Date().getTime(),event:\'gtm.js\'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!=\'dataLayer\'?\'&l=\'+l:\'\';j.async=true;j.src=\'//www.googletagmanager.com/gtm.js?id=\'+i+dl;f.parentNode.insertBefore(j,f);})(window,document,\'script\',\'dataLayer\',\'GTM-67NT\');</script>';
  output = '<script>!function(w,d,s,l,i){w[l]=w[l]||[],w[l].push({"gtm.start":(new Date).getTime(),event:"gtm.js"});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=!0,j.src="//www.googletagmanager.com/gtm.js?id=GTM-67NT",f.parentNode.insertBefore(j,f)}(window,document,"script","dataLayer")</script>';

  test_minify(assert, input, output, { minifyJS: { mangle: false } });

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

  test_minify(assert, input, output, { minifyJS: true });
});

QUnit.test('minification of scripts with different mimetypes', function(assert) {
  var input, output;

  input = '<script type="">function f(){  return 1  }</script>';
  output = '<script type="">function f(){return 1}</script>';
  test_minify(assert, input, output, { minifyJS: true });

  input = '<script type="text/javascript">function f(){  return 1  }</script>';
  output = '<script type="text/javascript">function f(){return 1}</script>';
  test_minify(assert, input, output, { minifyJS: true });

  input = '<script foo="bar">function f(){  return 1  }</script>';
  output = '<script foo="bar">function f(){return 1}</script>';
  test_minify(assert, input, output, { minifyJS: true });

  input = '<script type="text/ecmascript">function f(){  return 1  }</script>';
  output = '<script type="text/ecmascript">function f(){return 1}</script>';
  test_minify(assert, input, output, { minifyJS: true });

  input = '<script type="application/javascript">function f(){  return 1  }</script>';
  output = '<script type="application/javascript">function f(){return 1}</script>';
  test_minify(assert, input, output, { minifyJS: true });

  input = '<script type="boo">function f(){  return 1  }</script>';
  test_minify(assert, input, input, { minifyJS: true });

  input = '<script type="text/html"><!-- ko if: true -->\n\n\n<div></div>\n\n\n<!-- /ko --></script>';
  test_minify(assert, input, input, { minifyJS: true });
});

QUnit.test('minification of scripts with custom fragments', function(assert) {
  var input, output;

  input = '<script><?php ?></script>';
  test_minify(assert, input, input, { minifyJS: true });
  test_minify(assert, input, input, { collapseWhitespace: true, minifyJS: true });
  test_minify(assert, input, input, {
    collapseWhitespace: true,
    minifyJS: true,
    preserveLineBreaks: true
  });

  input = '<script>\n<?php ?></script>';
  test_minify(assert, input, input, { minifyJS: true });
  output = '<script> <?php ?></script>';
  test_minify(assert, input, output, { collapseWhitespace: true, minifyJS: true });
  test_minify(assert, input, input, {
    collapseWhitespace: true,
    minifyJS: true,
    preserveLineBreaks: true
  });

  input = '<script><?php ?>\n</script>';
  test_minify(assert, input, input, { minifyJS: true });
  output = '<script><?php ?> </script>';
  test_minify(assert, input, output, { collapseWhitespace: true, minifyJS: true });
  test_minify(assert, input, input, {
    collapseWhitespace: true,
    minifyJS: true,
    preserveLineBreaks: true
  });

  input = '<script>\n<?php ?>\n</script>';
  test_minify(assert, input, input, { minifyJS: true });
  output = '<script> <?php ?> </script>';
  test_minify(assert, input, output, { collapseWhitespace: true, minifyJS: true });
  test_minify(assert, input, input, {
    collapseWhitespace: true,
    minifyJS: true,
    preserveLineBreaks: true
  });

  input = '<script>// <% ... %></script>';
  output = '<script></script>';
  test_minify(assert, input, output, { minifyJS: true });
  test_minify(assert, input, output, { collapseWhitespace: true, minifyJS: true });
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    minifyJS: true,
    preserveLineBreaks: true
  });

  input = '<script>// \n<% ... %></script>';
  output = '<script> \n<% ... %></script>';
  test_minify(assert, input, output, { minifyJS: true });
  output = '<script> <% ... %></script>';
  test_minify(assert, input, output, { collapseWhitespace: true, minifyJS: true });
  output = '<script>\n<% ... %></script>';
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    minifyJS: true,
    preserveLineBreaks: true
  });

  input = '<script>// <% ... %>\n</script>';
  output = '<script></script>';
  test_minify(assert, input, output, { minifyJS: true });
  test_minify(assert, input, output, { collapseWhitespace: true, minifyJS: true });
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    minifyJS: true,
    preserveLineBreaks: true
  });

  input = '<script>// \n<% ... %>\n</script>';
  output = '<script> \n<% ... %>\n</script>';
  test_minify(assert, input, output, { minifyJS: true });
  output = '<script> <% ... %> </script>';
  test_minify(assert, input, output, { collapseWhitespace: true, minifyJS: true });
  output = '<script>\n<% ... %>\n</script>';
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    minifyJS: true,
    preserveLineBreaks: true
  });

  input = '<script>function f(){  return <?php ?>  }</script>';
  output = '<script>function f(){return <?php ?>  }</script>';
  test_minify(assert, input, output, { minifyJS: true });
  output = '<script>function f(){return <?php ?> }</script>';
  test_minify(assert, input, output, { collapseWhitespace: true, minifyJS: true });

  input = '<script>function f(){  return "<?php ?>"  }</script>';
  output = '<script>function f(){return"<?php ?>"}</script>';
  test_minify(assert, input, output, { minifyJS: true });
  test_minify(assert, input, output, { collapseWhitespace: true, minifyJS: true });
});

QUnit.test('event minification', function(assert) {
  var input, output;

  input = '<div only="alert(a + b)" one=";return false;"></div>';
  test_minify(assert, input, input, { minifyJS: true });

  input = '<div onclick="alert(a + b)"></div>';
  output = '<div onclick="alert(a+b)"></div>';
  test_minify(assert, input, output, { minifyJS: true });

  input = '<a href="/" onclick="this.href = getUpdatedURL (this.href);return true;">test</a>';
  output = '<a href="/" onclick="return this.href=getUpdatedURL(this.href),!0">test</a>';
  test_minify(assert, input, output, { minifyJS: true });

  input = '<a onclick="try{ dcsMultiTrack(\'DCS.dcsuri\',\'USPS\',\'WT.ti\') }catch(e){}"> foobar</a>';
  output = '<a onclick=\'try{dcsMultiTrack("DCS.dcsuri","USPS","WT.ti")}catch(e){}\'> foobar</a>';
  test_minify(assert, input, output, { minifyJS: { mangle: false } });
  test_minify(assert, input, output, { minifyJS: { mangle: false }, quoteCharacter: '\'' });

  input = '<a onclick="try{ dcsMultiTrack(\'DCS.dcsuri\',\'USPS\',\'WT.ti\') }catch(e){}"> foobar</a>';
  output = '<a onclick="try{dcsMultiTrack(&#34;DCS.dcsuri&#34;,&#34;USPS&#34;,&#34;WT.ti&#34;)}catch(e){}"> foobar</a>';
  test_minify(assert, input, output, { minifyJS: { mangle: false }, quoteCharacter: '"' });

  input = '<a onClick="_gaq.push([\'_trackEvent\', \'FGF\', \'banner_click\']);"></a>';
  output = '<a onclick=\'_gaq.push(["_trackEvent","FGF","banner_click"])\'></a>';
  test_minify(assert, input, output, { minifyJS: true });
  test_minify(assert, input, output, { minifyJS: true, quoteCharacter: '\'' });

  input = '<a onClick="_gaq.push([\'_trackEvent\', \'FGF\', \'banner_click\']);"></a>';
  output = '<a onclick="_gaq.push([&#34;_trackEvent&#34;,&#34;FGF&#34;,&#34;banner_click&#34;])"></a>';
  test_minify(assert, input, output, { minifyJS: true, quoteCharacter: '"' });

  input = '<button type="button" onclick=";return false;" id="appbar-guide-button"></button>';
  output = '<button type="button" onclick="return!1" id="appbar-guide-button"></button>';
  test_minify(assert, input, output, { minifyJS: true });

  input = '<button type="button" onclick=";return false;" ng-click="a(1 + 2)" data-click="a(1 + 2)"></button>';
  output = '<button type="button" onclick="return!1" ng-click="a(1 + 2)" data-click="a(1 + 2)"></button>';
  test_minify(assert, input, output, { minifyJS: true });
  test_minify(assert, input, input, { minifyJS: true, customEventAttributes: [] });
  output = '<button type="button" onclick=";return false;" ng-click="a(3)" data-click="a(1 + 2)"></button>';
  test_minify(assert, input, output, { minifyJS: true, customEventAttributes: [/^ng-/] });
  output = '<button type="button" onclick="return!1" ng-click="a(3)" data-click="a(1 + 2)"></button>';
  test_minify(assert, input, output, { minifyJS: true, customEventAttributes: [/^on/, /^ng-/] });

  input = '<div onclick="<?= b ?>"></div>';
  test_minify(assert, input, input, { minifyJS: true });

  input = '<div onclick="alert(a + <?= b ?>)"></div>';
  output = '<div onclick="alert(a+ <?= b ?>)"></div>';
  test_minify(assert, input, output, { minifyJS: true });

  input = '<div onclick="alert(a + \'<?= b ?>\')"></div>';
  output = '<div onclick=\'alert(a+"<?= b ?>")\'></div>';
  test_minify(assert, input, output, { minifyJS: true });
});

QUnit.test('escaping closing script tag', function(assert) {
  var input = '<script>window.jQuery || document.write(\'<script src="jquery.js"><\\/script>\')</script>';
  var output = '<script>window.jQuery||document.write(\'<script src="jquery.js"><\\/script>\')</script>';
  test_minify(assert, input, output, { minifyJS: true });
});

QUnit.test('style minification', function(assert) {
  var input, output;

  input = '<style></style>div#foo { background-color: red; color: white }';
  test_minify(assert, input, input, { minifyCSS: true });

  input = '<style>div#foo { background-color: red; color: white }</style>';
  output = '<style>div#foo{background-color:red;color:#fff}</style>';
  test_minify(assert, input, input);
  test_minify(assert, input, output, { minifyCSS: true });

  input = '<style>div > p.foo + span { border: 10px solid black }</style>';
  output = '<style>div>p.foo+span{border:10px solid #000}</style>';
  test_minify(assert, input, output, { minifyCSS: true });

  input = '<div style="background: url(images/<% image %>);"></div>';
  test_minify(assert, input, input);
  output = '<div style="background:url(images/<% image %>)"></div>';
  test_minify(assert, input, output, { minifyCSS: true });
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    minifyCSS: true
  });

  input = '<div style="background: url(\'images/<% image %>\')"></div>';
  test_minify(assert, input, input);
  output = '<div style="background:url(images/<% image %>)"></div>';
  test_minify(assert, input, output, { minifyCSS: true });
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    minifyCSS: true
  });

  input = '<style>\np {\n  background: url(images/<% image %>);\n}\n</style>';
  test_minify(assert, input, input);
  output = '<style>p{background:url(images/<% image %>)}</style>';
  test_minify(assert, input, output, { minifyCSS: true });
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    minifyCSS: true
  });

  input = '<style>p { background: url("images/<% image %>") }</style>';
  test_minify(assert, input, input);
  output = '<style>p{background:url(images/<% image %>)}</style>';
  test_minify(assert, input, output, { minifyCSS: true });
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    minifyCSS: true
  });

  input = '<link rel="stylesheet" href="css/style-mobile.css" media="(max-width: 737px)">';
  test_minify(assert, input, input);
  output = '<link rel="stylesheet" href="css/style-mobile.css" media="(max-width:737px)">';
  test_minify(assert, input, output, { minifyCSS: true });
  output = '<link rel=stylesheet href=css/style-mobile.css media=(max-width:737px)>';
  test_minify(assert, input, output, {
    minifyCSS: true,
    removeAttributeQuotes: true
  });

  input = '<style media="(max-width: 737px)"></style>';
  test_minify(assert, input, input);
  output = '<style media="(max-width:737px)"></style>';
  test_minify(assert, input, output, { minifyCSS: true });
  output = '<style media=(max-width:737px)></style>';
  test_minify(assert, input, output, {
    minifyCSS: true,
    removeAttributeQuotes: true
  });
});

QUnit.test('style attribute minification', function(assert) {
  var input = '<div style="color: red; background-color: yellow; font-family: Verdana, Arial, sans-serif;"></div>';
  var output = '<div style="color:red;background-color:#ff0;font-family:Verdana,Arial,sans-serif"></div>';
  test_minify(assert, input, output, { minifyCSS: true });
});

QUnit.test('url attribute minification', function(assert) {
  var input, output;

  input = '<link rel="stylesheet" href="http://website.com/style.css"><form action="http://website.com/folder/folder2/index.html"><a href="http://website.com/folder/file.html">link</a></form>';
  output = '<link rel="stylesheet" href="/style.css"><form action="folder2/"><a href="file.html">link</a></form>';
  test_minify(assert, input, output, { minifyURLs: 'http://website.com/folder/' });
  test_minify(assert, input, output, { minifyURLs: { site: 'http://website.com/folder/' } });

  input = '<link rel="canonical" href="http://website.com/">';
  test_minify(assert, input, input, { minifyURLs: 'http://website.com/' });
  test_minify(assert, input, input, { minifyURLs: { site: 'http://website.com/' } });

  input = '<style>body { background: url(\'http://website.com/bg.png\') }</style>';
  test_minify(assert, input, input, { minifyURLs: 'http://website.com/' });
  test_minify(assert, input, input, { minifyURLs: { site: 'http://website.com/' } });
  output = '<style>body{background:url(http://website.com/bg.png)}</style>';
  test_minify(assert, input, output, { minifyCSS: true });
  output = '<style>body{background:url(bg.png)}</style>';
  test_minify(assert, input, output, {
    minifyCSS: true,
    minifyURLs: 'http://website.com/'
  });
  test_minify(assert, input, output, {
    minifyCSS: true,
    minifyURLs: { site: 'http://website.com/' }
  });

  input = '<style>body { background: url("http://website.com/foo bar/bg.png") }</style>';
  test_minify(assert, input, input, { minifyURLs: { site: 'http://website.com/foo bar/' } });
  output = '<style>body{background:url("http://website.com/foo bar/bg.png")}</style>';
  test_minify(assert, input, output, { minifyCSS: true });
  output = '<style>body{background:url(bg.png)}</style>';
  test_minify(assert, input, output, {
    minifyCSS: true,
    minifyURLs: { site: 'http://website.com/foo bar/' }
  });

  input = '<style>body { background: url("http://website.com/foo bar/(baz)/bg.png") }</style>';
  test_minify(assert, input, input, { minifyURLs: { site: 'http://website.com/' } });
  test_minify(assert, input, input, { minifyURLs: { site: 'http://website.com/foo%20bar/' } });
  test_minify(assert, input, input, { minifyURLs: { site: 'http://website.com/foo%20bar/(baz)/' } });
  output = '<style>body{background:url("foo%20bar/(baz)/bg.png")}</style>';
  test_minify(assert, input, output, {
    minifyCSS: true,
    minifyURLs: { site: 'http://website.com/' }
  });
  output = '<style>body{background:url("(baz)/bg.png")}</style>';
  test_minify(assert, input, output, {
    minifyCSS: true,
    minifyURLs: { site: 'http://website.com/foo%20bar/' }
  });
  output = '<style>body{background:url(bg.png)}</style>';
  test_minify(assert, input, output, {
    minifyCSS: true,
    minifyURLs: { site: 'http://website.com/foo%20bar/(baz)/' }
  });

  input = '<img src="http://cdn.site.com/foo.png">';
  output = '<img src="//cdn.site.com/foo.png">';
  test_minify(assert, input, output, { minifyURLs: { site: 'http://site.com/' } });
});

QUnit.test('srcset attribute minification', function(assert) {
  var input, output;
  input = '<source srcset="http://site.com/foo.gif ,http://site.com/bar.jpg 1x, baz moo 42w,' +
          '\n\n\n\n\n\t    http://site.com/zo om.png 1.00x">';
  output = '<source srcset="http://site.com/foo.gif, http://site.com/bar.jpg, baz moo 42w, http://site.com/zo om.png">';
  test_minify(assert, input, output);
  output = '<source srcset="foo.gif, bar.jpg, baz%20moo 42w, zo%20om.png">';
  test_minify(assert, input, output, { minifyURLs: { site: 'http://site.com/' } });
});

QUnit.test('valueless attributes', function(assert) {
  var input = '<br foo>';
  test_minify(assert, input, input);
});

QUnit.test('newlines becoming whitespaces', function(assert) {
  var input = 'test\n\n<input>\n\ntest';
  var output = 'test <input> test';
  test_minify(assert, input, output, { collapseWhitespace: true });
});

QUnit.test('conservative collapse', function(assert) {
  var input, output;

  input = '<b>   foo \n\n</b>';
  output = '<b> foo </b>';
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    conservativeCollapse: true
  });

  input = '<html>\n\n<!--test-->\n\n</html>';
  output = '<html> </html>';
  test_minify(assert, input, output, {
    removeComments: true,
    collapseWhitespace: true,
    conservativeCollapse: true
  });

  input = '<p>\u00A0</p>';
  test_minify(assert, input, input, { collapseWhitespace: true });
  test_minify(assert, input, input, {
    collapseWhitespace: true,
    conservativeCollapse: true
  });

  input = '<p> \u00A0</p>';
  output = '<p>\u00A0</p>';
  test_minify(assert, input, output, { collapseWhitespace: true });
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    conservativeCollapse: true
  });

  input = '<p>\u00A0 </p>';
  output = '<p>\u00A0</p>';
  test_minify(assert, input, output, { collapseWhitespace: true });
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    conservativeCollapse: true
  });

  input = '<p> \u00A0 </p>';
  output = '<p>\u00A0</p>';
  test_minify(assert, input, output, { collapseWhitespace: true });
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    conservativeCollapse: true
  });

  input = '<p>  \u00A0\u00A0  \u00A0  </p>';
  output = '<p>\u00A0\u00A0 \u00A0</p>';
  test_minify(assert, input, output, { collapseWhitespace: true });
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    conservativeCollapse: true
  });

  input = '<p>foo  \u00A0\u00A0  \u00A0  </p>';
  output = '<p>foo \u00A0\u00A0 \u00A0</p>';
  test_minify(assert, input, output, { collapseWhitespace: true });
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    conservativeCollapse: true
  });

  input = '<p>  \u00A0\u00A0  \u00A0  bar</p>';
  output = '<p>\u00A0\u00A0 \u00A0 bar</p>';
  test_minify(assert, input, output, { collapseWhitespace: true });
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    conservativeCollapse: true
  });

  input = '<p>foo  \u00A0\u00A0  \u00A0  bar</p>';
  output = '<p>foo \u00A0\u00A0 \u00A0 bar</p>';
  test_minify(assert, input, output, { collapseWhitespace: true });
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    conservativeCollapse: true
  });

  input = '<p> \u00A0foo\u00A0\t</p>';
  output = '<p>\u00A0foo\u00A0</p>';
  test_minify(assert, input, output, { collapseWhitespace: true });
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    conservativeCollapse: true
  });


  input = '<p> \u00A0\nfoo\u00A0\t</p>';
  output = '<p>\u00A0 foo\u00A0</p>';
  test_minify(assert, input, output, { collapseWhitespace: true });
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    conservativeCollapse: true
  });


  input = '<p> \u00A0foo \u00A0\t</p>';
  output = '<p>\u00A0foo \u00A0</p>';
  test_minify(assert, input, output, { collapseWhitespace: true });
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    conservativeCollapse: true
  });

  input = '<p> \u00A0\nfoo \u00A0\t</p>';
  output = '<p>\u00A0 foo \u00A0</p>';
  test_minify(assert, input, output, { collapseWhitespace: true });
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    conservativeCollapse: true
  });
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
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    preserveLineBreaks: true
  });
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    preserveLineBreaks: true
  });
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
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    preserveLineBreaks: true,
    removeComments: true
  });

  input = '<div> text <span>\n text</span> \n</div>';
  output = '<div>text <span>\ntext</span>\n</div>';
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    preserveLineBreaks: true
  });

  input = '<div>  text \n </div>';
  output = '<div>text\n</div>';
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    preserveLineBreaks: true
  });
  output = '<div> text\n</div>';
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    preserveLineBreaks: true
  });

  input = '<div>\ntext  </div>';
  output = '<div>\ntext</div>';
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    preserveLineBreaks: true
  });
  output = '<div>\ntext </div>';
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    preserveLineBreaks: true
  });

  input = 'This is the start. <% ... %>\r\n<%= ... %>\r\n<? ... ?>\r\n<!-- This is the middle, and a comment. -->\r\nNo comment, but middle.\r\n<?= ... ?>\r\n<?php ... ?>\r\n<?xml ... ?>\r\nHello, this is the end!';
  output = 'This is the start. <% ... %>\n<%= ... %>\n<? ... ?>\nNo comment, but middle.\n<?= ... ?>\n<?php ... ?>\n<?xml ... ?>\nHello, this is the end!';
  test_minify(assert, input, output, {
    removeComments: true,
    collapseWhitespace: true,
    preserveLineBreaks: true
  });
});

QUnit.test('collapse inline tag whitespace', function(assert) {
  var input, output;

  input = '<button>a</button> <button>b</button>';
  test_minify(assert, input, input, {
    collapseWhitespace: true
  });

  output = '<button>a</button><button>b</button>';
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    collapseInlineTagWhitespace: true
  });

  input = '<p>where <math> <mi>R</mi> </math> is the Rici tensor.</p>';
  output = '<p>where <math><mi>R</mi></math> is the Rici tensor.</p>';
  test_minify(assert, input, output, {
    collapseWhitespace: true
  });

  output = '<p>where<math><mi>R</mi></math>is the Rici tensor.</p>';
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    collapseInlineTagWhitespace: true
  });
});

QUnit.test('ignore custom comments', function(assert) {
  var input, output;

  input = '<!--! test -->';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { removeComments: true });
  test_minify(assert, input, input, { ignoreCustomComments: false });
  test_minify(assert, input, '', {
    removeComments: true,
    ignoreCustomComments: []
  });
  test_minify(assert, input, '', {
    removeComments: true,
    ignoreCustomComments: false
  });

  input = '<!-- htmlmin:ignore -->test<!-- htmlmin:ignore -->';
  output = 'test';
  test_minify(assert, input, output);
  test_minify(assert, input, output, { removeComments: true });
  test_minify(assert, input, output, { ignoreCustomComments: false });
  test_minify(assert, input, output, {
    removeComments: true,
    ignoreCustomComments: []
  });
  test_minify(assert, input, output, {
    removeComments: true,
    ignoreCustomComments: false
  });

  input = '<!-- ko if: someExpressionGoesHere --><li>test</li><!-- /ko -->';
  test_minify(assert, input, input, {
    removeComments: true,
    // ignore knockout comments
    ignoreCustomComments: [
      /^\s+ko/,
      /\/ko\s+$/
    ]
  });

  input = '<!--#include virtual="/cgi-bin/counter.pl" -->';
  test_minify(assert, input, input, {
    removeComments: true,
    // ignore Apache SSI includes
    ignoreCustomComments: [
      /^\s*#/
    ]
  });
});

QUnit.test('processScripts', function(assert) {
  var input = '<script type="text/ng-template"><!--test--><div>   <span> foobar </span> \n\n</div></script>';
  var output = '<script type="text/ng-template"><div><span>foobar</span></div></script>';
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    removeComments: true,
    processScripts: ['text/ng-template']
  });
});

QUnit.test('ignore', function(assert) {
  var input, output;

  input = '<!-- htmlmin:ignore --><div class="blah" style="color: red">\n   test   <span> <input disabled/>  foo </span>\n\n   </div><!-- htmlmin:ignore -->' +
          '<div class="blah" style="color: red">\n   test   <span> <input disabled/>  foo </span>\n\n   </div>';
  output = '<div class="blah" style="color: red">\n   test   <span> <input disabled/>  foo </span>\n\n   </div>' +
           '<div class="blah" style="color: red">test <span><input disabled="disabled"> foo</span></div>';
  test_minify(assert, input, output, { collapseWhitespace: true });

  input = '<!-- htmlmin:ignore --><!-- htmlmin:ignore -->';
  test_minify(assert, input, '');

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
  test_minify(assert, input, output, { removeComments: true });

  input = '<!-- htmlmin:ignore --> <p class="logged"|cond="$is_logged === true" id="foo"> bar</p> <!-- htmlmin:ignore -->';
  output = ' <p class="logged"|cond="$is_logged === true" id="foo"> bar</p> ';
  test_minify(assert, input, output);

  input = '<!-- htmlmin:ignore --><body <?php body_class(); ?>><!-- htmlmin:ignore -->';
  output = '<body <?php body_class(); ?>>';
  test_minify(assert, input, output, { ignoreCustomFragments: [/<\?php[\s\S]*?\?>/] });

  input = 'a\n<!-- htmlmin:ignore -->b<!-- htmlmin:ignore -->';
  output = 'a b';
  test_minify(assert, input, output, { collapseWhitespace: true });

  input = '<p>foo <!-- htmlmin:ignore --><span>\n\tbar\n</span><!-- htmlmin:ignore -->.</p>';
  output = '<p>foo <span>\n\tbar\n</span>.</p>';
  test_minify(assert, input, output, { collapseWhitespace: true });
});

QUnit.test('meta viewport', function(assert) {
  var input, output;

  input = '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
  output = '<meta name="viewport" content="width=device-width,initial-scale=1">';
  test_minify(assert, input, output);

  input = '<meta name="viewport" content="initial-scale=1, maximum-scale=1.0">';
  output = '<meta name="viewport" content="initial-scale=1,maximum-scale=1">';
  test_minify(assert, input, output);

  input = '<meta name="viewport" content="width= 500 ,  initial-scale=1">';
  output = '<meta name="viewport" content="width=500,initial-scale=1">';
  test_minify(assert, input, output);

  input = '<meta name="viewport" content="width=device-width, initial-scale=1.0001, maximum-scale=3.140000">';
  output = '<meta name="viewport" content="width=device-width,initial-scale=1.0001,maximum-scale=3.14">';
  test_minify(assert, input, output);
});

QUnit.test('downlevel-revealed conditional comments', function(assert) {
  var input = '<![if !IE]><link href="non-ie.css" rel="stylesheet"><![endif]>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { removeComments: true });
});

QUnit.test('noscript', function(assert) {
  var input;

  input = '<SCRIPT SRC="x"></SCRIPT><NOSCRIPT>x</NOSCRIPT>';
  test_minify(assert, input, '<script src="x"></script><noscript>x</noscript>');

  input = '<noscript>\n<!-- anchor linking to external file -->\n' +
          '<a href="#" onclick="javascript:">External Link</a>\n</noscript>';
  test_minify(assert, input, '<noscript><a href="#">External Link</a></noscript>', { removeComments: true, collapseWhitespace: true, removeEmptyAttributes: true });
});

QUnit.test('max line length', function(assert) {
  var input;
  var options = { maxLineLength: 25 };

  input = '123456789012345678901234567890';
  test_minify(assert, input, input, options);

  input = '<div data-attr="foo"></div>';
  test_minify(assert, input, '<div data-attr="foo">\n</div>', options);

  input = '<code>    hello   world  \n    world   hello  </code>';
  test_minify(assert, input, '<code>\n    hello   world  \n    world   hello  \n</code>', options);

  test_minify(assert, '<p title="</p>">x</p>', '<p title="</p>">x</p>');
  test_minify(assert, '<p title=" <!-- hello world --> ">x</p>', '<p title=" <!-- hello world --> ">x</p>');
  test_minify(assert, '<p title=" <![CDATA[ \n\n foobar baz ]]> ">x</p>', '<p title=" <![CDATA[ \n\n foobar baz ]]> ">x</p>');
  test_minify(assert, '<p foo-bar=baz>xxx</p>', '<p foo-bar="baz">xxx</p>');
  test_minify(assert, '<p foo:bar=baz>xxx</p>', '<p foo:bar="baz">xxx</p>');

  input = '<div><div><div><div><div><div><div><div><div><div>' +
            'i\'m 10 levels deep' +
          '</div></div></div></div></div></div></div></div></div></div>';
  test_minify(assert, input, input);

  test_minify(assert, '<script>alert(\'<!--\')</script>', '<script>alert(\'<!--\')\n</script>', options);
  input = '<script>\nalert(\'<!-- foo -->\')\n</script>';
  test_minify(assert, '<script>alert(\'<!-- foo -->\')</script>', input, options);
  test_minify(assert, input, input, options);
  test_minify(assert, '<script>alert(\'-->\')</script>', '<script>alert(\'-->\')\n</script>', options);

  test_minify(assert, '<a title="x"href=" ">foo</a>', '<a title="x" href="">foo\n</a>', options);
  test_minify(assert, '<p id=""class=""title="">x', '<p id="" class="" \ntitle="">x</p>', options);
  test_minify(assert, '<p x="x\'"">x</p>', '<p x="x\'">x</p>', options, 'trailing quote should be ignored');
  test_minify(assert, '<a href="#"><p>Click me</p></a>', '<a href="#"><p>Click me\n</p></a>', options);
  input = '<span><button>Hit me\n</button></span>';
  test_minify(assert, '<span><button>Hit me</button></span>', input, options);
  test_minify(assert, input, input, options);
  test_minify(assert, '<object type="image/svg+xml" data="image.svg"><div>[fallback image]</div></object>', '<object \ntype="image/svg+xml" \ndata="image.svg"><div>\n[fallback image]</div>\n</object>', options);

  test_minify(assert, '<ng-include src="x"></ng-include>', '<ng-include src="x">\n</ng-include>', options);
  test_minify(assert, '<ng:include src="x"></ng:include>', '<ng:include src="x">\n</ng:include>', options);
  test_minify(assert, '<ng-include src="\'views/partial-notification.html\'"></ng-include><div ng-view=""></div>', '<ng-include \nsrc="\'views/partial-notification.html\'">\n</ng-include><div \nng-view=""></div>', options);
  test_minify(assert, '<some-tag-1></some-tag-1><some-tag-2></some-tag-2>', '<some-tag-1>\n</some-tag-1>\n<some-tag-2>\n</some-tag-2>', options);
  test_minify(assert, '[\']["]', '[\']["]', options);
  test_minify(assert, '<a href="test.html"><div>hey</div></a>', '<a href="test.html">\n<div>hey</div></a>', options);
  test_minify(assert, ':) <a href="http://example.com">link</a>', ':) <a \nhref="http://example.com">\nlink</a>', options);
  test_minify(assert, ':) <a href="http://example.com">\nlink</a>', ':) <a \nhref="http://example.com">\nlink</a>', options);
  test_minify(assert, ':) <a href="http://example.com">\n\nlink</a>', ':) <a \nhref="http://example.com">\n\nlink</a>', options);

  test_minify(assert, '<a href>ok</a>', '<a href>ok</a>', options);
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

  test_minify(assert, input, input);
  test_minify(assert, input, output, { customAttrCollapse: /data-bind/ });

  input = '<div style="' +
            'color: red;' +
            'font-size: 100em;' +
          '">bar</div>';
  output = '<div style="color: red;font-size: 100em;">bar</div>';
  test_minify(assert, input, output, { customAttrCollapse: /style/ });

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
  test_minify(assert, input, output, { customAttrCollapse: /ng-class/ });
});

QUnit.test('custom attribute collapse with empty attribute value', function(assert) {
  var input = '<div ng-some\n\n></div>';
  var output = '<div ng-some></div>';
  test_minify(assert, input, output, { customAttrCollapse: /.+/ });
});

QUnit.test('custom attribute collapse with newlines, whitespace, and carriage returns', function(assert) {
  var input = '<div ng-class="{ \n\r' +
          '               value:true, \n\r' +
          '               value2:false \n\r' +
          '               }"></div>';
  var output = '<div ng-class="{value:true,value2:false}"></div>';
  test_minify(assert, input, output, { customAttrCollapse: /ng-class/ });
});

QUnit.test('do not escape attribute value', function(assert) {
  var input, output;

  input = '<div data=\'{\n' +
          '\t"element": "<div class=\\"test\\"></div>\n"' +
          '}\'></div>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { preventAttributesEscaping: true });

  input = '<div foo bar=\'\' baz="" moo=1 loo=\'2\' haa="3"></div>';
  test_minify(assert, input, input, { preventAttributesEscaping: true });
  output = '<div foo bar="" baz="" moo="1" loo="2" haa="3"></div>';
  test_minify(assert, input, output);
});

QUnit.test('quoteCharacter is single quote', function(assert) {
  test_minify(assert, '<div class=\'bar\'>foo</div>', '<div class=\'bar\'>foo</div>', { quoteCharacter: '\'' });
  test_minify(assert, '<div class="bar">foo</div>', '<div class=\'bar\'>foo</div>', { quoteCharacter: '\'' });
});

QUnit.test('quoteCharacter is not single quote or double quote', function(assert) {
  test_minify(assert, '<div class=\'bar\'>foo</div>', '<div class="bar">foo</div>', { quoteCharacter: 'm' });
  test_minify(assert, '<div class="bar">foo</div>', '<div class="bar">foo</div>', { quoteCharacter: 'm' });
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
  test_minify(assert, input, output, options);

  input = '<input checked="checked" value="hello world!" data-attr="example">';
  output = '<input checked value="hello world!"data-attr=example>';
  test_minify(assert, input, output, options);

  input = '<input checked="checked" data-attr="example" value="hello world!">';
  output = '<input checked data-attr=example value="hello world!">';
  test_minify(assert, input, output, options);

  input = '<input data-attr="example" value="hello world!" checked="checked"/>';
  output = '<input data-attr=example value="hello world!"checked/>';
  test_minify(assert, input, output, options);

  input = '<input checked="checked" value="hello world!" data-attr="example"/>';
  output = '<input checked value="hello world!"data-attr=example />';
  test_minify(assert, input, output, options);

  input = '<input checked="checked" data-attr="example" value="hello world!"/>';
  output = '<input checked data-attr=example value="hello world!"/>';
  test_minify(assert, input, output, options);
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
  test_minify(assert, input, output, { caseSensitive: true });
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
  test_minify(assert, input, output, {
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
  });
});

QUnit.test('auto-generated tags', function(assert) {
  var input, output;

  input = '</p>';
  test_minify(assert, input, input, { includeAutoGeneratedTags: false });

  input = '<p id=""class=""title="">x';
  output = '<p id="" class="" title="">x';
  test_minify(assert, input, output, { includeAutoGeneratedTags: false });
  output = '<p id="" class="" title="">x</p>';
  test_minify(assert, input, output);
  test_minify(assert, input, output, { includeAutoGeneratedTags: true });

  input = '<body onload="  foo();   bar() ;  "><p>x</body>';
  output = '<body onload="foo();   bar() ;"><p>x</body>';
  test_minify(assert, input, output, { includeAutoGeneratedTags: false });

  input = '<a href="#"><div>Well, look at me! I\'m a div!</div></a>';
  output = '<a href="#"><div>Well, look at me! I\'m a div!</div>';
  test_minify(assert, input, output, { html5: false, includeAutoGeneratedTags: false });
  test_minify(assert, '<p id=""class=""title="">x', '<p id="" class="" \ntitle="">x', {
    maxLineLength: 25,
    includeAutoGeneratedTags: false
  });

  input = '<p>foo';
  test_minify(assert, input, input, { includeAutoGeneratedTags: false });
  test_minify(assert, input, input, {
    includeAutoGeneratedTags: false,
    removeOptionalTags: true
  });

  input = '</p>';
  test_minify(assert, input, input, { includeAutoGeneratedTags: false });
  output = '';
  test_minify(assert, input, output, {
    includeAutoGeneratedTags: false,
    removeOptionalTags: true
  });

  input = '<select><option>foo<option>bar</select>';
  test_minify(assert, input, input, { includeAutoGeneratedTags: false });
  output = '<select><option>foo</option><option>bar</option></select>';
  test_minify(assert, input, output, { includeAutoGeneratedTags: true });

  input = '<datalist><option label="A" value="1"><option label="B" value="2"></datalist>';
  test_minify(assert, input, input, { includeAutoGeneratedTags: false });
  output = '<datalist><option label="A" value="1"></option><option label="B" value="2"></option></datalist>';
  test_minify(assert, input, output, { includeAutoGeneratedTags: true });
});

QUnit.test('sort attributes', function(assert) {
  var input, output;

  input = '<link href="foo">' +
          '<link rel="bar" href="baz">' +
          '<link type="text/css" href="app.css" rel="stylesheet" async>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { sortAttributes: false });
  output = '<link href="foo">' +
           '<link href="baz" rel="bar">' +
           '<link href="app.css" rel="stylesheet" async type="text/css">';
  test_minify(assert, input, output, { sortAttributes: true });

  input = '<link href="foo">' +
          '<link rel="bar" href="baz">' +
          '<script type="text/html"><link type="text/css" href="app.css" rel="stylesheet" async></script>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { sortAttributes: false });
  output = '<link href="foo">' +
           '<link href="baz" rel="bar">' +
           '<script type="text/html"><link type="text/css" href="app.css" rel="stylesheet" async></script>';
  test_minify(assert, input, output, { sortAttributes: true });
  output = '<link href="foo">' +
           '<link href="baz" rel="bar">' +
           '<script type="text/html"><link href="app.css" rel="stylesheet" async type="text/css"></script>';
  test_minify(assert, input, output, {
    processScripts: [
      'text/html'
    ],
    sortAttributes: true
  });

  input = '<link type="text/css" href="foo.css">' +
          '<link rel="stylesheet" type="text/abc" href="bar.css">' +
          '<link href="baz.css">';
  output = '<link href="foo.css" type="text/css">' +
           '<link href="bar.css" type="text/abc" rel="stylesheet">' +
           '<link href="baz.css">';
  test_minify(assert, input, output, { sortAttributes: true });
  output = '<link href="foo.css">' +
           '<link href="bar.css" rel="stylesheet" type="text/abc">' +
           '<link href="baz.css">';
  test_minify(assert, input, output, {
    removeStyleLinkTypeAttributes: true,
    sortAttributes: true
  });

  input = '<a foo moo></a>' +
          '<a bar foo></a>' +
          '<a baz bar foo></a>' +
          '<a baz foo moo></a>' +
          '<a moo baz></a>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { sortAttributes: false });
  output = '<a foo moo></a>' +
           '<a foo bar></a>' +
           '<a foo bar baz></a>' +
           '<a foo baz moo></a>' +
           '<a baz moo></a>';
  test_minify(assert, input, output, { sortAttributes: true });

  input = '<span nav_sv_fo_v_column <#=(j === 0) ? \'nav_sv_fo_v_first\' : \'\' #> foo_bar></span>';
  test_minify(assert, input, input, {
    ignoreCustomFragments: [/<#[\s\S]*?#>/]
  });
  test_minify(assert, input, input, {
    ignoreCustomFragments: [/<#[\s\S]*?#>/],
    sortAttributes: false
  });
  output = '<span foo_bar nav_sv_fo_v_column <#=(j === 0) ? \'nav_sv_fo_v_first\' : \'\' #> ></span>';
  test_minify(assert, input, output, {
    ignoreCustomFragments: [/<#[\s\S]*?#>/],
    sortAttributes: true
  });

  input = '<a 0 1 2 3 4 5 6 7 8 9 a b c d e f g h i j k l m n o p q r s t u v w x y z></a>';
  test_minify(assert, input, input, { sortAttributes: true });
});

QUnit.test('sort style classes', function(assert) {
  var input, output;

  input = '<a class="foo moo"></a>' +
          '<b class="bar foo"></b>' +
          '<i class="baz bar foo"></i>' +
          '<s class="baz foo moo"></s>' +
          '<u class="moo baz"></u>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { sortClassName: false });
  output = '<a class="foo moo"></a>' +
           '<b class="foo bar"></b>' +
           '<i class="foo bar baz"></i>' +
           '<s class="foo baz moo"></s>' +
           '<u class="baz moo"></u>';
  test_minify(assert, input, output, { sortClassName: true });

  input = '<a class="moo <!-- htmlmin:ignore -->bar<!-- htmlmin:ignore --> foo baz"></a>';
  output = '<a class="moo bar foo baz"></a>';
  test_minify(assert, input, output);
  test_minify(assert, input, output, { sortClassName: false });
  output = '<a class="baz foo moo bar"></a>';
  test_minify(assert, input, output, { sortClassName: true });

  input = '<div class="nav_sv_fo_v_column <#=(j === 0) ? \'nav_sv_fo_v_first\' : \'\' #> foo_bar"></div>';
  test_minify(assert, input, input, {
    ignoreCustomFragments: [/<#[\s\S]*?#>/]
  });
  test_minify(assert, input, input, {
    ignoreCustomFragments: [/<#[\s\S]*?#>/],
    sortClassName: false
  });
  test_minify(assert, input, input, {
    ignoreCustomFragments: [/<#[\s\S]*?#>/],
    sortClassName: true
  });

  input = '<a class="0 1 2 3 4 5 6 7 8 9 a b c d e f g h i j k l m n o p q r s t u v w x y z"></a>';
  test_minify(assert, input, input, { sortClassName: false });
  test_minify(assert, input, input, { sortClassName: true });

  input = '<a class="add sort keys createSorter"></a>';
  test_minify(assert, input, input, { sortClassName: false });
  output = '<a class="add createSorter keys sort"></a>';
  test_minify(assert, input, output, { sortClassName: true });

  input = '<span class="sprite sprite-{{sprite}}"></span>';
  test_minify(assert, input, input, {
    collapseWhitespace: true,
    ignoreCustomFragments: [/{{.*?}}/],
    removeAttributeQuotes: true,
    sortClassName: true
  });

  input = '<span class="{{sprite}}-sprite sprite"></span>';
  test_minify(assert, input, input, {
    collapseWhitespace: true,
    ignoreCustomFragments: [/{{.*?}}/],
    removeAttributeQuotes: true,
    sortClassName: true
  });

  input = '<span class="sprite-{{sprite}}-sprite"></span>';
  test_minify(assert, input, input, {
    collapseWhitespace: true,
    ignoreCustomFragments: [/{{.*?}}/],
    removeAttributeQuotes: true,
    sortClassName: true
  });

  input = '<span class="{{sprite}}"></span>';
  test_minify(assert, input, input, {
    collapseWhitespace: true,
    ignoreCustomFragments: [/{{.*?}}/],
    removeAttributeQuotes: true,
    sortClassName: true
  });

  input = '<span class={{sprite}}></span>';
  output = '<span class="{{sprite}}"></span>';
  test_minify(assert, input, output, {
    collapseWhitespace: true,
    ignoreCustomFragments: [/{{.*?}}/],
    removeAttributeQuotes: true,
    sortClassName: true
  });
});

QUnit.test('decode entity characters', function(assert) {
  var input, output;

  input = '<!-- &ne; -->';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { decodeEntities: false });
  test_minify(assert, input, input, { decodeEntities: true });

  input = '<script type="text/html">&colon;</script>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { decodeEntities: false });
  test_minify(assert, input, input, { decodeEntities: true });
  output = '<script type="text/html">:</script>';
  test_minify(assert, input, output, { decodeEntities: true, processScripts: ['text/html'] });

  input = '<div style="font: &quot;monospace&#34;">foo&dollar;</div>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { decodeEntities: false });
  output = '<div style=\'font: "monospace"\'>foo$</div>';
  test_minify(assert, input, output, { decodeEntities: true });
  output = '<div style="font:&quot">foo&dollar;</div>';
  test_minify(assert, input, output, { minifyCSS: true });
  test_minify(assert, input, output, { decodeEntities: false, minifyCSS: true });
  output = '<div style="font:monospace">foo$</div>';
  test_minify(assert, input, output, { decodeEntities: true, minifyCSS: true });

  input = '<a href="/?foo=1&amp;bar=&lt;2&gt;">baz&lt;moo&gt;&copy;</a>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { decodeEntities: false });
  output = '<a href="/?foo=1&bar=<2>">baz&lt;moo>\u00a9</a>';
  test_minify(assert, input, output, { decodeEntities: true });

  input = '<? &amp; ?>&amp;<pre><? &amp; ?>&amp;</pre>';
  test_minify(assert, input, input);
  test_minify(assert, input, input, { collapseWhitespace: false, decodeEntities: false });
  test_minify(assert, input, input, { collapseWhitespace: true, decodeEntities: false });
  output = '<? &amp; ?>&<pre><? &amp; ?>&</pre>';
  test_minify(assert, input, output, { collapseWhitespace: false, decodeEntities: true });
  test_minify(assert, input, output, { collapseWhitespace: true, decodeEntities: true });
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
    test_minify(assert, tokens[1], tokens[0], {
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
    });
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

  test_minify(assert, input, output, {
    collapseWhitespace: true,
    canTrimWhitespace: canCollapseAndTrimWhitespace,
    canCollapseWhitespace: canCollapseAndTrimWhitespace
  });

  // Regression test: Previously the first </div> would clear the internal
  // stackNo{Collapse,Trim}Whitespace, so that ' foo  bar' turned into ' foo bar'
  input = '<div class="leaveAlone"><div></div><span> </span> foo  bar</div>';
  output = '<div class="leaveAlone"><div></div><span> </span> foo  bar</div>';

  test_minify(assert, input, output, {
    collapseWhitespace: true,
    canTrimWhitespace: canCollapseAndTrimWhitespace,
    canCollapseWhitespace: canCollapseAndTrimWhitespace
  });

  // Make sure that the stack does get reset when leaving the element for which
  // the hooks returned false:
  input = '<div class="leaveAlone"></div><div> foo  bar </div>';
  output = '<div class="leaveAlone"></div><div>foo bar</div>';

  test_minify(assert, input, output, {
    collapseWhitespace: true,
    canTrimWhitespace: canCollapseAndTrimWhitespace,
    canCollapseWhitespace: canCollapseAndTrimWhitespace
  });
});

QUnit.test('Async execution', function(assert) {
  var input, output;

  function cssSync(text, type) {
    return (type || 'Normal') + ' CSS';
  }

  function jsSync(text, inline) {
    return inline ? 'Inline JS' : 'Normal JS';
  }

  function cssAsync(text, type, cb) {
    setTimeout(function() {
      cb(cssSync(text, type));
    }, 1);
  }

  function jsAsync(text, inline, cb) {
    setTimeout(function() {
      cb(jsSync(text, inline));
    }, 1);
  }

  var styleInput = '<style>div#foo { background-color: red; color: white }</style>';
  var scriptInput = '<script>(function(  ){  console.log("Hello" + " World"); })()</script>';
  input = styleInput + scriptInput;

  var styleOutput = '<style>Normal CSS</style>';
  var scriptOutput = '<script>Normal JS</script>';

  test_minify(assert, input, input, {}, null, true);

  output = styleOutput + scriptInput;
  test_minify(assert, input, output, { minifyCSS: cssAsync }, null, true);
  test_minify(assert, input, output, { minifyCSS: cssAsync, minifyJS: false }, null, true);

  output = styleInput + scriptOutput;
  test_minify(assert, input, output, { minifyJS: jsAsync }, null, true);
  test_minify(assert, input, output, { minifyCSS: false, minifyJS: jsAsync }, null, true);

  output = styleOutput + scriptOutput;
  test_minify(assert, input, output, { minifyCSS: cssAsync, minifyJS: jsAsync }, null, true);
  test_minify(assert, input, output, { minifyCSS: cssAsync, minifyJS: jsSync }, null, true);
  test_minify(assert, input, output, { minifyCSS: cssSync, minifyJS: jsAsync }, null, true);
});

QUnit.test('minify error with callback', function(assert) {
  var input = '<style>div#foo { background-color: red; }</style><$unicorn>';

  test_minify_error(assert, input, null, null, 'Invalid tag name', true);
});

QUnit.test('error in callback', function(assert) {
  var input = '<style>div#foo { background-color: red; }</style>';
  var error = new Error();

  function css() {
    throw error;
  }

  test_minify_error(assert, input, { minifyCSS: css }, error, null, true);
});

QUnit.test('callback called multiple times', function(assert) {
  var input, done;

  function bad(_, __, cb) {
    try {
      cb('');
      cb('');
      assert.ok(false, 'An error should be thrown.');
    }
    catch (error) {
      assert.equal(error.message, 'Async completion has already occurred.');
    }
    finally {
      done();
    }
  }

  input = '<style>div#foo { background-color: red; color: white }</style><script>(function(  ){  console.log("Hello" + " World"); })()</script>';

  done = assert.async();
  minify(input, { minifyCSS: bad });

  done = assert.async();
  minify(input, { minifyJS: bad });

  done = assert.async(2);
  minify(input, { minifyCSS: bad, minifyJS: bad });
});
