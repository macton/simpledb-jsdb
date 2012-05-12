//
// Simpledb.js (intended for use with jsdb)
//
// Version 1-alpha Mike Acton, Insomniac Games <macton@insomniacgames.com>
// License: http://www.opensource.org/licenses/mit-license.php
// 
// Minimal translation. Pretty much a 1:1 mapping with the Web API 
//   See also: 
//   - SDB API http://docs.amazonwebservices.com/AmazonSimpleDB/latest/DeveloperGuide/SDB_API_Operations.html
//   - SimpleDB Scratchpad http://aws.amazon.com/code/developertools/1137
//   - AWS SDK for PHP http://docs.amazonwebservices.com/AWSSDKforPHP/latest/#i=AmazonSDB 
//
//

// REQUIRED:
// load('aws/awssigner.js');
// load('aws/hmacsha1.js');
// load('xml.js');
// load('xml_utils.js');

function SimpleDB( access_key, secret_key, result_format ) {
  this.AWSHostURL   =  'http://sdb.amazonaws.com';
  this.AWSHost      =  'sdb.amazonaws.com';
  this.AWSVersion   =  '2009-04-15';
  this.AccessKey    = access_key;
  this.SecretKey    = secret_key;
  this.ResultFormat = result_format?result_format:'xml'; // [ 'xml', 'json', 'raw' ]
}

SimpleDB.prototype.CreateSignedURL = function( action_name, action_args ) {
  var arg_name;
  var arg_value;
  var aws_params = { Action: action_name, Version: this.AWSVersion };

  for ( arg_name in action_args ) {
    // All input parameters require values
    if ( action_args[ arg_name ] ) {
      aws_params[ arg_name ] = action_args[ arg_name ];
    }
  }

  var signer         = new AWSV2Signer( this.AccessKey, this.SecretKey );
  var signed_params  = signer.sign( aws_params, new Date(), { "verb": "GET", "host": this.AWSHost, "uriPath": "/" });
  var encoded_params = [];
  var key;
  var value;
  var encoded_key;
  var encoded_value;
  var get_params;
  var singed_url;

  for (key in signed_params) {
    encoded_key = encodeURIComponent( key );
    value       = signed_params[ key ];

    if ( value !== null ) {
      encoded_value = encodeURIComponent( value );
      encoded_params.push( encoded_key + '=' + encoded_value );
    } else {
      encoded_params.push( encoded_key );
    }
  }

  get_params = encoded_params.join("&");
  signed_url = this.AWSHostURL + '?' + get_params;

  return signed_url;
}

SimpleDB.prototype.SendRequest = function( url ) {

  var stream       = new Stream( url );
  var response_txt = stream.readFile();
  var out;

  if ( this.ResultFormat == 'json' ) {
    out = XML.readObject( response_txt );
  } else if ( this.ResultFormat == 'raw' ) {
    out = response_txt;
  } else {
    out = XML.read( response_txt );
  }

  stream.close();

  return out;
}

// http://docs.amazonwebservices.com/AmazonSimpleDB/latest/DeveloperGuide/SDB_API_CreateDomain.html
SimpleDB.prototype.CreateDomain = function( domain_name ) {
  var url = this.CreateSignedURL( 'CreateDomain', { DomainName: domain_name } );
  return this.SendRequest( url );
}

// http://docs.amazonwebservices.com/AmazonSimpleDB/latest/DeveloperGuide/SDB_API_Select.html
//   For building queries, see also:
//   - Query 101 http://aws.amazon.com/articles/1231
//   - Query 201 http://aws.amazon.com/articles/1232
//
// Fetching multiple SimpleDB items in a single request
//   http://avdi.org/devblog/2009/11/24/fetching-multiple-simpledb-items-in-a-single-request/
//   select * from my_domain where date > '2009-01-01'  
//   select itemName() from my_domain where date > '2009-01-01'  
//   select * from my_domain where itemName() = 'ABC123'  
//   select * from my_domain where itemName() in ('ABC123', 'DEF456', ...) 

SimpleDB.prototype.Select = function( select_expression, next_token, consistent_read ) {
  var url = this.CreateSignedURL( 'Select', { SelectExpression: select_expression, NextToken: next_token, ConsistentRead: consistent_read } );
  return this.SendRequest( url );
}

