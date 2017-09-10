#!/usr/bin/env node

'use strict';

var packages = require('./package.json').benchmarkDependencies;
packages = Object.keys(packages).map(function(name) {
  return name + '@' + packages[name];
});
packages.unshift('install', '--no-save', '--no-optional');
var installed = require('child_process').spawnSync('npm', packages, {
  encoding: 'utf-8',
  shell: true
});
if (installed.error) {
  throw installed.error;
}
else if (installed.status) {
  console.log(installed.stdout);
  console.error(installed.stderr);
  process.exit(installed.status);
}

var brotli = require('brotli'),
    chalk = require('chalk'),
    fork = require('child_process').fork,
    fs = require('fs'),
    https = require('https'),
    lzma = require('lzma'),
    Minimize = require('minimize'),
    path = require('path'),
    Progress = require('progress'),
    querystring = require('querystring'),
    Table = require('cli-table'),
    url = require('url'),
    zlib = require('zlib');

var urls = require('./benchmarks');
var fileNames = Object.keys(urls);

var minimize = new Minimize();

var progress = new Progress('[:bar] :etas :fileName', {
  width: 50,
  total: fileNames.length
});

var table = new Table({
  head: ['File', 'Before', 'After', 'Minimize', 'Will Peavy', 'htmlcompressor.com', 'Savings', 'Time'],
  colWidths: [fileNames.reduce(function(length, fileName) {
    return Math.max(length, fileName.length);
  }, 0) + 2, 25, 25, 25, 25, 25, 20, 10]
});

function toKb(size, precision) {
  return (size / 1024).toFixed(precision || 0);
}

function redSize(size) {
  return chalk.red.bold(size) + chalk.white(' (' + toKb(size, 2) + ' KB)');
}

function greenSize(size) {
  return chalk.green.bold(size) + chalk.white(' (' + toKb(size, 2) + ' KB)');
}

function blueSavings(oldSize, newSize) {
  var savingsPercent = (1 - newSize / oldSize) * 100;
  var savings = oldSize - newSize;
  return chalk.cyan.bold(savingsPercent.toFixed(2)) + chalk.white('% (' + toKb(savings, 2) + ' KB)');
}

function blueTime(time) {
  return chalk.cyan.bold(time) + chalk.white(' ms');
}

function readBuffer(filePath, callback) {
  fs.readFile(filePath, function(err, data) {
    if (err) {
      throw new Error('There was an error reading ' + filePath);
    }
    callback(data);
  });
}

function readText(filePath, callback) {
  fs.readFile(filePath, { encoding: 'utf8' }, function(err, data) {
    if (err) {
      throw new Error('There was an error reading ' + filePath);
    }
    callback(data);
  });
}

function writeBuffer(filePath, data, callback) {
  fs.writeFile(filePath, data, function(err) {
    if (err) {
      throw new Error('There was an error writing ' + filePath);
    }
    callback();
  });
}

function writeText(filePath, data, callback) {
  fs.writeFile(filePath, data, { encoding: 'utf8' }, function(err) {
    if (err) {
      throw new Error('There was an error writing ' + filePath);
    }
    if (callback) {
      callback();
    }
  });
}

