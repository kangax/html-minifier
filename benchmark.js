/* jshint strict:false */

var fs = require('fs'),
    exec = require('child_process').exec,
    Table = require('cli-table');

var fileNames = [
  // 'es6-draft',
  // 'eloquentjavascript',
  'wikipedia',
  'stackoverflow',
  'amazon',
  'es6-table',
  'msn',
  'google',
  'newyorktimes',
  'abc',
  'html-minifier'
];

var table = new Table({
  head: ['File', 'Before', 'After', 'Savings', 'Time'],
  colWidths: [20, 25, 25, 20, 20]
});

console.log('');

function redSize(size) {
  return '\033[91m' + size + '\033[0m (' + toKb(size) + 'KB)';
}

function greenSize(size) {
  return '\033[92m' + size + '\033[0m (' + toKb(size) + 'KB)';
}

function toKb(size) {
  return (size / 1024).toFixed(2);
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

  var filePath = 'benchmarks/' + fileName + '.html';
  var minifiedFilePath = 'benchmarks/' + fileName + '.min.html';
  var gzFilePath = filePath + '.gz';
  var gzMinifiedFilePath = 'benchmarks/' + fileName + '.min.html.gz';
  var command = './cli.js ' + filePath + ' -c benchmark.conf' + ' -o ' + minifiedFilePath;

  // Open and read the size of the original input
  fs.stat(filePath, function (err, stats) {
    var originalSize = stats.size;

    exec('gzip -k -f -9 ' + filePath + ' > ' + gzFilePath, function () {
      // Open and read the size of the gzipped original
      fs.stat(gzFilePath, function (err, stats) {
        var gzOriginalSize = stats.size;

        // Begin timing after gzipped fixtures have been created
        var startTime = new Date();
        exec(command, function () {

          // Open and read the size of the minified output
          fs.stat(minifiedFilePath, function (err, stats) {
            var minifiedSize = stats.size;
            var minifiedTime = new Date() - startTime;

            // Gzip the minified output
            exec('gzip -k -f -9 ' + minifiedFilePath + ' > ' + gzMinifiedFilePath, function () {
              // Open and read the size of the minified+gzipped output
              fs.stat(gzMinifiedFilePath, function (err, stats) {
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
