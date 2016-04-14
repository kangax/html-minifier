 /* eslint-env phantomjs */
'use strict';

var page = require('webpage').create();
page.onAlert = function(details) {
  console.log(details);
  phantom.exit();
};
page.open(require('system').args[1], function(status) {
  if (status !== 'success') {
    phantom.exit(1);
  }
  page.evaluate(function() {
    QUnit.done(function(details) {
      alert(JSON.stringify(details));
    });
  });
});
