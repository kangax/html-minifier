'use strict';

var CleanCSS = require('clean-css');
var decode = require('he').decode;
var HTMLParser = require('./htmlparser').HTMLParser;
var RelateUrl = require('relateurl');
var TokenChain = require('./tokenchain');
var UglifyJS = require('uglify-js');
var utils = require('./utils');

function trimWhitespace(str) {
  if (typeof str !== 'string') {
    return str;
  }
  return str.replace(/^[ \n\r\t\f]+/, '').replace(/[ \n\r\t\f]+$/, '');
}

function collapseWhitespaceAll(str) {
  // Non-breaking space is specifically handled inside the replacer function here:
  return str && str.replace(/[ \n\r\t\f\xA0]+/g, function(spaces) {
    return spaces === '\t' ? '\t' : spaces.replace(/(^|\xA0+)[^\xA0]+/g, '$1 ');
  });
}

function collapseWhitespace(str, options, trimLeft, trimRight, collapseAll) {
  var lineBreakBefore = '', lineBreakAfter = '';

  if (options.preserveLineBreaks) {
    str = str.replace(/^[ \n\r\t\f]*?[\n\r][ \n\r\t\f]*/, function() {
      lineBreakBefore = '\n';
      return '';
    }).replace(/[ \n\r\t\f]*?[\n\r][ \n\r\t\f]*$/, function() {
      lineBreakAfter = '\n';
      return '';
    });
  }

  if (trimLeft) {
    // Non-breaking space is specifically handled inside the replacer function here:
    str = str.replace(/^[ \n\r\t\f\xA0]+/, function(spaces) {
      var conservative = !lineBreakBefore && options.conservativeCollapse;
      if (conservative && spaces === '\t') {
        return '\t';
      }
      return spaces.replace(/^[^\xA0]+/, '').replace(/(\xA0+)[^\xA0]+/g, '$1 ') || (conservative ? ' ' : '');
    });
  }

  if (trimRight) {
    // Non-breaking space is specifically handled inside the replacer function here:
    str = str.replace(/[ \n\r\t\f\xA0]+$/, function(spaces) {
      var conservative = !lineBreakAfter && options.conservativeCollapse;
      if (conservative && spaces === '\t') {
        return '\t';
      }
      return spaces.replace(/[^\xA0]+(\xA0+)/g, ' $1').replace(/[^\xA0]+$/, '') || (conservative ? ' ' : '');
    });
  }

  if (collapseAll) {
    // strip non space whitespace then compress spaces to one
    str = collapseWhitespaceAll(str);
  }

  return lineBreakBefore + str + lineBreakAfter;
}

var createMapFromString = utils.createMapFromString;
// non-empty tags that will maintain whitespace around them
var inlineTags = createMapFromString('a,abbr,acronym,b,bdi,bdo,big,button,cite,code,del,dfn,em,font,i,ins,kbd,label,mark,math,nobr,object,q,rp,rt,rtc,ruby,s,samp,select,small,span,strike,strong,sub,sup,svg,textarea,time,tt,u,var');
// non-empty tags that will maintain whitespace within them
var inlineTextTags = createMapFromString('a,abbr,acronym,b,big,del,em,font,i,ins,kbd,mark,nobr,rp,s,samp,small,span,strike,strong,sub,sup,time,tt,u,var');
// self-closing tags that will maintain whitespace around them
var selfClosingInlineTags = createMapFromString('comment,img,input,wbr');

function collapseWhitespaceSmart(str, prevTag, nextTag, options) {
  var trimLeft = prevTag && !selfClosingInlineTags(prevTag);
  if (trimLeft && !options.collapseInlineTagWhitespace) {
    trimLeft = prevTag.charAt(0) === '/' ? !inlineTags(prevTag.slice(1)) : !inlineTextTags(prevTag);
  }
  var trimRight = nextTag && !selfClosingInlineTags(nextTag);
  if (trimRight && !options.collapseInlineTagWhitespace) {
    trimRight = nextTag.charAt(0) === '/' ? !inlineTextTags(nextTag.slice(1)) : !inlineTags(nextTag);
  }
  return collapseWhitespace(str, options, trimLeft, trimRight, prevTag && nextTag);
}

function isConditionalComment(text) {
  return /^\[if\s[^\]]+]|\[endif]$/.test(text);
}

function isIgnoredComment(text, options) {
  for (var i = 0, len = options.ignoreCustomComments.length; i < len; i++) {
    if (options.ignoreCustomComments[i].test(text)) {
      return true;
    }
  }
  return false;
}

function isEventAttribute(attrName, options) {
  var patterns = options.customEventAttributes;
  if (patterns) {
    for (var i = patterns.length; i--;) {
      if (patterns[i].test(attrName)) {
        return true;
      }
    }
    return false;
  }
  return /^on[a-z]{3,}$/.test(attrName);
}

