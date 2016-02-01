#!/usr/bin/env node

'use strict';

var fs = require('fs'),
    path = require('path'),
    zlib = require('zlib'),
    exec = require('child_process').exec,
    chalk = require('chalk'),
    Table = require('cli-table'),

    Minimize = require('minimize'),
    minimize = new Minimize();

var fileNames = [
  'abc',
  'amazon',
  'eloquentjavascript',
  'es6-draft',
  'es6-table',
  'google',
  'html-minifier',
  'msn',
  'newyorktimes',
  'stackoverflow',
  'wikipedia',
  'es6'
].sort();

var table = new Table({
  head: ['File', 'Before', 'After', 'Savings', 'Time', 'Minimize'],
  colWidths: [20, 25, 25, 20, 10, 25]
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
    var gzFilePath = path.join('benchmarks/generated/', fileName + '.html.gz');
    var gzMinifiedFilePath = path.join('benchmarks/generated/', fileName + '.min.html.gz');
    var gzMinimizedFilePath = path.join('benchmarks/generated/', fileName + '.mz.html.gz');
    var command = path.normalize('./cli.js') + ' ' + filePath + ' -c benchmark.conf' + ' -o ' + minifiedFilePath;
    var originalSize, gzOriginalSize,
        minifiedSize, gzMinifiedSize,
        minimizedSize, gzMinimizedSize,
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
      // Minified test
      function (done) {
        // Begin timing after gzipped fixtures have been created
        var startTime = Date.now();
        exec('node ' + command, function () {

          // Open and read the size of the minified output
          fs.stat(minifiedFilePath, function (err, stats) {
            if (err) {
              throw new Error('There was an error reading ' + minifiedFilePath);
            }

            minifiedSize = stats.size;
            minifiedTime = Date.now() - startTime;

            // Gzip the minified output
            gzip(minifiedFilePath, gzMinifiedFilePath, function () {
              // Open and read the size of the minified+gzipped output
              fs.stat(gzMinifiedFilePath, function (err, stats) {
                if (err) {
                  throw new Error('There was an error reading ' + gzMinifiedFilePath);
                }

                gzMinifiedSize = stats.size;
                gzMinifiedTime = Date.now() - startTime;
                done();
              });
            });
          });
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
              gzip(minimizedFilePath, gzMinimizedFilePath, function () {
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
      }
    ], function () {
      rows[fileName] = [
        [fileName, '+ gzipped'].join('\n'),
        [redSize(originalSize), redSize(gzOriginalSize)].join('\n'),
        [greenSize(minifiedSize), greenSize(gzMinifiedSize)].join('\n'),
        [blueSavings(originalSize, minifiedSize), blueSavings(gzOriginalSize, gzMinifiedSize)].join('\n'),
        [blueTime(minifiedTime), blueTime(gzMinifiedTime)].join('\n'),
        [greenSize(minimizedSize), greenSize(gzMinimizedSize)].join('\n')
      ];
      done();
    });
  };
}), function () {
  fileNames.forEach(function (fileName) {
    table.push(rows[fileName]);
  });
  console.log('\n' + table.toString());
});