// http://docs.amazonwebservices.com/AmazonSimpleDB/latest/DeveloperGuide/SDB_API_ListDomains.html
SimpleDB.prototype.ListDomains = function( max_number_of_domains, next_token ) {
  var url = this.CreateSignedURL( 'ListDomains', { MaxNumberOfDomains: max_number_of_domains, NextToken: next_token } );
  return this.SendRequest( url );
}

// http://docs.amazonwebservices.com/AmazonSimpleDB/latest/DeveloperGuide/SDB_API_DomainMetadata.html
SimpleDB.prototype.DomainMetadata = function( domain_name ) {
  var url = this.CreateSignedURL( 'DomainMetadata', { DomainName: domain_name } );
  return this.SendRequest( url );
}

// http://docs.amazonwebservices.com/AmazonSimpleDB/latest/DeveloperGuide/SDB_API_DeleteDomain.html
SimpleDB.prototype.DeleteDomain = function( domain_name ) {
  var url = this.CreateSignedURL( 'DeleteDomain', { DomainName: domain_name } );
  return this.SendRequest( url );
}

// http://docs.amazonwebservices.com/AmazonSimpleDB/latest/DeveloperGuide/SDB_API_PutAttributes.html
SimpleDB.prototype.PutAttributes = function( domain_name, item_name, attribute, expected ) {
  var param = { DomainName: domain_name, ItemName: item_name };
  var i;

  if ( attribute ) {
    for (i=0;i<attribute.length;i++) {
      if ( attribute[i].Name ) {
        param[ 'Attribute.' + (i+1) + '.Name' ] = attribute[i].Name;
      }
      if ( attribute[i].Value ) {
        param[ 'Attribute.' + (i+1) + '.Value' ] = attribute[i].Value;
      }
      if ( attribute[i].Replace ) {
        param[ 'Attribute.' + (i+1) + '.Replace' ] = attribute[i].Replace;
      }
    }
  }

  if ( expected ) {
    for (i=0;i<expected.length;i++) {
      if ( expected[i].Name ) {
        param[ 'Expected.' + (i+1) + '.Name' ] = expected[i].Name;
      }
      if ( expected[i].Value ) {
        param[ 'Expected.' + (i+1) + '.Value' ] = expected[i].Value;
      }
      if ( expected[i].Exists ) {
        param[ 'Expected.' + (i+1) + '.Exists' ] = expected[i].Exists;
      }
    }
  }

  var url   = this.CreateSignedURL( 'PutAttributes', param );
  return this.SendRequest( url );
}

// http://docs.amazonwebservices.com/AmazonSimpleDB/latest/DeveloperGuide/SDB_API_BatchPutAttributes.html
//   256 attribute name-value pairs per item
//   1 MB request size
//   1 billion attributes per domain
//   10 GB of total user data storage per domain
//   25 item limit per BatchPutAttributes operation

SimpleDB.prototype.BatchPutAttributes = function( domain_name, item ) {
  var param = { DomainName: domain_name };
  var i;
  var j;

  if ( item ) {
    for (i=0;i<item.length;i++) {
      param[ 'Item.' + (i+1) + '.ItemName' ] = item[i].ItemName;

      if ( item[i].Attribute ) {
        for (j=0;j<item[i].Attribute.length;j++) {
          if ( item[i].Attribute[j].Name ) {
            param[ 'Item.' + (i+1) + '.Attribute.' + (j+1) + '.Name' ] = item[i].Attribute[j].Name;
          }
          if ( item[i].Attribute[j].Value ) {
            param[ 'Item.' + (i+1) + '.Attribute.' + (j+1) + '.Value' ] = item[i].Attribute[j].Value;
          }
          if ( item[i].Attribute[j].Replace ) {
            param[ 'Item.' + (i+1) + '.Attribute.' + (j+1) + '.Replace' ] = item[i].Attribute[j].Replace;
          }
        }
      }
    }
  }

  var url   = this.CreateSignedURL( 'BatchPutAttributes', param );
  return this.SendRequest( url );
}

