load('xml.js');

// XML.js type to native object. 
//   Straightforward translation. Notes:
//   1. If a node has children or attributes *and* CDATA, the CDATA will be put in a field named '#cdata'
//   2. Order is not necessarily preserved.
//   3. If a node has multiple children with the same name, they are placed into an array.
XML.prototype.toObject=function( obj )
{
  var has_children = this.children.length;
  var has_params   = this.params.count;
  var has_cdata    = this.cdata.length;
  var is_object    = has_children || has_params;
  var is_field     = (!is_object) && has_cdata;
  var x;

  if ( is_object ) {
    var out = new Object;

    // 3. If a node has multiple children with the same name, they are placed into an array.
    if ( obj[ this.name ] ) {
      if ( obj[ this.name ] instanceof Array ) {
        obj[ this.name ].push ( out );
      }
      else {
        var first_result = obj[ this.name ];
        obj[ this.name ] = [ first_result, out ]
      }
    } else {
      obj[ this.name ] = out;
    }

    for(x=0; x<this.params.count; x++) {
      out[ this.params.name(x) ] = this.params.value(x);
    }

    for(x in this.children) {
      this.children[x].toObject(out);
    }

    // 1. If a node has children or attributes *and* CDATA, the CDATA will be put in a field named '#cdata'
    if (has_cdata) {
      obj[ '#cdata' ] = this.cdata;
    }
  } else if ( is_field ) {
    // 3. If a node has multiple children with the same name, they are placed into an array.
    if ( obj[ this.name ] ) {
      if ( obj[ this.name ] instanceof Array ) {
        obj[ this.name ].push ( this.cdata );
      } else {
        var first_result = obj[ this.name ];
        obj[ this.name ] = [ first_result, this.cdata ]
      }
    } else {
      obj[ this.name ] = this.cdata;
    }
  }
}

XML.readObject=function( text ) {
  var out_xml = XML.read( text );
  var out_obj = new Object;

  out_xml.toObject( out_obj );
  return (out_obj);
}

