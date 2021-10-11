#!/usr/bin/env node

'use strict';

// eslint-disable-next-line import/order
let packages = require('./package.json').benchmarkDependencies;

packages = Object.keys(packages).map(name => name + '@' + packages[name]);
packages.unshift('install', '--no-save', '--no-optional');

const installed = require('child_process').spawnSync('npm', packages, {
  encoding: 'utf-8',
  shell: true
});

if (installed.error) {
  throw installed.error;
} else if (installed.status) {
  console.log(installed.stdout);
  console.error(installed.stderr);
  process.exit(installed.status);
}

const { fork } = require('child_process');
const fs = require('fs');
const https = require('https');
const path = require('path');
const process = require('process');
const querystring = require('querystring');
const url = require('url');
const zlib = require('zlib');
//const Buffer = require('Buffer');
const Table = require('cli-table');
const Progress = require('progress');
const Minimize = require('minimize');
const lzma = require('lzma');
const chalk = require('chalk');
const brotli = require('brotli');

const urls = require('./benchmarks/index.json');

const fileNames = Object.keys(urls);

const minimize = new Minimize();

const progress = new Progress('[:bar] :etas :fileName', {
  width: 50,
  total: fileNames.length
});

const table = new Table({
  head: ['File', 'Before', 'After', 'Minimize', 'Will Peavy', 'htmlcompressor.com', 'Savings', 'Time'],
  colWidths: [fileNames.reduce((length, fileName) => Math.max(length, fileName.length), 0) + 2, 25, 25, 25, 25, 25, 20, 10]
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
  const savingsPercent = (1 - newSize / oldSize) * 100;
  const savings = oldSize - newSize;
  return chalk.cyan.bold(savingsPercent.toFixed(2)) + chalk.white('% (' + toKb(savings, 2) + ' KB)');
}

function blueTime(time) {
  return chalk.cyan.bold(time) + chalk.white(' ms');
}

function readBuffer(filePath, callback) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      throw new Error('There was an error reading ' + filePath);
    }

    callback(data);
  });
}

function readText(filePath, callback) {
  fs.readFile(filePath, { encoding: 'utf8' }, (err, data) => {
    if (err) {
      throw new Error('There was an error reading ' + filePath);
    }

    callback(data);
  });
}

function writeBuffer(filePath, data, callback) {
  fs.writeFile(filePath, data, err => {
    if (err) {
      throw new Error('There was an error writing ' + filePath);
    }

    callback();
  });
}

function writeText(filePath, data, callback) {
  fs.writeFile(filePath, data, { encoding: 'utf8' }, err => {
    if (err) {
      throw new Error('There was an error writing ' + filePath);
    }

    if (callback) {
      callback();
    }
  });
}

function readSize(filePath, callback) {
  fs.stat(filePath, (err, stats) => {
    if (err) {
      throw new Error('There was an error reading ' + filePath);
    }

    callback(stats.size);
  });
}

function gzip(inPath, outPath, callback) {
  fs.createReadStream(inPath)
    .pipe(zlib.createGzip({
      level: zlib.Z_BEST_COMPRESSION
    }))
    .pipe(fs.createWriteStream(outPath))
    .on('finish', callback);
}

function run(tasks, done) {
  let i = 0;

  function callback() {
    if (i < tasks.length) {
      tasks[i++](callback);
    } else {
      done();
    }
  }

  callback();
}

const rows = {};

function generateMarkdownTable() {
  const headers = [
    'Site',
    'Original size *(KB)*',
    'HTMLMinifier',
    'minimize',
    'Will Peavy',
    'htmlcompressor.com'
  ];

  for (const fileName of fileNames) {
    const row = rows[fileName].report;
    row[2] = '**' + row[2] + '**';
  }

  const widths = headers.map((header, index) => {
    let width = header.length;
    for (const fileName of fileNames) {
      width = Math.max(width, rows[fileName].report[index].length);
    }

    return width;
  });

  let content = '';

  function output(row) {
    for (const [index, width] of widths.entries()) {
      const text = row[index];
      const length = width - text.length + 2;
      content += '| ' + text + Array.from({ length }).join(' ');
    }

    content += '|\n';
  }

  output(headers);
  for (const [index, width] of widths.entries()) {
    const length = width + 1;
    content += '|';
    content += index === 1 ? ':' : ' ';
    content += Array.from({ length }).join('-');
    content += index === 0 ? ' ' : ':';
  }

  content += '|\n';
  for (const fileName of fileNames.sort((a, b) => {
    const r = Number(rows[a].report[1]);
    const s = Number(rows[b].report[1]);
    return r < s ? -1 : (r > s ? 1 : a < b ? -1 : a > b ? 1 : 0);
  })) {
    output(rows[fileName].report);
  }

  return content;
}

function displayTable() {
  for (const fileName of fileNames) {
    table.push(rows[fileName].display);
  }

  console.log();
  console.log(table.toString());
}

