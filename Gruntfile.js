'use strict';

module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({

        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            gruntfile: {
                src: 'Gruntfile.js'
            },
            src: {
                src: ['src/**/*.js']
            },
            //tests: {
            //    src: ['tests/**/*.js']
            //},
            //web: {
            //    src: ['master.js']
            //}
        },

        concat: {
            js: {
                src: ['src/htmlparser.js',
                      'src/htmlminifier.js',
                      'src/htmllint.js'],
                dest: 'dist/htmlminifier.js'
            }
        },

        uglify: {
            options: {
                compress: true,
                mangle: true,
                preserveComments: false,
                report: 'min'
            },
            minify: {
                files: {
                    'dist/htmlminifier.min.js': '<%= concat.js.dest %>'
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
