/*!
 * HTMLMinifier v0.4
 * http://kangax.github.com/html-minifier/
 *
 * Copyright (c) 2010 Juriy "kangax" Zaytsev
 * Licensed under the MIT license.
 *
 */
 
(function(global){
  
  var log;
  if (global.console && global.console.log) {
    log = function(message) {
      // "preserving" `this`
      global.console.log(message);
    };
  }
  else {
    log = function(){ };
  }
  
  function trimWhitespace(str) {
    return str.replace(/^\s+/, '').replace(/\s+$/, '');
  }
  if (String.prototype.trim) {
    trimWhitespace = function(str) {
      return str.trim();
    };
  }
  
  function collapseWhitespace(str) {
    return str.replace(/\s+/g, ' ');
  }
  
  function isConditionalComment(text) {
    return (/\[if[^\]]+\]/).test(text);
  }
  
  function isEventAttribute(attrName) {
    return (/^on[a-z]+/).test(attrName);
  }
  
  function canRemoveAttributeQuotes(value) {
    // http://www.w3.org/TR/html4/intro/sgmltut.html#attributes
    // avoid \w, which could match unicode in some implementations
    return (/^[a-zA-Z0-9-._:]+$/).test(value);
  }
  
  function attributesInclude(attributes, attribute) {
    for (var i = attributes.length; i--; ) {
      if (attributes[i].name.toLowerCase() === attribute) {
        return true;
      }
    }
    return false;
  }
  
  function isAttributeRedundant(tag, attrName, attrValue, attrs) {
    attrValue = trimWhitespace(attrValue.toLowerCase());
    return (
        (tag === 'script' && 
        attrName === 'language' && 
        attrValue === 'javascript') ||
        
        (tag === 'form' && 
        attrName === 'method' && 
        attrValue === 'get') ||
        
        (tag === 'input' && 
        attrName === 'type' &&
        attrValue === 'text') ||
        
        (tag === 'script' &&
        attrName === 'charset' &&
        !attributesInclude(attrs, 'src')) ||
        
        (tag === 'a' &&
        attrName === 'name' &&
        attributesInclude(attrs, 'id'))
    );
  }
  
  function isBooleanAttribute(attrName) {
    return (/^(?:checked|disabled|selected|readonly)$/).test(attrName);
  }
  
  function cleanAttributeValue(tag, attrName, attrValue) {
    if (isEventAttribute(attrName)) {
      return trimWhitespace(attrValue.replace(/^\s*javascript:\s*/i, ''));
    }
    if (attrName === 'class') {
      return collapseWhitespace(trimWhitespace(attrValue));
    }
    return attrValue;
  }
  
  function removeCDATASections(text) {
    return text
      // "/* <![CDATA[ */" or "// <![CDATA["
      .replace(/^(?:\s*\/\*\s*<!\[CDATA\[\s*\*\/|\s*\/\/\s*<!\[CDATA\[.*)/, '')
      // "/* ]]> */" or "// ]]>"
      .replace(/(?:\/\*\s*\]\]>\s*\*\/|\/\/\s*\]\]>)\s*$/, '');
  }
  
  var reStartDelimiter = {
    'script': /^\s*<!--.*\n?/,
    'style': /^\s*<!--\s*/
  };
  function removeComments(text, tag) {
    return text.replace(reStartDelimiter[tag], '').replace(/\s*-->\s*$/, '');
  }
  
  function isOptionalTag(tag) {
    return (/^(?:html|t?body|t?head|tfoot|tr)$/).test(tag);
  }
  
  var reEmptyAttribute = new RegExp(
    '^(?:class|id|style|title|lang|dir|on(?:focus|blur|change|click|dblclick|mouse(' +
      '?:down|up|over|move|out)|key(?:press|down|up)))$');
      
  function canDeleteEmptyAttribute(tag, attrName, attrValue) {
    var isValueEmpty = /^(["'])?\s*\1$/.test(attrValue);
    if (isValueEmpty) {
      return (
        (tag === 'input' && attrName === 'value') ||
        reEmptyAttribute.test(attrName));
    }
    return false;
  }
  
  function canRemoveElement(tag) {
    return tag !== 'textarea';
  }
  
  function canCollapseWhitespace(tag) {
    return !(/^(?:script|style|pre|textarea)$/.test(tag));
  }
  
  function canTrimWhitespace(tag) {
    return !(/^(?:pre|textarea)$/.test(tag));
  }
  
  function normalizeAttribute(attr, attrs, tag, options) {
    
    var attrName = attr.name.toLowerCase(),
        attrValue = attr.escaped,
        attrFragment;
    
    if (options.removeRedundantAttributes && 
        isAttributeRedundant(tag, attrName, attrValue, attrs)) {
      return '';
    }
    
    attrValue = cleanAttributeValue(tag, attrName, attrValue);
    
    if (!options.removeAttributeQuotes || 
        !canRemoveAttributeQuotes(attrValue)) {
      attrValue = '"' + attrValue + '"';
    }
    
    if (options.removeEmptyAttributes &&
        canDeleteEmptyAttribute(tag, attrName, attrValue)) {
      return '';
    }

    if (options.collapseBooleanAttributes && 
        isBooleanAttribute(attrName)) {
      attrFragment = attrName;
    }
    else {
      attrFragment = attrName + '=' + attrValue;
    }
    
    return (' ' + attrFragment);
  }
  
  function minify(value, options) {
    
    options = options || { };
    value = trimWhitespace(value);
    
    var results = [ ],
        buffer = [ ],
        currentChars = '',
        currentTag = '',
        lint = options.lint,
        t = new Date()
    
    HTMLParser(value, {
      start: function( tag, attrs, unary ) {
        tag = tag.toLowerCase();
        currentTag = tag;
        currentChars = '';
        
        buffer.push('<', tag);
        
        for ( var i = 0, len = attrs.length; i < len; i++ ) {
          lint && lint.test(tag, attrs[i].name.toLowerCase());
          buffer.push(normalizeAttribute(attrs[i], attrs, tag, options));
        }
        
        buffer.push('>');
      },
      end: function( tag ) {
        
        var isElementEmpty = currentChars === '' && tag === currentTag;
        if ((options.removeEmptyElements && isElementEmpty && canRemoveElement(tag))) {
          // remove last "element" from buffer, return
          buffer.splice(buffer.lastIndexOf('<'));
          return;
        }
        else if (options.removeOptionalTags && isOptionalTag(tag)) {
          // noop, leave start tag in buffer
        }
        else {
          // push end tag to buffer
          buffer.push('</', tag.toLowerCase(), '>');
          results.push.apply(results, buffer);
        }
        // flush buffer
        buffer.length = 0;
        currentChars = '';
      },
      chars: function( text ) {
        if (currentTag === 'script' || currentTag === 'style') {
          if (options.removeCommentsFromCDATA) {
            text = removeComments(text, currentTag);
          }
          if (options.removeCDATASectionsFromCDATA) {
            text = removeCDATASections(text);
          }
        }
        if (options.collapseWhitespace) {
          if (canTrimWhitespace(currentTag)) {
            text = trimWhitespace(text);
          }
          if (canCollapseWhitespace(currentTag)) {
            text = collapseWhitespace(text);
          }
        }
        currentChars = text;
        buffer.push(text);
      },
      comment: function( text ) {
        if (options.removeComments && !isConditionalComment(text)) {
          text = '';
        }
        else {
          text = '<!--' + text + '-->';
        }
        buffer.push(text);
      },
      doctype: function(doctype) {
        buffer.push(options.useShortDoctype ? '<!DOCTYPE html>' : collapseWhitespace(doctype));
      }
    });  
    
    results.push.apply(results, buffer)    
    var str = results.join('');
    log('minified in: ' + (new Date() - t) + 'ms');
    return str;
  }
  
  // export
  global.minify = minify;
  
})(this);