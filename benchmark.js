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
    var minifiedFilePath = path.join('benchmarks/generated/', fileName + '.min.html');
    var minimizedFilePath = path.join('benchmarks/generated/', fileName + '.mz.html');
    var willPeavyFilePath = path.join('benchmarks/generated/', fileName + '.wp.html');
    var compressFilePath = path.join('benchmarks/generated/', fileName + '.hc.html');
    var gzFilePath = path.join('benchmarks/generated/', fileName + '.html.gz');
    var gzMinifiedFilePath = path.join('benchmarks/generated/', fileName + '.min.html.gz');
    var gzMinimizedFilePath = path.join('benchmarks/generated/', fileName + '.mz.html.gz');
    var gzWillPeavyFilePath = path.join('benchmarks/generated/', fileName + '.wp.html.gz');
    var gzCompressFilePath = path.join('benchmarks/generated/', fileName + '.hc.html.gz');
    var originalSize, gzOriginalSize,
        minifiedSize, gzMinifiedSize,
        minimizedSize, gzMinimizedSize,
        willPeavySize, gzWillPeavySize,
        compressSize, gzCompressSize,
        minifiedTime, gzMinifiedTime;

    run([
      // Open and read the size of the original input
      function (done) {
        fs.stat(filePath, function (err, stats) {
          if (err) {
            throw new Error('There was an error reading ' + filePath);
          }
          originalSize = stats.size;
          done();
        });
      },
      // Open and read the size of the gzipped original
      function (done) {
        gzip(filePath, gzFilePath, function () {
          fs.stat(gzFilePath, function (err, stats) {
            if (err) {
              throw new Error('There was an error reading ' + gzFilePath);
            }
            gzOriginalSize = stats.size;
            done();
          });
        });
      },
      // HTMLMinifier test
      function (done) {
        // Begin timing after gzipped fixtures have been created
        var startTime = Date.now();
        fork('./cli', [filePath, '-c', 'benchmark.conf', '-o', minifiedFilePath]).on('exit', function () {
          minifiedTime = Date.now() - startTime;
          run([
            // Gzip the minified output
            function (done) {
              gzip(minifiedFilePath, gzMinifiedFilePath, function () {
                gzMinifiedTime = Date.now() - startTime;
                // Open and read the size of the minified+gzipped output
                fs.stat(gzMinifiedFilePath, function (err, stats) {
                  if (err) {
                    throw new Error('There was an error reading ' + gzMinifiedFilePath);
                  }
                  gzMinifiedSize = stats.size;
                  done();
                });
              });
            },
            // Open and read the size of the minified output
            function (done) {
              fs.stat(minifiedFilePath, function (err, stats) {
                if (err) {
                  throw new Error('There was an error reading ' + minifiedFilePath);
                }
                minifiedSize = stats.size;
                done();
              });
            }
          ], done);
        });
      },
      // Minimize test
      function (done) {
        fs.readFile(filePath, function (err, data) {
          if (err) {
            throw new Error('There was an error reading ' + filePath);
          }
          minimize.parse(data, function (error, data) {
            minimizedSize = data.length;
            fs.writeFile(minimizedFilePath, data, function (err) {
              if (err) {
                throw new Error('There was an error writing ' + minimizedFilePath);
              }
              // Gzip the minified output
              gzip(minimizedFilePath, gzMinimizedFilePath, function () {
                // Open and read the size of the minified+gzipped output
                fs.stat(gzMinimizedFilePath, function (err, stats) {
                  if (err) {
                    throw new Error('There was an error reading ' + gzMinimizedFilePath);
                  }
                  gzMinimizedSize = stats.size;
                  done();
                });
              });
            });
          });
        });
      },
      // Will Peavy test
      function (done) {
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
              fs.writeFile(willPeavyFilePath, response.substring(start + 1, end), {
                encoding: 'utf8'
              }, function () {
                run([
                  // Gzip the minified output
                  function (done) {
                    gzip(willPeavyFilePath, gzWillPeavyFilePath, function () {
                      // Open and read the size of the minified+gzipped output
                      fs.stat(gzWillPeavyFilePath, function (err, stats) {
                        if (err) {
                          throw new Error('There was an error reading ' + gzWillPeavyFilePath);
                        }
                        gzWillPeavySize = stats.size;
                        done();
                      });
                    });
                  },
                  // Open and read the size of the minified output
                  function (done) {
                    fs.stat(willPeavyFilePath, function (err, stats) {
                      if (err) {
                        throw new Error('There was an error reading ' + willPeavyFilePath);
                      }
                      willPeavySize = stats.size;
                      done();
                    });
                  }
                ], done);
              });
            });
          }).end(querystring.stringify({
            html: data
          }));
        });
      },
      // HTML Compressor test
      function (done) {
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
              if (response.success) {
                fs.writeFile(compressFilePath, response.result, {
                  encoding: 'utf8'
                }, function () {
                  run([
                    // Gzip the minified output
                    function (done) {
                      gzip(compressFilePath, gzCompressFilePath, function () {
                        // Open and read the size of the minified+gzipped output
                        fs.stat(gzCompressFilePath, function (err, stats) {
                          if (err) {
                            throw new Error('There was an error reading ' + gzCompressFilePath);
                          }
                          gzCompressSize = stats.size;
                          done();
                        });
                      });
                    },
                    // Open and read the size of the minified output
                    function (done) {
                      fs.stat(compressFilePath, function (err, stats) {
                        if (err) {
                          throw new Error('There was an error reading ' + compressFilePath);
                        }
                        compressSize = stats.size;
                        done();
                      });
                    }
                  ], done);
                });
              }
              // Site refused to process content
              else {
                compressSize = gzCompressSize = 0;
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
    ], function () {
      rows[fileName] = [
        [fileName, '+ gzipped'].join('\n'),
        [redSize(originalSize), redSize(gzOriginalSize)].join('\n'),
        [greenSize(minifiedSize), greenSize(gzMinifiedSize)].join('\n'),
        [greenSize(minimizedSize), greenSize(gzMinimizedSize)].join('\n'),
        [greenSize(willPeavySize), greenSize(gzWillPeavySize)].join('\n'),
        [greenSize(compressSize), greenSize(gzCompressSize)].join('\n'),
        [blueSavings(originalSize, minifiedSize), blueSavings(gzOriginalSize, gzMinifiedSize)].join('\n'),
        [blueTime(minifiedTime), blueTime(gzMinifiedTime)].join('\n')
      ];
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
