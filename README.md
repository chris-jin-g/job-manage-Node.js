jobManager
==========

A program to manager and monitor your linux shell jobs ( In fact, your job is a shell command ), based on NodeJS.


Dependencies:
-------------

- Linux / Unix

- NodeJS

- MongoDB

- Shell Command : date, kill ...


Usage:
------

1:Run `npm install` to install necessary NodeJS packages.

2:Copy config.default.json to config.json and configurate your MongoDB setting. Move jobs.demo to jobs and plugins.demo to plugins.

2:Writing your own job config in jobs folder refer to demo config demo.a.json, json file name is your job name.

3:Run `npm run build` to init jobs.

4:Run `npm run bk` to start backend log scaner and run `npm run fe` to start monitor web server.

5:Then you can visitor 127.0.0.1:[port] to manager your jobs.


Job config:
-------

```
{
    "frequency": "quarterly", // value in (quarterly, hourly, daily, weekly, monthly)
    "dependencies": [{
        "job": "demo.b"
    }],
    "tasks": [{
        "plugin": "base",
        "retry": false, // is auto retry, default is false, is it is true job this task will retry untill success
        "config": { // you can get this config in you plugin
            "command": "echo \"test demo a\""
        }
    }]
}
```

Project config:
-------

```
{
    "port": 3000, // monitor web server port
    "db": "mongodb://127.0.0.1/test", // mongodb access string
    "alertInterval": 3600, // delay job and error job alert interval
    "email": { // email configration
        "host": "",
        "auth": {
            "user": "",
            "pass": ""
        },
        "from": "",
        "to": ""
    }
}
```

Job status:
----------

- waiting : waiting dependencies job ready or bk_index start the job

- progressing : running

- success : success and waiting next partition

- failed : ocurr error in job shell

- error : ocurr error in monitor

- dead : job dead when progressing

- stop : stoped, nothing will happen with this job.


Tips:
------
You can write your own plugin to make your work more efficient.

Variable in your shell command can be used:

1.$PARTITION # like 2014/12/12/12/2   when frequency is monthly, the partition is the last day of month.

2.$DATE # like 2014-12-12

3.$YEAR # like 2014

4.$MONTH # 0 - 11

5.$SHORT_DATE # 1 - 31

6.$HOUR # 0 - 23

7.$QUARTER # 0 1 2 3

8.$PROD_ROOT root directory which job shell running

9.$JOB_NAME name of this job

10.$FREQUENCY frequency of this job, like : HOURLY, QUARTERLY


Change Log:
----------

- 1.0.0 : 1.0.0 release
- 1.0.1 : support end partition, support view config


Plugin:
--------

Every job is a set of tasks, each task is build with a plugin.

You can write your won plugin to manager your code.

Write plugin in folder plugins, each plugin in a independent folder and include a nodeJS file index.js.

Your plugin module will get the config witch define in your job config json file, and you should retrun a command string.

Manager will run all task of your job one by one.


TODO:
------


- Support more frequency type, maybe strong like crontab

- frontend page auto update

- delay time display

- program log optimization

- handle kill job faild, aviod two same job running

- Handle job's status better

- Unit Test

- Support end time


*Welcome to contribute your code*


