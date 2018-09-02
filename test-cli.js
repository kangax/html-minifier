#!/usr/bin/env node
/**
 * tests for the html-minifier CLI tool
 *
 * The MIT/Expat License (MIT)
 *
 *  Copyright (c) 2017 Shlomi Fish
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

QUnit.module("CLI Tests");

QUnit.test("inplace test", function(assert) {
    assert.expect(2);

    const fs = require('fs');

    const temp_dir = fs.mkdtempSync('html-minifier-tests');
    const fn1 = temp_dir + "/" + "foo.html";
    const fn2 = temp_dir + "/" + "bar.html";
    fs.writeFileSync(fn1, "<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\">\n<title>Test file</title>\n</head>\n<body>\n    <p>Text</p>\n</body>\n</html>\n");
    fs.writeFileSync(fn2, "<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\">\n<title>Bar file</title>\n</head>\n<body>\n    <p>BarText</p>\n</body>\n</html>\n");

    const execFileSync = require('child_process').execFileSync;
    execFileSync('node', ['cli.js', '-c', 'sample-cli-config-file.conf', '--inplace', fn1, fn2]);

    const contents1 = fs.readFileSync(fn1, {encoding: 'utf-8'});
    const contents2 = fs.readFileSync(fn2, {encoding: 'utf-8'});

    assert.equal (contents1, "<!DOCTYPE html><meta charset=utf-8><title>Test file</title><p>Text",
    "file was modified in-place");
    assert.equal (contents2, "<!DOCTYPE html><meta charset=utf-8><title>Bar file</title><p>BarText",
    "second file was modified in-place");
});
