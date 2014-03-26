[Current](https://github.com/kangax/html-minifier/compare/v0.5.5...gh-pages)
==================

* Escape closing script tag [#142](https://github.com/kangax/html-minifier/issues/142)
* Don't add empty string value to valueless attributes
* Add support for minifying CSS (minifyCSS)
* Add support for JS minification (minifyJS)
* Add more boolean attributes
* No more tags in lint output (Node friendly)
* Add more optional tags

[0.5.6 / 2014-03-12](https://github.com/kangax/html-minifier/compare/v0.5.5...v0.5.6)
==================

* Fixed issue [#76](https://github.com/kangax/html-minifier/issues/76) - Add an option to keep closing slash in singleton tags
* Fixed issue [#92](https://github.com/kangax/html-minifier/issues/92) - Make `</source>` tag optional
* Fixed issue [#95](https://github.com/kangax/html-minifier/issues/95) - Add `td` and `th` to optional tags list
* Fixed issue [#106](https://github.com/kangax/html-minifier/issues/106) - Add `caseSensitive` option
* Fixed issue [#131](https://github.com/kangax/html-minifier/issues/131) - Add options quick reference in README.md
* Fixed quotes in attributes
* Ignore unneeded files from being included in the npm package
* Switch to Grunt for development
