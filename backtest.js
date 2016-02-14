#!/usr/bin/env node

'use strict';

var child_process = require('child_process'),
    fs = require('fs'),
    os = require('os'),
    path = require('path');

var urls = require('./benchmarks');
var fileNames = Object.keys(urls).sort();

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
  var count = fileNames.length;
  fileNames.forEach(function(fileName) {
    readText(path.join('benchmarks/', fileName + '.html'), function(err, data) {
      if (err) {
        throw err;
      }
      else {
        try {
          options.minifyURLs = { site: urls[fileName] };
          process.send({ name: fileName, size: minify(data, options).length });
        }
        catch (e) {
          console.error('[' + fileName + ']', e.stack || e);
        }
        finally {
          if (!--count) {
            process.disconnect();
          }
        }
      }
    });
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

      function fork() {
        if (commits.length && running < nThreads) {
          var hash = commits.shift();
          var task = child_process.fork('./backtest', { silent: true });
          var error = '';
          var id = setTimeout(function() {
            if (task.connected) {
              error += 'task timed out\n';
              task.kill();
            }
          }, 60000);
          task.on('message', function(data) {
            if (data === 'ready') {
              ready = true;
              fork();
            }
            else {
              table[hash][data.name] = data.size;
            }
          }).on('exit', function() {
            clearTimeout(id);
            if (error) {
              console.error(hash, '-', error);
            }
            if (!--running && !commits.length) {
              print(table);
            }
            else {
              fork();
            }
          });
          task.stderr.setEncoding('utf8');
          task.stderr.on('data', function(data) {
            error += data;
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
