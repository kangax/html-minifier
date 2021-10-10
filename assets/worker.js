(() => {
  'use strict';

  importScripts('../dist/htmlminifier.min.js');
  const { minify } = require('html-minifier');
  addEventListener('message', event => {
    try {
      const { options } = event.data;
      options.log = message => {
        console.log(message);
      };

      postMessage(minify(event.data.value, options));
    } catch (err) {
      postMessage({
        error: String(err)
      });
    }
  });
  postMessage(null);
})();
