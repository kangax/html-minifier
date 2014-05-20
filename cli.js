#!/usr/bin/env node
/**
 * html-minifier CLI tool
 *
 * The MIT License (MIT)
 *
 *  Copyright (c) 2014 Zoltan Frombach
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy of
 *  this software and associated documentation files (the "Software"), to deal in
 *  the Software without restriction, including without limitation the rights to
 *  use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 *  the Software, and to permit persons to whom the Software is furnished to do so,
 *  subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in all
 *  copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 *  FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 *  COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 *  IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 *  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */

'use strict';

var cli = require('cli');
var changeCase = require('change-case');
var path = require('path');
var fs = require('fs');
var appName = require('./package.json').name;
var appVersion = require('./package.json').version;
var minify = require('./dist/htmlminifier.min.js').minify;
var minifyOptions = {};
var input = null;
var output = null;

cli.width = 100;
cli.option_width = 40;
cli.setApp(appName, appVersion);

var usage = appName + ' [OPTIONS] [FILE(s)]\n\n';
usage += '  If no input file(s) specified then STDIN will be used for input.\n';
usage += '  If more than one input file specified those will be concatenated and minified together.\n\n';
usage += '  When you specify a config file with the --config-file option (see sample-cli-config-file.conf for format)\n';
usage += '    you can still override some of its contents by providing individual command line options, too.\n\n';
usage += '  When you want to provide an array of strings for --ignore-custom-comments or --process-scripts options\n';
usage += '    on the command line you must escape those such as --ignore-custom-comments "[\\"string1\\",\\"string1\\"]"\n';

cli.setUsage(usage);

var mainOptions = {
  'removeComments': [[false, 'Strip HTML comments'], false],
  'removeCommentsFromCDATA': [[false, 'Strip HTML comments from scripts and styles'], false],
  'removeCDATASectionsFromCDATA': [[false, 'Remove CDATA sections from script and style elements'], false],
  'collapseWhitespace': [[false, 'Collapse white space that contributes to text nodes in a document tree.'], false],
  'conservativeCollapse': [[false, 'Always collapse to 1 space (never remove it entirely)'], false],
  'collapseBooleanAttributes': [[false, 'Omit attribute values from boolean attributes'], false],
  'removeAttributeQuotes': [[false, 'Remove quotes around attributes when possible.'], false],
  'removeRedundantAttributes': [[false, 'Remove attributes when value matches default.'], false],
  'useShortDoctype': [[false, 'Replaces the doctype with the short (HTML5) doctype'], false],
  'removeEmptyAttributes': [[false, 'Remove all attributes with whitespace-only values'], false],
  'removeOptionalTags': [[false, 'Remove unrequired tags'], false],
  'removeEmptyElements': [[false, 'Remove all elements with empty contents'], false],
  'lint': [[false, 'Toggle linting'], false],
  'keepClosingSlash': [[false, 'Keep the trailing slash on singleton elements'], false],
  'caseSensitive': [[false, 'Treat attributes in case sensitive manner (useful for SVG; e.g. viewBox)'], false],
  'minifyJS': [[false, 'Minify Javascript in script elements and on* attributes (uses UglifyJS)'], false],
  'minifyCSS': [[false, 'Minify CSS in style elements and style attributes (uses clean-css)'], false],
  'ignoreCustomComments': [[false, 'Array of regex\'es that allow to ignore certain comments, when matched', 'string'], true],
  'processScripts': [[false, 'Array of strings corresponding to types of script elements to process through minifier (e.g. "text/ng-template", "text/x-handlebars-template", etc.)', 'string'], true]
};

var cliOptions = {
  'version': ['v', 'Version information'],
  'output': ['o', 'Specify output file (if not specified STDOUT will be used for output)', 'file'],
  'config-file': ['c', 'Use config file', 'file']
};

var mainOptionKeys = Object.keys(mainOptions);
mainOptionKeys.forEach(function(key) {
  cliOptions[changeCase.paramCase(key)] = mainOptions[key][0];
});

cli.parse(cliOptions);

cli.main(function(args, options) {

  if (options.version) {
    process.stderr.write(appName + ' v' + appVersion);
    cli.exit(0);
  }

  if (options['config-file']) {
    try {
      var fileOptions = JSON.parse(fs.readFileSync(path.resolve(options['config-file']), 'utf8'));
      if ((fileOptions !== null) && (typeof fileOptions === 'object')) minifyOptions = fileOptions;
    } catch(e) {
      process.stderr.write('Error: Cannot read the specified config file');
      cli.exit(1);
    }
  }

  mainOptionKeys.forEach(function(key) {
    var paramKey = changeCase.paramCase(key);
    if (options[paramKey] !== null) {
      if (mainOptions[key][1]) {
        var value = options[paramKey];
        if (value !== null) {
          var jsonArray;
          try {
            jsonArray = JSON.parse(value);
          } catch(e) {}
          if (jsonArray instanceof Array) {
            minifyOptions[key] = jsonArray;
          } else {
            minifyOptions[key] = [value];
          }
        }
      } else {
        minifyOptions[key] = true;
      }
    }
  });

  if (args.length) input = args;

  if (options.output) output = options.output;

  var original = '';
  var status = 0;

  if (input !== null) { // Minifying one or more files specified on the CMD line

    input.forEach(function(afile) {
      try {
        original += fs.readFileSync(afile, 'utf8');
      } catch(e) {
        status = 2;
        process.stderr.write('Error: Cannot read file ' + afile);
      }
    });

  } else { // Minifying input coming from STDIN

    var BUFSIZE = 4096;
    var buf = new Buffer(BUFSIZE);
    var bytesRead;

    while (true) { // Loop as long as stdin input is available.
      bytesRead = 0;
      try {
          bytesRead = fs.readSync(process.stdin.fd, buf, 0, BUFSIZE);
      } catch (e) {
          if (e.code === 'EAGAIN') { // 'resource temporarily unavailable'
              // Happens on OS X 10.8.3 (not Windows 7!), if there's no
              // stdin input - typically when invoking a script without any
              // input (for interactive stdin input).
              // If you were to just continue, you'd create a tight loop.
              process.stderr.write('ERROR: interactive stdin input not supported');
              cli.exit(2);
          } else if (e.code === 'EOF') {
              // Happens on Windows 7, but not OS X 10.8.3:
              // simply signals the end of *piped* stdin input.
              break;
          }
          throw e; // unexpected exception
      }
      if (bytesRead === 0) {
          // No more stdin input available.
          // OS X 10.8.3: regardless of input method, this is how the end
          //   of input is signaled.
          // Windows 7: this is how the end of input is signaled for
          //   *interactive* stdin input.
          break;
      }
      original += buf.toString('utf8', 0, bytesRead);
    }

  }

  // Run minify
  var minified = null;
  try {
    minified = minify(original, minifyOptions);
  } catch(e) {
    status = 3;
    process.stderr.write('Error: Minification error');
  }

  if (minified !== null) {
    // Write the output
    try {
      if (output !== null) {
        fs.writeFileSync(path.resolve(output), minified);
      } else {
        process.stdout.write(minified);
      }
    } catch(e) {
      status = 4;
      process.stderr.write('Error: Cannot write to output');
    }
  }

  cli.exit(status);

});
