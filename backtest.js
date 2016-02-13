#!/usr/bin/env node

'use strict';

var child_process = require('child_process'),
    fs = require('fs'),
    path = require('path');

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

function all(tasks, callback) {
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
  var args = [].slice.call(arguments, 0, -1);
  var callback = arguments[arguments.length - 1];
  var task = child_process.spawn('git', args, { stdio: [ 'ignore', 'pipe', 'ignore' ] });
  var output = '';
  task.stdout.setEncoding('utf8');
  task.stdout.on('data', function(data) {
    output += data;
  }).on('end', function() {
    callback(output);
  });
}

function setupConf(hash, callback) {
  var output = path.join('benchmarks/generated/', hash + '.conf');

  function done(data) {
    fs.writeFile(output, data, function(err) {
      if (err) {
        console.error(hash, ': error writing backtest.csv');
        callback();
      }
      else {
        callback(output);
      }
    });
  }

  fs.readFile('benchmark.conf', function(err, data) {
    if (err) {
      fs.readFile('sample-cli-config-file.conf', function(err, data) {
        if (err) {
          console.error(hash, ': failed to extract configuration');
          process.send({});
        }
        else {
          done(data);
        }
      });
    }
    else {
      done(data);
    }
  });
}

function minify(hash) {
  setupConf(hash, function(conf) {
    var results = {};
    process.send('ready');
    all(fileNames.map(function(fileName) {
      return function(done) {
        var input = path.join('benchmarks/', fileName + '.html');
        var output = path.join('benchmarks/generated/', fileName + '.' + hash + '.html');
        var args = [input, '-c', conf, '--minify-urls', urls[fileName], '-o', output];
        var task = child_process.fork('./cli', args, { silent: true }).on('exit', function () {
          fs.stat(output, function(err, stats) {
            if (err) {
              console.error(hash, ': failed to minify "' + fileName + '"');
            }
            else {
              results[fileName] = stats.size;
            }
            done();
          });
        });
        task.stdout.resume();
        task.stderr.resume();
      };
    }), function() {
      process.send(results);
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
      throw new Error('There was an error writing backtest.csv');
    }
  });
}

if (process.argv.length > 2) {
  var count = +process.argv[2];
  if (count) {
    git('log', '--date=iso', '--pretty=format:%h %cd', '-' + count, function(data) {
      var table = {};
      var commits = data.split(/\s*?\n/).map(function(line) {
        var index = line.indexOf(' ');
        var hash = line.substr(0, index);
        table[hash] = {
          date: line.substr(index + 1)
        };
        return hash;
      });
      var running = 0, ready = true;

      function fork() {
        if (commits.length && running < 8) {
          var hash = commits.shift();
          var task = child_process.fork('./backtest');
          task.on('message', function(data) {
            if (data === 'ready') {
              ready = true;
            }
            else {
              var date = table[hash].date;
              table[hash] = data;
              table[hash].date = date;
              task.disconnect();
              if (!--running && !commits.length) {
                print(table);
              }
            }
            fork();
          });
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
    git('reset', 'HEAD', '--', 'dist', 'benchmark.conf', 'sample-cli-config-file.conf', function() {
      all(['dist', 'benchmark.conf', 'sample-cli-config-file.conf'].map(function(path) {
        return function(done) {
          git('checkout', hash, '--', path, done);
        };
      }), function() {
        minify(hash);
      });
    });
  });
}
