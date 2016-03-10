/*!
 * HTML Parser By John Resig (ejohn.org)
 * Modified by Juriy "kangax" Zaytsev
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 */

/*
 * // Use like so:
 * HTMLParser(htmlString, {
 *     start: function(tag, attrs, unary) {},
 *     end: function(tag) {},
 *     chars: function(text) {},
 *     comment: function(text) {}
 * });
 *
 * // or to get an XML string:
 * HTMLtoXML(htmlString);
 *
 * // or to get an XML DOM Document
 * HTMLtoDOM(htmlString);
 *
 * // or to inject into an existing document/DOM node
 * HTMLtoDOM(htmlString, document);
 * HTMLtoDOM(htmlString, document.body);
 *
 */

 /* global ActiveXObject, DOMDocument */

(function(global) {
  'use strict';

  // Regular Expressions for parsing tags and attributes
  var singleAttrIdentifier = /([^\s"'<>\/=]+)/,
      singleAttrAssign = /=/,
      singleAttrAssigns = [ singleAttrAssign ],
      singleAttrValues = [
        // attr value double quotes
        /"([^"]*)"+/.source,
        // attr value, single quotes
        /'([^']*)'+/.source,
        // attr value, no quotes
        /([^\s"'=<>`]+)/.source
      ],
      startTagOpen = /^<([\w:-]+)/,
      startTagClose = /^\s*(\/?)>/,
      endTag = /^<\/([\w:-]+)[^>]*>/,
      doctype = /^<!DOCTYPE [^>]+>/i;

  var IS_REGEX_CAPTURING_BROKEN = false;
  'x'.replace(/x(.)?/g, function(m, g) {
    IS_REGEX_CAPTURING_BROKEN = g === '';
  });

  // Empty Elements
  var empty = makeMap('area,base,basefont,br,col,embed,frame,hr,img,input,isindex,keygen,link,meta,param,source,track,wbr');

  // Inline Elements
  var inline = makeMap('a,abbr,acronym,applet,b,basefont,bdo,big,br,button,cite,code,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,noscript,object,q,s,samp,script,select,small,span,strike,strong,sub,sup,svg,textarea,tt,u,var');

  // Elements that you can, intentionally, leave open
  // (and which close themselves)
  var closeSelf = makeMap('colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr,source');

  // Attributes that have their values filled in disabled='disabled'
  var fillAttrs = makeMap('checked,compact,declare,defer,disabled,ismap,multiple,nohref,noresize,noshade,nowrap,readonly,selected');

  // Special Elements (can contain anything)
  var special = makeMap('script,style');

  // Phrasing Content https://html.spec.whatwg.org/multipage/dom.html#phrasing-content
  var phrasingOnly = makeMap('abbr,b,bdi,bdo,button,cite,code,data,dfn,em,h1,h2,h3,h4,h5,h6,i,kbd,label,legend,mark,meter,output,p,pre,progress,q,rp,rt,s,samp,small,span,strong,sub,sup,time,u,var');
  var phrasing = makeMap('a,abbr,area,audio,b,bdi,bdo,br,button,canvas,cite,code,data,datalist,del,dfn,em,embed,i,iframe,img,input,ins,kbd,keygen,label,link,main,map,mark,math,menu,meter,nav,noscript,object,ol,output,p,picture,pre,progress,q,ruby,s,samp,script,section,select,small,span,strong,sub,sup,svg,table,template,textarea,time,u,ul,var,video,wbr');

  var reCache = {};

  function attrForHandler(handler) {
    var pattern = singleAttrIdentifier.source
      + '(?:\\s*(' + joinSingleAttrAssigns(handler) + ')'
      + '\\s*(?:' + singleAttrValues.join('|') + '))?';
    if (handler.customAttrSurround) {
      var attrClauses = [];
      for ( var i = handler.customAttrSurround.length - 1; i >= 0; i-- ) {
        attrClauses[i] = '(?:'
          + '(' + handler.customAttrSurround[i][0].source + ')\\s*'
          + pattern
          + '\\s*(' + handler.customAttrSurround[i][1].source + ')'
          + ')';
      }
      attrClauses.push('(?:' + pattern + ')');
      pattern = '(?:' + attrClauses.join('|') + ')';
    }
    return new RegExp('^\\s*' + pattern);
  }

  function joinSingleAttrAssigns( handler ) {
    return singleAttrAssigns.concat(
      handler.customAttrAssign || []
    ).map(function (assign) {
      return '(?:' + assign.source + ')';
    }).join('|');
  }

  var HTMLParser = global.HTMLParser = function( html, handler ) {
    var stack = [], lastTag;
    var attribute = attrForHandler(handler);
    var last, prevTag, nextTag;
    while ( html ) {
      last = html;
      // Make sure we're not in a script or style element
      if ( !lastTag || !special[ lastTag ] ) {
        var textEnd = html.indexOf('<');
        if (textEnd === 0) {
          // Comment:
          if ( /^<!--/.test( html ) ) {
            var commentEnd = html.indexOf('-->');

            if ( commentEnd >= 0 ) {
              if ( handler.comment ) {
                handler.comment( html.substring( 4, commentEnd ) );
              }
              html = html.substring( commentEnd + 3 );
              prevTag = '';
              continue;
            }
          }

          // http://en.wikipedia.org/wiki/Conditional_comment#Downlevel-revealed_conditional_comment
          if ( /^<!\[/.test( html ) ) {
            var conditionalEnd = html.indexOf(']>');

            if (conditionalEnd >= 0) {
              if ( handler.comment ) {
                handler.comment( html.substring(2, conditionalEnd + 1 ), true /* non-standard */ );
              }
              html = html.substring( conditionalEnd + 2 );
              prevTag = '';
              continue;
            }
          }

          // Doctype:
          var doctypeMatch = html.match( doctype );
          if ( doctypeMatch ) {
            if ( handler.doctype ) {
              handler.doctype( doctypeMatch[0] );
            }
            html = html.substring( doctypeMatch[0].length );
            prevTag = '';
            continue;
          }

          // End tag:
          var endTagMatch = html.match( endTag );
          if ( endTagMatch ) {
            html = html.substring( endTagMatch[0].length );
            endTagMatch[0].replace( endTag, parseEndTag );
            prevTag = '/' + endTagMatch[1].toLowerCase();
            continue;
          }

          // Start tag:
          var startTagMatch = parseStartTag(html);
          if ( startTagMatch ) {
            html = startTagMatch.rest;
            handleStartTag(startTagMatch);
            prevTag = startTagMatch.tagName.toLowerCase();
            continue;
          }
        }

        var text;
        if (textEnd >= 0) {
          text = html.substring( 0, textEnd );
          html = html.substring( textEnd );
        }
        else {
          text = html;
          html = '';
        }

        // next tag
        var nextTagMatch = parseStartTag(html);
        if (nextTagMatch) {
          nextTag = nextTagMatch.tagName;
        }
        else {
          nextTagMatch = html.match( endTag );
          if (nextTagMatch) {
            nextTag = '/' + nextTagMatch[1];
          }
          else {
            nextTag = '';
          }
        }

        if ( handler.chars ) {
          handler.chars(text, prevTag, nextTag);
        }
        prevTag = '';

      }
      else {
        var stackedTag = lastTag.toLowerCase();
        var reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp('([\\s\\S]*?)<\/' + stackedTag + '[^>]*>', 'i'));

        html = html.replace(reStackedTag, function(all, text) {
          if (stackedTag !== 'script' && stackedTag !== 'style' && stackedTag !== 'noscript') {
            text = text
              .replace(/<!--([\s\S]*?)-->/g, '$1')
              .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
          }

          if ( handler.chars ) {
            handler.chars( text );
          }

          return '';
        });

        parseEndTag( '</' + stackedTag + '>', stackedTag );
      }

      if ( html === last ) {
        throw 'Parse Error: ' + html;
      }
    }

    if (!handler.partialMarkup) {
      // Clean up any remaining tags
      parseEndTag();
    }

    function parseStartTag(input) {
      var start = input.match(startTagOpen);
      if (start) {
        var match = {
          tagName: start[1],
          attrs: []
        };
        input = input.slice(start[0].length);
        var end, attr;
        while (!(end = input.match(startTagClose)) && (attr = input.match(attribute))) {
          input = input.slice(attr[0].length);
          match.attrs.push(attr);
        }
        if (end) {
          match.unarySlash = end[1];
          match.rest = input.slice(end[0].length);
          return match;
        }
      }
    }

    function handleStartTag(match) {
      var tagName = match.tagName;
      var unarySlash = match.unarySlash;

      if (handler.html5 && lastTag && phrasingOnly[lastTag] && !phrasing[tagName]) {
        parseEndTag( '', lastTag );
      }

      if (!handler.html5) {
        while (lastTag && inline[ lastTag ]) {
          parseEndTag( '', lastTag );
        }
      }

      if ( closeSelf[ tagName ] && lastTag === tagName ) {
        parseEndTag( '', tagName );
      }

      var unary = empty[ tagName ] || tagName === 'html' && lastTag === 'head' || !!unarySlash;

      var attrs = match.attrs.map(function(args) {
        var name, value, fallbackValue, customOpen, customClose, customAssign, quote;
        var ncp = 7; // number of captured parts, scalar

        // hackish work around FF bug https://bugzilla.mozilla.org/show_bug.cgi?id=369778
        if (IS_REGEX_CAPTURING_BROKEN && args[0].indexOf('""') === -1) {
          if (args[3] === '') { args[3] = undefined; }
          if (args[4] === '') { args[4] = undefined; }
          if (args[5] === '') { args[5] = undefined; }
        }

        var j = 1;
        if (handler.customAttrSurround) {
          for (var i = 0, l = handler.customAttrSurround.length; i < l; i++, j += ncp) {
            name = args[j + 1];
            customAssign = args[j + 2];
            if (name) {
              fallbackValue = args[j + 3];
              value = fallbackValue || args[j + 4] || args[j + 5];
              quote = fallbackValue ? '"' : value ? '\'' : '';
              customOpen = args[j];
              customClose = args[j + 6];
              break;
            }
          }
        }

        if (!name && (name = args[j])) {
          customAssign = args[j + 1];
          fallbackValue = args[j + 2];
          value = fallbackValue || args[j + 3] || args[j + 4];
          quote = fallbackValue ? '"' : value ? '\'' : '';
        }

        if (value === undefined) {
          value = fillAttrs[name] ? name : fallbackValue;
        }

        return {
          name: name,
          value: value,
          customAssign: customAssign || '=',
          customOpen:  customOpen || '',
          customClose: customClose || '',
          quote: quote || ''
        };
      });

      if ( !unary ) {
        stack.push( { tag: tagName, attrs: attrs } );
        lastTag = tagName;
        unarySlash = '';
      }

      if ( handler.start ) {
        handler.start( tagName, attrs, unary, unarySlash );
      }
    }

    function parseEndTag( tag, tagName ) {
      var pos;

      // If no tag name is provided, clean shop
      if ( !tagName ) {
        pos = 0;
      }
      else {
        // Find the closest opened tag of the same type
        var needle = tagName.toLowerCase();
        for ( pos = stack.length - 1; pos >= 0; pos-- ) {
          if ( stack[ pos ].tag.toLowerCase() === needle ) {
            break;
          }
        }
      }

      if ( pos >= 0 ) {
        // Close all the open elements, up the stack
        for ( var i = stack.length - 1; i >= pos; i-- ) {
          if ( handler.end ) {
            handler.end( stack[ i ].tag, stack[ i ].attrs, i > pos || !tag );
          }
        }

        // Remove the open elements from the stack
        stack.length = pos;
        lastTag = pos && stack[ pos - 1 ].tag;
      }
    }
  };

  global.HTMLtoXML = function( html ) {
    var results = '';

    new HTMLParser(html, {
      start: function( tag, attrs, unary ) {
        results += '<' + tag;

        for ( var i = 0; i < attrs.length; i++ ) {
          results += ' ' + attrs[i].name + '="' + (attrs[i].value || '').replace(/"/g, '&#34;') + '"';
        }

        results += (unary ? '/' : '') + '>';
      },
      end: function( tag ) {
        results += '</' + tag + '>';
      },
      chars: function( text ) {
        results += text;
      },
      comment: function( text ) {
        results += '<!--' + text + '-->';
      },
      ignore: function(text) {
        results += text;
      }
    });

    return results;
  };

  global.HTMLtoDOM = function( html, doc ) {
    // There can be only one of these elements
    var one = makeMap('html,head,body,title');

    // Enforce a structure for the document
    var structure = {
      link: 'head',
      base: 'head'
    };

    if ( !doc ) {
      if ( typeof DOMDocument !== 'undefined' ) {
        doc = new DOMDocument();
      }
      else if ( typeof document !== 'undefined' && document.implementation && document.implementation.createDocument ) {
        doc = document.implementation.createDocument('', '', null);
      }
      else if ( typeof ActiveX !== 'undefined' ) {
        doc = new ActiveXObject('Msxml.DOMDocument');
      }

    }
    else {
      doc = doc.ownerDocument ||
        doc.getOwnerDocument && doc.getOwnerDocument() ||
        doc;
    }

    var elems = [],
      documentElement = doc.documentElement ||
        doc.getDocumentElement && doc.getDocumentElement();

    // If we're dealing with an empty document then we
    // need to pre-populate it with the HTML document structure
    if ( !documentElement && doc.createElement ) {
      (function() {
        var html = doc.createElement('html');
        var head = doc.createElement('head');
        head.appendChild( doc.createElement('title') );
        html.appendChild( head );
        html.appendChild( doc.createElement('body') );
        doc.appendChild( html );
      })();
    }

    // Find all the unique elements
    if ( doc.getElementsByTagName ) {
      for ( var i in one ) {
        one[ i ] = doc.getElementsByTagName( i )[0];
      }
    }

    // If we're working with a document, inject contents into
    // the body element
    var curParentNode = one.body;

    new HTMLParser( html, {
      start: function( tagName, attrs, unary ) {
        // If it's a pre-built element, then we can ignore
        // its construction
        if ( one[ tagName ] ) {
          curParentNode = one[ tagName ];
          return;
        }

        var elem = doc.createElement( tagName );

        for ( var attr in attrs ) {
          elem.setAttribute( attrs[ attr ].name, attrs[ attr ].value );
        }

        if ( structure[ tagName ] && typeof one[ structure[ tagName ] ] !== 'boolean' ) {
          one[ structure[ tagName ] ].appendChild( elem );
        }
        else if ( curParentNode && curParentNode.appendChild ) {
          curParentNode.appendChild( elem );
        }

        if ( !unary ) {
          elems.push( elem );
          curParentNode = elem;
        }
      },
      end: function( /* tag */ ) {
        elems.length -= 1;

        // Init the new parentNode
        curParentNode = elems[ elems.length - 1 ];
      },
      chars: function( text ) {
        curParentNode.appendChild( doc.createTextNode( text ) );
      },
      comment: function( /*text*/ ) {
        // create comment node
      },
      ignore: function( /* text */ ) {
        // What to do here?
      }
    });

    return doc;
  };

  function makeMap(str) {
    var obj = {}, items = str.split(',');
    for ( var i = 0; i < items.length; i++ ) {
      obj[ items[i] ] = true;
      obj[ items[i].toUpperCase() ] = true;
    }
    return obj;
  }
})(typeof exports === 'undefined' ? this : exports);
