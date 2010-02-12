(function(){
  
  function byId(id) {
    return document.getElementById(id);
  }
  
  function escapeHTML(str) {
    return (str + '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  
  function getOptions() {
    return {
      removeComments:               byId('remove-comments').checked,
      removeCommentsFromCDATA:      byId('remove-comments-from-cdata').checked,
      removeCDATASectionsFromCDATA: byId('remove-cdata-sections-from-cdata').checked,
      collapseWhitespace:           byId('collapse-whitespace').checked,
      collapseBooleanAttributes:    byId('collapse-boolean-attributes').checked,
      removeAttributeQuotes:        byId('remove-attribute-quotes').checked,  
      removeRedundantAttributes:    byId('remove-redundant-attributes').checked,
      useShortDoctype:              byId('use-short-doctype').checked,
      removeEmptyAttributes:        byId('remove-empty-attributes').checked,
      removeEmptyElements:          byId('remove-empty-elements').checked,
      removeOptionalTags:           byId('remove-optional-tags').checked,
      lint:                         byId('use-htmllint').checked ? new HTMLLint() : null
    };
  }
  
  function commify(str) {
    return String(str)
      .split('').reverse().join('')
      .replace(/(...)(?!$)/g, '$1,')
      .split('').reverse().join('');
  }
  
  byId('convert-btn').onclick = function() {
    try {
      var options = getOptions(),
          lint = options.lint,
          originalValue = byId('input').value,
          minifiedValue = minify(originalValue, options),
          diff = originalValue.length - minifiedValue.length,
          savings = originalValue.length ? ((100 * diff) / originalValue.length).toFixed(2) : 0;

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
    catch(err) {
      byId('output').value = '';
      byId('stats').innerHTML = '<span class="failure">' + escapeHTML(err) + '</span>';
    }
  };
  
})();