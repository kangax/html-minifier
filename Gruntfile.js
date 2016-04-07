'use strict';

module.exports = function(grunt) {
  // Force use of Unix newlines
  grunt.util.linefeed = '\n';

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*!\n' +
            ' * HTMLMinifier v<%= pkg.version %> (<%= pkg.homepage %>)\n' +
            ' * Copyright 2010-<%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
            ' * Licensed under the <%= pkg.license %> license\n' +
            ' */\n',

    browserify: {
      src: {
        options: {
          banner: '<%= banner %>',
          require: [
            './src/htmllint.js:html-minifier/src/htmllint',
            './src/htmlminifier.js:html-minifier'
          ]
        },
        src: 'src/htmlminifier.js',
        dest: 'dist/htmlminifier.js'
      }
    },

    eslint: {
      grunt: {
        src: 'Gruntfile.js'
      },
      src: {
        src: ['cli.js', 'src/**/*.js']
      },
      tests: {
        src: ['tests/*.js', 'test.js']
      },
      web: {
        src: 'assets/master.js'
      },
      other: {
        src: ['backtest.js', 'benchmark.js']
      }
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
    },

    web: {
      htmllint: 'tests/lint-tests.html',
      htmlminifier: 'tests/index.html'
    }
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-eslint');
  require('time-grunt')(grunt);

  var phantomjs = require('grunt-lib-phantomjs').init(grunt);
  var webErrors;
  phantomjs.on('fail.load', function() {
    phantomjs.halt();
    webErrors++;
    grunt.log.error('page failed to load');
  }).on('fail.timeout', function() {
    phantomjs.halt();
    webErrors++;
    grunt.log.error('timed out');
  }).on('qunit.done', function(details) {
    phantomjs.halt();
    grunt.log.writeln('completed in ' + details.runtime + 'ms');
    webErrors += details.failed;
    grunt.log[webErrors ? 'error' : 'ok'](details.passed + ' of ' + details.total + ' passed, ' + details.failed + ' failed');
  });
  grunt.registerMultiTask('web', function() {
    var done = this.async();
    webErrors = 0;
    phantomjs.spawn(this.data, {
      done: function() {
        done(!webErrors);
      },
      options: {
        inject: 'tests/inject.js'
      }
    });
  });

  var fork = require('child_process').fork;
  grunt.registerTask('exec-test', function() {
    var done = this.async();
    fork('./test').on('exit', function(code) {
      done(!code);
    });
  });

  grunt.registerTask('update-html', function() {
    var pattern = /(<h1>.*?<span>).*?(<\/span><\/h1>)/;
    var path = './index.html';
    var html = grunt.file.read(path);
    html = html.replace(pattern, '$1(v' + grunt.config('pkg.version') + ')$2');
    grunt.file.write(path, html);
  });

  grunt.registerTask('dist', [
    'update-html',
    'browserify',
    'uglify'
  ]);

  grunt.registerTask('test', [
    'dist',
    'eslint',
    'exec-test',
    'web'
  ]);

  grunt.registerTask('default', 'test');
};
