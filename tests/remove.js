/* global minify */
'use strict';

if (typeof minify === 'undefined') {
  self.minify = require('html-minifier').minify;
}

var input, output;

test('removing comment chunks', function () {
  input = '<!-- htmlmin:remove --><!-- htmlmin:remove -->';
  equal(minify(input), '');

  input = '<!-- htmlmin:remove -->FOOBAR<!-- htmlmin:remove -->';
  equal(minify(input), '');

  input = '' +
          '<div class="wrapper">\n' +
          '  <p> ignored </p>\n' +
          '  <!-- htmlmin:remove -->\n' +
          '    <div class="removed" style="color: red">\n' +
          '      removed <span> <input disabled/> chunk </span>\n' +
          '    </div>\n' +
          '  <!-- htmlmin:remove -->\n' +
          '</div>';
  output = '' +
          '<div class="wrapper">\n' +
          '  <p> ignored </p>\n' +
          // Note there's two spaces that linger before our <!-- htmlmin:remove -->
          '  \n' +
          '</div>';

  equal(minify(input), output);
});
