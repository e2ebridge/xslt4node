/**
 * Copyright: E2E Technologies Ltd
 */

'use strict';

var java = require('java');
var async = require('async');

/*
 *  Wrap Java functions
 */

function newFile(path, callback) {
    java.newInstance('java.io.File', path, callback);
}

function newFileSync(path) {
    return java.newInstanceSync('java.io.File', path);
}

function newFileOutputStream(path, callback) {
    java.newInstance('java.io.FileOutputStream', path, callback);
}

function newFileOutputStreamSync(path) {
    return java.newInstanceSync('java.io.FileOutputStream', path);
}

function newArrayInputStream(buffer, callback) {
    java.newInstance('java.io.ByteArrayInputStream', buffer.toByteArray(), callback);
}

function newArrayInputStreamSync(buffer) {
    return java.newInstanceSync('java.io.ByteArrayInputStream', buffer.toByteArray());
}

function newArrayOutputStream(callback) {
    java.newInstance('java.io.ByteArrayOutputStream', 1024, callback);
}

function newArrayOutputStreamSync() {
    return java.newInstanceSync('java.io.ByteArrayOutputStream', 1024);
}

function newReader(string, callback) {
    java.newInstance('java.io.StringReader', string, callback);
}

function newReaderSync(string) {
    return java.newInstanceSync('java.io.StringReader', string);
}

function newWriter(callback) {
    java.newInstance('java.io.StringWriter', 1024, callback);
}

function newWriterSync() {
    return java.newInstanceSync('java.io.StringWriter', 1024);
}

function newStreamSource(stream, callback) {
    java.newInstance('javax.xml.transform.stream.StreamSource', stream, callback);
}

function newStreamSourceSync(stream) {
    return java.newInstanceSync('javax.xml.transform.stream.StreamSource', stream);
}

function newStreamResult(stream, callback) {
    java.newInstance('javax.xml.transform.stream.StreamResult', stream, callback);
}

function newStreamResultSync(stream) {
    return java.newInstanceSync('javax.xml.transform.stream.StreamResult', stream);
}

function newTransformerFactory(callback) {
    java.callStaticMethod('javax.xml.transform.TransformerFactory', 'newInstance', callback);
}

function newTransformerFactorySync() {
    return java.callStaticMethodSync('javax.xml.transform.TransformerFactory', 'newInstance');
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
 * @param {...String} [options]
 */
module.exports.addOptions = function (/* options */) {
    var args = Array.prototype.slice.call(arguments);
    args.forEach(function (arg) {
        java.options.push(arg);
    });
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
                newFile(config.xsltPath, callback);
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
            newFile(config.sourcePath, callback);
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
            if (results.streamSource) {
                if (results.streamSource.getInputStreamSync()) {
                    results.streamSource.getInputStreamSync().closeSync();
                } else if (results.streamSource.getReaderSync()) {
                    results.streamSource.getReaderSync().closeSync();
                }
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

/**
 *
 * @param config
 * @returns {*}
 */
module.exports.transformSync = function (config) {
    var factory = newTransformerFactorySync(),
        transformer,
        xsltSource,
        source,
        result;

    if (config.xsltPath !== undefined && config.xslt !== undefined) {
        throw new Error('Properties \'xsltPath\' and \'xslt\' must not be used together.');
    }

    if (config.sourcePath !== undefined && config.source !== undefined) {
        throw new Error('Properties \'sourcePath\' and \'source\' must not be used together.');
    }

    if (config.xsltPath !== undefined || config.xslt !== undefined) {
        if (config.xsltPath) {
            xsltSource = newFileSync(config.xsltPath);
        } else if (typeof config.xslt === 'string') {
            xsltSource = newReaderSync(config.xslt);
        } else if (Buffer.isBuffer(config.xslt)) {
            xsltSource = newArrayInputStreamSync(config.xslt);
        } else {
            throw new Error('Unsupported format for property \'xslt\'. Has to be \'string\' or \'Buffer\'.');
        }
        transformer = factory.newTransformerSync(newStreamSourceSync(xsltSource));
    } else {
        transformer = factory.newTransformerSync();
    }

    if (config.sourcePath) {
        source = newFileSync(config.sourcePath);
    } else if (typeof config.source === 'string') {
        source = newReaderSync(config.source);
    } else if (Buffer.isBuffer(config.source)) {
        source = newArrayInputStreamSync(config.source);
    } else {
        throw new Error('Property \'sourcePath\' or \'source\' has to be given.');
    }

    if (typeof config.result === 'string') {
        result = newFileOutputStreamSync(config.result);
    } else if (isType('String', config.result)) {
        result = newWriterSync();
    } else if (isType('Buffer', config.result)) {
        result = newArrayOutputStreamSync();
    } else {
        throw new Error('Property \'result\' has to be given.');
    }

    if (config.params) {
        Object.keys(config.params).forEach(function (key) {
            transformer.setParameterSync(key, config.params[key]);
        });
    }

    if (config.props) {
        Object.keys(config.props).forEach(function (key) {
            transformer.setOutputPropertySync(key, config.props[key]);
        });
    }

    source = newStreamSourceSync(source);
    transformer.transformSync(source, newStreamResultSync(result));
    if (source.getInputStreamSync()) {
        source.getInputStreamSync().closeSync();
    } else if (source.getReaderSync()) {
        source.getReaderSync().closeSync();
    }
    result.closeSync();

    if (isType('String', config.result)) {
        return result.toStringSync();
    }
    if (isType('Buffer', config.result)) {
        return new Buffer(result.toByteArraySync());
    }
    return result;
};
