[![NPM version](https://badge.fury.io/js/html-minifier.svg)](http://badge.fury.io/js/html-minifier)
[![Build Status](https://travis-ci.org/kangax/html-minifier.svg)](https://travis-ci.org/kangax/html-minifier)
[![Dependency Status](https://david-dm.org/kangax/html-minifier.svg?theme=shields.io)](https://david-dm.org/kangax/html-minifier)
[![devDependency Status](https://david-dm.org/kangax/html-minifier/dev-status.svg?theme=shields.io)](https://david-dm.org/kangax/html-minifier#info=devDependencies)

[HTMLMinifier](http://kangax.github.io/html-minifier/) is a highly __configurable__, __well-tested__, Javascript-based HTML minifier, with lint-like capabilities.

See [corresponding blog post](http://perfectionkills.com/experimenting-with-html-minifier/) for all the gory details of [how it works](http://perfectionkills.com/experimenting-with-html-minifier/#how_it_works), [description of each option](http://perfectionkills.com/experimenting-with-html-minifier/#options), [testing results](http://perfectionkills.com/experimenting-with-html-minifier/#field_testing) and [conclusions](http://perfectionkills.com/experimenting-with-html-minifier/#cost_and_benefits).

[Test suite is available online](http://kangax.github.io/html-minifier/tests/).

Also see corresponding [Ruby wrapper](https://github.com/stereobooster/html_minifier), and for Node.js, [Grunt plugin](https://github.com/gruntjs/grunt-contrib-htmlmin) & [Gulp module](https://github.com/jonschlinkert/gulp-htmlmin).

How does HTMLMinifier compare to [another solution](http://www.willpeavy.com/minifier/) — HTML Minifier from Will Peavy (1st result in [google search for "html minifier"](https://www.google.com/#q=html+minifier)) as well as htmlcompressor.com?

| Site  | Original size _(KB)_ | HTMLMinifier _(KB)_  | Will Peavy _(KB)_  | htmlcompressor.com _(KB)_  |
| --------------------------------------------------------------------------- |:-----------:| ----------------:| ------------:| ----------------:|
| [HTMLMinifier page](https://github.com/kangax/html-minifier)                | 48.8        | <b>37.3</b>      |   43.3       | 41.9 |
| [ES6 table](http://kangax.github.io/es5-compat-table/es6/)                  | 117.9       | <b>79.9</b>        |   92         | 91.9 |
| [MSN](http://msn.com)                                                       | 156.6       | <b>133</b>       |   145        | 138.3 |
| [Stackoverflow](http://stackoverflow.com)                                   | 200.4       | <b>159.5</b>     |   168.3      | 163.3 |
| [Amazon](http://amazon.com)                                                 | 245.9       | <b>206.3</b>     |   225 |  218.5 |
| [Wikipedia](http://en.wikipedia.org/wiki/President_of_the_United_States)    | 401.4       | <b>380.6</b>     |   396.3      | n/a |
| [Eloquent Javascript](http://eloquentjavascript.net/print.html)             | 869.5       | <b>830</b>       |   872        | n/a |



## Options Quick Reference

| Option                         | Description     | Default |
|--------------------------------|-----------------|---------|
| `removeComments`               | [Strip HTML comments](http://perfectionkills.com/experimenting-with-html-minifier/#remove_comments) | `false` |
| `removeCommentsFromCDATA`      | [Strip HTML comments from scripts and styles](http://perfectionkills.com/experimenting-with-html-minifier/#remove_comments_from_scripts_and_styles) | `false` |
| `removeCDATASectionsFromCDATA` | [Remove CDATA sections from script and style elements](http://perfectionkills.com/experimenting-with-html-minifier/#remove_cdata_sections) | `false` |
| `collapseWhitespace`           | [Collapse white space that contributes to text nodes in a document tree.](http://perfectionkills.com/experimenting-with-html-minifier/#collapse_whitespace) | `false` |
| `conservativeCollapse`         | Always collapse to 1 space (never remove it entirely). Must be used in conjunction with `collapseWhitespace=true` | `false` |
| `collapseBooleanAttributes`    | [Omit attribute values from boolean attributes](http://perfectionkills.com/experimenting-with-html-minifier/#collapse_boolean_attributes) | `false` |
| `removeAttributeQuotes`        | [Remove quotes around attributes when possible.](http://perfectionkills.com/experimenting-with-html-minifier/#remove_attribute_quotes) | `false` |
| `removeRedundantAttributes`    | [Remove attributes when value matches default.](http://perfectionkills.com/experimenting-with-html-minifier/#remove_redundant_attributes) | `false` |
| `useShortDoctype`              | [Replaces the doctype with the short (HTML5) doctype](http://perfectionkills.com/experimenting-with-html-minifier/#use_short_doctype) | `false` |
| `removeEmptyAttributes`        | [Remove all attributes with whitespace-only values](http://perfectionkills.com/experimenting-with-html-minifier/#remove_empty_or_blank_attributes) | `false` |
| `removeOptionalTags`           | [Remove unrequired tags](http://perfectionkills.com/experimenting-with-html-minifier/#remove_optional_tags) | `false` |
| `removeEmptyElements`          | [Remove all elements with empty contents](http://perfectionkills.com/experimenting-with-html-minifier/#remove_empty_elements) | `false` |
| `lint`                         | [Toggle linting](http://perfectionkills.com/experimenting-with-html-minifier/#validate_input_through_html_lint) | `false` |
| `keepClosingSlash`             | Keep the trailing slash on singleton elements                            | `false` |
| `caseSensitive`                | Treat attributes in case sensitive manner (useful for SVG; e.g. viewBox) | `false` |
| `minifyJS`                     | Minify Javascript in script elements and on* attributes (uses [UglifyJS](https://github.com/mishoo/UglifyJS2)) | `false` (could be `true`, `false`, `Object` (options)) |
| `minifyCSS`                    | Minify CSS in style elements and style attributes (uses [clean-css](https://github.com/GoalSmashers/clean-css))  | `false` (could be `true`, `false`, `Object` (options)) |
| `ignoreCustomComments`             | Array of regex'es that allow to ignore certain comments, when matched  | `[ ]` |
| `processScripts`                   | Array of strings corresponding to types of script elements to process through minifier (e.g. "text/ng-template", "text/x-handlebars-template", etc.) | `[ ]` |
| `maxLineLength`                | Specify a maximum line length. Compressed output will be split by newlines at valid html split-points. |
| `customAttrAssign` | `[ ]` | Arrays of regex'es that allow to support custom attribute assign expressions (e.g. `'<div flex?="{{mode != cover}}"></div>'`) |
| `customAttrSurround` | `[ ]` | Arrays of regex'es that allow to support custom attribute surround expressions (e.g. `<input {{#if value}}checked="checked"{{/if}}>`) |


Chunks of markup can be ignored by wrapping them with `<!-- htmlmin:ignore -->`.

Installation Instructions
-------------------------

From NPM for use as a command line app:
```
npm install html-minifier -g
```

From NPM for programmatic use:
```
npm install html-minifier
```

From Git:
```
git clone git://github.com/kangax/html-minifier.git
cd html-minifier
npm link .
```

Usage
--------
For command line usage please see `html-minifier --help`

Node.js
========
```
var minify = require('html-minifier').minify;
var result = minify('<p title="blah" id="moo">foo</p>', {
  removeAttributeQuotes: true
});
result; // '<p title=blah id=moo>foo</p>'
```


[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/kangax/html-minifier/trend.png)](https://bitdeli.com/free "Bitdeli Badge")
