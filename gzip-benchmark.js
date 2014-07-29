/* jshint strict:false */

var fs = require('fs'),
    exec = require('child_process').exec,
    Table = require('cli-table'),
    _ = require('underscore');

function average (arr) {
  return _.reduce(arr, function(memo, num) {
    return memo + num;
  }, 0) / arr.length;
}

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

var allSavings = [];
var allTimes = [];

console.log('');
function test(fileName, done) {

  if (!fileName) {
    console.log(table.toString() + '\n');
    console.log('Average savings: \033[96m' + average(allSavings).toFixed(2) + '\033[0m%');
    console.log('Average time: \033[96m' + average(allTimes).toFixed(2) + '\033[0mms\n');
    return;
  }

  var filePath = 'benchmarks/' + fileName + '.html';
  var gzFilePath = filePath + '.gz';
  var minifedGzFilePath = 'benchmarks/' + fileName + '.min.html.gz';
  var command = './gzip-benchmark-minify ' + fileName;
  console.log(command);

  var startTime = new Date();

  console.log('Processing...', fileName);

  exec(command, function () {

    fs.stat(gzFilePath, function (err, stats) {

      var beforeSize = stats.size;

      fs.stat(minifedGzFilePath, function (err, stats) {

        var time = new Date() - startTime;
        var savingsPercent = (1 - stats.size / beforeSize) * 100;
        var savings = (beforeSize - stats.size) / 1024;

        allSavings.push(savings);
        allTimes.push(time);

        table.push([
          fileName,
          '\033[91m' + beforeSize + '\033[0m (' + (beforeSize / 1024).toFixed(2) + 'KB)',
          '\033[92m' + stats.size + '\033[0m (' + (stats.size / 1024).toFixed(2) + 'KB)',
          '\033[96m' + savingsPercent.toFixed(2) + '\033[0m% (' + savings.toFixed(2) + 'KB)',
          '\033[96m' + time + '\033[0mms'
        ]);

        done();
      });
    });
  });
}

(function run() {
  test(fileNames.pop(), run);
})();