function canRemoveAttributeQuotes(value) {
  // http://mathiasbynens.be/notes/unquoted-attribute-values
  return /^[^ \t\n\f\r"'`=<>]+$/.test(value);
}

function attributesInclude(attributes, attribute) {
  for (var i = attributes.length; i--;) {
    if (attributes[i].name.toLowerCase() === attribute) {
      return true;
    }
  }
  return false;
}

function isAttributeRedundant(tag, attrName, attrValue, attrs) {
  attrValue = attrValue ? trimWhitespace(attrValue.toLowerCase()) : '';

  return (
    tag === 'script' &&
    attrName === 'language' &&
    attrValue === 'javascript' ||

    tag === 'form' &&
    attrName === 'method' &&
    attrValue === 'get' ||

    tag === 'input' &&
    attrName === 'type' &&
    attrValue === 'text' ||

    tag === 'script' &&
    attrName === 'charset' &&
    !attributesInclude(attrs, 'src') ||

    tag === 'a' &&
    attrName === 'name' &&
    attributesInclude(attrs, 'id') ||

    tag === 'area' &&
    attrName === 'shape' &&
    attrValue === 'rect'
  );
}

// https://mathiasbynens.be/demo/javascript-mime-type
// https://developer.mozilla.org/en/docs/Web/HTML/Element/script#attr-type
var executableScriptsMimetypes = utils.createMap([
  'text/javascript',
  'text/ecmascript',
  'text/jscript',
  'application/javascript',
  'application/x-javascript',
  'application/ecmascript'
]);

function isScriptTypeAttribute(attrValue) {
  attrValue = trimWhitespace(attrValue.split(/;/, 2)[0]).toLowerCase();
  return attrValue === '' || executableScriptsMimetypes(attrValue);
}

function isExecutableScript(tag, attrs) {
  if (tag !== 'script') {
    return false;
  }
  for (var i = 0, len = attrs.length; i < len; i++) {
    var attrName = attrs[i].name.toLowerCase();
    if (attrName === 'type') {
      return isScriptTypeAttribute(attrs[i].value);
    }
  }
  return true;
}

function isStyleLinkTypeAttribute(attrValue) {
  attrValue = trimWhitespace(attrValue).toLowerCase();
  return attrValue === '' || attrValue === 'text/css';
}

function isStyleSheet(tag, attrs) {
  if (tag !== 'style') {
    return false;
  }
  for (var i = 0, len = attrs.length; i < len; i++) {
    var attrName = attrs[i].name.toLowerCase();
    if (attrName === 'type') {
      return isStyleLinkTypeAttribute(attrs[i].value);
    }
  }
  return true;
}

var isSimpleBoolean = createMapFromString('allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare,default,defaultchecked,defaultmuted,defaultselected,defer,disabled,enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple,muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly,required,reversed,scoped,seamless,selected,sortable,truespeed,typemustmatch,visible');
var isBooleanValue = createMapFromString('true,false');

function isBooleanAttribute(attrName, attrValue) {
  return isSimpleBoolean(attrName) || attrName === 'draggable' && !isBooleanValue(attrValue);
}

function isUriTypeAttribute(attrName, tag) {
  return (
    /^(?:a|area|link|base)$/.test(tag) && attrName === 'href' ||
    tag === 'img' && /^(?:src|longdesc|usemap)$/.test(attrName) ||
    tag === 'object' && /^(?:classid|codebase|data|usemap)$/.test(attrName) ||
    tag === 'q' && attrName === 'cite' ||
    tag === 'blockquote' && attrName === 'cite' ||
    (tag === 'ins' || tag === 'del') && attrName === 'cite' ||
    tag === 'form' && attrName === 'action' ||
    tag === 'input' && (attrName === 'src' || attrName === 'usemap') ||
    tag === 'head' && attrName === 'profile' ||
    tag === 'script' && (attrName === 'src' || attrName === 'for')
  );
}

function isNumberTypeAttribute(attrName, tag) {
  return (
    /^(?:a|area|object|button)$/.test(tag) && attrName === 'tabindex' ||
    tag === 'input' && (attrName === 'maxlength' || attrName === 'tabindex') ||
    tag === 'select' && (attrName === 'size' || attrName === 'tabindex') ||
    tag === 'textarea' && /^(?:rows|cols|tabindex)$/.test(attrName) ||
    tag === 'colgroup' && attrName === 'span' ||
    tag === 'col' && attrName === 'span' ||
    (tag === 'th' || tag === 'td') && (attrName === 'rowspan' || attrName === 'colspan')
  );
}

function isLinkType(tag, attrs, value) {
  if (tag !== 'link') {
    return false;
  }
  for (var i = 0, len = attrs.length; i < len; i++) {
    if (attrs[i].name === 'rel' && attrs[i].value === value) {
      return true;
    }
  }
}

function isMediaQuery(tag, attrs, attrName) {
  return attrName === 'media' && (isLinkType(tag, attrs, 'stylesheet') || isStyleSheet(tag, attrs));
}

var srcsetTags = createMapFromString('img,source');

function isSrcset(attrName, tag) {
  return attrName === 'srcset' && srcsetTags(tag);
}

function cleanAttributeValue(tag, attrName, attrValue, options, attrs) {
  if (attrValue && isEventAttribute(attrName, options)) {
    attrValue = trimWhitespace(attrValue).replace(/^javascript:\s*/i, '');
    return options.minifyJS(attrValue, true); // TODO: add callback
  }
  else if (attrName === 'class') {
    attrValue = trimWhitespace(attrValue);
    if (options.sortClassName) {
      attrValue = options.sortClassName(attrValue);
    }
    else {
      attrValue = collapseWhitespaceAll(attrValue);
    }
    return attrValue;
  }
  else if (isUriTypeAttribute(attrName, tag)) {
    attrValue = trimWhitespace(attrValue);
    return isLinkType(tag, attrs, 'canonical') ? attrValue : options.minifyURLs(attrValue);
  }
  else if (isNumberTypeAttribute(attrName, tag)) {
    return trimWhitespace(attrValue);
  }
  else if (attrName === 'style') {
    attrValue = trimWhitespace(attrValue);
    if (attrValue) {
      if (/;$/.test(attrValue) && !/&#?[0-9a-zA-Z]+;$/.test(attrValue)) {
        attrValue = attrValue.replace(/\s*;$/, ';');
      }
      attrValue = options.minifyCSS(attrValue, 'inline'); // TODO: add callback
    }
    return attrValue;
  }
  else if (isSrcset(attrName, tag)) {
    // https://html.spec.whatwg.org/multipage/embedded-content.html#attr-img-srcset
    attrValue = trimWhitespace(attrValue).split(/\s+,\s*|\s*,\s+/).map(function(candidate) {
      var url = candidate;
      var descriptor = '';
      var match = candidate.match(/\s+([1-9][0-9]*w|[0-9]+(?:\.[0-9]+)?x)$/);
      if (match) {
        url = url.slice(0, -match[0].length);
        var num = +match[1].slice(0, -1);
        var suffix = match[1].slice(-1);
        if (num !== 1 || suffix !== 'x') {
          descriptor = ' ' + num + suffix;
        }
      }
      return options.minifyURLs(url) + descriptor;
    }).join(', ');
  }
  else if (isMetaViewport(tag, attrs) && attrName === 'content') {
    attrValue = attrValue.replace(/\s+/g, '').replace(/[0-9]+\.[0-9]+/g, function(numString) {
      // "0.90000" -> "0.9"
      // "1.0" -> "1"
      // "1.0001" -> "1.0001" (unchanged)
      return (+numString).toString();
    });
  }
  else if (attrValue && options.customAttrCollapse && options.customAttrCollapse.test(attrName)) {
    attrValue = attrValue.replace(/\n+|\r+|\s{2,}/g, '');
  }
  else if (tag === 'script' && attrName === 'type') {
    attrValue = trimWhitespace(attrValue.replace(/\s*;\s*/g, ';'));
  }
  else if (isMediaQuery(tag, attrs, attrName)) {
    attrValue = trimWhitespace(attrValue);
    return options.minifyCSS(attrValue, 'media'); // TODO: add callback
  }
  return attrValue;
}

function isMetaViewport(tag, attrs) {
  if (tag !== 'meta') {
    return false;
  }
  for (var i = 0, len = attrs.length; i < len; i++) {
    if (attrs[i].name === 'name' && attrs[i].value === 'viewport') {
      return true;
    }
  }
}

// Wrap CSS declarations for CleanCSS > 3.x
// See https://github.com/jakubpawlowicz/clean-css/issues/418
function wrapInlineCSS(text) {
  return '*{' + text + '}';
}

function unwrapInlineCSS(text) {
  var matches = text.match(/^\*\{([\s\S]*)\}$/);
  return matches ? matches[1] : text;
}

function wrapMediaQuery(text) {
  return '@media ' + text + '{a{top:0}}';
}

function unwrapMediaQuery(text) {
  var matches = text.match(/^@media ([\s\S]*?)\s*{[\s\S]*}$/);
  return matches ? matches[1] : text;
}

function cleanConditionalComment(comment, options, cb) {
  return options.processConditionalComments ? comment.replace(/^(\[if\s[^\]]+]>)([\s\S]*?)(<!\[endif])$/, function(match, prefix, text, suffix) {
    return minify(text, options, true, function(error, result) {
      return cb(error, prefix + result + suffix);
    });
  }) : cb(null, comment);
}

