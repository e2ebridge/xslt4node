/**
 * Copyright: E2E Technologies Ltd
 */

'use strict';

var java = require('java');
var async = require('async');

/*
 *  Wrap Java functions
 */

function newFileInputStream(path, callback) {
    java.newInstance('java.io.FileInputStream', path, callback);
}

function newFileOutputStream(path, callback) {
    java.newInstance('java.io.FileOutputStream', path, callback);
}

function newArrayInputStream(buffer, callback) {
    java.newInstance('java.io.ByteArrayInputStream', buffer.toByteArray(), callback);
}

function newArrayOutputStream(callback) {
    java.newInstance('java.io.ByteArrayOutputStream', 1024, callback);
}

function newReader(string, callback) {
    java.newInstance('java.io.StringReader', string, callback);
}

function newWriter(callback) {
    java.newInstance('java.io.StringWriter', 1024, callback);
}

function newStreamSource(stream, callback) {
    java.newInstance('javax.xml.transform.stream.StreamSource', stream, callback);
}

function newStreamResult(stream, callback) {
    java.newInstance('javax.xml.transform.stream.StreamResult', stream, callback);
}

function newTransformerFactory(callback) {
    java.callStaticMethod('javax.xml.transform.TransformerFactory', 'newInstance', callback);
}

Buffer.prototype.toByteArray = function () {
    return java.newArray('byte', Array.prototype.map.call(this, function (e) { return java.newByte(e); }));
};


/*
 * helper functions
 */

function addTask(taskName, tasks, props, setter) {
    tasks[taskName] = ['transformer', function (callback, results) {
        async.forEachSeries(Object.keys(props), function (p, callback) {
            results.transformer[setter](p, props[p], callback);
        }, callback);
    }];
    tasks.transform.unshift(taskName);
}

function isType(type, object) {
    return typeof object === 'function' && object.name === type;
}

/*
 * module interface
 */

/**
 *
 * @param path
 */
module.exports.addLibrary = function (path) {
    if (typeof path === 'string' && java.classpath.indexOf(path) === -1) {
        java.classpath.push(path);
    }
};

/**
 *
 * @param config
 * @param callback
 * @returns {*}
 */
module.exports.transform = function (config, callback) {
    var tasks = {
        streamSource: ['source', function (callback, results) {
            newStreamSource(results.source, callback);
        }],
        streamResult: ['result', function (callback, results) {
            newStreamResult(results.result, callback);
        }],
        factory: function (callback) {
            newTransformerFactory(callback);
        },
        transform: ['transformer', 'streamSource', 'streamResult', function (callback, results) {
            results.transformer.transform(results.streamSource, results.streamResult, callback);
        }]
    };

    if (typeof callback !== 'function') {
        callback = function () {}; // if no callback passed, create use an empty function
    }

    if (config.xsltPath !== undefined && config.xslt !== undefined) {
        return callback(new Error('Properties \'xsltPath\' and \'xslt\' must not be used together.'));
    }
    if (config.sourcePath !== undefined && config.source !== undefined) {
        return callback(new Error('Properties \'sourcePath\' and \'source\' must not be used together.'));
    }

    if (config.xsltPath !== undefined || config.xslt !== undefined) {
        if (config.xsltPath) {
            tasks.xsltSource = function (callback) {
                newFileInputStream(config.xsltPath, callback);
            };
        } else if (typeof config.xslt === 'string') {
            tasks.xsltSource = function (callback) {
                newReader(config.xslt, callback);
            };
        } else if (Buffer.isBuffer(config.xslt)) {
            tasks.xsltSource = function (callback) {
                newArrayInputStream(config.xslt, callback);
            };
        } else {
            return callback(new Error('Unsupported format for property \'xslt\'. Has to be \'string\' or \'Buffer\'.'));
        }
        tasks.xsltStreamSource = ['xsltSource', function (callback, results) {
            newStreamSource(results.xsltSource, callback);
        }];
        tasks.transformer = ['factory', 'xsltStreamSource', function (callback, results) {
            results.factory.newTransformer(results.xsltStreamSource, callback);
        }];
    } else {
        tasks.transformer = ['factory', function (callback, results) {
            results.factory.newTransformer(callback);
        }];
    }

    if (config.sourcePath) {
        tasks.source = function (callback) {
            newFileInputStream(config.sourcePath, callback);
        };
    } else if (typeof config.source === 'string') {
        tasks.source = function (callback) {
            newReader(config.source, callback);
        };
    } else if (Buffer.isBuffer(config.source)) {
        tasks.source = function (callback) {
            newArrayInputStream(config.source, callback);
        };
    } else {
        return callback(new Error('Property \'sourcePath\' or \'source\' has to be given.'));
    }

    if (typeof config.result === 'string') {
        tasks.result = function (callback) {
            newFileOutputStream(config.result, callback);
        };
    } else if (isType('String', config.result)) {
        tasks.result = function (callback) {
            newWriter(callback);
        };
    } else if (isType('Buffer', config.result)) {
        tasks.result = function (callback) {
            newArrayOutputStream(callback);
        };
    } else {
        return callback(new Error('Property \'result\' has to be given.'));
    }

    if (config.params) {
        addTask('params', tasks, config.params, 'setParameter');
    }

    if (config.props) {
        addTask('props', tasks, config.props, 'setOutputProperty');
    }

    async.auto(
        tasks,
        function (err, results) {
            if (results.source) {
                results.source.closeSync();
            }
            if (results.result) {
                results.result.closeSync();
            }
            if (err) {
                callback(err.cause ? new Error(err.cause.getLocalizedMessageSync()) : err);
            } else if (isType('String', config.result)) {
                results.result.toString(callback);
            } else if (isType('Buffer', config.result)) {
                results.result.toByteArray(function (err, result) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, new Buffer(result));
                    }
                });
            } else {
                callback(null);
            }
        }
    );
};
