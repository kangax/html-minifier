(function() {
  'use strict';

  var minify = require('html-minifier').minify;
  var HTMLLint = require('html-minifier/src/htmllint').HTMLLint;

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHTML(str) {
    return (str + '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function getOptions() {
    return {
      removeComments:                 byId('remove-comments').checked,
      collapseWhitespace:             byId('collapse-whitespace').checked,
      conservativeCollapse:           byId('conservative-collapse').checked,
      collapseBooleanAttributes:      byId('collapse-boolean-attributes').checked,
      removeTagWhitespace:            byId('remove-tag-whitespace').checked,
      removeAttributeQuotes:          byId('remove-attribute-quotes').checked,
      removeRedundantAttributes:      byId('remove-redundant-attributes').checked,
      useShortDoctype:                byId('use-short-doctype').checked,
      removeEmptyAttributes:          byId('remove-empty-attributes').checked,
      removeEmptyElements:            byId('remove-empty-elements').checked,
      removeOptionalTags:             byId('remove-optional-tags').checked,
      removeScriptTypeAttributes:     byId('remove-script-type-attributes').checked,
      removeStyleLinkTypeAttributes:  byId('remove-style-link-type-attributes').checked,
      caseSensitive:                  byId('case-sensitive').checked,
      keepClosingSlash:               byId('keep-closing-slash').checked,
      minifyJS:                       byId('minify-js').checked,
      processScripts:                 byId('minify-js-templates').checked ? byId('minify-js-templates-type').value : false,
      minifyCSS:                      byId('minify-css').checked,
      minifyURLs:                     byId('minify-urls').checked ? { site: byId('minify-urls-siteurl').value } : false,
      lint:                           byId('use-htmllint').checked ? new HTMLLint() : null,
      maxLineLength:                  parseInt(byId('max-line-length').value, 10)
    };
  }

  function commify(str) {
    return String(str)
      .split('').reverse().join('')
      .replace(/(...)(?!$)/g, '$1,')
      .split('').reverse().join('');
  }

  function minifyTextarea() {
    try {
      var options = getOptions(),
          lint = options.lint,
          originalValue = byId('input').value,
          minifiedValue = minify(originalValue, options),
          diff = originalValue.length - minifiedValue.length,
          savings = originalValue.length ? (100 * diff / originalValue.length).toFixed(2) : 0;

      byId('output').value = minifiedValue;

      byId('stats').innerHTML =
        '<span class="success">' +
          'Original size: <strong>' + commify(originalValue.length) + '</strong>' +
          '. Minified size: <strong>' + commify(minifiedValue.length) + '</strong>' +
          '. Savings: <strong>' + commify(diff) + ' (' + savings + '%)</strong>.' +
        '</span>';

      if (lint) {
        lint.populate(byId('report'));
      }
    }
    catch (err) {
      byId('output').value = '';
      byId('stats').innerHTML = '<span class="failure">' + escapeHTML(err) + '</span>';
    }
  }

  byId('max-line-length').oninput = function() { minifyTextarea(); };
  byId('minify-btn').onclick = function() { minifyTextarea(); };

  function setCheckedAttrOnCheckboxes(attrValue) {
    var checkboxes = byId('options').getElementsByTagName('input');
    for (var i = checkboxes.length; i--; ) {
      checkboxes[i].checked = attrValue;
    }
  }

  byId('select-all').onclick = function() {
    setCheckedAttrOnCheckboxes(true);
    return false;
  };

  byId('select-none').onclick = function() {
    setCheckedAttrOnCheckboxes(false);
    return false;
  };

  byId('select-safe').onclick = function() {
    setCheckedAttrOnCheckboxes(true);
    var inputEls = byId('options').getElementsByTagName('input');
    inputEls[10].checked = false;
    inputEls[11].checked = false;
    inputEls[13].checked = false;
    inputEls[18].checked = false;
    return false;
  };

})();
/* eslint-disable */
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-1128111-22']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script');
  ga.type = 'text/javascript';
  ga.async = true;
  ga.src = (document.location.protocol === 'https:' ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
  document.getElementsByTagName('head')[0].appendChild(ga);
})();
