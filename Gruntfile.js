module.exports = function(grunt) {
    'use strict';

    grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),
    banner: '/*!\n' +
            ' * HTMLMinifier v<%= pkg.version %> (<%= pkg.homepage %>)\n' +
            ' * Copyright 2010-<%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
            ' * Licensed under <%= pkg.license.type %> (<%= pkg.license.url %>)\n' +
            ' */\n',

        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            gruntfile: {
                src: 'Gruntfile.js'
            },
            src: {
                src: 'src/**/*.js'
            },
            tests: {
                src: 'tests/*.js'
            },
            web: {
                src: 'master.js'
            }
        },

        concat: {
            options: {
                banner: '<%= banner %>'
            },
            dist: {
                src: ['src/htmlparser.js',
                      'src/htmlminifier.js',
                      'src/htmllint.js'],
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

    grunt.registerTask('build', [
        'concat'
    ]);

    grunt.registerTask('dist', [
        'concat',
        'uglify'
    ]);

    grunt.registerTask('test', [
        'concat',
        'jshint'
    ]);

    grunt.registerTask('default', 'test');

};
