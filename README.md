# xslt4node

A XSLT package wrapping the XSLT interface of the Java API for XML Processing (JAXP).

## Quick Example

    var config = {
        xsltPath: 'discount.xsl',
        sourcePath: 'order.xml',
        result: 'result.xml',
        params: {
            discount: '2014/08/01'
        },
        props: {
            indent: 'yes'
        }
    };

    xslt4node.transform(config, function (err) {
        if (err) {
            console.log(err);
        }
    });

## Installation

The easiest way to install it, is via NPM:

    npm install xslt4node

## Documentation

### transform(config, callback)
### transformSync(config) : result

Executes a transformation defined by the contents of `config`.

__Arguments__

* `config` - _Object defining the transformation_
    * `xsltPath` {String} optional - _Path to the XSLT document used to create the transformer._
    * `xslt` {String | Buffer} optional - _{String} or {Buffer} holding the XSLT document used to create the transformer._
    * `sourcePath`{String} optional - _Path to the XML document to be transformed._
    * `source` {String | Buffer} optional - _{String} or {Buffer} holding the XML document to be transformed._
    * `result`{String | Function} - _If `result` is a string, this string is interpreted as the path to the file to hold the result of the transformation._
                                    _If `result` is {Function} `String` or {Function} `Buffer`, the result of the transformation is stored in the second parameter of `callback`._
    * `params` {Object} optional - _`params`'s properties provide name/value pairs for the parameters for the transformation._
    * `props` {Object} optional - _`props`'s properties provide name/value pairs for the output properties for the transformation._
* `callback(err, result)` {Function} - _A callback that is called, when the transformation has finished or an error occurred. The error is stored in `err`. If `config.result` is `String` or `Buffer`, the argument `result` holds the transformed XML document._

Either `xsltPath` or `xslt` but not both may be specified. If neither `xsltPath` nor `xslt` is specified, the transformer performs
the _identity transform_. Either `sourcePath` or `source` but not both have to be specified.

Some examples are found in the directory _test_.

### addLibrary(path)

Adds a Java archive file to the classpath. May be used to specify a XSLT processor (e.g. by adding _saxon9he.jar_)

__Arguments__

* path {String} - _The path to an Java archive file._


### addOptions(...options)

Adds options to the JVM.

__Arguments__

* options {...String} - _The options to be added to the JVM._

## License

(The MIT License)

Copyright (c) 2014 [Scheer E2E AG](http://www.e2ebridge.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

by [Scheer E2E AG](http://www.e2ebridge.com)
