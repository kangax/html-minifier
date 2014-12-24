#!/usr/bin/env node

/* jshint strict:false */

var fs = require('fs'),
    path = require('path'),
    exec = require('child_process').exec,
    Table = require('cli-table');

var fileNames = [
  'abc',
  'amazon',
  //'eloquentjavascript',
  //'es6-draft',
  'es6-table',
  'google',
  'html-minifier',
  'msn',
  'newyorktimes',
  'stackoverflow',
  'wikipedia'
];

fileNames = fileNames.sort().reverse();

var table = new Table({
  head: ['File', 'Before', 'After', 'Savings', 'Time'],
  colWidths: [20, 25, 25, 20, 20]
});

console.log('');

function toKb(size) {
  return (size / 1024).toFixed(2);
}

function redSize(size) {
  return '\033[91m' + size + '\033[0m (' + toKb(size) + 'KB)';
}

function greenSize(size) {
  return '\033[92m' + size + '\033[0m (' + toKb(size) + 'KB)';
}

function blueSavings(oldSize, newSize) {
  var savingsPercent = (1 - newSize / oldSize) * 100;
  var savings = (oldSize - newSize) / 1024;
  return '\033[96m' + savingsPercent.toFixed(2) + '\033[0m% (' + savings.toFixed(2) + 'KB)';
}

function blueTime(time) {
  return '\033[96m' + time + '\033[0mms';
}

function test(fileName, done) {

  if (!fileName) {
    console.log(table.toString());
    return;
  }

  console.log('Processing...', fileName);

  var filePath = path.join('benchmarks/', fileName + '.html');
  var minifiedFilePath = path.join('benchmarks/generated/', fileName + '.min.html');
  var gzFilePath = path.join('benchmarks/generated/', fileName + '.html.gz');
  var gzMinifiedFilePath = path.join('benchmarks/generated/', fileName + '.min.html.gz');
  var command = path.normalize('./cli.js') + ' ' + filePath + ' -c benchmark.conf' + ' -o ' + minifiedFilePath;

  // Open and read the size of the original input
  fs.stat(filePath, function (err, stats) {
    if (err) {
      throw new Error('There was an error reading ' + filePath);
    }
    var originalSize = stats.size;

    exec('gzip --keep --force --best --stdout ' + filePath + ' > ' + gzFilePath, function () {
      // Open and read the size of the gzipped original
      fs.stat(gzFilePath, function (err, stats) {
        if (err) {
          throw new Error('There was an error reading ' + gzFilePath);
        }

        var gzOriginalSize = stats.size;

        // Begin timing after gzipped fixtures have been created
        var startTime = new Date();
        exec('node ' + command, function () {

          // Open and read the size of the minified output
          fs.stat(minifiedFilePath, function (err, stats) {
            if (err) {
              throw new Error('There was an error reading ' + minifiedFilePath);
            }

            var minifiedSize = stats.size;
            var minifiedTime = new Date() - startTime;

            // Gzip the minified output
            exec('gzip --keep --force --best --stdout ' + minifiedFilePath + ' > ' + gzMinifiedFilePath, function () {
              // Open and read the size of the minified+gzipped output
              fs.stat(gzMinifiedFilePath, function (err, stats) {
                if (err) {
                  throw new Error('There was an error reading ' + gzMinifiedFilePath);
                }

                var gzMinifiedSize = stats.size;
                var gzMinifiedTime = new Date() - startTime;

                table.push([
                  [fileName, '+ gzipped'].join('\n'),
                  [redSize(originalSize), redSize(gzOriginalSize)].join('\n'),
                  [greenSize(minifiedSize), greenSize(gzMinifiedSize)].join('\n'),
                  [blueSavings(originalSize, minifiedSize), blueSavings(gzOriginalSize, gzMinifiedSize)].join('\n'),
                  [blueTime(minifiedTime), blueTime(gzMinifiedTime)].join('\n')
                ]);

                done();
              });
            });
          });
        });
      });
    });
  });
}

(function run() {
  test(fileNames.pop(), run);
})();
