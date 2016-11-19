(function() {
  'use strict';

  importScripts('../dist/htmlminifier.min.js');
  var minify = require('html-minifier').minify;
  addEventListener('message', function(event) {
    try {
      postMessage(minify(event.data.value, event.data.options));
    }
    catch (err) {
      postMessage(err);
    }
  });
  postMessage(null);
})();
