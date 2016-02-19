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
  var singleAttrIdentifier = /([\w:\.-]+)/,
      singleAttrAssign = /=/,
      singleAttrAssigns = [ singleAttrAssign ],
      singleAttrValues = [
        /"((?:\\.|[^"])*)"/.source, // attr value double quotes
        /'((?:\\.|[^'])*)'/.source, // attr value, single quotes
        /([^>\s]+)/.source          // attr value, no quotes
      ],
      startTagOpen = /^<([\w:-]+)/,
      startTagClose = /\s*(\/?)>/,
      endTag = /^<\/([\w:-]+)[^>]*>/,
      endingSlash = /\/>$/,
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

  var reCache = {}, stackedTag, reStackedTag, tagMatch;

  function startTagForHandler( handler ) {
    var customStartTagAttrs;

    var startTagAttrs = new RegExp(
        '(?:\\s*[\\w:\\.-]+'
      +   '(?:\\s*'
      +     '(?:' + joinSingleAttrAssigns(handler) + ')'
      +     '\\s*(?:(?:"[^"]*")|(?:\'[^\']*\')|[^>\\s]+)'
      +   ')?'
      + ')*'
    );

    if ( handler.customAttrSurround ) {
      var attrClauses = [];

      for ( var i = handler.customAttrSurround.length - 1; i >= 0; i-- ) {
        // Capture the custom attribute opening and closing markup surrounding the standard attribute rules
        attrClauses[i] = '(?:\\s*'
          + handler.customAttrSurround[i][0].source
          + '\\s*'
          + startTagAttrs.source
          + '\\s*'
          + handler.customAttrSurround[i][1].source
          + ')';
      }
      attrClauses.unshift(startTagAttrs.source);

      customStartTagAttrs = new RegExp(
        '((?:' + attrClauses.join('|') + ')*)'
      );
    }
    else {
      // No custom attribute wrappers specified, so just capture the standard attribute rules
      customStartTagAttrs = new RegExp('(' + startTagAttrs.source + ')');
    }

    return new RegExp(startTagOpen.source + customStartTagAttrs.source + startTagClose.source);
  }

  function attrForHandler( handler ) {
    var singleAttr = new RegExp(
      singleAttrIdentifier.source
      + '(?:\\s*'
      + '(' + joinSingleAttrAssigns( handler ) + ')'
      + '\\s*'
      + '(?:'
      + singleAttrValues.join('|')
      + ')'
      + ')?'
    );

    if ( handler.customAttrSurround ) {
      var attrClauses = [];
      for ( var i = handler.customAttrSurround.length - 1; i >= 0; i-- ) {
        attrClauses[i] = '(?:'
          + '(' + handler.customAttrSurround[i][0].source + ')\\s*'
          + singleAttr.source
          + '\\s*(' + handler.customAttrSurround[i][1].source + ')'
          + ')';
      }
      attrClauses.unshift('(?:' + singleAttr.source + ')');

      return new RegExp(attrClauses.join('|'), 'g');
    }
    else {
      return new RegExp(singleAttr.source, 'g');
    }
  }

  function joinSingleAttrAssigns( handler ) {
    return singleAttrAssigns.concat(
      handler.customAttrAssign || []
    ).map(function (assign) {
      return '(?:' + assign.source + ')';
    }).join('|');
  }

  var HTMLParser = global.HTMLParser = function( html, handler ) {
    var index, match, stack = [], last = html, prevTag, nextTag;
    stack.last = function() {
      var last = this[ this.length - 1 ];
      return last && last.tag;
    };

    var startTag = startTagForHandler(handler);
    var attr = attrForHandler(handler);

    while ( html ) {
      // Make sure we're not in a script or style element
      if ( !stack.last() || !special[ stack.last() ] ) {

        // Comment:
        if ( /^<!--/.test( html ) ) {
          index = html.indexOf('-->');

          if ( index >= 0 ) {
            if ( handler.comment ) {
              handler.comment( html.substring( 4, index ) );
            }
            html = html.substring( index + 3 );
            prevTag = '';
            continue;
          }
        }

        // http://en.wikipedia.org/wiki/Conditional_comment#Downlevel-revealed_conditional_comment
        if ( /^<!\[/.test( html ) ) {
          index = html.indexOf(']>');

          if (index >= 0) {
            if ( handler.comment ) {
              handler.comment( html.substring(2, index + 1 ), true /* non-standard */ );
            }
            html = html.substring( index + 2 );
            prevTag = '';
            continue;
          }
        }

        // Doctype:
        if ( (match = doctype.exec( html )) ) {
          if ( handler.doctype ) {
            handler.doctype( match[0] );
          }
          html = html.substring( match[0].length );
          prevTag = '';
          continue;
        }

        // End tag:
        if ( /^<\//.test( html ) ) {
          match = html.match( endTag );
          if ( match ) {
            html = html.substring( match[0].length );
            match[0].replace( endTag, parseEndTag );
            prevTag = '/' + match[1].toLowerCase();
            continue;
          }

        }
        // Start tag:
        if ( /^</.test( html ) ) {
          match = html.match( startTag );
          if ( match ) {
            html = html.substring( match[0].length );
            match[0].replace( startTag, parseStartTag );
            prevTag = match[1].toLowerCase();
            continue;
          }
        }

        index = html.indexOf('<');

        var text = index < 0 ? html : html.substring( 0, index );
        html = index < 0 ? '' : html.substring( index );

        // next tag
        tagMatch = html.match( startTag );
        if (tagMatch) {
          nextTag = tagMatch[1];
        }
        else {
          tagMatch = html.match( endTag );
          if (tagMatch) {
            nextTag = '/' + tagMatch[1];
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

        stackedTag = stack.last().toLowerCase();
        reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp('([\\s\\S]*?)<\/' + stackedTag + '[^>]*>', 'i'));

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

        parseEndTag( '', stackedTag );
      }

      if ( html === last ) {
        throw 'Parse Error: ' + html;
      }
      last = html;
    }

    // Clean up any remaining tags
    parseEndTag();

    function parseStartTag( tag, tagName, rest, unary ) {
      var unarySlash = false;

      while ( !handler.html5 && stack.last() && inline[ stack.last() ]) {
        parseEndTag( '', stack.last() );
      }

      if ( closeSelf[ tagName ] && stack.last() === tagName ) {
        parseEndTag( '', tagName );
      }

      unary = empty[ tagName ] || !!unary;

      var attrs = [];

      rest.replace(attr, function () {
        var name, value, fallbackValue, customOpen, customClose, customAssign, quote;
        var ncp = 7; // number of captured parts, scalar

        // hackish work around FF bug https://bugzilla.mozilla.org/show_bug.cgi?id=369778
        if (IS_REGEX_CAPTURING_BROKEN && arguments[0].indexOf('""') === -1) {
          if (arguments[3] === '') { arguments[3] = undefined; }
          if (arguments[4] === '') { arguments[4] = undefined; }
          if (arguments[5] === '') { arguments[5] = undefined; }
        }

        name = arguments[1];
        if ( name ) {
          customAssign = arguments[2];
          fallbackValue = arguments[3];
          value = fallbackValue || arguments[4] || arguments[5];

          if (customAssign) {
            quote = arguments[0].charAt(name.length + customAssign.length);
            quote = (quote === '\'' || quote === '"') ? quote : '';
          }

        }
        else if ( handler.customAttrSurround ) {
          for ( var i = handler.customAttrSurround.length - 1; i >= 0; i-- ) {
            name = arguments[i * ncp + 7];
            customAssign = arguments[i * ncp + 8];
            if ( name ) {
              fallbackValue = arguments[i * ncp + 9];
              value = fallbackValue
                || arguments[i * ncp + 10]
                || arguments[i * ncp + 11];
              customOpen = arguments[i * ncp + 6];
              customClose = arguments[i * ncp + 12];
              break;
            }
          }
        }

        if ( value === undefined ) {
          value = fillAttrs[name] ? name : fallbackValue;
        }

        attrs.push({
          name: name,
          value: value,
          customAssign: customAssign || '=',
          customOpen:  customOpen || '',
          customClose: customClose || '',
          quote: quote || ''
        });
      });

      if ( !unary ) {
        stack.push( { tag: tagName, attrs: attrs } );
      }
      else {
        unarySlash = tag.match( endingSlash );
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
            handler.end( stack[ i ].tag, stack[ i ].attrs );
          }
        }

        // Remove the open elements from the stack
        stack.length = pos;
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