run(fileNames.map(fileName => {
  const filePath = path.join('benchmarks/', fileName + '.html');

  function processFile(site, done) {
    const original = {
      filePath,
      gzFilePath: path.join('benchmarks/generated/', fileName + '.html.gz'),
      lzFilePath: path.join('benchmarks/generated/', fileName + '.html.lz'),
      brFilePath: path.join('benchmarks/generated/', fileName + '.html.br')
    };
    const infos = {};
    for (const name of ['minifier', 'minimize', 'willpeavy', 'compressor']) {
      infos[name] = {
        filePath: path.join('benchmarks/generated/', fileName + '.' + name + '.html'),
        gzFilePath: path.join('benchmarks/generated/', fileName + '.' + name + '.html.gz'),
        lzFilePath: path.join('benchmarks/generated/', fileName + '.' + name + '.html.lz'),
        brFilePath: path.join('benchmarks/generated/', fileName + '.' + name + '.html.br')
      };
    }

    function readSizes(info, done) {
      info.endTime = Date.now();
      run([
        // Apply Gzip on minified output
        function(done) {
          gzip(info.filePath, info.gzFilePath, () => {
            info.gzTime = Date.now();
            // Open and read the size of the minified+gzip output
            readSize(info.gzFilePath, size => {
              info.gzSize = size;
              done();
            });
          });
        },

        // Apply LZMA on minified output
        function(done) {
          readBuffer(info.filePath, data => {
            lzma.compress(data, 1, (result, error) => {
              if (error) {
                throw error;
              }

              writeBuffer(info.lzFilePath, new Buffer(result), () => {
                info.lzTime = Date.now();
                // Open and read the size of the minified+lzma output
                readSize(info.lzFilePath, size => {
                  info.lzSize = size;
                  done();
                });
              });
            });
          });
        },

        // Apply Brotli on minified output
        function(done) {
          readBuffer(info.filePath, data => {
            const output = new Buffer(brotli.compress(data, true).buffer);
            writeBuffer(info.brFilePath, output, () => {
              info.brTime = Date.now();
              // Open and read the size of the minified+brotli output
              readSize(info.brFilePath, size => {
                info.brSize = size;
                done();
              });
            });
          });
        },

        // Open and read the size of the minified output
        function(done) {
          readSize(info.filePath, size => {
            info.size = size;
            done();
          });
        }
      ], done);
    }

    function testHTMLMinifier(done) {
      const info = infos.minifier;
      info.startTime = Date.now();
      const args = [filePath, '-c', 'sample-cli-config-file.conf', '--minify-urls', site, '-o', info.filePath];
      fork('./cli', args).on('exit', () => {
        readSizes(info, done);
      });
    }

    function testMinimize(done) {
      readBuffer(filePath, data => {
        minimize.parse(data, (error, data) => {
          const info = infos.minimize;
          writeBuffer(info.filePath, data, () => {
            readSizes(info, done);
          });
        });
      });
    }

    function testWillPeavy(done) {
      readText(filePath, data => {
        const options = url.parse('https://www.willpeavy.com/minifier/');
        options.method = 'POST';
        options.headers = {
          'Content-Type': 'application/x-www-form-urlencoded'
        };
        https.request(options, res => {
          res.setEncoding('utf8');
          let response = '';
          res.on('data', chunk => {
            response += chunk;
          }).on('end', () => {
            const info = infos.willpeavy;
            if (res.statusCode === 200) {
              // Extract result from <textarea/>
              const start = response.indexOf('>', response.indexOf('<textarea'));
              const end = response.lastIndexOf('</textarea>');
              const result = response.slice(start + 1, end).replace(/<\\\//g, '</');
              writeText(info.filePath, result, () => {
                readSizes(info, done);
              });
            } else { // Site refused to process content
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
      readText(filePath, data => {
        const options = url.parse('https://htmlcompressor.com/compress_ajax_v2.php');
        options.method = 'POST';
        options.headers = {
          'Accept-Encoding': 'gzip',
          'Content-Type': 'application/x-www-form-urlencoded'
        };
        let info = infos.compressor;

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

        https.request(options, res => {
          if (res.headers['content-encoding'] === 'gzip') {
            res = res.pipe(zlib.createGunzip());
          }

          res.setEncoding('utf8');
          let response = '';
          res.on('data', chunk => {
            response += chunk;
          }).on('end', () => {
            try {
              response = JSON.parse(response);
            } catch {
              response = {};
            }

            if (info && response.success) {
              writeText(info.filePath, response.result, () => {
                readSizes(info, done);
              });
            } else { // Site refused to process content
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
    ], () => {
      const display = [
        [fileName, '+ gzip', '+ lzma', '+ brotli'].join('\n'),
        [redSize(original.size), redSize(original.gzSize), redSize(original.lzSize), redSize(original.brSize)].join('\n')
      ];
      const report = [
        '[' + fileName + '](' + urls[fileName] + ')',
        toKb(original.size)
      ];

      for (const name in infos) {
        const info = infos[name];
        display.push([greenSize(info.size), greenSize(info.gzSize), greenSize(info.lzSize), greenSize(info.brSize)].join('\n'));
        report.push(info.size > 0 ? toKb(info.size) : 'n/a');
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
        display,
        report
      };
      progress.tick({ fileName: '' });
      done();
    });
  }

  function get(site, callback) {
    const options = url.parse(site);
    https.get(options, res => {
      const status = res.statusCode;
      if (status === 200) {
        if (res.headers['content-encoding'] === 'gzip') {
          res = res.pipe(zlib.createGunzip());
        }

        res.pipe(fs.createWriteStream(filePath)).on('finish', () => {
          callback(site);
        });
      } else if (status >= 300 && status < 400 && res.headers.location) {
        get(url.resolve(site, res.headers.location), callback);
      } else {
        throw new Error('HTTP error ' + status + '\n' + site);
      }
    });
  }

  return function(done) {
    progress.tick(0, { fileName });
    get(urls[fileName], site => {
      processFile(site, done);
    });
  };
}), () => {
  displayTable();
  const content = generateMarkdownTable();
  const readme = './README.md';
  readText(readme, data => {
    let start = data.indexOf('## Minification comparison');
    start = data.indexOf('|', start);
    let end = data.indexOf('##', start);
    end = data.lastIndexOf('|\n', end) + '|\n'.length;
    data = data.slice(0, start) + content + data.slice(end);
    writeText(readme, data);
  });
});
