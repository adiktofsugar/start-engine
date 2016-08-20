var async = require('async');
var forever = require('forever');

function MyProcess(script, startOptions, options) {
    if (!(this instanceof MyProcess)) {
        return new MyProcess(script, startOptions, options);
    }
    if (startOptions && !startOptions.silent) {
        startOptions.silent = true;
    }
    var monitor = forever.start(script, startOptions);
    var title = monitor.uid;
    if (title.length > MyProcess.titleWidth) {
        MyProcess.titleWidth = title.length;
    }

    function getHeader() {
        var paddingLen = MyProcess.titleWidth - title.length;
        if (paddingLen < 0) {
            paddingLen = 0;
        }
        var sidePaddingLen = Math.floor(paddingLen / 2);
        var sidePadding = (new Array(sidePaddingLen + 1)).join(' ');
        var header = '[' + sidePadding + title + sidePadding + ']';
        return colorHeader(header);
    }

    function colorHeader(header) {
        if (options.color) {
            return options.color(header);
        }
        return header;
    }

    this.monitor = monitor;
    this.getHeader = getHeader;
}
MyProcess.titleWidth = 10;

function list(callback) {
    forever.list(true, function (error, output) {
        output = output || 'No processes running';
        console.log(output);
        if (callback) callback();
    });
}

function stop(callback) {
    callback = callback || function () {};
    forever.list(false, function (error, children) {
        if (!children) {
            console.log('no children running');
            return callback();
        }
        if (children.length == 1) {
            console.log(children.length, 'child running');
        } else {
            console.log(children.length, 'children running');
        }
        function stopChildFactory(child, index) {
            return function(callback) {
                forever.stop(index)
                .on("error", function (error) {
                    console.error(error);
                    callback();
                })
                .on("stop", function () {
                    console.log('stopped', child.uid);
                    callback();
                });
            }
        }
        async.parallel(children.map(stopChildFactory), callback);
    });
}

function start(myProcesses, callback) {
    callback = callback || function () {};
    
    function prependData(data, header) {
        var text = (data instanceof Buffer)
            ? data.toString('utf-8')
            : String(data);
        var reg = /.*?(\n\r|\r\n|\n|\r)/g;
        var newText = header + ' ';
        var result;
        while (result = reg.exec(text)) {
            newText = newText + result[0];
        }
        return newText;
    }
    
    myProcesses.forEach(function (myProcess) {
        var monitor = myProcess.monitor;
        
        function writeDataFn(stream) {
            return function (data) {
                var header = myProcess.getHeader();
                stream.write(prependData(data, header));
            }
        }
        
        monitor
        .on('start', function () {
            console.log('started', monitor.uid);
        })
        .on('stop', function () {
            console.log('stopped', monitor.uid);
        })
        .on('exit', function () {
            console.log('exited', monitor.uid);
        })
        .on('stdout', writeDataFn(process.stdout))
        .on('stderr', writeDataFn(process.stderr))
        .on('error', function (error) {
            console.error('ERROR', error, monitor.uid);
        })
        .on('exit:code', function(code) {
            console.error(
                'Script "', monitor.uid, '"',
                'exited with code "', code, '"');
        });
    });

    function onStartServer (error, monitors) {
        console.log('startserver workers started');
        if (error) {
            console.error('startserver', error);
        }
        callback();
    }
    forever.startServer.apply(forever, myProcesses.concat([onStartServer]));
}

function run(myProcesses) {
    stop(function () {
        start(myProcesses)
    });
}

module.exports = {
    run,
    MyProcess
};