// http://docs.amazonwebservices.com/AmazonSimpleDB/latest/DeveloperGuide/SDB_API_GetAttributes.html
SimpleDB.prototype.GetAttributes = function( domain_name, item_name, attribute_name, consistent_read ) {
  var param = { DomainName: domain_name, ItemName: item_name };
  var i;

  // shift parameters...
  if ( typeof attribute_name == 'boolean' ) {
    consistent_read = attribute_name;
    attribute_name  = null;
  }

  if ( attribute_name ) {
    for (i=0;i<attribute_name.length;i++)
    {
      param[ 'AttributeName.' + (i+1) ] = attribute_name[i];
    }
  }

  // ConsistentRead default is false
  if ( consistent_read ) {
      param[ 'ConsistentRead' ] = true;
  }

  var url   = this.CreateSignedURL( 'GetAttributes', param );
  return this.SendRequest( url );
}

// http://docs.amazonwebservices.com/AmazonSimpleDB/latest/DeveloperGuide/SDB_API_DeleteAttributes.html
// Note: Attribute.NameEncoding and Attribute.ValueEncoding are not documented on this page.
SimpleDB.prototype.DeleteAttributes = function( domain_name, item_name, attribute, expected ) {
  var param = { DomainName: domain_name, ItemName: item_name };
  var i;

  if ( attribute ) {
    for (i=0;i<attribute.length;i++) {
      if ( attribute[i].Name ) {
        param[ 'Attribute.' + (i+1) + '.Name' ] = attribute[i].Name;
      }
      if ( attribute[i].Value ) {
        param[ 'Attribute.' + (i+1) + '.Value' ] = attribute[i].Value;
      }
      if ( attribute[i].NameEncoding ) {
        param[ 'Attribute.' + (i+1) + '.NameEncoding' ] = attribute[i].NameEncoding;
      }
      if ( attribute[i].ValueEncoding  ) {
        param[ 'Attribute.' + (i+1) + '.ValueEncoding' ] = attribute[i].ValueEncoding;
      }
    }
  }

  if ( expected ) {
    for (i=0;i<expected.length;i++) {
      if ( expected[i].Name ) {
        param[ 'Expected.' + (i+1) + '.Name' ] = expected[i].Name;
      }
      if ( expected[i].Value ) {
        param[ 'Expected.' + (i+1) + '.Value' ] = expected[i].Value;
      }
      if ( expected[i].Exists ) {
        param[ 'Expected.' + (i+1) + '.Exists' ] = expected[i].Exists;
      }
    }
  }

  var url   = this.CreateSignedURL( 'DeleteAttributes', param );
  return this.SendRequest( url );
}

SimpleDB.AttributeToObject = function( in_attribute )
{
  var i;
  var result = new Object;
  var name;
  var value;
  var first_result;
  var attribute;


  if ( in_attribute ) {
    // Default.
    attribute = in_attribute;

    // Try to figure out what we're trying to convert...
    if (!( in_attribute instanceof Array )) {
      if (in_attribute.Attribute) {
        attribute = [ in_attribute.Attribute ];
      } else {
        attribute = [ in_attribute ];
      }
    }

    for (i=0;i<attribute.length;i++) {
      name  = attribute[i].Name;
      value = attribute[i].Value;

      // If a node has multiple children with the same name, they are placed into an array.
      if ( result[ name ] ) {
        if ( result[ name ] instanceof Array ) {
          result[ name ].push( value );
        } else {
          first_result = result[ name ];
          result[ name ] = [ first_result, value ];
        }
      } else {
        result[ name ] = value;
      }
    }
  }

  return result;
}

SimpleDB.ItemToObject = function( result, item )
{
  var i;
  var name;
  var attribute;

  // shift arguments for default
  if ( item == undefined )
  {
    item   = result;
    result = new Object;
  }

  if ( item ) {
    for (i=0;i<item.length;i++) {
      name           = item[i].Name;
      attribute      = item[i].Attribute;
      result[ name ] = SimpleDB.AttributeToObject( attribute );
    }
  }

  return result;
}

SimpleDB.ObjectToAttribute = function( obj, is_replace )
{
  var name;
  var attribute = [];
  var single;

  for (name in obj) {
    single = { Name: name, Value: obj[name] };

    if (is_replace) {
      single.Replace = 'true';
    }

    attribute.push( single );
  }

  return (attribute);
}
