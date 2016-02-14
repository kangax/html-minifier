#!/usr/bin/env node

'use strict';

var child_process = require('child_process'),
    fs = require('fs'),
    os = require('os'),
    path = require('path');

var urls = require('./benchmarks');
var fileNames = Object.keys(urls).sort();

function run(tasks, callback) {
  var remaining = tasks.length;

  function done() {
    if (!--remaining) {
      callback();
    }
  }

  tasks.forEach(function(task) {
    task(done);
  });
}

function git() {
  var args = [].concat.apply([], [].slice.call(arguments, 0, -1));
  var callback = arguments[arguments.length - 1];
  var task = child_process.spawn('git', args, { stdio: [ 'ignore', 'pipe', 'ignore' ] });
  var output = '';
  task.stdout.setEncoding('utf8');
  task.stdout.on('data', function(data) {
    output += data;
  });
  task.on('exit', function(code) {
    callback(code, output);
  });
}

function readText(filePath, callback) {
  fs.readFile(filePath, { encoding: 'utf8' }, callback);
}

function minify(hash, options) {
  var minify = require('./src/htmlminifier').minify;
  process.send('ready');
  var results = {};
  run(fileNames.map(function(fileName) {
    return function(done) {
      readText(path.join('benchmarks/', fileName + '.html'), function(err, data) {
        if (err) {
          throw err;
        }
        else {
          options.minifyURLs = { site: urls[fileName] };
          results[fileName] = minify(data, options).length;
          done();
        }
      });
    };
  }), function() {
    process.send(results);
  });
}

function print(table) {
  var output = [];
  var row = fileNames.slice(0);
  row.unshift('hash', 'date');
  output.push(row.join(','));
  for (var hash in table) {
    var data = table[hash];
    row = [ hash, '"' + data.date + '"' ];
    for (var i = 0; i < fileNames.length; i++) {
      row.push(data[fileNames[i]]);
    }
    output.push(row.join(','));
  }
  fs.writeFile('backtest.csv', output.join('\n'), { encoding: 'utf8' }, function(err) {
    if (err) {
      throw err;
    }
  });
}

if (process.argv.length > 2) {
  var count = +process.argv[2];
  if (count) {
    git('log', '--date=iso', '--pretty=format:%h %cd', '-' + count, function(code, data) {
      var table = {};
      var commits = data.split(/\s*?\n/).map(function(line) {
        var index = line.indexOf(' ');
        var hash = line.substr(0, index);
        table[hash] = {
          date: line.substr(index + 1).replace('+', '').replace(/ 0000$/, '')
        };
        return hash;
      });
      var nThreads = os.cpus().length;
      var running = 0, ready = true;

      function done() {
        if (!--running && !commits.length) {
          print(table);
        }
      }

      function fork() {
        if (commits.length && running < nThreads) {
          var hash = commits.shift();
          var task = child_process.fork('./backtest', { silent: true });
          setTimeout(function() {
            task.kill();
          }, 15000);
          var output = '';
          task.on('message', function(data) {
            if (data === 'ready') {
              ready = true;
            }
            else {
              var date = table[hash].date;
              table[hash] = data;
              table[hash].date = date;
              task.disconnect();
              done();
            }
            fork();
          }).on('exit', function(code) {
            if (code !== 0) {
              console.error(hash, '-', output.substr(0, output.indexOf('\n')));
              done();
              fork();
            }
          });
          task.stderr.setEncoding('utf8');
          task.stderr.on('data', function(data) {
            output += data;
          });
          task.stdout.resume();
          task.send(hash);
          running++;
        }
      }

      fork();
    });
  }
  else {
    console.error('Invalid input:', process.argv[2]);
  }
}
else {
  process.on('message', function(hash) {
    var paths = ['src', 'benchmark.conf', 'sample-cli-config-file.conf'];
    git('reset', 'HEAD', '--', paths, function() {
      var conf = 'sample-cli-config-file.conf';

      function checkout() {
        var path = paths.shift();
        git('checkout', hash, '--', path, function(code) {
          if (code === 0 && path === 'benchmark.conf') {
            conf = path;
          }
          if (paths.length) {
            checkout();
          }
          else {
            readText(conf, function(err, data) {
              if (err) {
                throw err;
              }
              else {
                /* global JSON: true */
                minify(hash, JSON.parse(data));
              }
            });
          }
        });
      }

      checkout();
    });
  });
}