function processScript(text, options, currentAttrs, cb) {
  for (var i = 0, len = currentAttrs.length; i < len; i++) {
    if (currentAttrs[i].name.toLowerCase() === 'type' &&
        options.processScripts.indexOf(currentAttrs[i].value) > -1) {
      return minify(text, options, false, cb);
    }
  }
  return cb(text);
}

// Tag omission rules from https://html.spec.whatwg.org/multipage/syntax.html#optional-tags
// with the following deviations:
// - retain <body> if followed by <noscript>
// - </rb>, </rt>, </rtc>, </rp> & </tfoot> follow http://www.w3.org/TR/html5/syntax.html#optional-tags
// - retain all tags which are adjacent to non-standard HTML tags
var optionalStartTags = createMapFromString('html,head,body,colgroup,tbody');
var optionalEndTags = createMapFromString('html,head,body,li,dt,dd,p,rb,rt,rtc,rp,optgroup,option,colgroup,caption,thead,tbody,tfoot,tr,td,th');
var headerTags = createMapFromString('meta,link,script,style,template,noscript');
var descriptionTags = createMapFromString('dt,dd');
var pBlockTags = createMapFromString('address,article,aside,blockquote,details,div,dl,fieldset,figcaption,figure,footer,form,h1,h2,h3,h4,h5,h6,header,hgroup,hr,main,menu,nav,ol,p,pre,section,table,ul');
var pInlineTags = createMapFromString('a,audio,del,ins,map,noscript,video');
var rubyTags = createMapFromString('rb,rt,rtc,rp');
var rtcTag = createMapFromString('rb,rtc,rp');
var optionTag = createMapFromString('option,optgroup');
var tableContentTags = createMapFromString('tbody,tfoot');
var tableSectionTags = createMapFromString('thead,tbody,tfoot');
var cellTags = createMapFromString('td,th');
var topLevelTags = createMapFromString('html,head,body');
var compactTags = createMapFromString('html,body');
var looseTags = createMapFromString('head,colgroup,caption');
var trailingTags = createMapFromString('dt,thead');
var htmlTags = createMapFromString('a,abbr,acronym,address,applet,area,article,aside,audio,b,base,basefont,bdi,bdo,bgsound,big,blink,blockquote,body,br,button,canvas,caption,center,cite,code,col,colgroup,command,content,data,datalist,dd,del,details,dfn,dialog,dir,div,dl,dt,element,em,embed,fieldset,figcaption,figure,font,footer,form,frame,frameset,h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,i,iframe,image,img,input,ins,isindex,kbd,keygen,label,legend,li,link,listing,main,map,mark,marquee,menu,menuitem,meta,meter,multicol,nav,nobr,noembed,noframes,noscript,object,ol,optgroup,option,output,p,param,picture,plaintext,pre,progress,q,rb,rp,rt,rtc,ruby,s,samp,script,section,select,shadow,small,source,spacer,span,strike,strong,style,sub,summary,sup,table,tbody,td,template,textarea,tfoot,th,thead,time,title,tr,track,tt,u,ul,var,video,wbr,xmp');

function canRemoveParentTag(optionalStartTag, tag) {
  switch (optionalStartTag) {
    case 'html':
    case 'head':
      return true;
    case 'body':
      return !headerTags(tag);
    case 'colgroup':
      return tag === 'col';
    case 'tbody':
      return tag === 'tr';
  }
  return false;
}

function isStartTagMandatory(optionalEndTag, tag) {
  switch (tag) {
    case 'colgroup':
      return optionalEndTag === 'colgroup';
    case 'tbody':
      return tableSectionTags(optionalEndTag);
  }
  return false;
}

function canRemovePrecedingTag(optionalEndTag, tag) {
  switch (optionalEndTag) {
    case 'html':
    case 'head':
    case 'body':
    case 'colgroup':
    case 'caption':
      return true;
    case 'li':
    case 'optgroup':
    case 'tr':
      return tag === optionalEndTag;
    case 'dt':
    case 'dd':
      return descriptionTags(tag);
    case 'p':
      return pBlockTags(tag);
    case 'rb':
    case 'rt':
    case 'rp':
      return rubyTags(tag);
    case 'rtc':
      return rtcTag(tag);
    case 'option':
      return optionTag(tag);
    case 'thead':
    case 'tbody':
      return tableContentTags(tag);
    case 'tfoot':
      return tag === 'tbody';
    case 'td':
    case 'th':
      return cellTags(tag);
  }
  return false;
}

var reEmptyAttribute = new RegExp(
  '^(?:class|id|style|title|lang|dir|on(?:focus|blur|change|click|dblclick|mouse(' +
    '?:down|up|over|move|out)|key(?:press|down|up)))$');

function canDeleteEmptyAttribute(tag, attrName, attrValue, options) {
  var isValueEmpty = !attrValue || /^\s*$/.test(attrValue);
  if (!isValueEmpty) {
    return false;
  }
  if (typeof options.removeEmptyAttributes === 'function') {
    return options.removeEmptyAttributes(attrName, tag);
  }
  return tag === 'input' && attrName === 'value' || reEmptyAttribute.test(attrName);
}

function hasAttrName(name, attrs) {
  for (var i = attrs.length - 1; i >= 0; i--) {
    if (attrs[i].name === name) {
      return true;
    }
  }
  return false;
}

function canRemoveElement(tag, attrs) {
  switch (tag) {
    case 'textarea':
      return false;
    case 'audio':
    case 'script':
    case 'video':
      if (hasAttrName('src', attrs)) {
        return false;
      }
      break;
    case 'iframe':
      if (hasAttrName('src', attrs) || hasAttrName('srcdoc', attrs)) {
        return false;
      }
      break;
    case 'object':
      if (hasAttrName('data', attrs)) {
        return false;
      }
      break;
    case 'applet':
      if (hasAttrName('code', attrs)) {
        return false;
      }
      break;
  }
  return true;
}

function canCollapseWhitespace(tag) {
  return !/^(?:script|style|pre|textarea)$/.test(tag);
}

function canTrimWhitespace(tag) {
  return !/^(?:pre|textarea)$/.test(tag);
}

