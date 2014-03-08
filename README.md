[![Build Status](https://travis-ci.org/kangax/html-minifier.png)](https://travis-ci.org/kangax/html-minifier)
[![devDependency Status](https://david-dm.org/kangax/html-minifier/dev-status.png?theme=shields.io)](https://david-dm.org/kangax/html-minifier#info=devDependencies)
[![NPM version](https://badge.fury.io/js/html-minifier.png)](http://badge.fury.io/js/html-minifier)

[HTMLMinifier](http://kangax.github.io/html-minifier/) is a highly __configurable__, __well-tested__, Javascript-based HTML minifier, with lint-like capabilities.

See [corresponding blog post](http://perfectionkills.com/experimenting-with-html-minifier/) for all the gory details of [how it works](http://perfectionkills.com/experimenting-with-html-minifier/#how_it_works), [description of each option](http://perfectionkills.com/experimenting-with-html-minifier/#options), [testing results](http://perfectionkills.com/experimenting-with-html-minifier/#field_testing) and [conclusions](http://perfectionkills.com/experimenting-with-html-minifier/#cost_and_benefits).

[Test suite is available online](http://kangax.github.io/html-minifier/tests/).

Also see corresponding [Grunt plugin](https://github.com/gruntjs/grunt-contrib-htmlmin).

How does HTMLMinifier compare to [another solution](http://www.willpeavy.com/minifier/) — HTML Minifier from Will Peavy (1st result in [google search for "html minifier"](https://www.google.com/#q=html+minifier))?

| Site          | Original size _(KB)_ | HTMLMinifier _(KB)_  | Will Peavy _(KB)_  |
| ------------- |:-------------:| -------------:| -----------:|
| [Wikipedia](http://en.wikipedia.org/wiki/President_of_the_United_States)     | 401.4       | <b>385.5</b>       |   396.3   |
| [Stackoverflow](http://stackoverflow.com) | 200.4       | <b>165.3</b>       |   168.3   |
| [Amazon](http://amazon.com)        | 245.9       | 237.1       |   <b>225</b>     |
| [ES6 table](http://kangax.github.io/es5-compat-table/es6/)     | 117.9       | <b>82</b>          |   92      |
| [HTMLMinifier page](https://github.com/kangax/html-minifier)     | 48.8       | <b>41.3</b>          |   43.3      |


Installing with [npm](https://github.com/isaacs/npm):

```
npm install html-minifier
```

[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/kangax/html-minifier/trend.png)](https://bitdeli.com/free "Bitdeli Badge")
