#!/usr/bin/env node

'use strict';

var fs = require('fs'),
    path = require('path'),
    zlib = require('zlib'),
    fork = require('child_process').fork,
    http = require('http'),
    url = require('url'),
    querystring = require('querystring'),
    chalk = require('chalk'),
    Table = require('cli-table'),

    Minimize = require('minimize'),
    minimize = new Minimize();

var fileNames = [
  'abc',
  'amazon',
  'eloquentjavascript',
  'es6',
  'es6-table',
  'google',
  'html-minifier',
  'msn',
  'newyorktimes',
  'stackoverflow',
  'wikipedia'
].sort();

var table = new Table({
  head: ['File', 'Before', 'After', 'Minimize', 'Will Peavy', 'htmlcompressor.com', 'Savings', 'Time'],
  colWidths: [20, 25, 25, 25, 25, 25, 20, 10]
});

function toKb(size) {
  return (size / 1024).toFixed(2);
}

function redSize(size) {
  return chalk.red.bold(size) + chalk.white(' (' + toKb(size) + ' KB)');
}

function greenSize(size) {
  return chalk.green.bold(size) + chalk.white(' (' + toKb(size) + ' KB)');
}

function blueSavings(oldSize, newSize) {
  var savingsPercent = (1 - newSize / oldSize) * 100;
  var savings = (oldSize - newSize) / 1024;
  return chalk.cyan.bold(savingsPercent.toFixed(2)) + chalk.white('% (' + savings.toFixed(2) + ' KB)');
}

function blueTime(time) {
  return chalk.cyan.bold(time) + chalk.white(' ms');
}

function gzip(inPath, outPath, callback) {
  fs.createReadStream(inPath).pipe(zlib.createGzip({
    level: zlib.Z_BEST_COMPRESSION
  })).pipe(fs.createWriteStream(outPath)).on('finish', callback);
}

function run(tasks, done) {
  var remaining = tasks.length;

  function callback() {
    if (!--remaining) {
      done();
    }
  }

  tasks.forEach(function (task) {
    task(callback);
  });
}

