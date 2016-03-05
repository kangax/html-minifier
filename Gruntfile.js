module.exports = function(grunt) {
  'use strict';

  // Force use of Unix newlines
  grunt.util.linefeed = '\n';

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),
    banner: '/*!\n' +
            ' * HTMLMinifier v<%= pkg.version %> (<%= pkg.homepage %>)\n' +
            ' * Copyright 2010-<%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
            ' * Licensed under the <%= pkg.license %> license\n' +
            ' */\n',

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

    exec: {
      'clean-css': {
        command: 'npm run assets/clean-css'
      },
      ncname: {
        command: 'npm run assets/ncname'
      },
      relateurl: {
        command: 'npm run assets/relateurl'
      },
      test: {
        command: 'node ./test.js'
      },
      'uglify-js': {
        command: 'npm run assets/uglify-js'
      }
    },

    concat: {
      options: {
        banner: '<%= banner %>'
      },
      dist: {
        src: ['src/htmlparser.js', 'src/htmlminifier.js', 'src/htmllint.js'],
        dest: 'dist/htmlminifier.js'
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
          'dist/htmlminifier.min.js': '<%= concat.dist.dest %>'
        }
      }
    },

    web: {
      htmllint: 'tests/lint-tests.html',
      htmlminifier: 'tests/index.html'
    }

  });

  require('load-grunt-tasks')(grunt, {
    pattern: [ 'grunt-*', '!grunt-lib-*' ],
    scope: 'devDependencies'
  });
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

  grunt.registerTask('assets', [
    'exec:clean-css',
    'exec:ncname',
    'exec:relateurl',
    'exec:uglify-js'
  ]);

  grunt.registerTask('build', [
    'concat'
  ]);

  grunt.registerTask('dist', [
    'concat',
    'uglify'
  ]);

  grunt.registerTask('test', [
    'dist',
    'eslint',
    'exec:test',
    'web'
  ]);

  grunt.registerTask('default', 'test');

};