function readSize(filePath, callback) {
  fs.stat(filePath, function(err, stats) {
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

function generateMarkdownTable() {
  var headers = [
    'Site',
    'Original size *(KB)*',
    'HTMLMinifier',
    'minimize',
    'Will Peavy',
    'htmlcompressor.com'
  ];
  fileNames.forEach(function(fileName) {
    var row = rows[fileName].report;
    row[2] = '**' + row[2] + '**';
  });
  var widths = headers.map(function(header, index) {
    var width = header.length;
    fileNames.forEach(function(fileName) {
      width = Math.max(width, rows[fileName].report[index].length);
    });
    return width;
  });
  var content = '';

  function output(row) {
    widths.forEach(function(width, index) {
      var text = row[index];
      content += '| ' + text + new Array(width - text.length + 2).join(' ');
    });
    content += '|\n';
  }

  output(headers);
  widths.forEach(function(width, index) {
    content += '|';
    content += index === 1 ? ':' : ' ';
    content += new Array(width + 1).join('-');
    content += index === 0 ? ' ' : ':';
  });
  content += '|\n';
  fileNames.sort(function(a, b) {
    var r = +rows[a].report[1];
    var s = +rows[b].report[1];
    return r < s ? -1 : r > s ? 1 : a < b ? -1 : a > b ? 1 : 0;
  }).forEach(function(fileName) {
    output(rows[fileName].report);
  });
  return content;
}

function displayTable() {
  fileNames.forEach(function(fileName) {
    table.push(rows[fileName].display);
  });
  console.log();
  console.log(table.toString());
}

run(fileNames.map(function(fileName) {
  var filePath = path.join('benchmarks/', fileName + '.html');

  function processFile(site, done) {
    var original = {
      filePath: filePath,
      gzFilePath: path.join('benchmarks/generated/', fileName + '.html.gz'),
      lzFilePath: path.join('benchmarks/generated/', fileName + '.html.lz'),
      brFilePath: path.join('benchmarks/generated/', fileName + '.html.br')
    };
    var infos = {};
    ['minifier', 'minimize', 'willpeavy', 'compressor'].forEach(function(name) {
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
        function(done) {
          gzip(info.filePath, info.gzFilePath, function() {
            info.gzTime = Date.now();
            // Open and read the size of the minified+gzip output
            readSize(info.gzFilePath, function(size) {
              info.gzSize = size;
              done();
            });
          });
        },
        // Apply LZMA on minified output
        function(done) {
          readBuffer(info.filePath, function(data) {
            lzma.compress(data, 1, function(result, error) {
              if (error) {
                throw error;
              }
              writeBuffer(info.lzFilePath, new Buffer(result), function() {
                info.lzTime = Date.now();
                // Open and read the size of the minified+lzma output
                readSize(info.lzFilePath, function(size) {
                  info.lzSize = size;
                  done();
                });
              });
            });
          });
        },
        // Apply Brotli on minified output
        function(done) {
          readBuffer(info.filePath, function(data) {
            var output = new Buffer(brotli.compress(data, true).buffer);
            writeBuffer(info.brFilePath, output, function() {
              info.brTime = Date.now();
              // Open and read the size of the minified+brotli output
              readSize(info.brFilePath, function(size) {
                info.brSize = size;
                done();
              });
            });
          });
        },
        // Open and read the size of the minified output
        function(done) {
          readSize(info.filePath, function(size) {
            info.size = size;
            done();
          });
        }
      ], done);
    }

    function testHTMLMinifier(done) {
      var info = infos.minifier;
      info.startTime = Date.now();
      var args = [filePath, '-c', 'sample-cli-config-file.conf', '--minify-urls', site, '-o', info.filePath];
      fork('./cli', args).on('exit', function() {
        readSizes(info, done);
      });
    }

    function testMinimize(done) {
      readBuffer(filePath, function(data) {
        minimize.parse(data, function(error, data) {
          var info = infos.minimize;
          writeBuffer(info.filePath, data, function() {
            readSizes(info, done);
          });
        });
      });
    }

    function testWillPeavy(done) {
      readText(filePath, function(data) {
        var options = url.parse('https://www.willpeavy.com/minifier/');
        options.method = 'POST';
        options.headers = {
          'Content-Type': 'application/x-www-form-urlencoded'
        };
        https.request(options, function(res) {
          res.setEncoding('utf8');
          var response = '';
          res.on('data', function(chunk) {
            response += chunk;
          }).on('end', function() {
            var info = infos.willpeavy;
            if (res.statusCode === 200) {
              // Extract result from <textarea/>
              var start = response.indexOf('>', response.indexOf('<textarea'));
              var end = response.lastIndexOf('</textarea>');
              var result = response.slice(start + 1, end).replace(/<\\\//g, '</');
              writeText(info.filePath, result, function() {
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
          html: data
        }));
      });
    }

    function testHTMLCompressor(done) {
      readText(filePath, function(data) {
        var options = url.parse('https://htmlcompressor.com/compress_ajax_v2.php');
        options.method = 'POST';
        options.headers = {
          'Accept-Encoding': 'gzip',
          'Content-Type': 'application/x-www-form-urlencoded'
        };
        var info = infos.compressor;

        function failed() {
          // Site refused to process content
          if (info) {
            info.size = 0;
            info.gzSize = 0;
            info.lzSize = 0;
            info.brSize = 0;
            info = null;
            done();
          }
        }

        https.request(options, function(res) {
          if (res.headers['content-encoding'] === 'gzip') {
            res = res.pipe(zlib.createGunzip());
          }
          res.setEncoding('utf8');
          var response = '';
          res.on('data', function(chunk) {
            response += chunk;
          }).on('end', function() {
            try {
              response = JSON.parse(response);
            }
            catch (e) {
              response = {};
            }
            if (info && response.success) {
              writeText(info.filePath, response.result, function() {
                readSizes(info, done);
              });
            }
            // Site refused to process content
            else {
              failed();
            }
          });
        }).on('error', failed).end(querystring.stringify({
          code_type: 'html',
          html_level: 3,
          html_strip_quotes: 1,
          minimize_style: 1,
          minimize_events: 1,
          minimize_js_href: 1,
          minimize_css: 1,
          minimize_js: 1,
          html_optional_cdata: 1,
          js_engine: 'yui',
          js_fallback: 1,
          code: data
        }));
      });
    }

    run([
      function(done) {
        readSizes(original, done);
      },
      testHTMLMinifier,
      testMinimize,
      testWillPeavy,
      testHTMLCompressor
    ], function() {
      var display = [
        [fileName, '+ gzip', '+ lzma', '+ brotli'].join('\n'),
        [redSize(original.size), redSize(original.gzSize), redSize(original.lzSize), redSize(original.brSize)].join('\n')
      ];
      var report = [
        '[' + fileName + '](' + urls[fileName] + ')',
        toKb(original.size)
      ];
      for (var name in infos) {
        var info = infos[name];
        display.push([greenSize(info.size), greenSize(info.gzSize), greenSize(info.lzSize), greenSize(info.brSize)].join('\n'));
        report.push(info.size ? toKb(info.size) : 'n/a');
      }
      display.push(
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
      rows[fileName] = {
        display: display,
        report: report
      };
      progress.tick({ fileName: '' });
      done();
    });
  }

  function get(site, callback) {
    var options = url.parse(site);
    https.get(options, function(res) {
      var status = res.statusCode;
      if (status === 200) {
        if (res.headers['content-encoding'] === 'gzip') {
          res = res.pipe(zlib.createGunzip());
        }
        res.pipe(fs.createWriteStream(filePath)).on('finish', function() {
          callback(site);
        });
      }
      else if (status >= 300 && status < 400 && res.headers.location) {
        get(url.resolve(site, res.headers.location), callback);
      }
      else {
        throw new Error('HTTP error ' + status + '\n' + site);
      }
    });
  }

  return function(done) {
    progress.tick(0, { fileName: fileName });
    get(urls[fileName], function(site) {
      processFile(site, done);
    });
  };
}), function() {
  displayTable();
  var content = generateMarkdownTable();
  var readme = './README.md';
  readText(readme, function(data) {
    var start = data.indexOf('## Minification comparison');
    start = data.indexOf('|', start);
    var end = data.indexOf('##', start);
    end = data.lastIndexOf('|\n', end) + '|\n'.length;
    data = data.slice(0, start) + content + data.slice(end);
    writeText(readme, data);
  });
});