function normalizeAttr(attr, attrs, tag, options, cb) {
  var attrName = options.caseSensitive ? attr.name : attr.name.toLowerCase(),
      attrValue = attr.value;

  if (options.decodeEntities && attrValue) {
    attrValue = decode(attrValue, { isAttributeValue: true });
  }

  if (options.removeRedundantAttributes &&
    isAttributeRedundant(tag, attrName, attrValue, attrs) ||
    options.removeScriptTypeAttributes && tag === 'script' &&
    attrName === 'type' && isScriptTypeAttribute(attrValue) ||
    options.removeStyleLinkTypeAttributes && (tag === 'style' || tag === 'link') &&
    attrName === 'type' && isStyleLinkTypeAttribute(attrValue)) {
    return cb();
  }

  attrValue = cleanAttributeValue(tag, attrName, attrValue, options, attrs);

  if (options.removeEmptyAttributes &&
      canDeleteEmptyAttribute(tag, attrName, attrValue, options)) {
    return cb();
  }

  if (options.decodeEntities && attrValue) {
    attrValue = attrValue.replace(/&(#?[0-9a-zA-Z]+;)/g, '&amp;$1');
  }

  return cb(null, {
    attr: attr,
    name: attrName,
    value: attrValue
  });
}

function buildAttr(normalized, hasUnarySlash, options, isLast, uidAttr) {
  var attrName = normalized.name,
      attrValue = normalized.value,
      attr = normalized.attr,
      attrQuote = attr.quote,
      attrFragment,
      emittedAttrValue;

  if (typeof attrValue !== 'undefined' && (!options.removeAttributeQuotes ||
      ~attrValue.indexOf(uidAttr) || !canRemoveAttributeQuotes(attrValue))) {
    if (!options.preventAttributesEscaping) {
      if (typeof options.quoteCharacter === 'undefined') {
        var apos = (attrValue.match(/'/g) || []).length;
        var quot = (attrValue.match(/"/g) || []).length;
        attrQuote = apos < quot ? '\'' : '"';
      }
      else {
        attrQuote = options.quoteCharacter === '\'' ? '\'' : '"';
      }
      if (attrQuote === '"') {
        attrValue = attrValue.replace(/"/g, '&#34;');
      }
      else {
        attrValue = attrValue.replace(/'/g, '&#39;');
      }
    }
    emittedAttrValue = attrQuote + attrValue + attrQuote;
    if (!isLast && !options.removeTagWhitespace) {
      emittedAttrValue += ' ';
    }
  }
  // make sure trailing slash is not interpreted as HTML self-closing tag
  else if (isLast && !hasUnarySlash && !/\/$/.test(attrValue)) {
    emittedAttrValue = attrValue;
  }
  else {
    emittedAttrValue = attrValue + ' ';
  }

  if (typeof attrValue === 'undefined' || options.collapseBooleanAttributes &&
      isBooleanAttribute(attrName.toLowerCase(), attrValue.toLowerCase())) {
    attrFragment = attrName;
    if (!isLast) {
      attrFragment += ' ';
    }
  }
  else {
    attrFragment = attrName + attr.customAssign + emittedAttrValue;
  }

  return attr.customOpen + attrFragment + attr.customClose;
}

function identity(value) {
  return value;
}

function processOptions(values) {
  var options = {
    canCollapseWhitespace: canCollapseWhitespace,
    canTrimWhitespace: canTrimWhitespace,
    html5: true,
    ignoreCustomComments: [/^!/],
    ignoreCustomFragments: [
      /<%[\s\S]*?%>/,
      /<\?[\s\S]*?\?>/
    ],
    includeAutoGeneratedTags: true,
    log: identity,
    minifyCSS: identity,
    minifyJS: identity,
    minifyURLs: identity
  };
  Object.keys(values).forEach(function(key) {
    var value = values[key];
    if (key === 'log') {
      if (typeof value === 'function') {
        options.log = value;
      }
    }
    else if (key === 'minifyCSS' && typeof value !== 'function') {
      if (!value) {
        return;
      }
      if (typeof value !== 'object') {
        value = {};
      }
      options.minifyCSS = function(text, type) {
        text = text.replace(/(url\s*\(\s*)("|'|)(.*?)\2(\s*\))/ig, function(match, prefix, quote, url, suffix) {
          return prefix + quote + options.minifyURLs(url) + quote + suffix;
        });
        try {
          if (type === 'inline') {
            text = wrapInlineCSS(text);
          }
          else if (type === 'media') {
            text = wrapMediaQuery(text);
          }
          text = new CleanCSS(value).minify(text).styles;
          if (type === 'inline') {
            text = unwrapInlineCSS(text);
          }
          else if (type === 'media') {
            text = unwrapMediaQuery(text);
          }
          return text;
        }
        catch (err) {
          options.log(err);
          return text;
        }
      };
    }
    else if (key === 'minifyJS' && typeof value !== 'function') {
      if (!value) {
        return;
      }
      if (typeof value !== 'object') {
        value = {};
      }
      (value.parse || (value.parse = {})).bare_returns = false;
      options.minifyJS = function(text, inline) {
        var start = text.match(/^\s*<!--.*/);
        var code = start ? text.slice(start[0].length).replace(/\n\s*-->\s*$/, '') : text;
        value.parse.bare_returns = inline;
        var result = UglifyJS.minify(code, value);
        if (result.error) {
          options.log(result.error);
          return text;
        }
        return result.code.replace(/;$/, '');
      };
    }
    else if (key === 'minifyURLs' && typeof value !== 'function') {
      if (!value) {
        return;
      }
      if (typeof value === 'string') {
        value = { site: value };
      }
      else if (typeof value !== 'object') {
        value = {};
      }
      options.minifyURLs = function(text) {
        try {
          return RelateUrl.relate(text, value);
        }
        catch (err) {
          options.log(err);
          return text;
        }
      };
    }
    else {
      options[key] = value;
    }
  });
  return options;
}

function uniqueId(value) {
  var id;
  do {
    id = Math.random().toString(36).replace(/^0\.[0-9]*/, '');
  } while (~value.indexOf(id));
  return id;
}

var specialContentTags = createMapFromString('script,style');

function createSortFns(value, options, uidIgnore, uidAttr, cb) {
  var attrChains = options.sortAttributes && Object.create(null);
  var classChain = options.sortClassName && new TokenChain();

  function attrNames(attrs) {
    return attrs.map(function(attr) {
      return options.caseSensitive ? attr.name : attr.name.toLowerCase();
    });
  }

  function shouldSkipUID(token, uid) {
    return !uid || token.indexOf(uid) === -1;
  }

  function shouldSkipUIDs(token) {
    return shouldSkipUID(token, uidIgnore) && shouldSkipUID(token, uidAttr);
  }

  function scan(input) {
    var currentTag, currentType;
    new HTMLParser(input, {
      start: function(tag, attrs) {
        if (attrChains) {
          if (!attrChains[tag]) {
            attrChains[tag] = new TokenChain();
          }
          attrChains[tag].add(attrNames(attrs).filter(shouldSkipUIDs));
        }
        for (var i = 0, len = attrs.length; i < len; i++) {
          var attr = attrs[i];
          if (classChain && (options.caseSensitive ? attr.name : attr.name.toLowerCase()) === 'class') {
            classChain.add(trimWhitespace(attr.value).split(/[ \t\n\f\r]+/).filter(shouldSkipUIDs));
          }
          else if (options.processScripts && attr.name.toLowerCase() === 'type') {
            currentTag = tag;
            currentType = attr.value;
          }
        }
      },
      end: function() {
        currentTag = '';
      },
      chars: function(text) {
        if (options.processScripts && specialContentTags(currentTag) &&
            options.processScripts.indexOf(currentType) > -1) {
          scan(text);
        }
      }
    });
  }

  var log = options.log;
  options.log = identity;
  options.sortAttributes = false;
  options.sortClassName = false;
  minify(value, options, false, function(error, result) {
    if (error) {
      return cb(error);
    }

    scan(result);
    options.log = log;
    if (attrChains) {
      var attrSorters = Object.create(null);
      for (var tag in attrChains) {
        attrSorters[tag] = attrChains[tag].createSorter();
      }
      options.sortAttributes = function(tag, attrs) {
        var sorter = attrSorters[tag];
        if (sorter) {
          var attrMap = Object.create(null);
          var names = attrNames(attrs);
          names.forEach(function(name, index) {
            (attrMap[name] || (attrMap[name] = [])).push(attrs[index]);
          });
          sorter.sort(names).forEach(function(name, index) {
            attrs[index] = attrMap[name].shift();
          });
        }
      };
    }
    if (classChain) {
      var sorter = classChain.createSorter();
      options.sortClassName = function(value) {
        return sorter.sort(value.split(/[ \n\f\r]+/)).join(' ');
      };
    }

    return cb();
  });
}

/**
 * Minify HTML.
 *
 * @param {string} value
 * @param {Object} options
 * @param {boolean} partialMarkup
 * @param {Function<Error, string>} cb
 */
function minify(value, options, partialMarkup, cb) {
  if (options.collapseWhitespace) {
    value = collapseWhitespace(value, options, true, true);
  }

  var buffer = [],
      charsPrevTag,
      currentChars = '',
      hasChars,
      currentTag = '',
      currentAttrs = [],
      stackNoTrimWhitespace = [],
      stackNoCollapseWhitespace = [],
      optionalStartTag = '',
      optionalEndTag = '',
      ignoredMarkupChunks = [],
      ignoredCustomMarkupChunks = [],
      uidIgnore,
      uidAttr,
      uidPattern;

  /**
   * Set of tasks to perform asynchronously.
   *
   * @type {Array<AsyncTask|AsyncTaskGroup>}
   */
  var asyncTasks = [];

  /**
   * A placeholder that can be inserted into the buffer in place of a string.
   *
   * Placeholder objects in the buffer will be removed by async tasks before
   * completion of the `minify` function.
   *
   * @constructor
   */
  function Placeholder() {}

  /**
   * A group of AsyncTasks to execute in series.
   *
   * @constructor
   *
   * @param {AsyncTask[]} [tasks]
   * @param {*} [data]
   * @param {Function<Error, *>} [cb]
   */
  function AsyncTaskGroup(tasks, data, cb) {
    this.tasks = tasks ? tasks : [];
    this.data = data;
    this.cb = cb;
  }

  /**
   * Asynchronously runs all tasks in this group in series.
   *
   * @param {Function<Error, *>} cb
   */
  AsyncTaskGroup.prototype.exec = function(cb) {
    function multiCb(error, result) {
      if (typeof this.cb === 'function') {
        this.cb(error, result);
      }
      if (typeof cb === 'function') {
        cb(error, result);
      }
    }

    /**
     * Run the task at the given index, giving it a callback to run the next
     * task the same way.
     *
     * @param {string} data
     * @param {number} index
     */
    (function implementation(data, index) {
      if (index < this.tasks.length) {
        try {
          if (typeof this.tasks[index].data === 'undefined') {
            this.tasks[index].data = data;
          }
          this.tasks[index].exec(
            function(error, result) {
              if (error) {
                throw error;
              }

              if (this.tasks[index].cbExecuted) {
                throw new Error('Async completion has already occurred.');
              }
              this.tasks[index].cbExecuted = true;

              implementation.call(this, result, index + 1);
            }.bind(this)
          );
        }
        catch (error) {
          multiCb.call(this, error);
        }
      }
      else {
        multiCb.call(this, null, data);
      }
    }.bind(this))(this.data, 0);
  };

  /**
   * An async task.
   *
   * @constructor
   *
   * @param {Function<string, Function<Error, *>>} task
   * @param {*} [data]
   */
  function AsyncTask(task, data) {
    this.task = task;
    this.data = data;
  }

  /**
   * Execute this task.
   *
   * @param {Function<Error, *>} cb
   */
  AsyncTask.prototype.exec = function(cb) {
    this.task(this.data, cb);
  };

  // temporarily replace ignored chunks with comments,
  // so that we don't have to worry what's there.
  // for all we care there might be
  // completely-horribly-broken-alien-non-html-emoj-cthulhu-filled content
  value = value.replace(/<!-- htmlmin:ignore -->([\s\S]*?)<!-- htmlmin:ignore -->/g, function(match, group1) {
    if (!uidIgnore) {
      uidIgnore = uniqueId(value);
      var pattern = new RegExp('^' + uidIgnore + '([0-9]+)$');
      if (options.ignoreCustomComments) {
        options.ignoreCustomComments = options.ignoreCustomComments.slice();
      }
      else {
        options.ignoreCustomComments = [];
      }
      options.ignoreCustomComments.push(pattern);
    }
    var token = '<!--' + uidIgnore + ignoredMarkupChunks.length + '-->';
    ignoredMarkupChunks.push(group1);
    return token;
  });

  function escapeFragments(fn) {
    return function(text, type, cb) {
      return fn(text.replace(uidPattern, function(match, prefix, index) {
        var chunks = ignoredCustomMarkupChunks[+index];
        return chunks[1] + uidAttr + index + chunks[2];
      }), type, cb);
    };
  }

  var customFragments = options.ignoreCustomFragments.map(function(re) {
    return re.source;
  });
  if (customFragments.length) {
    var reCustomIgnore = new RegExp('\\s*(?:' + customFragments.join('|') + ')+\\s*', 'g');
    // temporarily replace custom ignored fragments with unique attributes
    value = value.replace(reCustomIgnore, function(match) {
      if (!uidAttr) {
        uidAttr = uniqueId(value);
        uidPattern = new RegExp('(\\s*)' + uidAttr + '([0-9]+)(\\s*)', 'g');
        if (options.minifyCSS) {
          options.minifyCSS = escapeFragments(options.minifyCSS);
        }
        if (options.minifyJS) {
          options.minifyJS = escapeFragments(options.minifyJS);
        }
      }
      var token = uidAttr + ignoredCustomMarkupChunks.length;
      ignoredCustomMarkupChunks.push(/^(\s*)[\s\S]*?(\s*)$/.exec(match));
      return '\t' + token + '\t';
    });
  }

  if (options.sortAttributes && typeof options.sortAttributes !== 'function' ||
      options.sortClassName && typeof options.sortClassName !== 'function') {
    asyncTasks.push(new AsyncTask(function(data, cb) {
      createSortFns(value, options, uidIgnore, uidAttr, cb);
    }));
  }

  function _canCollapseWhitespace(tag, attrs) {
    return options.canCollapseWhitespace(tag, attrs, canCollapseWhitespace);
  }

  function _canTrimWhitespace(tag, attrs) {
    return options.canTrimWhitespace(tag, attrs, canTrimWhitespace);
  }

  function removeStartTag(indexBound) {
    if (typeof indexBound === 'undefined') {
      indexBound = buffer.length;
    }

    var index = indexBound - 1;
    while (index > 0 && !/^<[^/!]/.test(buffer[index])) {
      index--;
    }
    return buffer.splice(index, indexBound - index).length;
  }

  function removeEndTag(indexBound) {
    if (typeof indexBound === 'undefined') {
      indexBound = buffer.length;
    }

    var index = indexBound - 1;
    while (index > 0 && !/^<\//.test(buffer[index])) {
      index--;
    }
    return buffer.splice(index, indexBound - index).length;
  }

  // look for trailing whitespaces, bypass any inline tags
  function trimTrailingWhitespace(index, nextTag) {
    for (var endTag = null; index >= 0 && _canTrimWhitespace(endTag); index--) {
      var str = buffer[index];
      var match = str.match(/^<\/([\w:-]+)>$/);
      if (match) {
        endTag = match[1];
      }
      else if (/>$/.test(str) || (buffer[index] = collapseWhitespaceSmart(str, null, nextTag, options))) {
        break;
      }
    }
  }

  // look for trailing whitespaces from previously processed text
  // which may not be trimmed due to a following comment or an empty
  // element which has now been removed
  function squashTrailingWhitespace(nextTag) {
    var charsIndex = buffer.length - 1;
    if (buffer.length > 1) {
      var item = buffer[buffer.length - 1];
      if (/^(?:<!|$)/.test(item) && item.indexOf(uidIgnore) === -1) {
        charsIndex--;
      }
    }
    trimTrailingWhitespace(charsIndex, nextTag);
  }

  asyncTasks.push(new AsyncTask(function(data, cb) {
    try {
      new HTMLParser(value, {
        partialMarkup: partialMarkup,
        html5: options.html5,

        start: function(tag, attrs, unary, unarySlash, autoGenerated) {
          var placeholder = new Placeholder(); // Some unique reference.
          buffer.push(placeholder);

          asyncTasks.push(
            new AsyncTask(function(data, cb) {
              // The index of the placeholder may not be the same as where it
              // was originally inserted at; therefore we need to search for it.
              var insertionIndex = buffer.indexOf(placeholder);

              // Remove the placeholder.
              buffer.splice(insertionIndex, 1);

              var lowerTag = data.tag.toLowerCase();

              if (lowerTag === 'svg') {
                options = Object.create(options);
                options.keepClosingSlash = true;
                options.caseSensitive = true;
              }

              data.tag = options.caseSensitive ? data.tag : lowerTag;

              currentTag = data.tag;
              charsPrevTag = data.tag;
              if (!inlineTextTags(data.tag)) {
                currentChars = '';
              }
              hasChars = false;
              currentAttrs = data.attrs;

              var optional = options.removeOptionalTags;
              if (optional) {
                var htmlTag = htmlTags(data.tag);
                // <html> may be omitted if first thing inside is not comment
                // <head> may be omitted if first thing inside is an element
                // <body> may be omitted if first thing inside is not space, comment, <meta>, <link>, <script>, <style> or <template>
                // <colgroup> may be omitted if first thing inside is <col>
                // <tbody> may be omitted if first thing inside is <tr>
                if (htmlTag && canRemoveParentTag(optionalStartTag, data.tag)) {
                  insertionIndex -= removeStartTag(insertionIndex);
                }
                optionalStartTag = '';
                // end-data.tag-followed-by-start-data.tag omission rules
                if (htmlTag && canRemovePrecedingTag(optionalEndTag, data.tag)) {
                  insertionIndex -= removeEndTag(insertionIndex);
                  // <colgroup> cannot be omitted if preceding </colgroup> is omitted
                  // <tbody> cannot be omitted if preceding </tbody>, </thead> or </tfoot> is omitted
                  optional = !isStartTagMandatory(optionalEndTag, data.tag);
                }
                optionalEndTag = '';
              }

              // set whitespace flags for nested tags (eg. <code> within a <pre>)
              if (options.collapseWhitespace) {
                if (!stackNoTrimWhitespace.length) {
                  squashTrailingWhitespace(data.tag);
                }
                if (!data.unary) {
                  if (!_canTrimWhitespace(data.tag, data.attrs) || stackNoTrimWhitespace.length) {
                    stackNoTrimWhitespace.push(data.tag);
                  }
                  if (!_canCollapseWhitespace(data.tag, data.attrs) || stackNoCollapseWhitespace.length) {
                    stackNoCollapseWhitespace.push(data.tag);
                  }
                }
              }

              var openTag = '<' + data.tag;
              var hasUnarySlash = data.unarySlash && options.keepClosingSlash;

              buffer.splice(insertionIndex++, 0, openTag);

              if (options.sortAttributes) {
                options.sortAttributes(data.tag, data.attrs);
              }

              var parts = [];
              var isLast = true;

              // Loop through all the attributes and normalize them.
              (function normalizeAttrLoop(i) {
                // Attributes to normalize?
                if (--i >= 0) {
                  var innerLoopResult;
                  // Normalize all the attributes in series.
                  normalizeAttr(data.attrs[i], data.attrs, data.tag, options, function(error, normalized) {
                    if (error) {
                      return cb(error);
                    }

                    if (normalized) {
                      parts.unshift(buildAttr(normalized, hasUnarySlash, options, isLast, uidAttr));
                      isLast = false;
                    }

                    innerLoopResult = normalizeAttrLoop(i);
                  });
                  return innerLoopResult;
                }

                // All attributes are now normalize.

                if (parts.length > 0) {
                  buffer.splice.apply(buffer, [insertionIndex, 0, ' '].concat(parts));
                  insertionIndex += 1 + parts.length;
                }
                // start tag must never be omitted if it has any attributes
                else if (optional && optionalStartTags(data.tag)) {
                  optionalStartTag = data.tag;
                }

                // Remove the last inserted element, modify it and put it back.
                var lastElem = buffer.splice(--insertionIndex, 1)[0];
                buffer.splice(insertionIndex++, 0, lastElem + (hasUnarySlash ? '/' : '') + '>');

                if (data.autoGenerated && !options.includeAutoGeneratedTags) {
                  insertionIndex -= removeStartTag(insertionIndex);
                  optionalStartTag = '';
                }

                return cb(null, data);
              })(data.attrs.length);
            }, {
              tag: tag,
              attrs: attrs,
              unary: unary,
              unarySlash: unarySlash,
              autoGenerated: autoGenerated
            })
          );
        },
        end: function(tag, attrs, autoGenerated) {
          var placeholder = new Placeholder(); // Some unique reference.
          buffer.push(placeholder);

          asyncTasks.push(
            new AsyncTask(function(data, cb) {
              // The index of the placeholder may not be the same as where it
              // was originally inserted at; therefore we need to search for it.
              var insertionIndex = buffer.indexOf(placeholder);

              // Remove the placeholder.
              buffer.splice(insertionIndex, 1);

              var lowerTag = data.tag.toLowerCase();
              if (lowerTag === 'svg') {
                options = Object.getPrototypeOf(options);
              }
              data.tag = options.caseSensitive ? data.tag : lowerTag;

              // check if current tag is in a whitespace stack
              if (options.collapseWhitespace) {
                if (stackNoTrimWhitespace.length) {
                  if (data.tag === stackNoTrimWhitespace[stackNoTrimWhitespace.length - 1]) {
                    stackNoTrimWhitespace.pop();
                  }
                }
                else {
                  squashTrailingWhitespace('/' + data.tag);
                }
                if (stackNoCollapseWhitespace.length &&
                  data.tag === stackNoCollapseWhitespace[stackNoCollapseWhitespace.length - 1]) {
                  stackNoCollapseWhitespace.pop();
                }
              }

              var isElementEmpty = false;
              if (data.tag === currentTag) {
                currentTag = '';
                isElementEmpty = !hasChars;
              }

              if (options.removeOptionalTags) {
                // <html>, <head> or <body> may be omitted if the element is empty
                if (isElementEmpty && topLevelTags(optionalStartTag)) {
                  insertionIndex -= removeStartTag(insertionIndex);
                }
                optionalStartTag = '';
                // </html> or </body> may be omitted if not followed by comment
                // </head> may be omitted if not followed by space or comment
                // </p> may be omitted if no more content in non-</a> parent
                // except for </dt> or </thead>, end tags may be omitted if no more content in parent element
                if (htmlTags(data.tag) && optionalEndTag && !trailingTags(optionalEndTag) && (optionalEndTag !== 'p' || !pInlineTags(data.tag))) {
                  insertionIndex -= removeEndTag(insertionIndex);
                }
                optionalEndTag = optionalEndTags(data.tag) ? data.tag : '';
              }

              if (options.removeEmptyElements && isElementEmpty && canRemoveElement(data.tag, data.attrs)) {
                // remove last "element" from buffer
                insertionIndex -= removeStartTag(insertionIndex);
                optionalStartTag = '';
                optionalEndTag = '';
              }
              else {
                if (data.autoGenerated && !options.includeAutoGeneratedTags) {
                  optionalEndTag = '';
                }
                else {
                  buffer.splice(insertionIndex, 0, '</' + data.tag + '>');
                }
                charsPrevTag = '/' + data.tag;
                if (!inlineTags(data.tag)) {
                  currentChars = '';
                }
                else if (isElementEmpty) {
                  currentChars += '|';
                }
              }

              return cb(null, data);
            }, {
              tag: tag,
              attrs: attrs,
              autoGenerated: autoGenerated
            })
          );
        },
        chars: function(text, prevTag, nextTag) {
          var placeholder = new Placeholder(); // Some unique reference.
          buffer.push(placeholder);

          asyncTasks.push(
            new AsyncTask(function(data, cb) {
              // The index of the placeholder may not be the same as where it
              // was originally inserted at; therefore we need to search for it.
              var insertionIndex = buffer.indexOf(placeholder);

              // Remove the placeholder.
              buffer.splice(insertionIndex, 1);

              var subtasks = [];
              data.prevTag = data.prevTag === '' ? 'comment' : data.prevTag;
              data.nextTag = data.nextTag === '' ? 'comment' : data.nextTag;
              if (options.decodeEntities && data.text && !specialContentTags(currentTag)) {
                data.text = decode(data.text);
              }
              if (options.collapseWhitespace) {
                if (!stackNoTrimWhitespace.length) {
                  if (data.prevTag === 'comment') {
                    var prevComment = buffer[insertionIndex - 1];
                    if (prevComment.indexOf(uidIgnore) === -1) {
                      if (!prevComment) {
                        data.prevTag = charsPrevTag;
                      }
                      if (insertionIndex > 1 && (!prevComment || !options.conservativeCollapse && / $/.test(currentChars))) {
                        var charsIndex = insertionIndex - 2;
                        buffer[charsIndex] = buffer[charsIndex].replace(/\s+$/, function(trailingSpaces) {
                          data.text = trailingSpaces + data.text;
                          return '';
                        });
                      }
                    }
                  }
                  if (data.prevTag) {
                    if (data.prevTag === '/nobr' || data.prevTag === 'wbr') {
                      if (/^\s/.test(data.text)) {
                        var tagIndex = insertionIndex - 1;
                        while (tagIndex > 0 && buffer[tagIndex].lastIndexOf('<' + data.prevTag) !== 0) {
                          tagIndex--;
                        }
                        trimTrailingWhitespace(tagIndex - 1, 'br');
                      }
                    }
                    else if (inlineTextTags(data.prevTag.charAt(0) === '/' ? data.prevTag.slice(1) : data.prevTag)) {
                      data.text = collapseWhitespace(data.text, options, /(?:^|\s)$/.test(currentChars));
                    }
                  }
                  if (data.prevTag || data.nextTag) {
                    data.text = collapseWhitespaceSmart(data.text, data.prevTag, data.nextTag, options);
                  }
                  else {
                    data.text = collapseWhitespace(data.text, options, true, true);
                  }
                  if (!data.text && /\s$/.test(currentChars) && data.prevTag && data.prevTag.charAt(0) === '/') {
                    trimTrailingWhitespace(insertionIndex - 1, data.nextTag);
                  }
                }
                if (!stackNoCollapseWhitespace.length && data.nextTag !== 'html' && !(data.prevTag && data.nextTag)) {
                  data.text = collapseWhitespace(data.text, options, false, false, true);
                }
              }
              if (options.processScripts && specialContentTags(currentTag)) {
                subtasks.push(new AsyncTask(function(data, cb) {
                  processScript(data.text, options, currentAttrs, function(error, result) {
                    data.text = result;
                    return cb(error, data);
                  });
                }));
              }
              if (isExecutableScript(currentTag, currentAttrs)) {
                subtasks.push(new AsyncTask(function(data, cb) {
                  var result = options.minifyJS(data.text, null, minifyJS_cb);
                  if (typeof result !== 'undefined') {
                    return minifyJS_cb(null, result);
                  }

                  var callbackCalled = false;
                  function minifyJS_cb(error, result) {
                    if (!callbackCalled) {
                      callbackCalled = true;
                      data.text = result;
                      return cb(error, data);
                    }
                  }
                }));
              }
              if (isStyleSheet(currentTag, currentAttrs)) {
                subtasks.push(new AsyncTask(function(data, cb) {
                  var result = options.minifyCSS(data.text, null, minifyCSS_cb);
                  if (typeof result !== 'undefined') {
                    return minifyCSS_cb(null, result);
                  }

                  var callbackCalled = false;
                  function minifyCSS_cb(error, result) {
                    if (!callbackCalled) {
                      callbackCalled = true;
                      data.text = result;
                      return cb(error, data);
                    }
                  }
                }));
              }
              subtasks.push(
                new AsyncTask(function(data, cb) {
                  if (options.removeOptionalTags && data.text) {
                    // <html> may be omitted if first thing inside is not comment
                    // <body> may be omitted if first thing inside is not space, comment, <meta>, <link>, <script>, <style> or <template>
                    if (optionalStartTag === 'html' || optionalStartTag === 'body' && !/^\s/.test(data.text)) {
                      insertionIndex -= removeStartTag(insertionIndex);
                    }
                    optionalStartTag = '';
                    // </html> or </body> may be omitted if not followed by comment
                    // </head>, </colgroup> or </caption> may be omitted if not followed by space or comment
                    if (compactTags(optionalEndTag) || looseTags(optionalEndTag) && !/^\s/.test(data.text)) {
                      insertionIndex -= removeEndTag(insertionIndex);
                    }
                    optionalEndTag = '';
                  }
                  charsPrevTag = /^\s*$/.test(data.text) ? data.prevTag : 'comment';
                  if (options.decodeEntities && data.text && !specialContentTags(currentTag)) {
                    // semi-colon can be omitted
                    // https://mathiasbynens.be/notes/ambiguous-ampersands
                    data.text = data.text.replace(/&(#?[0-9a-zA-Z]+;)/g, '&amp$1').replace(/</g, '&lt;');
                  }
                  if (uidPattern && options.collapseWhitespace && stackNoTrimWhitespace.length) {
                    data.text = data.text.replace(uidPattern, function(match, prefix, index) {
                      return ignoredCustomMarkupChunks[+index][0];
                    });
                  }
                  currentChars += data.text;
                  if (data.text) {
                    hasChars = true;
                  }

                  buffer.splice(insertionIndex++, 0, data.text);
                  return cb(null, data);
                })
              );

              // Run the subtasks.
              new AsyncTaskGroup(subtasks, data).exec(cb);
            }, {
              text: text,
              prevTag: prevTag,
              nextTag: nextTag
            })
          );
        },
        comment: function(text, nonStandard) {
          var placeholder = new Placeholder(); // Some unique reference.
          buffer.push(placeholder);

          asyncTasks.push(
            new AsyncTask(function(data, cb) {
              // The index of the placeholder may not be the same as where it
              // was originally inserted at; therefore we need to search for it.
              var insertionIndex = buffer.indexOf(placeholder);

              // Remove the placeholder.
              buffer.splice(insertionIndex, 1);

              var subtasks = [];
              var prefix = data.nonStandard ? '<!' : '<!--';
              var suffix = data.nonStandard ? '>' : '-->';
              if (isConditionalComment(data.text)) {
                subtasks.push(new AsyncTask(function(data, cb) {
                  cleanConditionalComment(data.text, options, function(error, result) {
                    data.text = prefix + result + suffix;
                    return cb(error, data);
                  });
                }));
              }
              else if (options.removeComments) {
                if (isIgnoredComment(data.text, options)) {
                  data.text = '<!--' + data.text + '-->';
                }
                else {
                  data.text = '';
                }
              }
              else {
                data.text = prefix + data.text + suffix;
              }

              subtasks.push(new AsyncTask(function(data, cb) {
                if (options.removeOptionalTags && data.text) {
                  // preceding comments suppress tag omissions
                  optionalStartTag = '';
                  optionalEndTag = '';
                }
                buffer.splice(insertionIndex++, 0, data.text);
                cb(null, data);
              }));

              // Run the subtasks.
              new AsyncTaskGroup(subtasks, data).exec(cb);
            }, {
              text: text,
              nonStandard: nonStandard
            })
          );
        },
        doctype: function(doctype) {
          var placeholder = new Placeholder(); // Some unique reference.
          buffer.push(placeholder);

          asyncTasks.push(
            new AsyncTask(function(data, cb) {
              // The index of the placeholder may not be the same as where it
              // was originally inserted at; therefore we need to search for it.
              var insertionIndex = buffer.indexOf(placeholder);

              // Remove the placeholder.
              buffer.splice(insertionIndex, 1);

              buffer.splice(insertionIndex++, 0, options.useShortDoctype ? '<!DOCTYPE html>' : collapseWhitespaceAll(data.doctype));
              return cb(null, data);
            }, {
              doctype: doctype
            })
          );
        },
        customAttrAssign: options.customAttrAssign,
        customAttrSurround: options.customAttrSurround
      });

      return cb();
    }
    catch (error) {
      return cb(error);
    }
  }));

  function finalize() {
    if (options.removeOptionalTags) {
      // <html> may be omitted if first thing inside is not comment
      // <head> or <body> may be omitted if empty
      if (topLevelTags(optionalStartTag)) {
        removeStartTag();
      }
      // except for </dt> or </thead>, end tags may be omitted if no more content in parent element
      if (optionalEndTag && !trailingTags(optionalEndTag)) {
        removeEndTag();
      }
    }
    if (options.collapseWhitespace) {
      squashTrailingWhitespace('br');
    }

    var str = joinResultSegments(buffer, options);

    if (uidPattern) {
      str = str.replace(uidPattern, function(match, prefix, index, suffix) {
        var chunk = ignoredCustomMarkupChunks[+index][0];
        if (options.collapseWhitespace) {
          if (prefix !== '\t') {
            chunk = prefix + chunk;
          }
          if (suffix !== '\t') {
            chunk += suffix;
          }
          return collapseWhitespace(chunk, {
            preserveLineBreaks: options.preserveLineBreaks,
            conservativeCollapse: !options.trimCustomFragments
          }, /^[ \n\r\t\f]/.test(chunk), /[ \n\r\t\f]$/.test(chunk));
        }
        return chunk;
      });
    }
    if (uidIgnore) {
      str = str.replace(new RegExp('<!--' + uidIgnore + '([0-9]+)-->', 'g'), function(match, index) {
        return ignoredMarkupChunks[+index];
      });
    }

    return str;
  }

  function callCallBack() {
    try {
      return cb(null, finalize());
    }
    catch (error) {
      return cb(error);
    }
  }

  // No async tasks?
  if (asyncTasks.length === 0) {
    return callCallBack();
  }

  new AsyncTaskGroup(asyncTasks)
    .exec(function(error) {
      if (error) {
        return cb(error);
      }
      return callCallBack();
    });
  return;
}

function joinResultSegments(results, options) {
  var str;
  var maxLineLength = options.maxLineLength;
  if (maxLineLength) {
    var line = '', lines = [];
    while (results.length) {
      var len = line.length;
      var end = results[0].indexOf('\n');
      if (end < 0) {
        line += results.shift();
      }
      else {
        line += results[0].slice(0, end);
        results[0] = results[0].slice(end + 1);
      }
      if (len > 0 && line.length >= maxLineLength) {
        lines.push(line.slice(0, len));
        line = line.slice(len);
      }
      else if (end >= 0) {
        lines.push(line);
        line = '';
      }
    }
    if (line) {
      lines.push(line);
    }

    str = lines.join('\n');
  }
  else {
    str = results.join('');
  }
  return options.collapseWhitespace ? collapseWhitespace(str, options, true, true) : str;
}

exports.minify = function(value, options, cb) {
  var start = Date.now();
  var hasCallback = typeof cb === 'function';
  options = processOptions(options || {});

  var minified;
  minify(value, options, false, function(error, result) {
    if (error) {
      if (hasCallback) {
        return cb(error);
      }
      throw error;
    }

    options.log('minified in: ' + (Date.now() - start) + 'ms');
    if (hasCallback) {
      return cb(null, result);
    }
    minified = result;
  });
  return minified;
};
