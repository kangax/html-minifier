(function(){
  
  function byId(id) {
    return document.getElementById(id);
  }
  
  var options = {
    shouldRemoveComments: function(){
      return byId('remove-comments').checked;
    },
    shouldCollapseWhitespace: function(){ 
      return byId('collapse-whitespace').checked;
    },
    shouldCollapseBooleanAttributes: function(){ 
      return byId('collapse-boolean-attributes').checked;
    },
    shouldRemoveAttributeQuotes: function(){ 
      return byId('remove-attribute-quotes').checked;
    },
    shouldRemoveRedundantAttributes: function(){
      return byId('remove-redundant-attributes').checked;
    },
    shouldUseShortDoctype: function() {
      return byId('use-short-doctype').checked;
    }
  };
  
  function escapeHTML(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function collapseWhitespace(str) {
    return str.replace(/^\s+/, '').replace(/\s+$/, '');
  }
  function canRemoveAttributeQuotes(value) {
    // http://www.w3.org/TR/html4/intro/sgmltut.html#attributes
    // avoid \w, which could match unicode in certain implementations
    return /^[a-zA-Z0-9-._:]+$/.test(value);
  }
  function isAttributeRedundant(tag, attributeName, attributeValue) {
    return (
        (/^script$/i.test(tag) && 
        /^language$/i.test(attributeName) && 
        /^javascript$/i.test(attributeValue)) ||
        
        (/^form$/i.test(tag) && 
        /^method$/i.test(attributeName) && 
        /^get$/i.test(attributeValue)) ||
        
        (/^input$/i.test(tag) && 
        /^type$/i.test(attributeName) &&
        /^text$/i.test(attributeValue))
    );
  }
  function isBooleanAttribute(attributeName) {
    return /^(?:checked|disabled|selected|readonly)$/.test(attributeName);
  }
  
  function minify(value) {
    var results = '';
    HTMLParser(value, {
      start: function( tag, attrs, unary ) {
        results += '<' + tag;
        for ( var i = 0, len = attrs.length; i < len; i++ ) {
          
          if (options.shouldRemoveRedundantAttributes() &&
              isAttributeRedundant(tag, attrs[i].name, attrs[i].value)) {
            continue;
          }
          
          var attributeValue;
          if (options.shouldRemoveAttributeQuotes() && 
              canRemoveAttributeQuotes(attrs[i].escaped)) {
            attributeValue = attrs[i].escaped;
          }
          else {
            attributeValue = '"' + attrs[i].escaped + '"';
          }
          
          var attributeFragment;
          if (options.shouldCollapseBooleanAttributes() && 
              isBooleanAttribute(attrs[i].name)) {
            attributeFragment = attrs[i].name;
          }
          else {
            attributeFragment = attrs[i].name + '=' + attributeValue;
          }
          results += ' ' + attributeFragment;
        }
        results += '>';
      },
      end: function( tag ) {
        results += '</' + tag + '>';
      },
      chars: function( text ) {
        if (options.shouldCollapseWhitespace()) {
          results += collapseWhitespace(text);
        }
        else {
          results += text;
        }
      },
      comment: function( text ) {
        results += (options.shouldRemoveComments() ? '' : ('<!--' + text + '-->'));
      },
      doctype: function(doctype) {
        results += (options.shouldUseShortDoctype() ? '<!DOCTYPE html>' : doctype);
      }
    });
    return results;
  }
  
  byId('convert-btn').onclick = function() {
    try {
      var originalValue = byId('input').value,
          minifiedValue = minify(originalValue),
          diff = originalValue.length - minifiedValue.length;

      byId('output').value = minifiedValue;

      byId('stats').innerHTML = '<span class="success">' +
        'Original size: <strong>' + originalValue.length + '</strong>' +
        '. Minified size: <strong>' + minifiedValue.length + '</strong>' +
        '. Savings: <strong>' + (originalValue.length ? ((100 * diff) / originalValue.length).toFixed(2) : 0) + '</strong>%.' +
      '</span>';
    }
    catch(err) {
      byId('output').value = '';
      byId('stats').innerHTML = '<span class="failure">' + escapeHTML(err) + '</span>';
    }
  };
  
})();