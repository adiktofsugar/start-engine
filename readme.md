Start Engine
===
Horrible name, I know.

Description
===
Just a way to run multiple processes and have line titles.
Uses forever.start to spawn processes, and there's a made up wrapper (MyProcess) whose first two arguments are the same to forever.start. The third argument is for unique options, of which there's only color.

Example
===
```
var path = require('path');
var chalk = require('chalk');
var startEngine = require('start-engine');

var appengine = startEngine.MyProcess([
        'bash', '-c', 
        'dev_appserver.py appengine'
    ], 
    {
        uid: "appengine",
        max: 1,
        watch: false,
        killSignal: 'SIGTERM'
    }, 
    {
        color: chalk.green,
        filter(line, index, isLast) {
            if (line.match(/extraneous nonsense/)) {
                return false; // to totally ignore the line
            }
            if (line.match(/modifying file/) && !this.modifiying) {
                this.modifying = true;
                this.modifiedCount = 0;
            }
            if (this.modifying && (!line.match(/modifiying file/) || isLast)) {
                this.modifying = false;
                line = 'Modified ' + this.modifiedCount;
            } else if (this.modifiying) {
                if (this.modifiying) {
                    this.modifiedCount++;
                    return false;
                }
            }
            return line;
        }
    });
var media = startEngine.MyProcess(
    'broccoli-build.js',
    {
        args: ["appengine/media"],
        uid: "media",
        max: 1,
        watch: false
    },
    {
        color: chalk.yellow
    });

startEngine.run([appengine, media]);
```

Notes
===
No matter what, `silent: true` gets passed to the forever process options, because I want to pre-process the output.
