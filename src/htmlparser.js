/*
 * HTML Parser By John Resig (ejohn.org)
 * Modified by Juriy "kangax" Zaytsev
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 *
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

(function(global){

  // Regular Expressions for parsing tags and attributes
  var startTag = /^<([\w:-]+)((?:\s*[\w:-]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/,
      endTag = /^<\/([\w:-]+)[^>]*>/,
      attr = /([\w:-]+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))?/g,
      doctype = /^<!DOCTYPE [^>]+>/i,
      startIgnore = /<(%|\?)/;
      endIgnore = /(%|\?)>/;

  // Empty Elements - HTML 4.01
  var empty = makeMap("area,base,basefont,br,col,frame,hr,img,input,isindex,link,meta,param,embed");

  // Block Elements - HTML 4.01
  // var block = makeMap("address,applet,blockquote,button,center,dd,del,dir,div,dl,dt,fieldset,form,frameset,hr,iframe,ins,isindex,li,map,menu,noframes,noscript,object,ol,p,pre,script,table,tbody,td,tfoot,th,thead,tr,ul");

  // Inline Elements - HTML 4.01
  var inline = makeMap("a,abbr,acronym,applet,b,basefont,bdo,big,br,button,cite,code,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,script,select,small,span,strike,strong,sub,sup,textarea,tt,u,var");

  // Elements that you can, intentionally, leave open
  // (and which close themselves)
  var closeSelf = makeMap("colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr");

  // Attributes that have their values filled in disabled="disabled"
  var fillAttrs = makeMap("checked,compact,declare,defer,disabled,ismap,multiple,nohref,noresize,noshade,nowrap,readonly,selected");

  // Special Elements (can contain anything)
  var special = makeMap("script,style");

  var reCache = { }, stackedTag, reStackedTag, tagMatch;

  var HTMLParser = global.HTMLParser = function( html, handler ) {
    var index, chars, match, stack = [], last = html, prevTag, nextTag;
    stack.last = function(){
      return this[ this.length - 1 ];
    };

    while ( html ) {
      chars = true;

      // Make sure we're not in a script or style element
      if ( !stack.last() || !special[ stack.last() ] ) {

        // Comment:
        if ( html.indexOf("<!--") === 0 ) {
          index = html.indexOf("-->");

          if ( index >= 0 ) {
            if ( handler.comment )
              handler.comment( html.substring( 4, index ) );
            html = html.substring( index + 3 );
            chars = false;
          }
        }

        // Ignored elements?
        else if (html.search(startIgnore) === 0) {
          index = html.search(endIgnore); // Find closing tag.
          if (index >= 0) { // Found?
            // @TODO: Pass matched open/close tags back to handler.
            handler.ignore && handler.ignore(html.substring(0, index + 2)); // Return ignored string if callback exists.
            html = html.substring(index + 2); // Next starting point for parser.
            chars = false; // Chars flag.
          }
        }

        // Doctype:
        else if ( (match = doctype.exec( html )) ) {
          if ( handler.doctype )
            handler.doctype( match[0] );
          html = html.substring( match[0].length );
          chars = false;
        }

        // End tag:
        else if ( html.indexOf("</") === 0 ) {
          match = html.match( endTag );

          if ( match ) {
            html = html.substring( match[0].length );
            match[0].replace( endTag, parseEndTag );
            prevTag = '/'+match[1];
            chars = false;
          }

        // Start tag:
        } else if ( html.indexOf("<") === 0 ) {
          match = html.match( startTag );

          if ( match ) {
            html = html.substring( match[0].length );
            match[0].replace( startTag, parseStartTag );
            prevTag = match[1];
            chars = false;
          }
        }

        if ( chars ) {
          index = html.indexOf("<");

          var text = index < 0 ? html : html.substring( 0, index );
          html = index < 0 ? "" : html.substring( index );

          // next tag
          tagMatch = html.match( startTag );
          if (tagMatch) {
          nextTag = tagMatch[1];
          } else {
          tagMatch = html.match( endTag );
          if (tagMatch) {
            nextTag = '/'+tagMatch[1];
          } else {
          nextTag = '';
          }
          }

          if ( handler.chars )
          handler.chars(text, prevTag, nextTag);

        }

      } else {

        stackedTag = stack.last().toLowerCase();
        reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp("([\\s\\S]*?)<\/" + stackedTag + "[^>]*>", "i"));

        html = html.replace(reStackedTag, function(all, text) {
          if (stackedTag !== 'script' && stackedTag !== 'style') {
            text = text
              .replace(/<!--([\s\S]*?)-->/g, "$1")
              .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
          }

          if ( handler.chars )
            handler.chars( text );

          return "";
        });

        parseEndTag( "", stackedTag );
      }

      if ( html === last )
        throw "Parse Error: " + html;
      last = html;
    }

    // Clean up any remaining tags
    parseEndTag();

    function parseStartTag( tag, tagName, rest, unary ) {

      while ( !handler.html5 && stack.last() && inline[ stack.last() ]) {
        parseEndTag( "", stack.last() );
      }

      if ( closeSelf[ tagName ] && stack.last() === tagName ) {
        parseEndTag( "", tagName );
      }

      unary = empty[ tagName ] || !!unary;

      if ( !unary )
        stack.push( tagName );

      if ( handler.start ) {
        var attrs = [];

        rest.replace(attr, function(match, name) {
          var value = arguments[2] ? arguments[2] :
            arguments[3] ? arguments[3] :
            arguments[4] ? arguments[4] :
            fillAttrs[name] ? name : "";
          attrs.push({
            name: name,
            value: value,
            escaped: value.replace(/(^|[^\\])"/g, '$1\\\"') //"
          });
        });

        if ( handler.start )
          handler.start( tagName, attrs, unary );
      }
    }

    function parseEndTag( tag, tagName ) {
      var pos;

      // If no tag name is provided, clean shop
      if ( !tagName )
        pos = 0;

      // Find the closest opened tag of the same type
      else
        for ( pos = stack.length - 1; pos >= 0; pos-- )
          if ( stack[ pos ] === tagName )
            break;

      if ( pos >= 0 ) {
        // Close all the open elements, up the stack
        for ( var i = stack.length - 1; i >= pos; i-- )
          if ( handler.end )
            handler.end( stack[ i ] );

        // Remove the open elements from the stack
        stack.length = pos;
      }
    }
  };

  global.HTMLtoXML = function( html ) {
    var results = "";

    HTMLParser(html, {
      start: function( tag, attrs, unary ) {
        results += "<" + tag;

        for ( var i = 0; i < attrs.length; i++ )
          results += " " + attrs[i].name + '="' + attrs[i].escaped + '"';

        results += (unary ? "/" : "") + ">";
      },
      end: function( tag ) {
        results += "</" + tag + ">";
      },
      chars: function( text ) {
        results += text;
      },
      comment: function( text ) {
        results += "<!--" + text + "-->";
      },
      ignore: function(text) {
        results += text;
      }
    });

    return results;
  };

  global.HTMLtoDOM = function( html, doc ) {
    // There can be only one of these elements
    var one = makeMap("html,head,body,title");

    // Enforce a structure for the document
    var structure = {
      link: "head",
      base: "head"
    };

    if ( !doc ) {
      if ( typeof DOMDocument !== "undefined" )
        doc = new DOMDocument();
      else if ( typeof document !== "undefined" && document.implementation && document.implementation.createDocument )
        doc = document.implementation.createDocument("", "", null);
      else if ( typeof ActiveX !== "undefined" )
        doc = new ActiveXObject("Msxml.DOMDocument");

    } else
      doc = doc.ownerDocument ||
        doc.getOwnerDocument && doc.getOwnerDocument() ||
        doc;

    var elems = [],
      documentElement = doc.documentElement ||
        doc.getDocumentElement && doc.getDocumentElement();

    // If we're dealing with an empty document then we
    // need to pre-populate it with the HTML document structure
    if ( !documentElement && doc.createElement ) (function(){
      var html = doc.createElement("html");
      var head = doc.createElement("head");
      head.appendChild( doc.createElement("title") );
      html.appendChild( head );
      html.appendChild( doc.createElement("body") );
      doc.appendChild( html );
    })();

    // Find all the unique elements
    if ( doc.getElementsByTagName )
      for ( var i in one )
        one[ i ] = doc.getElementsByTagName( i )[0];

    // If we're working with a document, inject contents into
    // the body element
    var curParentNode = one.body;

    HTMLParser( html, {
      start: function( tagName, attrs, unary ) {
        // If it's a pre-built element, then we can ignore
        // its construction
        if ( one[ tagName ] ) {
          curParentNode = one[ tagName ];
          return;
        }

        var elem = doc.createElement( tagName );

        for ( var attr in attrs )
          elem.setAttribute( attrs[ attr ].name, attrs[ attr ].value );

        if ( structure[ tagName ] && typeof one[ structure[ tagName ] ] !== "boolean" )
          one[ structure[ tagName ] ].appendChild( elem );

        else if ( curParentNode && curParentNode.appendChild )
          curParentNode.appendChild( elem );

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

  function makeMap(str){
    var obj = {}, items = str.split(",");
    for ( var i = 0; i < items.length; i++ ) {
      obj[ items[i] ] = true;
      obj[ items[i].toUpperCase() ] = true;
    }
    return obj;
  }
})(typeof exports === 'undefined' ? this : exports);
