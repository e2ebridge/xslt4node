/**
 * Copyright: E2E Technologies Ltd
 */
'use strict';

var testcase = require('nodeunit').testCase;
var fs = require('fs');
var xslt4node = require('../lib/xslt4node');
var transform = xslt4node.transform;
//xslt4node.addLibrary('./javaLibs/saxon9he.jar');
//xslt4node.addOptions('-Xmx1g', '-Dgugus=foobar');

var ORDER = '<order><book ISBN="10-861003-324"><title>The Handmaid\'s Tale</title><price>19.95</price></book><cd ISBN="2-3631-4"><title>Americana</title><price>16.95</price></cd></order>';
var DISCOUNT = '<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:param name="discount"/><xsl:template match="/"><order><xsl:variable name="sub-total" select="sum(//price)"/><total><xsl:value-of select="$sub-total"/></total>15% discount if paid by: <xsl:value-of select="$discount"/></order></xsl:template></xsl:stylesheet>';
var RESULT = '<?xml version="1.0" encoding="UTF-8"?><order><total>36.9</total>15% discount if paid by: 1972/01/01</order>';

module.exports = testcase({
    'configuration': testcase({
        'ambiguous xslt': function (test) {
            var config = {
                xsltPath: './test/discount.xsl',
                xslt: 'foobar'
            };
            test.expect(1);
            transform(config, function (err) {
                test.strictEqual(err ? err.message : '', 'Properties \'xsltPath\' and \'xslt\' must not be used together.');
                test.done();
            });
        },
        'ambiguous source': function (test) {
            var config = {
                sourcePath: './test/order.xml',
                source: 'foobar'
            };
            test.expect(1);
            transform(config, function (err) {
                test.strictEqual(err ? err.message : '', 'Properties \'sourcePath\' and \'source\' must not be used together.');
                test.done();
            });
        },
        'source missing': function (test) {
            var config = {
                result: ''
            };
            test.expect(1);
            transform(config, function (err) {
                test.strictEqual(err ? err.message : '', 'Property \'sourcePath\' or \'source\' has to be given.');
                test.done();
            });
        },
        'result missing': function (test) {
            var config = {
                source: ORDER
            };
            test.expect(1);
            transform(config, function (err) {
                test.strictEqual(err ? err.message : '', 'Property \'result\' has to be given.');
                test.done();
            });
        }
    }),
    'transformation': testcase({
        'with file': testcase({
            setUp: function (cb) {
                if (fs.existsSync('./test/result.xml')) {
                    fs.unlinkSync('./test/result.xml');
                }
                cb();
            },
            'transformation ok': function (test) {
                var config = {
                    xsltPath: './test/discount.xsl',
                    sourcePath: './test/order.xml',
                    result: './test/result.xml',
                    params: {
                        discount: '1972/01/01'
                    }
                };
                test.expect(1);
                transform(config, function (err) {
                    test.ifError(err);
                    if (!err) {
                        var exists = fs.existsSync('./test/result.xml'),
                            actual;
                        test.expect(2);
                        test.ok(exists, 'File \'result.xml\' does not exist.');
                        if (exists) {
                            test.expect(3);
                            actual = fs.readFileSync('./test/result.xml', 'utf-8');
                            test.strictEqual(actual, RESULT);
                        }
                    }
                    test.done();
                });
            }
        }),
        'with string': testcase({
            'transformation ok': function (test) {
                var config = {
                    xslt: DISCOUNT,
                    source: ORDER,
                    result: String,
                    params: {
                        discount: '1972/01/01'
                    }
                };
                test.expect(1);
                transform(config, function (err, result) {
                    test.ifError(err);
                    if (!err) {
                        test.expect(2);
                        test.strictEqual(result, RESULT);
                    }
                    test.done();
                });
            }
        }),
        'with buffer': testcase({
            'transformation ok': function (test) {
                var config = {
                    xslt: new Buffer(DISCOUNT),
                    source: new Buffer(ORDER),
                    result: Buffer,
                    params: {
                        discount: '1972/01/01'
                    }
                };
                test.expect(1);
                transform(config, function (err, result) {
                    test.ifError(err);
                    if (!err) {
                        test.expect(2);
                        test.strictEqual(result.toString(), RESULT);
                    }
                    test.done();
                });
            }
        })
    })
});
