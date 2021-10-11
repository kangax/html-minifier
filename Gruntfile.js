'use strict';

const process = require('process');
const fs = require('fs');
const qunit = require('qunit');
const UglifyJS = require('uglify-js');
//const { path: phantomJsPath } = require('phantomjs-prebuilt');

function qunitVersion() {
  const { prepareStackTrace } = Error;
  Error.prepareStackTrace = () => '';

  try {
    return qunit.version;
  } finally {
    Error.prepareStackTrace = prepareStackTrace;
  }
}

module.exports = function(grunt) {
  // Force use of Unix newlines
  grunt.util.linefeed = '\n';

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    qunit_ver: qunitVersion(),
    banner: '/*!\n' +
            ' * HTMLMinifier v<%= pkg.version %> (<%= pkg.homepage %>)\n' +
            ' * Copyright 2010-<%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
            ' * Licensed under the <%= pkg.license %> license\n' +
            ' */\n',

    browserify: {
      src: {
        options: {
          banner: '<%= banner %>',
          preBundleCB() {
            const files = {};
            for (const file of UglifyJS.FILES) {
              files[file] = fs.readFileSync(file, 'utf8');
            }

            fs.writeFileSync('./dist/uglify.js', UglifyJS.minify(files, {
              compress: false,
              mangle: false,
              wrap: 'exports'
            }).code);
          },
          postBundleCB(err, src, next) {
            fs.unlinkSync('./dist/uglify.js');
            next(err, src);
          },
          require: [
            './dist/uglify.js:uglify-js',
            './src/htmlminifier.js:html-minifier'
          ]
        },
        src: 'src/htmlminifier.js',
        dest: 'dist/htmlminifier.js'
      }
    },

    qunit: {
      htmlminifier: ['./tests/minifier', 'tests/index.html']
    },

    replace: {
      './index.html': [
        /(<h1>.*?<span>).*?(<\/span><\/h1>)/,
        '$1(v<%= pkg.version %>)$2'
      ],
      './tests/index.html': [
        /("[^"]+\/qunit-)[0-9.]+?(\.(?:css|js)")/g,
        '$1<%= qunit_ver %>$2'
      ]
    },

    uglify: {
      options: {
        banner: '<%= banner %>',
        compress: true,
        mangle: true,
        preserveComments: false,
        report: 'min'
      },
      minify: {
        files: {
          'dist/htmlminifier.min.js': '<%= browserify.src.dest %>'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  function report(type, details) {
    grunt.log.writeln(type + ' completed in ' + details.runtime + 'ms');
    for (const detail of details.failures) {
      grunt.log.error();
      grunt.log.error(detail.name + (detail.message ? ' [' + detail.message + ']' : ''));
      grunt.log.error(detail.source);
      grunt.log.error('Actual:');
      grunt.log.error(detail.actual);
      grunt.log.error('Expected:');
      grunt.log.error(detail.expected);
    }

    grunt.log[details.failed ? 'error' : 'ok'](
      details.passed + ' of ' + details.total + ' passed, ' + details.failed + ' failed'
    );
    return details.failed;
  }

  grunt.registerMultiTask('qunit', function() {
    const done = this.async();
    const errors = [];

    function run(testType, binPath, testPath) {
      grunt.util.spawn({
        cmd: binPath,
        args: ['test.js', testPath]
      }, (error, result) => {
        if (error) {
          grunt.log.error(result.stderr);
          grunt.log.error(testType + ' test failed to load');
          errors.push(-1);
        } else {
          let output = result.stdout;
          const index = output.lastIndexOf('\n');
          if (index !== -1) {
            // There's something before the report JSON
            // Log it to the console -- it's probably some debug output:
            console.log(output.slice(0, index));
            output = output.slice(index);
          }

          errors.push(report(testType, JSON.parse(output)));
        }

        if (errors.length === 2) {
          done(!errors[0] && !errors[1]);
        }
      });
    }

    run('node', process.argv[0], this.data[0]);
    //run('web', phantomJsPath, this.data[1]);
  });

  grunt.registerMultiTask('replace', function() {
    const pattern = this.data[0];
    const path = this.target;
    const html = grunt.file.read(path).replace(pattern, this.data[1]);
    grunt.file.write(path, html);
  });

  grunt.registerTask('dist', [
    'replace',
    'browserify',
    'uglify'
  ]);

  grunt.registerTask('test', [
    'dist',
    'qunit'
  ]);

  grunt.registerTask('default', 'test');
};
