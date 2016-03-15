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
    }

  });

  require('load-grunt-tasks')(grunt, { scope: 'devDependencies' });
  require('time-grunt')(grunt);

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
    'exec:test'
  ]);

  grunt.registerTask('default', 'test');

};
