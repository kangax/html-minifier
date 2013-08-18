[HTMLMinifier](http://kangax.github.com/html-minifier/) is a Javascript-based HTML minifier (duh), with lint-like capabilities.

See [corresponding blog post](http://perfectionkills.com/experimenting-with-html-minifier/) for all the gory details of [how it works](http://perfectionkills.com/experimenting-with-html-minifier/#how_it_works), [description of each option](http://perfectionkills.com/experimenting-with-html-minifier/#options), [testing results](http://perfectionkills.com/experimenting-with-html-minifier/#field_testing) and [conclusions](http://perfectionkills.com/experimenting-with-html-minifier/#cost_and_benefits).

[Test suite is available online](http://kangax.github.com/html-minifier/tests/index.html).

Installing with [npm](https://github.com/isaacs/npm):

    npm install html-minifier

Building distribution:

    > cat src/htmlparser.js src/htmlminifier.js src/htmllint.js > dist/all.js

Testing locally:

    > npm test