var rows = {};
run(fileNames.map(function (fileName) {
  return function (done) {
    console.log('Processing...', fileName);

    var filePath = path.join('benchmarks/', fileName + '.html');
    var original = {
      filePath: filePath,
      gzFilePath: path.join('benchmarks/generated/', fileName + '.html.gz')
    };
    var infos = {};
    ['minifier', 'minimize', 'willpeavy', 'compressor'].forEach(function (name) {
      infos[name] = {
        filePath: path.join('benchmarks/generated/', fileName + '.' + name + '.html'),
        gzFilePath: path.join('benchmarks/generated/', fileName + '.' + name + '.html.gz')
      };
    });
    var minifiedTime, gzMinifiedTime;

    function readSizes(info, done) {
      run([
        // Gzip the minified output
        function (done) {
          gzip(info.filePath, info.gzFilePath, function () {
            // Open and read the size of the minified+gzipped output
            fs.stat(info.gzFilePath, function (err, stats) {
              if (err) {
                throw new Error('There was an error reading ' + info.gzFilePath);
              }
              info.gzSize = stats.size;
              done();
            });
          });
        },
        // Open and read the size of the minified output
        function (done) {
          fs.stat(info.filePath, function (err, stats) {
            if (err) {
              throw new Error('There was an error reading ' + info.filePath);
            }
            info.size = stats.size;
            done();
          });
        }
      ], done);
    }

    function testHTMLMinifier(done) {
      // Begin timing after gzipped fixtures have been created
      var startTime = Date.now();
      var info = infos.minifier;
      var args = [filePath, '-c', 'benchmark.conf', '-o', info.filePath];
      fork('./cli', args).on('exit', function () {
        minifiedTime = Date.now() - startTime;
        readSizes(info, function () {
          gzMinifiedTime = Date.now() - startTime;
          done();
        });
      });
    }

    function testMinimize(done) {
      fs.readFile(filePath, function (err, data) {
        if (err) {
          throw new Error('There was an error reading ' + filePath);
        }
        minimize.parse(data, function (error, data) {
          var info = infos.minimize;
          fs.writeFile(info.filePath, data, function (err) {
            if (err) {
              throw new Error('There was an error writing ' + info.filePath);
            }
            readSizes(info, done);
          });
        });
      });
    }

    function testWillPeavy(done) {
      fs.readFile(filePath, {
        encoding: 'utf8'
      }, function (err, data) {
        if (err) {
          throw new Error('There was an error reading ' + filePath);
        }
        var options = url.parse('http://www.willpeavy.com/minifier/');
        options.method = 'POST';
        options.headers = {
          'Content-Type': 'application/x-www-form-urlencoded'
        };
        http.request(options, function (res) {
          res.setEncoding('utf8');
          var response = '';
          res.on('data', function (chunk) {
            response += chunk;
          }).on('end', function () {
            // Extract result from <textarea/>
            var start = response.indexOf('>', response.indexOf('<textarea'));
            var end = response.lastIndexOf('</textarea>');
            var info = infos.willpeavy;
            fs.writeFile(info.filePath, response.substring(start + 1, end), {
              encoding: 'utf8'
            }, function (err) {
              if (err) {
                throw new Error('There was an error writing ' + info.filePath);
              }
              readSizes(info, done);
            });
          });
        }).end(querystring.stringify({
          html: data
        }));
      });
    }

    function testHTMLCompressor(done) {
      fs.readFile(filePath, {
        encoding: 'utf8'
      }, function (err, data) {
        if (err) {
          throw new Error('There was an error reading ' + filePath);
        }
        var options = url.parse('http://htmlcompressor.com/compress_ajax_v2.php');
        options.method = 'POST';
        options.headers = {
          'Accept-Encoding': 'gzip',
          'Content-Type': 'application/x-www-form-urlencoded'
        };
        http.request(options, function (res) {
          if (res.headers['content-encoding'] === 'gzip') {
            res = res.pipe(zlib.createGunzip());
          }
          res.setEncoding('utf8');
          var response = '';
          res.on('data', function (chunk) {
            response += chunk;
          }).on('end', function () {
            /* global JSON: true */
            response = JSON.parse(response);
            var info = infos.compressor;
            if (response.success) {
              fs.writeFile(info.filePath, response.result, {
                encoding: 'utf8'
              }, function (err) {
                if (err) {
                  throw new Error('There was an error writing ' + info.filePath);
                }
                readSizes(info, done);
              });
            }
            // Site refused to process content
            else {
              info.size = 0;
              info.gzSize = 0;
              done();
            }
          });
        }).end(querystring.stringify({
          code_type:'html',
          verbose: 1,
          html_level: 1,
          minimize_style: 1,
          minimize_events: 1,
          minimize_js_href: 1,
          minimize_css: 1,
          minimize_js: 1,
          js_engine: 'yui',
          js_fallback: 1,
          code: data
        }));
      });
    }

    run([
      function (done) {
        readSizes(original, done);
      },
      testHTMLMinifier,
      testMinimize,
      testWillPeavy,
      testHTMLCompressor
    ], function () {
      var row = [
        [fileName, '+ gzipped'].join('\n'),
        [redSize(original.size), redSize(original.gzSize)].join('\n')
      ];
      for (var name in infos) {
        var info = infos[name];
        row.push([greenSize(info.size), greenSize(info.gzSize)].join('\n'));
      }
      row.push(
        [blueSavings(original.size, infos.minifier.size), blueSavings(original.gzSize, infos.minifier.gzSize)].join('\n'),
        [blueTime(minifiedTime), blueTime(gzMinifiedTime)].join('\n')
      );
      rows[fileName] = row;
      done();
    });
  };
}), function () {
  fileNames.forEach(function (fileName) {
    table.push(rows[fileName]);
  });
  console.log();
  console.log(table.toString());
});
