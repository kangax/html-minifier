[![NPM version](https://img.shields.io/npm/v/html-minifier.svg)](https://www.npmjs.com/package/html-minifier)
[![Build Status](https://img.shields.io/travis/kangax/html-minifier.svg)](https://travis-ci.org/kangax/html-minifier)
[![Dependency Status](https://img.shields.io/david/kangax/html-minifier.svg)](https://david-dm.org/kangax/html-minifier)
[![devDependency Status](https://img.shields.io/david/dev/kangax/html-minifier.svg)](https://david-dm.org/kangax/html-minifier#info=devDependencies)
[![Gitter](https://img.shields.io/gitter/room/kangax/html-minifier.svg)](https://gitter.im/kangax/html-minifier)

[HTMLMinifier](http://kangax.github.io/html-minifier/) is a highly **configurable**, **well-tested**, JavaScript-based HTML minifier, with lint-like capabilities.

See [corresponding blog post](http://perfectionkills.com/experimenting-with-html-minifier/) for all the gory details of [how it works](http://perfectionkills.com/experimenting-with-html-minifier/#how_it_works), [description of each option](http://perfectionkills.com/experimenting-with-html-minifier/#options), [testing results](http://perfectionkills.com/experimenting-with-html-minifier/#field_testing) and [conclusions](http://perfectionkills.com/experimenting-with-html-minifier/#cost_and_benefits).

[Test suite is available online](http://kangax.github.io/html-minifier/tests/).

Also see corresponding [Ruby wrapper](https://github.com/stereobooster/html_minifier), and for Node.js, [Grunt plugin](https://github.com/gruntjs/grunt-contrib-htmlmin), [Gulp module](https://github.com/jonschlinkert/gulp-htmlmin), and [Koa middleware wrapper](https://github.com/koajs/html-minifier).

## Minification comparison

How does HTMLMinifier compare to other solutions — [HTML Minifier from Will Peavy](http://www.willpeavy.com/minifier/) (1st result in [google search for "html minifier"](https://www.google.com/#q=html+minifier)) as well as [htmlcompressor.com](http://htmlcompressor.com) and [minimize](https://github.com/Swaagie/minimize)?

| Site                                                                        | Original size _(KB)_ | HTMLMinifier | minimize | Will Peavy | htmlcompressor.com |
| --------------------------------------------------------------------------- |:--------------------:| ------------:| --------:| ----------:| ------------------:|
| [HTMLMinifier page](https://github.com/kangax/html-minifier)                | 49                   | <b>37</b>    | 42       | 44         | 43                 |
| [NBC](http://www.nbc.com)                                                   | 91                   | <b>74</b>    | 84       | 86         | 85                 |
| [ES6 table](http://kangax.github.io/es5-compat-table/es6/)                  | 118                  | <b>80</b>    | 93       | 95         | 94                 |
| [New York Times](http://www.nytimes.com/)                                   | 131                  | <b>101</b>   | 122      | 125        | 120                |
| [Google](http://www.google.com/)                                            | 133                  | <b>128</b>   | 132      | 135        | 131                |
| [MSN](http://msn.com)                                                       | 157                  | <b>130</b>   | 138      | 145        | 138                |
| [Stackoverflow](http://stackoverflow.com)                                   | 200                  | <b>159</b>   | 165      | 174        | 166                |
| [Amazon](http://amazon.com)                                                 | 246                  | <b>204</b>   | 234      | 230        | 219                |
| [Wikipedia](http://en.wikipedia.org/wiki/President_of_the_United_States)    | 401                  | <b>367</b>   | 388      | 400        | n/a                |
| [Eloquent Javascript](http://eloquentjavascript.net/print.html)             | 870                  | <b>827</b>   | 840      | 864        | n/a                |
| [ES6 draft](https://people.mozilla.org/~jorendorff/es6-draft.html)          | 3678                 | <b>2990</b>  | 3079     | 3204       | n/a                |



## Options Quick Reference

| Option                         | Description     | Default |
|--------------------------------|-----------------|---------|
| `removeComments`               | [Strip HTML comments](http://perfectionkills.com/experimenting-with-html-minifier/#remove_comments) | `false` |
| `removeCommentsFromCDATA`      | [Strip HTML comments from scripts and styles](http://perfectionkills.com/experimenting-with-html-minifier/#remove_comments_from_scripts_and_styles) | `false` |
| `removeCDATASectionsFromCDATA` | [Remove CDATA sections from script and style elements](http://perfectionkills.com/experimenting-with-html-minifier/#remove_cdata_sections) | `false` |
| `collapseWhitespace`           | [Collapse white space that contributes to text nodes in a document tree.](http://perfectionkills.com/experimenting-with-html-minifier/#collapse_whitespace) | `false` |
| `conservativeCollapse`         | Always collapse to 1 space (never remove it entirely). Must be used in conjunction with `collapseWhitespace=true` | `false` |
| `collapseInlineTagWhitespace`  | Don't leave any spaces between `display:inline;` elements when collapsing. Must be used in conjunction with `collapseWhitespace=true` | `false` |
| `preserveLineBreaks`           | Always collapse to 1 line break (never remove it entirely) when whitespace between tags include a line break. Must be used in conjunction with `collapseWhitespace=true` | `false` |
| `collapseBooleanAttributes`    | [Omit attribute values from boolean attributes](http://perfectionkills.com/experimenting-with-html-minifier/#collapse_boolean_attributes) | `false` |
| `removeTagWhitespace`          | Remove space between attributes whenever possible. | `false` |
| `removeAttributeQuotes`        | [Remove quotes around attributes when possible.](http://perfectionkills.com/experimenting-with-html-minifier/#remove_attribute_quotes) | `false` |
| `removeRedundantAttributes`    | [Remove attributes when value matches default.](http://perfectionkills.com/experimenting-with-html-minifier/#remove_redundant_attributes) | `false` |
| `preventAttributesEscaping`    | Prevents the escaping of the values of attributes. | `false` |
| `useShortDoctype`              | [Replaces the doctype with the short (HTML5) doctype](http://perfectionkills.com/experimenting-with-html-minifier/#use_short_doctype) | `false` |
| `removeEmptyAttributes`        | [Remove all attributes with whitespace-only values](http://perfectionkills.com/experimenting-with-html-minifier/#remove_empty_or_blank_attributes) | `false` |
| `removeScriptTypeAttributes`   | Remove `type="text/javascript"` from `script` tags. Other `type` attribute values are left intact. | `false` |
| `removeStyleLinkTypeAttributes`| Remove `type="text/css"` from `style` and `link` tags. Other `type` attribute values are left intact. | `false` |
| `removeOptionalTags`           | [Remove unrequired tags](http://perfectionkills.com/experimenting-with-html-minifier/#remove_optional_tags) | `false` |
| `removeEmptyElements`          | [Remove all elements with empty contents](http://perfectionkills.com/experimenting-with-html-minifier/#remove_empty_elements) | `false` |
| `lint`                         | [Toggle linting](http://perfectionkills.com/experimenting-with-html-minifier/#validate_input_through_html_lint) | `false` |
| `keepClosingSlash`             | Keep the trailing slash on singleton elements                            | `false` |
| `caseSensitive`                | Treat attributes in case sensitive manner (useful for custom HTML tags.) | `false` |
| `minifyJS`                     | Minify Javascript in script elements and event attributes (uses [UglifyJS](https://github.com/mishoo/UglifyJS2)) | `false` (could be `true`, `false`, `Object` (options)) |
| `minifyCSS`                    | Minify CSS in style elements and style attributes (uses [clean-css](https://github.com/jakubpawlowicz/clean-css)) | `false` (could be `true`, `false`, `Object` (options)) |
| `minifyURLs`                   | Minify URLs in various attributes (uses [relateurl](https://github.com/stevenvachon/relateurl)) | `false` (could be `Object` (options)) |
| `includeAutoGeneratedTags`     | Insert tags generated by HTML parser | `true` |
| `ignoreCustomComments`         | Array of regex'es that allow to ignore certain comments, when matched  | `[ ]` |
| `ignoreCustomFragments`        | Array of regex'es that allow to ignore certain fragments, when matched (e.g. `<?php ... ?>`, `{{ ... }}`, etc.)  | `[ /<%[\s\S]*?%>/, /<\?[\s\S]*?\?>/ ]` |
| `processScripts`               | Array of strings corresponding to types of script elements to process through minifier (e.g. `text/ng-template`, `text/x-handlebars-template`, etc.) | `[ ]` |
| `maxLineLength`                | Specify a maximum line length. Compressed output will be split by newlines at valid HTML split-points. |
| `customEventAttributes`        | Arrays of regex'es that allow to support custom event attributes for `minifyJS` (e.g. `ng-click`) | `[ /^on[a-z]{3,}$/ ]` |
| `customAttrAssign`             | Arrays of regex'es that allow to support custom attribute assign expressions (e.g. `'<div flex?="{{mode != cover}}"></div>'`) | `[ ]` |
| `customAttrSurround`           | Arrays of regex'es that allow to support custom attribute surround expressions (e.g. `<input {{#if value}}checked="checked"{{/if}}>`) | `[ ]` |
| `customAttrCollapse`           | Regex that specifies custom attribute to strip newlines from (e.g. `/ng\-class/`) | |
| `quoteCharacter`               | Type of quote to use for attribute values (' or ") | |


## Special cases

### Ignoring chunks of markup

If you have chunks of markup you would like preserved, you can wrap them `<!-- htmlmin:ignore -->`.

### Preserving SVG tags

SVG tags are automatically recognized, and when they are minified, both case-sensitivity and closing-slashes are preserved, regardless of the minification settings used for the rest of the file.

### Working with invalid markup

HTMLMinifier **can't work with invalid or partial chunks of markup**. This is because it parses markup into a tree structure, then modifies it (removing anything that was specified for removal, ignoring anything that was specified to be ingored, etc.), then it creates a markup out of that tree and returns it.

Input markup (e.g. `<p id="">foo`)

↓

Internal representation of markup in a form of tree (e.g. `{tag: "p", attr: "id", children: ["foo"] }`)

↓

Transformation of internal representation (e.g. removal of "id" attribute)

↓

Output of resulting markup (e.g. `<p>foo</p>`)

HTMLMinifier can't know that original markup was only half of the tree; it does its best to try to parse it as a full tree and it loses information about tree being malformed or partial in the beginning. As a result, it can't create a partial/malformed tree at the time of the output.


## Installation Instructions

From NPM for use as a command line app:
```bash
npm install html-minifier -g
```

From NPM for programmatic use:
```bash
npm install html-minifier
```

From Git:
```bash
git clone git://github.com/kangax/html-minifier.git
cd html-minifier
npm link .
```


## Usage

For command line usage please see `html-minifier --help`

### Node.js

```js
var minify = require('html-minifier').minify;
var result = minify('<p title="blah" id="moo">foo</p>', {
  removeAttributeQuotes: true
});
result; // '<p title=blah id=moo>foo</p>'
```


## Running benchmarks

Benchmarks for minified HTML:
```
node benchmark.js
```
