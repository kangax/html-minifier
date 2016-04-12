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

    qunit: {
      htmllint: ['./tests/lint', 'tests/lint-tests.html'],
      htmlminifier: ['./tests/minifier', 'tests/index.html']
    },

    replace: {
      './index.html': [
        /(<h1>.*?<span>).*?(<\/span><\/h1>)/,
        '$1(v<%= pkg.version %>)$2'
      ],
      './tests/index.html': [
        /("[^"]+\/qunit-)[0-9\.]+?(\.(?:css|js)")/g,
        '$1<%= pkg.devDependencies.qunitjs %>$2'
      ],
      './tests/lint-tests.html': [
        /("[^"]+\/qunit-)[0-9\.]+?(\.(?:css|js)")/g,
        '$1<%= pkg.devDependencies.qunitjs %>$2'
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
  grunt.loadNpmTasks('grunt-eslint');

  function report(type, details) {
    grunt.log.writeln(type + ' completed in ' + details.runtime + 'ms');
    grunt.log[details.failed ? 'error' : 'ok'](details.passed + ' of ' + details.total + ' passed, ' + details.failed + ' failed');
    return details.failed;
  }

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
    webErrors += report('web', details);
  });
  var fork = require('child_process').fork;
  grunt.registerMultiTask('qunit', function() {
    var done = this.async();
    var remaining = 2;
    var nodeErrors;

    function completed() {
      if (!--remaining) {
        done(!nodeErrors && !webErrors);
      }
    }

    webErrors = 0;
    phantomjs.spawn(this.data[1], {
      done: completed,
      options: {
        inject: 'tests/inject.js'
      }
    });
    fork('./test', [this.data[0]]).on('message', function(details) {
      nodeErrors += report('node', details);
      completed();
    });
  });

  grunt.registerMultiTask('replace', function() {
    var pattern = this.data[0];
    var path = this.target;
    var html = grunt.file.read(path);
    html = html.replace(pattern, this.data[1]);
    grunt.file.write(path, html);
  });

  grunt.registerTask('dist', [
    'replace',
    'browserify',
    'uglify'
  ]);

  grunt.registerTask('test', [
    'eslint',
    'dist',
    'qunit'
  ]);

  grunt.registerTask('default', 'test');
};
