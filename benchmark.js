#!/usr/bin/env node

'use strict';

var brotli = require('brotli'),
    chalk = require('chalk'),
    fork = require('child_process').fork,
    fs = require('fs'),
    http = require('http'),
    lzma = require('lzma'),
    Minimize = require('minimize'),
    path = require('path'),
    Progress = require('progress'),
    querystring = require('querystring'),
    Table = require('cli-table'),
    url = require('url'),
    zlib = require('zlib');

var urls = {
  amazon: 'http://www.amazon.com/',
  eloquentjavascript: 'http://eloquentjavascript.net/print.html',
  es6: 'https://people.mozilla.org/~jorendorff/es6-draft.html',
  'es6-table': 'http://kangax.github.io/es5-compat-table/es6/',
  google: 'http://www.google.com/',
  'html-minifier': 'https://github.com/kangax/html-minifier',
  msn: 'http://www.msn.com/',
  nbc: 'http://www.nbc.com/',
  newyorktimes: 'http://www.nytimes.com/',
  stackoverflow: 'http://stackoverflow.com/',
  wikipedia: 'http://en.wikipedia.org/wiki/President_of_the_United_States'
};
var fileNames = Object.keys(urls).sort();

var minimize = new Minimize();

var progress = new Progress('[:bar] :etas :fileName', {
  width: 50,
  total: fileNames.length
});

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

function readBuffer(filePath, callback) {
  fs.readFile(filePath, function (err, data) {
    if (err) {
      throw new Error('There was an error reading ' + filePath);
    }
    callback(data);
  });
}

function readText(filePath, callback) {
  fs.readFile(filePath, { encoding: 'utf8' }, function (err, data) {
    if (err) {
      throw new Error('There was an error reading ' + filePath);
    }
    callback(data);
  });
}

function writeBuffer(filePath, data, callback) {
  fs.writeFile(filePath, data, function (err) {
    if (err) {
      throw new Error('There was an error writing ' + filePath);
    }
    callback();
  });
}

function writeText(filePath, data, callback) {
  fs.writeFile(filePath, data, { encoding: 'utf8' }, function (err) {
    if (err) {
      throw new Error('There was an error writing ' + filePath);
    }
    callback();
  });
}

function readSize(filePath, callback) {
  fs.stat(filePath, function (err, stats) {
    if (err) {
      throw new Error('There was an error reading ' + filePath);
    }
    callback(stats.size);
  });
}

function gzip(inPath, outPath, callback) {
  fs.createReadStream(inPath).pipe(zlib.createGzip({
    level: zlib.Z_BEST_COMPRESSION
  })).pipe(fs.createWriteStream(outPath)).on('finish', callback);
}

function run(tasks, done) {
  var i = 0;

  function callback() {
    if (i < tasks.length) {
      tasks[i++](callback);
    }
    else {
      done();
    }
  }

  callback();
}

var rows = {};
run(fileNames.map(function (fileName) {
  return function (done) {
    progress.tick(0, { fileName: fileName });
    var filePath = path.join('benchmarks/', fileName + '.html');
    var original = {
      filePath: filePath,
      gzFilePath: path.join('benchmarks/generated/', fileName + '.html.gz'),
      lzFilePath: path.join('benchmarks/generated/', fileName + '.html.lz'),
      brFilePath: path.join('benchmarks/generated/', fileName + '.html.br')
    };
    var infos = {};
    ['minifier', 'minimize', 'willpeavy', 'compressor'].forEach(function (name) {
      infos[name] = {
        filePath: path.join('benchmarks/generated/', fileName + '.' + name + '.html'),
        gzFilePath: path.join('benchmarks/generated/', fileName + '.' + name + '.html.gz'),
        lzFilePath: path.join('benchmarks/generated/', fileName + '.' + name + '.html.lz'),
        brFilePath: path.join('benchmarks/generated/', fileName + '.' + name + '.html.br')
      };
    });

    function readSizes(info, done) {
      info.endTime = Date.now();
      run([
        // Apply Gzip on minified output
        function (done) {
          gzip(info.filePath, info.gzFilePath, function () {
            info.gzTime = Date.now();
            // Open and read the size of the minified+gzip output
            readSize(info.gzFilePath, function (size) {
              info.gzSize = size;
              done();
            });
          });
        },
        // Apply LZMA on minified output
        function (done) {
          readBuffer(info.filePath, function (data) {
            lzma.compress(data, 1, function (result, error) {
              if (error) {
                throw error;
              }
              writeBuffer(info.lzFilePath, new Buffer(result), function () {
                info.lzTime = Date.now();
                // Open and read the size of the minified+lzma output
                readSize(info.lzFilePath, function (size) {
                  info.lzSize = size;
                  done();
                });
              });
            });
          });
        },
        // Apply Brotli on minified output
        function (done) {
          readBuffer(info.filePath, function (data) {
            var output = new Buffer(brotli.compress(data, true).buffer);
            writeBuffer(info.brFilePath, output, function () {
              info.brTime = Date.now();
              // Open and read the size of the minified+brotli output
              readSize(info.brFilePath, function (size) {
                info.brSize = size;
                done();
              });
            });
          });
        },
        // Open and read the size of the minified output
        function (done) {
          readSize(info.filePath, function (size) {
            info.size = size;
            done();
          });
        }
      ], done);
    }

    function testHTMLMinifier(done) {
      var info = infos.minifier;
      info.startTime = Date.now();
      var args = [filePath, '-c', 'sample-cli-config-file.conf', '--minify-urls', urls[fileName], '-o', info.filePath];
      fork('./cli', args).on('exit', function () {
        readSizes(info, done);
      });
    }

    function testMinimize(done) {
      readBuffer(filePath, function (data) {
        minimize.parse(data, function (error, data) {
          var info = infos.minimize;
          writeBuffer(info.filePath, data, function () {
            readSizes(info, done);
          });
        });
      });
    }

    function testWillPeavy(done) {
      readText(filePath, function (data) {
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
            writeText(info.filePath, response.substring(start + 1, end), function () {
              readSizes(info, done);
            });
          });
        }).end(querystring.stringify({
          html: data
        }));
      });
    }

    function testHTMLCompressor(done) {
      readText(filePath, function (data) {
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
              writeText(info.filePath, response.result, function () {
                readSizes(info, done);
              });
            }
            // Site refused to process content
            else {
              info.size = 0;
              info.gzSize = 0;
              info.lzSize = 0;
              info.brSize = 0;
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
        [fileName, '+ gzip', '+ lzma', '+ brotli'].join('\n'),
        [redSize(original.size), redSize(original.gzSize), redSize(original.lzSize), redSize(original.brSize)].join('\n')
      ];
      for (var name in infos) {
        var info = infos[name];
        row.push([greenSize(info.size), greenSize(info.gzSize), greenSize(info.lzSize), greenSize(info.brSize)].join('\n'));
      }
      row.push(
        [
          blueSavings(original.size, infos.minifier.size),
          blueSavings(original.gzSize, infos.minifier.gzSize),
          blueSavings(original.lzSize, infos.minifier.lzSize),
          blueSavings(original.brSize, infos.minifier.brSize)
        ].join('\n'),
        [
          blueTime(infos.minifier.endTime - infos.minifier.startTime),
          blueTime(original.gzTime - original.endTime),
          blueTime(original.lzTime - original.gzTime),
          blueTime(original.brTime - original.lzTime)
        ].join('\n')
      );
      rows[fileName] = row;
      progress.tick({ fileName: '' });
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
