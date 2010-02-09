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
    return (str.trim ? str.trim() : str.replace(/^\s+/, '').replace(/\s+$/, ''));
  }
  
  function canRemoveAttributeQuotes(value) {
    // http://www.w3.org/TR/html4/intro/sgmltut.html#attributes
    // avoid \w, which could match unicode in some implementations
    return /^[a-zA-Z0-9-._:]+$/.test(value);
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
    attrValue = attrValue.toLowerCase();
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
        attributesInclude(attrs, 'src')) ||
        
        (tag === 'a' &&
        attrName === 'name' &&
        attributesInclude(attrs, 'id'))
    );
  }
  
  function isBooleanAttribute(attrName) {
    return /^(?:checked|disabled|selected|readonly)$/.test(attrName);
  }
  
  function cleanAttributeValue(tag, attrName, attrValue) {
    if (/^on[a-z]+/.test(attrName)) {
      return attrValue.replace(/^(['"])?javascript:/i, '$1');
    }
    if (attrName.toLowerCase() === 'class') {
      // trim and collapse whitesapce
      return attrValue.replace(/^(["'])?\s+/, '$1').replace(/\s+(["'])?$/, '$1').replace(/\s+/g, ' ');
    }
    return attrValue;
  }
  
  var reEmptyAttribute = new RegExp(
    '^(?:class|id|style|title|lang|dir|on(?:focus|blur|change|click|dblclick|mouse(' +
      '?:down|up|over|move|out)|key(?:press|down|up)))$');
      
  function canDeleteEmptyAttribute(tag, attrName, attrValue) {
    var isValueEmpty = /^(["'])?\s*\1$/.test(attrValue);
    if (isValueEmpty) {
      log('empty attribute: ' + tag + ' :: ' + attrName);
      return (
        (tag === 'input' && attrName === 'value') ||
        reEmptyAttribute.test(attrName));
    }
    return false;
  }
  
  function normalizeAttribute(attr, attrs, tag, options) {
    
    var attrName = attr.name.toLowerCase();
    var attrValue = attr.escaped;
    var attrFragment;
    
    if (options.shouldRemoveRedundantAttributes && 
        isAttributeRedundant(tag, attrName, attrValue, attrs)) {
      return '';
    }
    
    attrValue = cleanAttributeValue(tag, attrName, attrValue);
    
    if (!options.shouldRemoveAttributeQuotes || 
        !canRemoveAttributeQuotes(attrValue)) {
      attrValue = '"' + attrValue + '"';
    }
    
    if (options.shouldRemoveEmptyAttributes &&
        canDeleteEmptyAttribute(tag, attrName, attrValue)) {
      return '';
    }

    if (options.shouldCollapseBooleanAttributes && 
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
    
    var results = [];
    var t = new Date();
    
    HTMLParser(value, {
      start: function( tag, attrs, unary ) {
        
        tag = tag.toLowerCase();
        
        results.push('<', tag);
        
        for ( var i = 0, len = attrs.length; i < len; i++ ) {
          results.push(normalizeAttribute(attrs[i], attrs, tag, options));
        }
        
        results.push('>');
      },
      end: function( tag ) {
        results.push('</', tag.toLowerCase(), '>');
      },
      chars: function( text ) {
        results.push(options.shouldCollapseWhitespace ? trimWhitespace(text) : text);
      },
      comment: function( text ) {
        results.push(options.shouldRemoveComments ? '' : ('<!--' + text + '-->'));
      },
      doctype: function(doctype) {
        results.push(options.shouldUseShortDoctype ? '<!DOCTYPE html>' : doctype.replace(/\s+/g, ' '));
      }
    });  

    var str = results.join('');

    log('minified in: ' + (new Date() - t) + 'ms');

    return str;
  }
  
  // export
  global.minify = minify;
  
})(this);