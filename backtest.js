#!/usr/bin/env node

'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const process = require('process');
const Progress = require('progress');
const urls = require('./benchmarks/index.json');

const fileNames = Object.keys(urls);

function git() {
  const args = Array.prototype.slice.call(arguments, 0, -1).flat();
  const callback = arguments[arguments.length - 1];
  const task = childProcess.spawn('git', args, { stdio: ['ignore', 'pipe', 'ignore'] });
  let output = '';
  task.stdout.setEncoding('utf8');
  task.stdout.on('data', data => {
    output += data;
  });
  task.on('exit', code => {
    callback(code, output);
  });
}

function readText(filePath, callback) {
  fs.readFile(filePath, { encoding: 'utf8' }, callback);
}

function writeText(filePath, data) {
  fs.writeFile(filePath, data, { encoding: 'utf8' }, err => {
    if (err) {
      throw err;
    }
  });
}

function loadModule() {
  require('./src/htmlparser.js');
  return require('./src/htmlminifier.js').minify || global.minify;
}

function getOptions(fileName, options) {
  const result = {
    minifyURLs: {
      site: urls[fileName]
    }
  };
  for (const key in options) {
    result[key] = options[key];
  }

  return result;
}

function minify(hash, options) {
  const minify = loadModule();
  process.send('ready');
  let count = fileNames.length;
  fileNames.forEach(fileName => {
    readText(path.join('benchmarks/', fileName + '.html'), (err, data) => {
      if (err) {
        throw err;
      } else {
        try {
          const minified = minify(data, getOptions(fileName, options));
          if (minified) {
            process.send({ name: fileName, size: minified.length });
          } else {
            throw new Error('unexpected result: ' + minified);
          }
        } catch (e) {
          console.error('[' + fileName + ']', e.stack || e);
        } finally {
          if (!--count) {
            process.disconnect();
          }
        }
      }
    });
  });
}

function print(table) {
  const output = [];
  const errors = [];
  let row = [...fileNames];
  row.unshift('hash', 'date');
  output.push(row.join(','));
  for (const hash in table) {
    const data = table[hash];
    row = [hash, '"' + data.date + '"'];
    fileNames.forEach(fileName => {
      row.push(data[fileName]);
    });
    output.push(row.join(','));
    if (data.error) {
      errors.push(hash + ' - ' + data.error);
    }
  }

  writeText('backtest.csv', output.join('\n'));
  writeText('backtest.log', errors.join('\n'));
}

if (process.argv.length > 2) {
  const count = Number(process.argv[2]);
  if (count) {
    git('log', '--date=iso', '--pretty=format:%h %cd', '-' + count, (code, data) => {
      const table = {};
      const commits = data.split(/\s*?\n/).map(line => {
        const index = line.indexOf(' ');
        const hash = line.substr(0, index);
        table[hash] = {
          date: line.substr(index + 1).replace('+', '').replace(/ 0000$/, '')
        };
        return hash;
      });
      const nThreads = os.cpus().length;
      let running = 0;
      const progress = new Progress('[:bar] :etas', {
        width: 50,
        total: commits.length * 2
      });

      function fork() {
        if (commits.length > 0 && running < nThreads) {
          const hash = commits.shift();
          const task = childProcess.fork('./backtest', { silent: true });
          let error = '';
          const id = setTimeout(() => {
            if (task.connected) {
              error += 'task timed out\n';
              task.kill();
            }
          }, 60_000);
          task.on('message', data => {
            if (data === 'ready') {
              progress.tick(1);
              fork();
            } else {
              table[hash][data.name] = data.size;
            }
          }).on('exit', () => {
            progress.tick(1);
            clearTimeout(id);
            if (error) {
              table[hash].error = error;
            }

            if (!--running && commits.length === 0) {
              print(table);
            } else {
              fork();
            }
          });
          task.stderr.setEncoding('utf8');
          task.stderr.on('data', data => {
            error += data;
          });
          task.stdout.resume();
          task.send(hash);
          running++;
        }
      }

      fork();
    });
  } else {
    console.error('Invalid input:', process.argv[2]);
  }
} else {
  process.on('message', hash => {
    const paths = ['src', 'benchmark.conf', 'sample-cli-config-file.conf'];
    git('reset', 'HEAD', '--', paths, () => {
      let conf = 'sample-cli-config-file.conf';

      function checkout() {
        const path = paths.shift();
        git('checkout', hash, '--', path, code => {
          if (code === 0 && path === 'benchmark.conf') {
            conf = path;
          }

          if (paths.length > 0) {
            checkout();
          } else {
            readText(conf, (err, data) => {
              if (err) {
                throw err;
              } else {
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
