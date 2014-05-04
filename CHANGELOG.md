## [0.6.0](https://github.com/kangax/html-minifier/compare/v0.5.6...0.6.0)

* Minify meta viewport value [#159](https://github.com/kangax/html-minifier/issues/159)
* Add support for ignoring markup via <!-- htmlmin:ignore --> [#89](https://github.com/kangax/html-minifier/issues/89)
* Add support for processScripts [#139](https://github.com/kangax/html-minifier/issues/139)
* Add support for ignoreCustomComments [#145](https://github.com/kangax/html-minifier/issues/145)
* Add conservativeCollapse option
* Fix handling of valueless attributes [#150](https://github.com/kangax/html-minifier/issues/150)
* Escape closing script tag [#142](https://github.com/kangax/html-minifier/issues/142)
* Add support for minifying CSS (`minifyCSS`)
* Add support for minifying JS (`minifyJS`)
* Don't add empty string value to valueless attributes
* Add more boolean attributes
* No more tags in lint output (Node friendly)
* Add more optional tags
* Node.js v0.10 is needed for development

## [0.5.6 / 2014-03-12](https://github.com/kangax/html-minifier/compare/v0.5.5...v0.5.6)

* Add an option to keep closing slash in singleton tags [#76](https://github.com/kangax/html-minifier/issues/76)
* Make `</source>` tag optional [#92](https://github.com/kangax/html-minifier/issues/92)
* Add `td` and `th` to optional tags list [#95](https://github.com/kangax/html-minifier/issues/95)
* Add `caseSensitive` option [#106](https://github.com/kangax/html-minifier/issues/106)
* Add options quick reference in README.md [#131](https://github.com/kangax/html-minifier/issues/131)
* Fix quotes in attributes
* Ignore unneeded files from being included in the npm package
* Switch to Grunt for development

## [0.5.5 / 2014-01-03](https://github.com/kangax/html-minifier/compare/v0.5.4...v0.5.5)

* Add missing inline tags for collapsing whitespace
* Preserve quotes if attribute ends with a trailing slash
* Add space around time tag
* Newlines are collapsed to one space

## [0.5.4 / 2013-09-04](https://github.com/kangax/html-minifier/compare/v0.5.3...v0.5.4)

* Add support for ignoring <%...%> and <?...?>
* Fix space after textarea
* Add support for ignored comments (<!--!)
* Add more tags to collapseWhitespaceSmart whitelist
